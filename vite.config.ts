import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import type { Plugin } from 'vite';
import { execSync, spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import type { IncomingMessage, ServerResponse } from 'http';

const FEISHU_FOLDER_TOKEN = 'HZ9AfYDoulSZ1MdvyB7cDCH1nWg';

// Python script to extract text from PDF
const PDF_EXTRACT_SCRIPT = `
import sys
try:
    import pdfplumber
    with pdfplumber.open(sys.argv[1]) as pdf:
        parts = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        print("\\n".join(parts))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

// Python script to scan all processes and return the LARKSUITE_CLI_USER_ACCESS_TOKEN
// with the latest (farthest) expiration time. Only returns tokens that are not expired.
const TOKEN_REFRESH_SCRIPT = `
import subprocess, base64, json, re, time, sys

def get_latest_token():
    try:
        out = subprocess.run(['ps', '-A', '-o', 'pid='], capture_output=True, text=True, timeout=5)
        pids = [p.strip() for p in out.stdout.strip().split('\\n') if p.strip()]
    except Exception:
        return None
    results = []
    for pid in pids:
        try:
            env = subprocess.run(['ps', 'eww', '-p', pid], capture_output=True, text=True, timeout=2)
            env_str = env.stdout
        except Exception:
            continue
        match = re.search(r'LARKSUITE_CLI_USER_ACCESS_TOKEN=([^\\s]+)', env_str)
        if not match:
            continue
        token = match.group(1).strip("'")
        try:
            parts = token.split('.')
            if len(parts) < 2:
                continue
            body = parts[1]
            body += '=' * (4 - len(body) % 4)
            d = json.loads(base64.b64decode(body))
            exp = d.get('exp', 0)
            results.append((exp, token))
        except Exception:
            pass
    if not results:
        return None
    results.sort(reverse=True)
    exp, token = results[0]
    if exp < int(time.time()):
        return None
    return token

t = get_latest_token()
if t:
    print(t)
else:
    sys.exit(1)
`;

const TOKEN_REFRESH_PATH = path.join(tmpdir(), 'feishu_token_refresh.py');
try { writeFileSync(TOKEN_REFRESH_PATH, TOKEN_REFRESH_SCRIPT); } catch { /* ignore */ }

// 解析 lark-cli 的完整路径：优先从 PATH，其次从常见安装位置定位（避免新终端继承的PATH缺失导致command not found）
function resolveLarkCli(): string {
  const candidates = [
    '/Users/zhouqinyang/.trae-cn/plugins/trae-remote-official/lark/1.0.4/bin/lark-cli',
  ];
  for (const p of candidates) {
    try { if (existsSync(p)) return p; } catch { /* ignore */ }
  }
  return 'lark-cli'; // 回退：依赖 PATH
}
const LARK_CLI = resolveLarkCli();

// Cached token with very short TTL (30s) to avoid stale tokens in long-running Vite process
let _cachedToken: string | null = null;
let _cachedTokenExp: number = 0;
let _cachedAt: number = 0;

/**
 * Returns a fresh LARKSUITE_CLI_USER_ACCESS_TOKEN.
 * Every request runs the refresh script to find the latest valid token
 * across live sibling processes (minimize cache hit with stale data).
 * Falls back to process env if the refresh script fails.
 */
function getFreshToken(): string | null {
  const now = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  // Short TTL: only use cache if fetched within 30s AND not expired
  const cacheValid = _cachedToken && (nowMs - _cachedAt < 30_000) && (_cachedTokenExp > now + 60);
  if (cacheValid) return _cachedToken;

  try {
    const raw = execSync(`python3 "${TOKEN_REFRESH_PATH}"`, {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
    // 清洗：只保留 JWT 合法字符（base64url + .），去除可能误匹配的引号/分号/尾部符号
    const cleaned = raw.replace(/[^A-Za-z0-9\-_.]/g, '');
    if (cleaned.length > 100) {
      try {
        const parts = cleaned.split('.');
        if (parts.length >= 2) {
          let body = parts[1];
          body += '='.repeat(4 - (body.length % 4));
          const d = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
          if (d.exp && d.exp > now + 60) {
            _cachedToken = cleaned;
            _cachedTokenExp = d.exp;
            _cachedAt = nowMs;
            return _cachedToken;
          }
        }
      } catch { /* parse failed */ }
    }
  } catch { /* refresh failed */ }

  // Fallback to env token (if valid)
  const rawEnvToken = process.env.LARKSUITE_CLI_USER_ACCESS_TOKEN || null;
  if (rawEnvToken) {
    const envToken = rawEnvToken.replace(/[^A-Za-z0-9\-_.]/g, '');
    try {
      const parts = envToken.split('.');
      if (parts.length >= 2) {
        let body = parts[1];
        body += '='.repeat(4 - (body.length % 4));
        const d = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
        if (d.exp && d.exp > now + 60) {
          _cachedToken = envToken;
          _cachedTokenExp = d.exp;
          _cachedAt = nowMs;
          return envToken;
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * 返回 lark-cli 调用时使用的 env 对象（每次调用都刷新最新 user token），
 * 不再用 Shell 字符串拼接方式注入 token，避免引号嵌套引发语法错误。
 */
function buildLarkExecEnv(): NodeJS.ProcessEnv {
  const token = getFreshToken();
  const larkBinDir = path.dirname(LARK_CLI);
  const existingPath = process.env.PATH || '';
  const extraPath = existingPath.includes(larkBinDir) ? existingPath : `${larkBinDir}:${existingPath}`;
  return {
    ...process.env,
    PATH: extraPath,
    LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1',
    LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1',
    ...(token ? { LARKSUITE_CLI_USER_ACCESS_TOKEN: token } : {}),
  };
}

function fetchDocxContent(token: string): { ok: boolean; content?: string; error?: string } {
  try {
    const result = execSync(
      `${LARK_CLI} docs +fetch --doc ${JSON.stringify(token)} --doc-format markdown --format json --as user`,
      { encoding: 'utf-8', timeout: 30000, env: buildLarkExecEnv() }
    );
    const parsed = JSON.parse(result);
    if (parsed.ok && parsed.data) {
      return { ok: true, content: parsed.data.document?.content || '' };
    }
    return { ok: false, error: parsed.error?.message || 'Failed to fetch document content' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function fetchFileContent(token: string): { ok: boolean; content?: string; error?: string } {
  const relPdf = `feishu_${token}.pdf`;
  const absPdf = path.join(process.cwd(), relPdf);
  const tmpScript = path.join(tmpdir(), `feishu_extract.py`);

  try {
    writeFileSync(tmpScript, PDF_EXTRACT_SCRIPT);
    execSync(
      `${LARK_CLI} drive +preview --file-token ${JSON.stringify(token)} --type pdf --output ${JSON.stringify(relPdf)} --if-exists overwrite --format json --as user`,
      { encoding: 'utf-8', timeout: 30000, env: buildLarkExecEnv() }
    );
    if (!existsSync(absPdf)) {
      return { ok: false, error: 'PDF download failed' };
    }
    const text = execSync(`python3 ${JSON.stringify(tmpScript)} ${JSON.stringify(absPdf)}`, {
      encoding: 'utf-8', timeout: 15000,
    });
    return { ok: true, content: text.trim() };
  } catch (err) {
    return { ok: false, error: `File preview failed: ${String(err).slice(0, 200)}` };
  } finally {
    try { unlinkSync(absPdf); } catch { /* ignore */ }
  }
}

function fetchFolderList(): { ok: boolean; files?: unknown[]; error?: string } {
  try {
    // 通过 stdin 传 JSON，避免所有 Shell 引号嵌套/绝对路径限制问题
    const params = JSON.stringify({
      folder_token: FEISHU_FOLDER_TOKEN,
      order_by: 'EditedTime',
      direction: 'DESC',
      page_size: 200,
    });
    const r = spawnSync(
      LARK_CLI,
      ['drive', 'files', 'list', '--params', '-', '--format', 'json', '--as', 'user'],
      {
        input: params,
        encoding: 'utf-8',
        timeout: 15000,
        env: buildLarkExecEnv(),
      }
    );
    if (r.error) return { ok: false, error: String(r.error) };
    const stdout = (r.stdout || '').trim();
    if (!stdout && r.stderr) return { ok: false, error: String(r.stderr).slice(0, 500) };
    const parsed = JSON.parse(stdout);
    if (parsed.ok && parsed.data) {
      return { ok: true, files: parsed.data.files || [] };
    }
    return { ok: false, error: parsed.error?.message || 'Failed to fetch files' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function feishuDocsPlugin(): Plugin {
  return {
    name: 'feishu-docs-proxy',
    configureServer(server) {
      server.middlewares.use('/api/feishu-docs', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const docToken = url.searchParams.get('token');
        const fileType = url.searchParams.get('type') || 'docx';

        if (docToken) {
          // Fetch document content based on type
          const result = fileType === 'file'
            ? fetchFileContent(docToken)
            : fetchDocxContent(docToken);

          // If docx fetch fails, try file approach (type may be mislabeled)
          if (!result.ok && fileType !== 'file') {
            const fallback = fetchFileContent(docToken);
            if (fallback.ok) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, content: fallback.content }));
              return;
            }
          }

          res.setHeader('Content-Type', 'application/json');
          if (result.ok) {
            res.end(JSON.stringify({ ok: true, content: result.content }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: result.error }));
          }
        } else {
          // List folder files
          const result = fetchFolderList();
          res.setHeader('Content-Type', 'application/json');
          if (result.ok) {
            res.end(JSON.stringify({ ok: true, files: result.files }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: result.error }));
          }
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), feishuDocsPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
