/**
 * 百日攻坚 - 路面专项周报（攻坚汇总 → 路面专项周报）
 *
 * 展示 区域 → 项目部 → 项目 在所选标准周（周五～周四）的情况：
 *  - 年固定为攻坚年（基准日 9.10 所在年），选择月份 → 该月的标准周 Tab（不展示超过当前所在周的周）
 *  - 本周完成（病害/罩面：施工天数、投入班组数、m²|km、吨、工效 吨/班组）
 *  - 累计完成工程量（病害 m² / 罩面 km / 超薄 km / 热再生 m² / 总金额）
 *  - 累计完成百分率 vs 理论完成百分比（工期，截至 min(所选周末, 今天)）
 *  - 状态标识：🟢正常（实际≥理论）/ 🟡滞后<20% / 🔴滞后>20%
 *  - 「存在问题（含工效偏高或偏低的原因）」项目部手填，按 项目×周 localStorage 持久化
 *  - 累计平均工效（吨/班组）= Σ累计吨 ÷ Σ累计班组数（与预警中心口径一致）
 *  - 「下一周」Tab：独立的「下周计划」填报表（病害/罩面 各3列：施工天数、投入班组数、吨；
 *    超薄/就地热再生 各4列 + 产值万元）；支持 CSV 导入/导出
 *    下周计划未填时 Tab 红色高亮 + 页面顶部提示 + 该行浅红底标识
 *  - 周报表（各周）：本周完成列下方灰字显示该周计划值（病害/罩面的 施工天数/投入班组数/吨/工效），
 *    实际 < 计划 时标红；「查看本周计划」按钮查看该周计划填报情况；「导出」按钮导出周报 CSV；
 *    表格底部冻结「合计」行（工效按 Σ吨÷Σ班组数 计算）
 *    （计划数据按 项目×周 持久化，key: md_campaign_weekly_plans_v1）
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getProjects, getDailyReports, buildWeeks, baseDateOf, todayStr,
  ensureWeeklyPlanSeeds, type WeekPlan, type WeekPlanWork,
} from './campaignStore';
import { M, Select, useToast } from './_shared';
import type { CampaignProject, DailyReport, DailyReportLine, WeekSlot } from './types';

/* ==================== 存在问题（项目部手填，项目×周 持久化） ==================== */
const ISSUE_KEY = 'md_campaign_weekly_issues_v1';
const getIssues = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(ISSUE_KEY) || '{}') as Record<string, string>; }
  catch { return {}; }
};
const saveIssues = (m: Record<string, string>) => localStorage.setItem(ISSUE_KEY, JSON.stringify(m));

/* ==================== 下周计划（项目部手填，项目×周 持久化；种子由 campaignStore 播种） ==================== */
const PLAN_KEY = 'md_campaign_weekly_plans_v1';
const emptyWork = (): WeekPlanWork => ({ days: 0, crews: 0, qty: 0, tons: 0 });
const emptyPlan = (): WeekPlan => ({ disease: emptyWork(), overlay: emptyWork(), ultraThin: emptyWork(), hotRecycle: emptyWork(), value: 0 });
const savePlans = (m: Record<string, WeekPlan>) => localStorage.setItem(PLAN_KEY, JSON.stringify(m));
/** 计划是否已填（四个数值任一 > 0 即视为已填） */
export const planFilled = (w: WeekPlanWork) => w.days > 0 || w.crews > 0 || w.qty > 0 || w.tons > 0;
/** 整条周计划（病害/罩面/超薄/热再生/产值）任一项已填即视为已填 */
export const planAnyFilled = (p: WeekPlan) =>
  planFilled(p.disease) || planFilled(p.overlay) || planFilled(p.ultraThin) || planFilled(p.hotRecycle) || p.value > 0;
/** 读取并补全缺字段（兼容旧版只存 disease/overlay 的数据） */
const planOf = (plans: Record<string, WeekPlan>, projectId: string, weekKey: string): WeekPlan => {
  const raw = plans[`${projectId}__${weekKey}`];
  if (!raw) return emptyPlan();
  return {
    disease: { ...emptyWork(), ...raw.disease },
    overlay: { ...emptyWork(), ...raw.overlay },
    ultraThin: { ...emptyWork(), ...raw.ultraThin },
    hotRecycle: { ...emptyWork(), ...raw.hotRecycle },
    value: raw.value || 0,
  };
};

/* ==================== 工具 ==================== */
const parseD = (s: string) => new Date(`${s}T00:00:00`);
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (r: number | null) => r === null ? '—' : `${(r * 100).toFixed(1)}%`;
/** 数值显示：0 → "—" */
const nz = (v: number) => v ? r2(v) : '—';

/** 某项目截至某日的全部日报明细行 */
function linesOf(reports: DailyReport[], projectId: string, upto: string): DailyReportLine[] {
  return reports.filter(r => r.date <= upto).flatMap(r => r.lines.filter(l => l.projectId === projectId));
}

