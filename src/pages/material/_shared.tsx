/**
 * 材料系统 - 共享 UI 小组件 & helper hooks
 * 弹窗、表格行、搜索区、材料选择器等
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Material, DocLineItem, Warehouse, StockBalance } from './types';
import type { SysOrg } from '../system/types';
import { getMaterials, getWarehouses, genId, recalcLine, getStockBalancesByMaterialIds } from './materialStore';

/* ==================== 通用样式常量 ==================== */
export const C = {
  sectionTitle: 'text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5',
  input: 'w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-white',
  label: 'text-xs font-medium text-slate-600 mb-1 block',
  button: {
    primary: 'px-4 py-2 rounded-md bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition',
    success: 'px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50',
    danger:  'px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50',
    amber:   'px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition',
    tiny: 'px-2 py-1 rounded text-[12px] border border-slate-300 text-slate-600 hover:bg-slate-50 transition',
  },
  pill: 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
  table: 'w-full text-sm text-left border-collapse',
  th: 'px-3 py-2 bg-slate-50 text-slate-600 font-medium text-[12px] border-b border-slate-200',
  td: 'px-3 py-2 border-b border-slate-100 text-slate-700 align-top',
};

/* ==================== Modal 弹窗 ==================== */
export function Modal({
  title, open, onClose, children, width = 'max-w-4xl', footer,
}: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode;
  width?: string; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== Tag / Pill ==================== */
export function StatusPill({ status, color }: { status: string; color?: string }) {
  const map: Record<string, string> = {
    'draft':       `${C.pill} bg-slate-100 text-slate-700`,
    'submitted':   `${C.pill} bg-blue-50 text-blue-700`,
    'audited':     `${C.pill} bg-emerald-50 text-emerald-700`,
    'issuing':     `${C.pill} bg-amber-50 text-amber-700`,
    'completed':   `${C.pill} bg-emerald-100 text-emerald-800`,
    'out_done':    `${C.pill} bg-sky-50 text-sky-700`,
    'confirmed':   `${C.pill} bg-cyan-50 text-cyan-700`,
    '待调入确认':  `${C.pill} bg-amber-50 text-amber-700`,
    'rejected':    `${C.pill} bg-rose-50 text-rose-700`,
    'voided':      `${C.pill} bg-slate-100 text-slate-500`,
    'done':        `${C.pill} bg-emerald-100 text-emerald-800`,
    'closed':      `${C.pill} bg-slate-100 text-slate-600`,
  };
  const cls = (color || map[status] || `${C.pill} bg-slate-100 text-slate-700`);
  return <span className={cls}>{status}</span>;
}

export function TypePill({ text, tone = 'slate' }: { text: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' | 'amber' }) {
  const tones: Record<string, string> = {
    slate:   `${C.pill} bg-slate-100 text-slate-700`,
    cyan:    `${C.pill} bg-cyan-50 text-cyan-700`,
    emerald: `${C.pill} bg-emerald-50 text-emerald-700`,
    rose:    `${C.pill} bg-rose-50 text-rose-700`,
    amber:   `${C.pill} bg-amber-50 text-amber-700`,
  };
  return <span className={tones[tone]}>{text}</span>;
}

/* ==================== 筛选条 ==================== */
export function SearchBar({ children, onAdd, addLabel = '+ 新建' }: { children: React.ReactNode; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
      {children}
      <div className="ml-auto flex items-center gap-2">
        {onAdd && <button className={C.button.primary} onClick={onAdd}>{addLabel}</button>}
      </div>
    </div>
  );
}

/* ==================== 选择器 ==================== */
export function Select({ value, onChange, options, placeholder, className = '', disabled = false }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`${C.input} ${className} ${disabled ? 'opacity-60 cursor-not-allowed !bg-slate-100' : ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Input({ value, onChange, placeholder, className = '', type = 'text', onKeyDown, step, min, max }: {
  value: string | number | undefined; onChange: (v: string) => void;
  placeholder?: string; className?: string; type?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  step?: string | number; min?: string | number; max?: string | number;
}) {
  return (
    <input
      type={type}
      step={step as any}
      min={min as any}
      max={max as any}
      value={value === undefined || value === null ? '' : value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      className={`${C.input} ${className}`}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={C.input}
    />
  );
}

/* ==================== 材料搜索选择器（弹层） ==================== */
export function MaterialPicker({ open, onClose, onPick, multiple = true, showStock = false, scopeOrgId }: {
  open: boolean; onClose: () => void;
  onPick: (items: Material[]) => void;
  multiple?: boolean;
  /** 显示"所在仓库+当前可用库存"（按仓库逐行显示）*/
  showStock?: boolean;
  /** 限定到指定组织（缩小仓库范围）*/
  scopeOrgId?: string;
}) {
  const [kw, setKw] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const mats = useMemo(() => {
    const all = getMaterials();
    if (!kw.trim()) return all;
    const k = kw.trim().toLowerCase();
    return all.filter(m =>
      m.name.toLowerCase().includes(k) ||
      m.code.toLowerCase().includes(k) ||
      (m.category || '').toLowerCase().includes(k)
    );
  }, [kw, open]);

  // 按当前 mats 查库存（scopeOrgId 生效）
  const balanceByMatId = useMemo(() => {
    const ids = mats.map(m => m.id);
    const all = getStockBalancesByMaterialIds(ids, scopeOrgId);
    const map: Record<string, StockBalance[]> = {};
    for (const b of all) {
      (map[b.materialId] ||= []).push(b);
    }
    return map;
  }, [mats, open, scopeOrgId]);

  useEffect(() => { if (open) { setPicked({}); setKw(''); } }, [open]);

  const toggle = (id: string) => {
    if (!multiple) {
      setPicked({ [id]: true });
    } else {
      setPicked(p => ({ ...p, [id]: !p[id] }));
    }
  };
  const confirm = () => {
    const ids = Object.keys(picked).filter(k => picked[k]);
    const items = getMaterials().filter(m => ids.includes(m.id));
    if (items.length) onPick(items);
    onClose();
  };
  return (
    <Modal title={showStock ? "选择材料（显示仓库+可用库存）" : "选择材料"} open={open} onClose={onClose} width={showStock ? "max-w-5xl" : "max-w-3xl"}
      footer={<>
        <button className={C.button.ghost} onClick={onClose}>取消</button>
        <button className={C.button.primary} onClick={confirm} disabled={!Object.values(picked).some(Boolean)}>
          确定（{Object.values(picked).filter(Boolean).length}）
        </button>
      </>}>
      <div className="mb-3">
        <Input value={kw} onChange={setKw} placeholder="搜索编码/名称/分类" />
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[60vh] overflow-auto">
        <table className={C.table}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={C.th + ' w-10'}></th>
              <th className={C.th}>编码</th>
              <th className={C.th}>名称</th>
              <th className={C.th}>分类</th>
              <th className={C.th}>规格</th>
              <th className={C.th}>单位</th>
              {showStock && <th className={C.th}>所在仓库 · 可用库存</th>}
              {!showStock && <th className={C.th + ' text-right'}>参考价(元)</th>}
            </tr>
          </thead>
          <tbody>
            {mats.length === 0 && (
              <tr><td colSpan={showStock ? 7 : 7} className={`${C.td} text-center text-slate-400 py-6`}>暂无匹配材料</td></tr>
            )}
            {mats.map(m => {
              const selected = !!picked[m.id];
              const bs = balanceByMatId[m.id] || [];
              const totalStock = bs.reduce((s, b) => s + b.qty, 0);
              return (
                <tr key={m.id} onClick={() => toggle(m.id)} className={`cursor-pointer ${selected ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}>
                  <td className={C.td}>
                    <input type={multiple ? 'checkbox' : 'radio'} checked={selected} readOnly className="accent-cyan-600" />
                  </td>
                  <td className={C.td}>{m.code}</td>
                  <td className={C.td + ' font-medium'}>{m.name}</td>
                  <td className={C.td}>{m.category}</td>
                  <td className={C.td}>{m.spec || '-'}</td>
                  <td className={C.td}>{m.unit}</td>
                  {showStock ? (
                    <td className={C.td}>
                      {bs.length === 0 ? (
                        <span className="text-slate-400 text-xs">（当前组织各仓库均无库存）</span>
                      ) : (
                        <>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs mb-1 ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            合计：<b className="tabular-nums">{totalStock.toLocaleString()} {m.unit}</b>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {bs.map(b => (
                              <span key={b.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] text-slate-600 shadow-sm">
                                <span className="text-slate-400">{b.orgName} /</span>
                                <span className="font-medium text-slate-700">{b.warehouseName}</span>
                                <span className="tabular-nums text-cyan-700 font-semibold ml-1">{b.qty.toLocaleString()} {m.unit}</span>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  ) : (
                    <td className={C.td + ' text-right tabular-nums'}>{m.price?.toFixed(2)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ==================== 单据行编辑器（明细表格） ==================== */
interface DocLineEditorProps {
  lines: DocLineItem[];
  onChange: (lines: DocLineItem[]) => void;
  onPickMaterials: () => void;  // 打开材料选择
  extraColumns?: { key: string; label: string; render?: (l: DocLineItem, onChange: (val: any) => void) => React.ReactNode }[];
  readOnly?: boolean;
  enablePrice?: boolean;        // 是否显示单价/金额
  qtyLabel?: string;
}

export function DocLineEditor({
  lines, onChange, onPickMaterials, extraColumns = [], readOnly = false, enablePrice = true, qtyLabel = '数量',
}: DocLineEditorProps) {
  const updateLine = (id: string, patch: Partial<DocLineItem>) => {
    const next = lines.map(l => l.id === id ? recalcLine({ ...l, ...patch }) : l);
    onChange(next);
  };
  const removeLine = (id: string) => onChange(lines.filter(l => l.id !== id));
  const totalAmount = lines.reduce((s, l) => s + (l.totalAmount || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className={C.sectionTitle}>
          <span className="w-1 h-4 bg-cyan-500 rounded-full inline-block"></span>
          单据明细（{lines.length} 行）
        </div>
        {!readOnly && (
          <button className={C.button.ghost} onClick={onPickMaterials}>+ 选择材料</button>
        )}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-auto max-h-[460px]">
        <table className={`${C.table} min-w-[960px]`}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={C.th + ' w-14'}>序号</th>
              <th className={C.th + ' w-32'}>材料编码</th>
              <th className={C.th}>材料名称/规格</th>
              <th className={C.th + ' w-24'}>单位</th>
              <th className={`${C.th} w-32 text-right`}>{qtyLabel}</th>
              {enablePrice && <th className={`${C.th} w-32 text-right`}>单价(元)</th>}
              {enablePrice && <th className={`${C.th} w-32 text-right`}>含税金额(元)</th>}
              {extraColumns.map(ec => <th key={ec.key} className={C.th}>{ec.label}</th>)}
              {!readOnly && <th className={C.th + ' w-16'}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={8 + extraColumns.length} className={`${C.td} text-center text-slate-400 py-8`}>
                  暂无明细，请点击右上方"+ 选择材料"添加
                </td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className={C.td + ' text-slate-400'}>{i + 1}</td>
                <td className={C.td + ' text-slate-500'}>{l.materialCode}</td>
                <td className={C.td}>
                  <div className="font-medium text-slate-800">{l.materialName}</div>
                  {l.spec && <div className="text-[11px] text-slate-500">{l.spec}</div>}
                  {l.remark && <div className="text-[11px] text-slate-400 mt-0.5">备注: {l.remark}</div>}
                </td>
                <td className={C.td}>{l.unit}</td>
                <td className={C.td}>
                  {readOnly
                    ? <div className="text-right tabular-nums">{l.quantity.toLocaleString()}</div>
                    : (
                      <input
                        type="number"
                        step="any"
                        value={l.quantity}
                        onChange={e => updateLine(l.id, { quantity: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-slate-300 rounded-md text-right text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                    )
                  }
                </td>
                {enablePrice && (
                  <td className={C.td}>
                    {readOnly
                      ? <div className="text-right tabular-nums">{(l.unitPrice || 0).toFixed(2)}</div>
                      : (
                        <input
                          type="number"
                          step="0.01"
                          value={l.unitPrice ?? ''}
                          onChange={e => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border border-slate-300 rounded-md text-right text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                        />
                      )
                    }
                  </td>
                )}
                {enablePrice && (
                  <td className={`${C.td} text-right tabular-nums font-medium text-slate-800`}>
                    {(l.totalAmount || 0).toFixed(2)}
                  </td>
                )}
                {extraColumns.map(ec => (
                  <td key={ec.key} className={C.td}>
                    {ec.render ? ec.render(l, (v) => updateLine(l.id, { [ec.key]: v } as any)) : (l as any)[ec.key] ?? ''}
                  </td>
                ))}
                {!readOnly && (
                  <td className={C.td}>
                    <button onClick={() => removeLine(l.id)} className="text-rose-500 hover:text-rose-700 text-xs">删除</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-4 mt-2 text-sm text-slate-600">
        <span>合计行数：<b className="text-slate-800">{lines.length}</b></span>
        <span>合计数量：<b className="text-slate-800 tabular-nums">{totalQty.toLocaleString()}</b></span>
        {enablePrice && (
          <span>含税合计：<b className="text-cyan-700 text-base tabular-nums">¥ {totalAmount.toFixed(2)}</b></span>
        )}
      </div>
    </div>
  );
}

/* ==================== 把 Material[] 转成 DocLineItem（默认数量1，参考价）==================== */
export function materialsToLines(mats: Material[]): DocLineItem[] {
  return mats.map(m => recalcLine({
    id: genId('li'),
    materialId: m.id,
    materialCode: m.code,
    materialName: m.name,
    spec: m.spec,
    unit: m.unit,
    quantity: 1,
    unitPrice: m.price || 0,
  }));
}

/* ==================== 工具 Hook：local 状态刷新 ==================== */
export function useForceRefresh() {
  const [, setTick] = useState(0);
  return () => setTick(t => t + 1);
}

/* ==================== 导入表格（CSV/文本粘贴）弹窗 ==================== */
export function ImportLinesModal({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void;
  onConfirm: (rows: { code: string; name: string; quantity: number; unitPrice: number; remark?: string }[]) => void;
}) {
  const [text, setText] = useState<string>('');
  useEffect(() => { if (open) setText('材料编码,材料名称,数量,单价(元),备注\nLQ-001,SBS改性沥青(I-C),20,5200,示例行'); }, [open]);

  const rows = useMemo(() => {
    const arr: { code: string; name: string; quantity: number; unitPrice: number; remark?: string }[] = [];
    text.split(/\r?\n/).forEach((line, idx) => {
      if (!line.trim()) return;
      if (idx === 0 && /编码|code|名称|name/i.test(line)) return; // skip header
      const cols = line.split(/[,\t]/).map(c => c.trim());
      if (cols.length < 2) return;
      arr.push({
        code: cols[0] || '',
        name: cols[1] || '',
        quantity: Number(cols[2]) || 0,
        unitPrice: Number(cols[3]) || 0,
        remark: cols[4],
      });
    });
    return arr;
  }, [text]);

  return (
    <Modal title="上传/粘贴入库材料表格" open={open} onClose={onClose} width="max-w-3xl"
      footer={<>
        <button className={C.button.ghost} onClick={onClose}>取消</button>
        <button className={C.button.primary} onClick={() => onConfirm(rows)} disabled={rows.length === 0}>
          确认导入（{rows.length} 行）
        </button>
      </>}>
      <div className="mb-2 text-xs text-slate-500">
        支持 CSV/Excel 直接粘贴，分隔符为逗号或 Tab。列顺序：<b>材料编码, 材料名称, 数量, 单价(元), 备注</b>；
        材料编码和名称必须与系统材料编码体系一致（任一匹配即可）。
      </div>
      <textarea
        className={`${C.input} font-mono text-xs leading-6`}
        rows={14}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="mt-3 text-xs text-slate-500">
        预览解析到 <b className="text-cyan-700">{rows.length}</b> 行数据，点击确定后会校验编码并生成单据明细。
      </div>
    </Modal>
  );
}

/* ==================== 组织/仓库下拉 ==================== */
export function useWarehouseByOrg(orgId: string): Warehouse[] {
  const all = useMemo(() => getWarehouses(), [orgId]);
  return useMemo(() => all.filter(w => w.enabled && (!orgId || w.orgId === orgId)), [all, orgId]);
}

export function orgDropdownOptions(orgs: SysOrg[]): { value: string; label: string }[] {
  // 取项目级/区域/集团级组织均可；此处仅展示 path
  return orgs
    .filter(o => o.level === 'project' || !o.parentId || o.level === 'region')
    .map(o => ({ value: o.id, label: o.path }));
}

/* ==================== 消息条（简单实现）==================== */
export function useToast() {
  const ref = useRef<HTMLDivElement | null>(null);
  if (typeof window !== 'undefined' && !document.getElementById('__mat_toasts')) {
    const host = document.createElement('div');
    host.id = '__mat_toasts';
    host.className = 'fixed top-20 right-4 z-[100] space-y-2';
    document.body.appendChild(host);
  }
  return (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const host = document.getElementById('__mat_toasts');
    if (!host) return;
    const el = document.createElement('div');
    const bg =
      type === 'success' ? 'bg-emerald-600' :
      type === 'error' ? 'bg-rose-600' : 'bg-slate-700';
    el.className = `${bg} text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };
}