/** 行集合按作业类型聚合 */
interface Agg { days: number; crews: number; qty: number; tons: number; }
const aggOf = (lines: DailyReportLine[], k: 'disease' | 'overlay' | 'ultraThin'): Agg =>
  lines.reduce((s, l) => ({
    days: s.days + (l[k].days || 0),
    crews: s.crews + (l[k].crews || 0),
    qty: s.qty + (l[k].qty || 0),
    tons: s.tons + (l[k].tons || 0),
  }), { days: 0, crews: 0, qty: 0, tons: 0 });

/** 工效（吨/班组）：班组数为 0 → null（显示 "—"） */
const effPerCrew = (a: Agg): number | null => a.crews > 0 ? a.tons / a.crews : null;

/** 理论完成百分比：截至 refDate 的工期占比，封顶 100%；无工期 → null */
function theoryOf(p: CampaignProject, refDate: string): number | null {
  if (!p.startDate || !p.endDate) return null;
  const s = parseD(p.startDate).getTime(), e = parseD(p.endDate).getTime(), t = parseD(refDate).getTime();
  if (e <= s) return null;
  return Math.max(0, Math.min(1, (t - s) / (e - s)));
}

/** 状态标识：绿=正常 / 黄=滞后<20% / 红=滞后>20% */
function statusOf(rate: number | null, theory: number | null) {
  if (rate === null || theory === null) return { dot: 'bg-slate-300', cls: 'text-slate-400', text: '—' };
  const dev = rate - theory;
  if (dev >= 0) return { dot: 'bg-emerald-500', cls: 'text-emerald-700', text: '正常' };
  return -dev < 0.2
    ? { dot: 'bg-amber-400', cls: 'text-amber-700', text: '滞后<20%' }
    : { dot: 'bg-rose-500', cls: 'text-rose-700', text: '滞后>20%' };
}

/* ==================== CSV 导入/导出工具 ==================== */
const csvEsc = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** 下载 CSV（带 BOM，Excel 可直接打开） */
const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = '\uFEFF' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
/** 简易 CSV 解析（支持引号转义，兼容 Excel 另存的 CSV） */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some(x => x !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  cur.push(field);
  if (cur.some(x => x !== '')) rows.push(cur);
  return rows;
};
/** 计划表各工种的填报字段（病害/罩面 无工程量列，超薄/热再生 含工程量） */
const workFields: Record<'disease' | 'overlay' | 'ultraThin' | 'hotRecycle', (keyof WeekPlanWork)[]> = {
  disease: ['days', 'crews', 'tons'],
  overlay: ['days', 'crews', 'tons'],
  ultraThin: ['days', 'crews', 'qty', 'tons'],
  hotRecycle: ['days', 'crews', 'qty', 'tons'],
};
/** 计划导出表头（与导入模板一致） */
const PLAN_HEADER = [
  '区域', '中心/项目部', '路段',
  '病害施工天数', '病害投入班组数', '病害吨',
  '罩面施工天数', '罩面投入班组数', '罩面吨',
  '超薄施工天数', '超薄投入班组数', '超薄km', '超薄吨',
  '热再生施工天数', '热再生投入班组数', '热再生m²', '热再生吨',
  '产值（万元）',
];
/** 周报导出表头（28 列，与周报表一致） */
const WEEK_HEADER = [
  '区域', '中心/项目部', '路段', '总金额（万元）',
  '病害施工天数', '病害投入班组数', '病害m²', '病害吨', '病害工效（吨/班组）',
  '罩面施工天数', '罩面投入班组数', '罩面km', '罩面吨', '罩面工效（吨/班组）', '本周产值（万元）',
  '病害累计（m²）', '罩面累计（km）', '超薄累计（km）', '热再生累计（m²）', '累计总金额（万元）',
  '存在问题（含工效偏高或偏低的原因）', '累计完成百分率', '理论完成百分比（工期）', '状态标识',
  '预计开工日期', '预计结束日期',
  '累计平均工效-病害（吨/班组）', '累计平均工效-罩面（吨/班组）',
];

/** 计划表表头（下周计划填报表 与 本周计划只读查看 共用） */
const PlanTableHeader = () => (
  <thead>
    <tr>
      <th rowSpan={2} className={M.th}>区域</th>
      <th rowSpan={2} className={M.th}>中心/项目部</th>
      <th rowSpan={2} className={M.th}>路段</th>
      <th colSpan={3} className={`${M.th} !bg-sky-100 !text-sky-800`}>病害</th>
      <th colSpan={3} className={`${M.th} !bg-sky-100 !text-sky-800`}>罩面</th>
      <th colSpan={4} className={`${M.th} !bg-sky-100 !text-sky-800`}>超薄</th>
      <th colSpan={4} className={`${M.th} !bg-sky-100 !text-sky-800`}>就地热再生</th>
      <th colSpan={1} className={`${M.th} !bg-emerald-100 !text-emerald-800`}>产值</th>
    </tr>
    <tr>
      {(['施工天数', '投入班组数'] as const).map(t => (
        <th key={`d-${t}`} className={M.th}>{t}</th>))}
      <th className={M.th}>吨</th>
      {(['施工天数', '投入班组数'] as const).map(t => (
        <th key={`o-${t}`} className={M.th}>{t}</th>))}
      <th className={M.th}>吨</th>
      {(['施工天数', '投入班组数'] as const).map(t => (
        <th key={`u-${t}`} className={M.th}>{t}</th>))}
      <th className={M.th}>km</th>
      <th className={M.th}>吨</th>
      {(['施工天数', '投入班组数'] as const).map(t => (
        <th key={`h-${t}`} className={M.th}>{t}</th>))}
      <th className={M.th}>m²</th>
      <th className={M.th}>吨</th>
      <th className={M.th}>万元</th>
    </tr>
  </thead>
);

/* ==================== 页面 ==================== */
export default function CampaignPavementWeekly() {
  const today = todayStr();
  const allWeeks = useMemo(() => buildWeeks(baseDateOf(), today), [today]);
  const curWeek = allWeeks[allWeeks.length - 1]; // buildWeeks 生成到今天，最后一格即当前所在周

  const [month, setMonth] = useState(curWeek ? curWeek.month : new Date().getMonth() + 1);
  const [weekKey, setWeekKey] = useState(curWeek ? curWeek.key : '');
  const [showNext, setShowNext] = useState(false);   // 「下一周」Tab：查看/填报下周计划
  const [planOpen, setPlanOpen] = useState(false);   // 周报表「查看本周计划」面板开关
  const [regionSel, setRegionSel] = useState('');
  const [deptSel, setDeptSel] = useState('');
  const [issues, setIssues] = useState<Record<string, string>>(() => getIssues());
  const [plans, setPlans] = useState<Record<string, WeekPlan>>(() => ensureWeeklyPlanSeeds());
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);   // 导入 CSV 的隐藏文件选择框

  /* 路面专项项目 + 日报 */
  const projects = useMemo(() => getProjects().filter(p => p.workType === 'pavement'), []);
  const reports = useMemo(() => getDailyReports(), []);

  /* 所选月份下的周（标准周归属月 = 起始日所在月；不超过当前所在周） */
  const monthWeeks = useMemo(() => allWeeks.filter(w => w.month === month), [allWeeks, month]);
  useEffect(() => {
    if (monthWeeks.length && !monthWeeks.some(w => w.key === weekKey)) {
      setWeekKey(monthWeeks[monthWeeks.length - 1].key);
    }
  }, [monthWeeks, weekKey]);
  const slot: WeekSlot | undefined =
    monthWeeks.find(w => w.key === weekKey) || monthWeeks[monthWeeks.length - 1];

  /* 下一周 slot（仅当前所在周可切下一周；其余历史周不展示） */
  const nextSlot: WeekSlot | null = useMemo(() => {
    if (!curWeek || !slot || slot.key !== curWeek.key) return null;
    const s = new Date(`${slot.end}T00:00:00`); s.setDate(s.getDate() + 1); // 周末次日 = 下周周五
    const e = new Date(s.getTime() + 6 * 86400000);
    const mm = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
    return { key: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`,
      start: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`,
      end: `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`,
      label: `${mm(s)}-${mm(e)}`, month: s.getMonth() + 1, seq: slot.seq + 1 };
  }, [curWeek, slot]);

  /* 区域 / 项目部联动下拉 */
  const regions = useMemo(() => [...new Set(projects.map(p => p.region))], [projects]);
  const depts = useMemo(
    () => [...new Set(projects.filter(p => !regionSel || p.region === regionSel).map(p => p.dept))],
    [projects, regionSel]);

  const rows = useMemo(() => projects
    .filter(p => (!regionSel || p.region === regionSel) && (!deptSel || p.dept === deptSel))
    .sort((a, b) => a.region.localeCompare(b.region, 'zh') || a.dept.localeCompare(b.dept, 'zh') || a.name.localeCompare(b.name, 'zh')),
    [projects, regionSel, deptSel]);

  const setIssue = (projectId: string, wk: string, v: string) => {
    setIssues(prev => {
      const next = { ...prev, [`${projectId}__${wk}`]: v };
      saveIssues(next);
      return next;
    });
  };

  /* 下周计划写入（项目×周×工种×字段 / 产值） */
  const setPlanVal = (projectId: string, wk: string, work: 'disease' | 'overlay' | 'ultraThin' | 'hotRecycle', field: keyof WeekPlanWork, v: string) => {
    setPlans(prev => {
      const k = `${projectId}__${wk}`;
      const cur = planOf(prev, projectId, wk);
      const next = { ...prev, [k]: { ...cur, [work]: { ...cur[work], [field]: Math.max(0, Number(v) || 0) } } };
      savePlans(next);
      return next;
    });
  };
  /* 下周计划产值（万元）写入 */
  const setPlanValue = (projectId: string, wk: string, v: string) => {
    setPlans(prev => {
      const k = `${projectId}__${wk}`;
      const cur = planOf(prev, projectId, wk);
      const next = { ...prev, [k]: { ...cur, value: Math.max(0, Number(v) || 0) } };
      savePlans(next);
      return next;
    });
  };

  /* 下周计划缺填检测（当前筛选范围内的项目） */
  const missingNext = useMemo(() => {
    if (!nextSlot) return [];
    return rows.filter(p => !planAnyFilled(planOf(plans, p.id, nextSlot.key)));
  }, [nextSlot, rows, plans]);

  /* 某项目的周报行数据（表格渲染 / 合计 / 导出共用） */
  const weekDataOf = (p: CampaignProject) => {
    /* 当前周截至今天，历史周截至周末（仅在有 slot 时调用） */
    const refEnd = slot.end > today ? today : slot.end;
    const weekLines = (slot ? reports.filter(r => r.date >= slot.start && r.date <= slot.end) : [])
      .flatMap(r => r.lines.filter(l => l.projectId === p.id));
    const allLines = linesOf(reports, p.id, refEnd);
    const cumMoney = (p.baseDoneValue || 0) + allLines.reduce((s, l) => s + (l.dayValue || 0), 0);
    return {
      p,
      wd: aggOf(weekLines, 'disease'),   // 本周病害
      wo: aggOf(weekLines, 'overlay'),   // 本周罩面
      ad: aggOf(allLines, 'disease'),    // 累计病害
      ao: aggOf(allLines, 'overlay'),    // 累计罩面
      au: aggOf(allLines, 'ultraThin'),  // 累计超薄
      hotM2: allLines.reduce((s, l) => s + (l.hotRecycleM2 || 0), 0),
      cumMoney,
      weekValue: weekLines.reduce((s, l) => s + (l.dayValue || 0), 0), // 本周完成产值（该周每日填报合计）
      rate: p.amount ? cumMoney / p.amount : null,
      theory: theoryOf(p, refEnd),
      pl: planOf(plans, p.id, slot!.key), // 本周计划（由上周「下一周」Tab 填报）
    };
  };
  const weekRowsData = useMemo(
    () => slot ? rows.map(weekDataOf) : [],
    [slot, rows, reports, plans, today]);

  /* 合计行（工效按 Σ吨 ÷ Σ投入班组数 计算；理论完成百分比按项目金额加权平均） */
  const totals = useMemo(() => {
    if (!weekRowsData.length) return null;
    const sumAgg = (get: (d: (typeof weekRowsData)[number]) => Agg): Agg =>
      weekRowsData.reduce((s, d) => {
        const a = get(d);
        return { days: s.days + a.days, crews: s.crews + a.crews, qty: s.qty + a.qty, tons: s.tons + a.tons };
      }, { days: 0, crews: 0, qty: 0, tons: 0 });
    const amount = weekRowsData.reduce((s, d) => s + (d.p.amount || 0), 0);
    const cumMoney = weekRowsData.reduce((s, d) => s + d.cumMoney, 0);
    return {
      wd: sumAgg(d => d.wd), wo: sumAgg(d => d.wo),
      ad: sumAgg(d => d.ad), ao: sumAgg(d => d.ao), au: sumAgg(d => d.au),
      hotM2: weekRowsData.reduce((s, d) => s + d.hotM2, 0),
      amount, cumMoney,
      weekValue: weekRowsData.reduce((s, d) => s + d.weekValue, 0),
      rate: amount ? cumMoney / amount : null,
      theory: amount ? weekRowsData.reduce((s, d) => s + (d.theory || 0) * (d.p.amount || 0), 0) / amount : null,
    };
  }, [weekRowsData]);

  /* 导出本周周报 CSV（27 列 + 合计行） */
  const exportWeek = () => {
    if (!slot) return;
    const data = weekRowsData.map(d => [
      d.p.region, d.p.dept, d.p.roadSection || d.p.name, d.p.amount,
      d.wd.days, d.wd.crews, d.wd.qty, d.wd.tons, effPerCrew(d.wd) ?? '—',
      d.wo.days, d.wo.crews, d.wo.qty, d.wo.tons, effPerCrew(d.wo) ?? '—', r2(d.weekValue),
      d.ad.qty, d.ao.qty, d.au.qty, d.hotM2, r2(d.cumMoney),
      issues[`${d.p.id}__${slot.key}`] || '',
      pct(d.rate), pct(d.theory), statusOf(d.rate, d.theory).text,
      d.p.startDate || '—', d.p.endDate || '—',
      effPerCrew(d.ad) ?? '—', effPerCrew(d.ao) ?? '—',
    ]);
    const t = totals;
    const totalRow = t ? [
      '合计', '—', '—', t.amount,
      t.wd.days, t.wd.crews, t.wd.qty, t.wd.tons, t.wd.crews > 0 ? r2(t.wd.tons / t.wd.crews) : '—',
      t.wo.days, t.wo.crews, t.wo.qty, t.wo.tons, t.wo.crews > 0 ? r2(t.wo.tons / t.wo.crews) : '—', r2(t.weekValue),
      t.ad.qty, t.ao.qty, t.au.qty, t.hotM2, r2(t.cumMoney),
      '—', pct(t.rate), pct(t.theory), '—', '—', '—',
      t.ad.crews > 0 ? r2(t.ad.tons / t.ad.crews) : '—', t.ao.crews > 0 ? r2(t.ao.tons / t.ao.crews) : '—',
    ] : [];
    downloadCsv(`路面专项周报_${slot.key}.csv`, [WEEK_HEADER, ...data, ...(t ? [totalRow] : [])]);
    toast(`已导出 ${data.length} 条周报数据`, 'success');
  };

  /* 导出下周计划 CSV（当前筛选范围内的项目，表头与导入模板一致） */
  const exportPlans = () => {
    if (!nextSlot) return;
    const data = rows.map(p => {
      const pl = planOf(plans, p.id, nextSlot.key);
      return [
        p.region, p.dept, p.roadSection || p.name,
        pl.disease.days, pl.disease.crews, pl.disease.tons,
        pl.overlay.days, pl.overlay.crews, pl.overlay.tons,
        pl.ultraThin.days, pl.ultraThin.crews, pl.ultraThin.qty, pl.ultraThin.tons,
        pl.hotRecycle.days, pl.hotRecycle.crews, pl.hotRecycle.qty, pl.hotRecycle.tons,
        pl.value,
      ];
    });
    downloadCsv(`下周计划_${nextSlot.key}.csv`, [PLAN_HEADER, ...data]);
    toast(`已导出 ${data.length} 条下周计划`, 'success');
  };

  /* 导入下周计划 CSV：按第 3 列「路段」匹配项目后写入下周计划 */
  const importPlans = (file: File) => {
    if (!nextSlot) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rowsCsv = parseCsv(String(reader.result || ''));
      if (rowsCsv.length < 2) { toast('文件为空或格式不正确', 'error'); return; }
      if ((rowsCsv[0][0] || '').trim() !== '区域') {
        toast('表头不匹配，请使用「导出」的文件作为模板填写后导入', 'error'); return;
      }
      const num = (cells: string[], i: number) => Math.max(0, Number(cells[i]) || 0);
      const next = { ...plans };
      let ok = 0;
      const unmatched: string[] = [];
      rowsCsv.slice(1).forEach(cells => {
        const road = (cells[2] || '').trim();
        if (!road) return;
        const p = projects.find(x => x.roadSection === road || x.name === road);
        if (!p) { unmatched.push(road); return; }
        next[`${p.id}__${nextSlot.key}`] = {
          disease: { days: num(cells, 3), crews: num(cells, 4), qty: 0, tons: num(cells, 5) },
          overlay: { days: num(cells, 6), crews: num(cells, 7), qty: 0, tons: num(cells, 8) },
          ultraThin: { days: num(cells, 9), crews: num(cells, 10), qty: num(cells, 11), tons: num(cells, 12) },
          hotRecycle: { days: num(cells, 13), crews: num(cells, 14), qty: num(cells, 15), tons: num(cells, 16) },
          value: num(cells, 17),
        };
        ok++;
      });
      if (ok === 0) { toast('未匹配到任何项目（按「路段」列匹配）', 'error'); return; }
      setPlans(next);
      savePlans(next);
      toast(`导入成功 ${ok} 条${unmatched.length ? `，${unmatched.length} 条未匹配到项目` : ''}`, 'success');
    };
    reader.readAsText(file);
  };

  const issueCls = 'w-44 px-2 py-1 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white';
  /* 计划编辑输入框（灰色小号，仅在「下一周」Tab 使用） */
  const planInputCls = 'w-14 px-1 py-0.5 rounded border border-slate-300 text-xs text-slate-600 text-right font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white';

  return (
    <div>
      {/* 页头 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">路面专项周报</h1>
      </div>

      {/* 月份 + 区域/项目部筛选 */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
        <Select value={String(month)} onChange={v => setMonth(Number(v))}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` }))}
          className="!w-28" />
        <Select value={regionSel} onChange={v => { setRegionSel(v); setDeptSel(''); }}
          options={regions.map(r => ({ value: r, label: r }))} placeholder="全部区域" className="!w-36" />
        <Select value={deptSel} onChange={setDeptSel}
          options={depts.map(d => ({ value: d, label: d }))} placeholder="全部项目部" className="!w-36" />
        {(regionSel || deptSel) && (
          <button onClick={() => { setRegionSel(''); setDeptSel(''); }}
            className="text-xs text-slate-500 hover:text-orange-600 underline">重置</button>
        )}
      </div>

      {/* 该月份下的周 Tab（当前所在周后附「下一周」计划 Tab） */}
      {monthWeeks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {monthWeeks.map(w => (
            <button key={w.key} onClick={() => { setWeekKey(w.key); setShowNext(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                !showNext && slot && w.key === slot.key ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-orange-50'}`}>
              {w.label}{curWeek && w.key === curWeek.key ? ' 本周' : ''}
            </button>
          ))}
          {nextSlot && (
            <button onClick={() => setShowNext(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showNext ? 'bg-orange-500 text-white'
                : missingNext.length > 0
                  ? 'bg-rose-50 border-2 border-rose-400 text-rose-600 font-semibold animate-pulse'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-orange-50'}`}>
              {nextSlot.label} 下一周{!showNext && missingNext.length > 0 ? '（计划未填）' : ''}
            </button>
          )}
        </div>
      ) : (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-sm mb-4">
          {month}月暂无已开始的周（周报不展示超过当前所在周的内容）
        </div>
      )}

      {/* 下周计划缺填提示 */}
      {!showNext && nextSlot && missingNext.length > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-300 text-sm text-rose-700 flex items-center gap-2">
          <span className="font-semibold">⚠ 下周计划未填</span>
          <span>（{nextSlot.label}）：{missingNext.slice(0, 3).map(p => p.shortName || p.name).join('、')}{missingNext.length > 3 ? ` 等 ${missingNext.length} 个项目` : ''}，点击「{nextSlot.label} 下一周」Tab 填写计划量</span>
        </div>
      )}
      {showNext && nextSlot && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sm text-sky-700">
          当前为 <b>{nextSlot.label}（下一周）</b>计划填报：按 病害 / 罩面 / 超薄 / 就地热再生 / 产值 填写计划量，填完后「下一周」Tab 恢复正常颜色。
        </div>
      )}

      {/* 下周计划填报表（按预警规则梳理表样式：病害/罩面/超薄/就地热再生/产值） */}
      {showNext && nextSlot && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm font-semibold text-slate-800">下周计划（{nextSlot.label}）</div>
            <div className="flex items-center gap-2">
              <button onClick={exportPlans}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:bg-orange-50 hover:border-orange-300 transition">导出</button>
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition">导入</button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importPlans(f); e.target.value = ''; }} />
            </div>
          </div>
          <table className={`${M.table} w-max min-w-full`}>
            <PlanTableHeader />
            <tbody>
              {rows.map(p => {
                const pl = planOf(plans, p.id, nextSlot.key);
                /** 某工种计划输入框（病害/罩面 3 列，超薄/热再生 4 列） */
                const workInputs = (work: 'disease' | 'overlay' | 'ultraThin' | 'hotRecycle') =>
                  workFields[work].map(field => (
                    <td key={`${work}-${field}`} className={M.td}>
                      <input type="number" min={0} step="0.01" value={pl[work][field] || ''}
                        placeholder="—" onChange={e => setPlanVal(p.id, nextSlot.key, work, field, e.target.value)}
                        className={planInputCls} />
                    </td>
                  ));
                const filled = planAnyFilled(pl);
                return (
                  <tr key={p.id} className={`transition ${filled ? 'hover:bg-orange-50/40' : 'bg-rose-50/40'}`}>
                    <td className={M.td}>{p.region}</td>
                    <td className={M.td}>{p.dept}</td>
                    <td className={`${M.td} whitespace-nowrap`}>{p.roadSection || p.name}</td>
                    {workInputs('disease')}
                    {workInputs('overlay')}
                    {workInputs('ultraThin')}
                    {workInputs('hotRecycle')}
                    <td className={M.td}>
                      <input type="number" min={0} step="0.01" value={pl.value || ''}
                        placeholder="—" onChange={e => setPlanValue(p.id, nextSlot.key, e.target.value)}
                        className={planInputCls} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={18} className="px-4 py-10 text-center text-slate-400 text-sm">当前筛选条件下无路面专项项目</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-slate-400">未填计划的项目行以浅红底标识；超薄工程量单位 km，热再生 m²；导入按「路段」列匹配项目，建议先「导出」作模板填写。</div>
        </div>
      )}

      {/* 周报表 */}
      {slot && !showNext && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm font-semibold text-slate-800">周报（{slot.label}）</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPlanOpen(o => !o)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:bg-orange-50 hover:border-orange-300 transition">{planOpen ? '收起本周计划' : '查看本周计划'}</button>
              <button onClick={exportWeek}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition">导出</button>
            </div>
          </div>

          {/* 本周计划（只读查看，数据来自上周「下一周」Tab 的填报） */}
          {planOpen && (
            <div className="mb-4 p-3 rounded-lg bg-sky-50/60 border border-sky-200 overflow-x-auto">
              <div className="text-xs font-semibold text-sky-800 mb-2">本周计划（{slot.label}）</div>
              <table className={`${M.table} w-max min-w-full`}>
                <PlanTableHeader />
                <tbody>
                  {rows.map(p => {
                    const pl = planOf(plans, p.id, slot.key);
                    const plCell = (v: number) => (
                      <td className={`${M.td} text-right font-mono`}>{v ? r2(v) : '—'}</td>);
                    return (
                      <tr key={p.id} className="hover:bg-sky-100/40 transition">
                        <td className={M.td}>{p.region}</td>
                        <td className={M.td}>{p.dept}</td>
                        <td className={`${M.td} whitespace-nowrap`}>{p.roadSection || p.name}</td>
                        {plCell(pl.disease.days)}{plCell(pl.disease.crews)}{plCell(pl.disease.tons)}
                        {plCell(pl.overlay.days)}{plCell(pl.overlay.crews)}{plCell(pl.overlay.tons)}
                        {plCell(pl.ultraThin.days)}{plCell(pl.ultraThin.crews)}{plCell(pl.ultraThin.qty)}{plCell(pl.ultraThin.tons)}
                        {plCell(pl.hotRecycle.days)}{plCell(pl.hotRecycle.crews)}{plCell(pl.hotRecycle.qty)}{plCell(pl.hotRecycle.tons)}
                        {plCell(pl.value)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <table className={`${M.table} w-max min-w-full`}>
            <thead>
              <tr>
                <th rowSpan={3} className={M.th}>区域</th>
                <th rowSpan={3} className={M.th}>中心/项目部</th>
                <th rowSpan={3} className={M.th}>路段</th>
                <th className={M.th}>总工程</th>
                <th colSpan={11} className={M.th}>本周完成</th>
                <th colSpan={5} className={M.th}>累计完成工程量</th>
                <th rowSpan={3} className={M.th}>存在问题（含工效偏高或偏低的原因）</th>
                <th rowSpan={3} className={M.th}>累计完成百分率</th>
                <th rowSpan={3} className={M.th}>理论完成百分比（工期）</th>
                <th rowSpan={3} className={M.th}>状态标识</th>
                <th rowSpan={3} className={M.th}>预计开工日期</th>
                <th rowSpan={3} className={M.th}>预计结束日期</th>
                <th colSpan={2} className={M.th}>累计平均工效（吨/班组）</th>
              </tr>
              <tr>
                <th rowSpan={2} className={M.th}>总金额（万元）</th>
                <th colSpan={5} className={M.th}>病害</th>
                <th colSpan={5} className={M.th}>罩面</th>
                <th className={`${M.th} !bg-amber-100 !text-amber-900`}>本周产值</th>
                <th rowSpan={2} className={M.th}>病害（m²）</th>
                <th rowSpan={2} className={M.th}>罩面（km）</th>
                <th rowSpan={2} className={M.th}>超薄（km）</th>
                <th rowSpan={2} className={M.th}>热再生（m²）</th>
                <th rowSpan={2} className={M.th}>总金额（万元）</th>
                <th rowSpan={2} className={M.th}>病害</th>
                <th rowSpan={2} className={M.th}>罩面</th>
              </tr>
              {/* 本周完成 · 病害/罩面 叶子列（10 列）+ 本周产值（万元） */}
              <tr>
                {(['m²', 'km'] as const).flatMap(unit =>
                  ['施工天数', '投入班组数', unit, '吨', '工效（吨/班组）'].map((t, i) => (
                    <th key={`${unit}-${i}`} className={M.th}>{t}</th>
                  )))}
                <th className={`${M.th} !bg-amber-100 !text-amber-900`}>万元</th>
              </tr>
            </thead>
            <tbody>
              {weekRowsData.map(d => {
                const { p, wd, wo, ad, ao, au, hotM2, cumMoney, rate, theory, pl, weekValue } = d;
                const st = statusOf(rate, theory);
                const issueKey = `${p.id}__${slot.key}`;

                /* 计划工效（吨/班组）= 计划吨 ÷ 计划投入班组数 */
                const plEff = (work: 'disease' | 'overlay') =>
                  pl[work].crews > 0 ? pl[work].tons / pl[work].crews : null;
                /** 实际值 + 计划小字（实际 < 计划时标红） */
                const cell = (actual: number, work: 'disease' | 'overlay', field: 'days' | 'crews' | 'tons') => {
                  const planV = pl[work][field];
                  const lower = planV > 0 && actual < planV;
                  return (
                    <td className={`${M.td} text-right font-mono`}>
                      <div className={lower ? 'text-rose-600 font-semibold' : ''}>{nz(actual)}</div>
                      <div className={`text-[11px] leading-tight ${lower ? 'text-rose-500 font-medium' : 'text-slate-400'}`} title="本周计划">计划{planV ? r2(planV) : '—'}</div>
                    </td>
                  );
                };
                /** 工效格：实际工效 + 计划工效小字（实际 < 计划时标红） */
                const effCell = (a: Agg, work: 'disease' | 'overlay') => {
                  const actual = effPerCrew(a);
                  const planV = plEff(work);
                  const lower = planV !== null && actual !== null && actual < planV;
                  return (
                    <td className={`${M.td} text-right font-mono`}>
                      <div className={lower ? 'text-rose-600 font-semibold' : ''}>{actual === null ? '—' : r2(actual)}</div>
                      <div className={`text-[11px] leading-tight ${lower ? 'text-rose-500 font-medium' : 'text-slate-400'}`} title="本周计划工效（吨/班组）">计划{planV === null ? '—' : r2(planV)}</div>
                    </td>
                  );
                };

                return (
                  <tr key={p.id} className="hover:bg-orange-50/40 transition">
                    <td className={M.td}>{p.region}</td>
                    <td className={M.td}>{p.dept}</td>
                    <td className={`${M.td} whitespace-nowrap`}>{p.roadSection || p.name}</td>
                    <td className={`${M.td} text-right font-mono`}>{(p.amount || 0).toLocaleString()}</td>

                    {/* 本周完成 · 病害（工程量列不显示计划值） */}
                    {cell(wd.days, 'disease', 'days')}
                    {cell(wd.crews, 'disease', 'crews')}
                    <td className={`${M.td} text-right font-mono`}>{nz(wd.qty)}</td>
                    {cell(wd.tons, 'disease', 'tons')}
                    {effCell(wd, 'disease')}
                    {/* 本周完成 · 罩面 */}
                    {cell(wo.days, 'overlay', 'days')}
                    {cell(wo.crews, 'overlay', 'crews')}
                    <td className={`${M.td} text-right font-mono`}>{nz(wo.qty)}</td>
                    {cell(wo.tons, 'overlay', 'tons')}
                    {effCell(wo, 'overlay')}
                    {/* 本周完成 · 本周产值（万元，该周每日填报产值合计） */}
                    <td className={`${M.td} text-right font-mono`}>{nz(weekValue)}</td>

                    {/* 累计完成工程量 */}
                    <td className={`${M.td} text-right font-mono`}>{nz(ad.qty)}</td>
                    <td className={`${M.td} text-right font-mono`}>{nz(ao.qty)}</td>
                    <td className={`${M.td} text-right font-mono`}>{nz(au.qty)}</td>
                    <td className={`${M.td} text-right font-mono`}>{nz(hotM2)}</td>
                    <td className={`${M.td} text-right font-mono font-bold`}>{r2(cumMoney).toLocaleString()}</td>

                    {/* 存在问题（项目部手填） */}
                    <td className={M.td}>
                      <input value={issues[issueKey] || ''} onChange={e => setIssue(p.id, slot.key, e.target.value)}
                        placeholder="手填" className={issueCls} />
                    </td>

                    <td className={`${M.td} text-right font-mono`}>{pct(rate)}</td>
                    <td className={`${M.td} text-right font-mono`}>{pct(theory)}</td>
                    <td className={M.td}>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.cls}`}>
                        <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                        {st.text}
                      </span>
                    </td>
                    <td className={`${M.td} whitespace-nowrap font-mono text-xs`}>{p.startDate || '—'}</td>
                    <td className={`${M.td} whitespace-nowrap font-mono text-xs`}>{p.endDate || '—'}</td>

                    {/* 累计平均工效（吨/班组） */}
                    <td className={`${M.td} text-right font-mono`}>{effPerCrew(ad) === null ? '—' : r2(effPerCrew(ad)!)}</td>
                    <td className={`${M.td} text-right font-mono`}>{effPerCrew(ao) === null ? '—' : r2(effPerCrew(ao)!)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={28} className="px-4 py-10 text-center text-slate-400 text-sm">当前筛选条件下无路面专项项目</td></tr>
              )}
            </tbody>
            {/* 合计行（冻结在表格最底部；工效按 Σ吨 ÷ Σ班组数 计算） */}
            {totals && rows.length > 0 && (
              <tfoot>
                <tr className="sticky bottom-0 bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td className={M.td}>合计</td>
                  <td className={M.td}>—</td>
                  <td className={M.td}>—</td>
                  <td className={`${M.td} text-right font-mono`}>{totals.amount.toLocaleString()}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wd.days)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wd.crews)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wd.qty)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wd.tons)}</td>
                  <td className={`${M.td} text-right font-mono`}>{totals.wd.crews > 0 ? r2(totals.wd.tons / totals.wd.crews) : '—'}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wo.days)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wo.crews)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wo.qty)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.wo.tons)}</td>
                  <td className={`${M.td} text-right font-mono`}>{totals.wo.crews > 0 ? r2(totals.wo.tons / totals.wo.crews) : '—'}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.weekValue)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.ad.qty)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.ao.qty)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.au.qty)}</td>
                  <td className={`${M.td} text-right font-mono`}>{nz(totals.hotM2)}</td>
                  <td className={`${M.td} text-right font-mono`}>{r2(totals.cumMoney).toLocaleString()}</td>
                  <td className={M.td}>—</td>
                  <td className={`${M.td} text-right font-mono`}>{pct(totals.rate)}</td>
                  <td className={`${M.td} text-right font-mono`}>{pct(totals.theory)}</td>
                  <td className={M.td}>—</td>
                  <td className={M.td}>—</td>
                  <td className={M.td}>—</td>
                  <td className={`${M.td} text-right font-mono`}>{totals.ad.crews > 0 ? r2(totals.ad.tons / totals.ad.crews) : '—'}</td>
                  <td className={`${M.td} text-right font-mono`}>{totals.ao.crews > 0 ? r2(totals.ao.tons / totals.ao.crews) : '—'}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <div className="mt-2 text-xs text-slate-400">本周完成各列下方灰字为上周填报的本周计划值，实际值低于计划值时标红；合计行冻结在表格最底部（工效按 Σ吨÷Σ班组数 计算）。</div>
        </div>
      )}
    </div>
  );
}
