/**
 * 百日攻坚 - 数据看板（清新浅色主题 · 双 Tab）
 *
 * Tab 1「作战总览」：核心指标 → 今日战报 → 多维对比（3 图）→ 区域作战看板 → 预警清单
 * Tab 2「综合分析」：顶部条件过滤（区域 / 项目部 / 路段项目关键字 / 进度预警 / 能否按期 + 重置）
 *   → KPI 指标卡（10 项）→ 进度预警分布（环形图）→ 区域 开累完成率 vs 工期完成率（加权）
 *   → 项目部 工期进度偏差率 → 区域 本周日均工效双指标对比
 *
 * 指标口径：
 *   实际完成率 =（基准日已完成产值 + 日报累计产值）÷ 项目总金额
 *   开累计划完成率 =（基准日已完成产值 + 截至当周周计划累计）÷ 项目总金额
 *   工期完成率 = 已过工期日历天数 ÷ 总工期天数；工期进度偏差 = 实际完成率 − 工期完成率
 *   进度预警：已完成（完成率≥100%）/ 红色-严重滞后（偏差<-20%）/ 黄色-滞后（偏差<0）/ 绿色-正常（偏差≥0）
 *   能否按期：按开工以来日均产值 × 剩余工期推算可完成剩余产值 → 按期，否则滞后
 *   本周工效 = 本周（周五~周四）Σ吨数 ÷ Σ施工天数，阈值：病害≥300 / 罩面≥800（吨/工日）
 *   班组缺口 = 剩余工作日 ÷ 剩余日历工期 − 1（倒排按单班组口径），缺口工日 = 剩余工作日 − 剩余工期
 */

import React, { useMemo, useState } from 'react';
import {
  getProjects, getDailyReports, cumValueOf, planOf,
  buildWeeks, baseDateOf, getExtraWeeks, todayStr,
} from './campaignStore';
import type { CampaignProject } from './types';
import { WORK_TYPE_LABELS } from './types';

const DAY = 86400000;
const parseD = (s: string) => new Date(`${s}T00:00:00`);
const p2 = (n: number) => String(n).padStart(2, '0');
const ymdOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (r: number | null) => r === null ? '—' : `${(r * 100).toFixed(1)}%`;
const devPct = (d: number | null) =>
  d === null ? '—' : `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;
const fmt = (n: number) => (r2(n)).toLocaleString();

/** 项目级统计（含工期维度与预警分类） */
type Warn = 'red' | 'yellow' | 'green' | 'done';

interface ProjStat {
  p: CampaignProject;
  amount: number;         // 总金额
  actualCum: number;       // 实际累计（基准日已完成 + 日报累计）
  rate: number | null;    // 实际完成率
  planRate: number | null; // 开累计划完成率
  dev: number | null;      // 偏差（实际-计划）
  remainValue: number;     // 剩余产值
  remainDays: number;      // 剩余日历工期（天）
  remainWorkDays: number; // 剩余工作日需求（病害+罩面）
  needCrews: number;      // 需求班组数
  crewGap: number;        // 班组缺口（需求-1，正值=缺口）
  gapWorkDays: number;    // 缺口工日（剩余工作日-剩余工期，正值=缺口）
  totalDays: number | null; // 总工期天数
  elapsedDays: number;    // 已过工期天数
  schedRate: number | null; // 工期完成率（已过天数/总天数）
  schedDev: number | null; // 工期进度偏差（实际完成率-工期完成率）
  warn: Warn;              // 进度预警分类
  onTime: boolean;         // 能否按期（按当前进度推算）
}

/** 预警分类色（静态类名，避免 Tailwind 动态类名失效） */
const WARN_DOT: Record<Warn, string> = {
  red: 'bg-rose-500', yellow: 'bg-amber-400', green: 'bg-emerald-500', done: 'bg-sky-500',
};
const WARN_LABEL: Record<Warn, string> = {
  red: '红色 · 严重滞后', yellow: '黄色 · 滞后', green: '绿色 · 正常', done: '已完成',
};

/** 偏差文字色（综合分析用） */
const devTxt = (d: number | null) =>
  d === null ? 'text-slate-400' : d >= 0 ? 'text-emerald-600' : d < -0.2 ? 'text-rose-600' : 'text-amber-600';
/** 偏差条色（项目部偏差图用） */
const devBar = (d: number | null) =>
  d === null ? 'bg-slate-300' : d >= 0 ? 'bg-emerald-500' : d < -0.2 ? 'bg-rose-500' : 'bg-amber-400';

export default function CampaignDashboard() {
  const today = todayStr();
  const [tab, setTab] = useState<'overview' | 'analysis'>(() =>
    (typeof window !== 'undefined' && window.location.hash === '#analysis') ? 'analysis' : 'overview');

  /* ==================== 项目统计（全量） ==================== */
  const { projStats, curWeek } = useMemo(() => {
    const projects = getProjects();

    /* 周序列（与月度倒排一致） */
    const base = baseDateOf();
    const latestEnd = projects.reduce((m, p) => (p.endDate && p.endDate > m ? p.endDate : m), '');
    const autoUntil = ymdOf(new Date(Math.max(
      parseD(latestEnd || `${base}T00:00:00`).getTime() + 100 * DAY,
      Date.now() + 28 * DAY,
    )));
    const until = ymdOf(new Date(parseD(autoUntil).getTime() + getExtraWeeks() * 7 * DAY));
    const allWeeks = buildWeeks(base, until);
    const cw = allWeeks.find(w => w.start <= today && today <= w.end);
    const curIdx = cw ? allWeeks.findIndex(w => w.key === cw.key) : -1;

    const stats: ProjStat[] = projects.map(p => {
      const amount = p.amount || 0;
      const actualCum = (p.baseDoneValue || 0) + cumValueOf(p.id, today);
      const rate = amount > 0 ? actualCum / amount : null;
      const planCum = (p.baseDoneValue || 0)
        + (curIdx >= 0
          ? allWeeks.slice(0, curIdx + 1).reduce((s, w) => s + planOf(p, w.key), 0)
          : 0);
      const planRate = amount > 0 ? planCum / amount : null;
      const dev = (rate !== null && planRate !== null) ? rate - planRate : null;
      const remainDays = p.endDate
        ? Math.floor((parseD(p.endDate).getTime() - parseD(today).getTime()) / DAY) : 0;
      const remainWorkDays = (p.diseaseRemainDays || 0) + (p.overlayRemainDays || 0);
      const needCrews = (remainDays > 0 && remainWorkDays > 0) ? remainWorkDays / remainDays : 0;
      /* 工期维度 */
      const totalDays = p.startDate && p.endDate
        ? Math.floor((parseD(p.endDate).getTime() - parseD(p.startDate).getTime()) / DAY) : null;
      const elapsedDays = p.startDate
        ? Math.min(
            Math.max(0, Math.floor((parseD(today).getTime() - parseD(p.startDate).getTime()) / DAY)),
            totalDays ?? 0,
          )
        : 0;
      const schedRate = totalDays && totalDays > 0 ? elapsedDays / totalDays : null;
      const schedDev = (rate !== null && schedRate !== null) ? rate - schedRate : null;
      const warn: Warn = (rate !== null && rate >= 0.999)
        ? 'done'
        : schedDev === null ? 'green'
        : schedDev < -0.2 ? 'red'
        : schedDev < 0 ? 'yellow' : 'green';
      const remainValue = amount - actualCum;
      /* 按期能力：开工以来日均产值 × 剩余工期 能否覆盖剩余产值 */
      const pace = (actualCum - (p.baseDoneValue || 0)) / Math.max(elapsedDays, 1);
      const onTime = remainValue <= 0 || pace * Math.max(remainDays, 0) >= remainValue;
      return {
        p, amount, actualCum, rate, planRate, dev,
        remainValue, remainDays, remainWorkDays, needCrews,
        crewGap: Math.max(0, needCrews - 1),
        gapWorkDays: Math.max(0, remainWorkDays - remainDays),
        totalDays, elapsedDays, schedRate, schedDev, warn, onTime,
      };
    });
    return { projStats: stats, curWeek: cw };
  }, [today]);

  /* ==================== 作战总览：核心指标 ==================== */
  const core = useMemo(() => {
    const totalAmount = projStats.reduce((s, x) => s + x.amount, 0);
    const actualCum = projStats.reduce((s, x) => s + x.actualCum, 0);
    const planCum = projStats.reduce((s, x) => s + (x.planRate ?? 0) * x.amount, 0);
    const totalRate = totalAmount > 0 ? actualCum / totalAmount : null;
    const totalPlanRate = totalAmount > 0 ? planCum / totalAmount : null;
    const lagProjects = projStats.filter(x => x.dev !== null && x.dev < 0);
    const gapProjects = projStats.filter(x => x.crewGap > 0);
    const gapRegions = [...new Set(gapProjects.map(x => x.p.region))].length;
    return {
      totalAmount, projectCount: projStats.length,
      actualCum, totalRate,
      remainValue: totalAmount - actualCum,
      remainPct: totalAmount > 0 ? 1 - (totalRate ?? 0) : null,
      totalPlanRate, dev: (totalRate !== null && totalPlanRate !== null) ? totalRate - totalPlanRate : null,
      lagCount: lagProjects.length,
      gapRegions,
      gapWorkDays: projStats.reduce((s, x) => s + x.gapWorkDays, 0),
    };
  }, [projStats]);

  /* ==================== 作战总览：今日战报 ==================== */
  const daily = useMemo(() => {
    const reports = getDailyReports();
    const todayList = reports.filter(r => r.date === today);
    const weekList = curWeek
      ? reports.filter(r => r.date >= curWeek.start && r.date <= curWeek.end && r.date <= today)
      : [];
    const sumValue = (list: typeof reports) =>
      list.reduce((s, r) => s + r.lines.reduce((x, l) => x + (l.dayValue || 0), 0), 0);
    const todayTons = todayList.reduce((s, r) => s + r.lines.reduce((x, l) =>
      x + (l.disease.tons || 0) + (l.overlay.tons || 0) + (l.ultraThin.tons || 0), 0), 0);
    const todayCrews = todayList.reduce((s, r) => s + r.lines.reduce((x, l) =>
      x + (l.disease.crews || 0) + (l.overlay.crews || 0) + (l.ultraThin.crews || 0), 0), 0);
    return {
      todayValue: r2(sumValue(todayList)),
      weekValue: r2(sumValue(weekList)),
      todayTons: r2(todayTons),
      todayCrews,
      hasToday: todayList.length > 0,
      todayReportCount: todayList.length,
    };
  }, [today, curWeek]);

  /* ==================== 作战总览：区域聚合 ==================== */
  const regionStats = useMemo(() => {
    const regions = [...new Set(projStats.map(x => x.p.region).filter(Boolean))];
    return regions.map(rg => {
      const list = projStats.filter(x => x.p.region === rg);
      const amount = list.reduce((s, x) => s + x.amount, 0);
      const actualCum = list.reduce((s, x) => s + x.actualCum, 0);
      const rate = amount > 0 ? actualCum / amount : null;
      const planRate = amount > 0
        ? list.reduce((s, x) => s + (x.planRate ?? 0) * x.amount, 0) / amount : null;
      const remainDays = Math.min(...list.map(x => x.remainDays > 0 ? x.remainDays : Infinity));
      const crewGap = list.reduce((s, x) => s + x.crewGap, 0);
      return {
        region: rg, projectCount: list.length,
        amount, actualCum, rate, planRate,
        dev: (rate !== null && planRate !== null) ? rate - planRate : null,
        remainValue: list.reduce((s, x) => s + x.remainValue, 0),
        remainDays: Number.isFinite(remainDays) ? remainDays : 0,
        crewGap, hasGap: crewGap > 0,
      };
    }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [projStats]);

  /* ==================== 作战总览：预警清单 ==================== */
  const alerts = useMemo(() =>
    projStats.filter(x => (x.dev !== null && x.dev < 0) || x.crewGap > 0)
      .sort((a, b) => (a.dev ?? 0) - (b.dev ?? 0)),
    [projStats]);

  const devCls = (d: number | null) =>
    d === null ? 'text-slate-400' : d >= 0 ? 'text-emerald-600' : 'text-rose-600';

  /* ==================== 综合分析：条件过滤 ==================== */
  const [regionSel, setRegionSel] = useState('');
  const [deptSel, setDeptSel] = useState('');
  const [kw, setKw] = useState('');
  const [warnSel, setWarnSel] = useState('');
  const [onTimeSel, setOnTimeSel] = useState('');

  const regionOpts = useMemo(
    () => [...new Set(projStats.map(x => x.p.region).filter(Boolean))].sort(),
    [projStats]);
  const deptOpts = useMemo(
    () => [...new Set(
      projStats.filter(x => !regionSel || x.p.region === regionSel)
        .map(x => x.p.dept).filter(Boolean))].sort(),
    [projStats, regionSel]);

  /* ==================== 综合分析：聚合 ==================== */
  const view = useMemo(() => {
    const list = projStats.filter(x =>
      (!regionSel || x.p.region === regionSel)
      && (!deptSel || x.p.dept === deptSel)
      && (!kw || [x.p.name, x.p.shortName, x.p.roadSection, x.p.contractName]
        .some(s => s && s.toLowerCase().includes(kw.toLowerCase())))
      && (!warnSel || x.warn === warnSel)
      && (!onTimeSel || (onTimeSel === 'yes') === x.onTime));

    const totalAmount = list.reduce((s, x) => s + x.amount, 0);
    const actualCum = list.reduce((s, x) => s + x.actualCum, 0);
    const remainValue = list.reduce((s, x) => s + x.remainValue, 0);
    const rateW = totalAmount > 0 ? actualCum / totalAmount : null;
    const planW = totalAmount > 0
      ? list.reduce((s, x) => s + (x.planRate ?? 0) * x.amount, 0) / totalAmount : null;
    const schedAmt = list.filter(x => x.schedRate !== null).reduce((s, x) => s + x.amount, 0);
    const schedW = schedAmt > 0
      ? list.reduce((s, x) => s + (x.schedRate ?? 0) * x.amount, 0) / schedAmt : null;
    const schedDevW = (rateW !== null && schedW !== null) ? rateW - schedW : null;
    const planDevW = (rateW !== null && planW !== null) ? rateW - planW : null;

    const warnCount = { red: 0, yellow: 0, green: 0, done: 0 } as Record<Warn, number>;
    list.forEach(x => { warnCount[x.warn] += 1; });
    const onTimeCount = list.filter(x => x.onTime).length;

    /* 本周工效（周报范围内 Σ吨 ÷ Σ施工天数） */
    const weekIds = new Set(list.map(x => x.p.id));
    const inWeek = curWeek ? [curWeek.start, curWeek.end] : null;
    const effByRegion = new Map<string, { dT: number; dD: number; oT: number; oD: number }>();
    let dT = 0, dD = 0, oT = 0, oD = 0;
    if (inWeek) {
      getDailyReports().forEach(r => {
        if (r.date < inWeek[0] || r.date > inWeek[1] || r.date > today) return;
        r.lines.forEach(l => {
          if (!weekIds.has(l.projectId)) return;
          const prj = projStats.find(x => x.p.id === l.projectId)?.p;
          if (!prj) return;
          const rg = prj.region || '未分配';
          const cell = effByRegion.get(rg) ?? { dT: 0, dD: 0, oT: 0, oD: 0 };
          cell.dT += l.disease.tons || 0; cell.dD += l.disease.days || 0;
          cell.oT += l.overlay.tons || 0; cell.oD += l.overlay.days || 0;
          effByRegion.set(rg, cell);
          dT += l.disease.tons || 0; dD += l.disease.days || 0;
          oT += l.overlay.tons || 0; oD += l.overlay.days || 0;
        });
      });
    }
    const effDisease = dD > 0 ? dT / dD : null;
    const effOverlay = oD > 0 ? oT / oD : null;

    /* 区域行（金额加权 实际率 vs 工期率） */
    const weighted = (g: ProjStat[]) => {
      const amount = g.reduce((s, x) => s + x.amount, 0);
      const rate = amount > 0 ? g.reduce((s, x) => s + x.actualCum, 0) / amount : null;
      const sAmt = g.filter(x => x.schedRate !== null).reduce((s, x) => s + x.amount, 0);
      const sched = sAmt > 0
        ? g.reduce((s, x) => s + (x.schedRate ?? 0) * x.amount, 0) / sAmt : null;
      const dev = (rate !== null && sched !== null) ? rate - sched : null;
      return { amount, rate, sched, dev };
    };
    const regionRows = [...new Set(list.map(x => x.p.region).filter(Boolean))]
      .map(rg => ({ region: rg, ...weighted(list.filter(x => x.p.region === rg)) }))
      .sort((a, b) => (a.dev ?? 0) - (b.dev ?? 0));
    const deptRows = [...new Set(list.map(x => x.p.dept).filter(Boolean))]
      .map(dp => ({ dept: dp, ...weighted(list.filter(x => x.p.dept === dp)) }))
      .sort((a, b) => (a.dev ?? 0) - (b.dev ?? 0));

    /* 区域工效行 */
    const effRows = [...new Set(list.map(x => x.p.region).filter(Boolean))]
      .map(rg => {
        const c = effByRegion.get(rg);
        return {
          region: rg,
          dEff: c && c.dD > 0 ? c.dT / c.dD : null,
          oEff: c && c.oD > 0 ? c.oT / c.oD : null,
        };
      });

    return {
      list, totalAmount, actualCum, remainValue, rateW, planW, schedW, schedDevW, planDevW,
      warnCount, onTimeCount, effDisease, effOverlay, regionRows, deptRows, effRows,
    };
  }, [projStats, regionSel, deptSel, kw, warnSel, onTimeSel, curWeek, today]);

  const resetFilters = () => {
    setRegionSel(''); setDeptSel(''); setKw(''); setWarnSel(''); setOnTimeSel('');
  };

  const selCls = 'h-9 w-full px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:border-cyan-300';
  const inputCls = 'h-9 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:border-cyan-300';

  /* 环形图几何 */
  const R = 60, CIRC = 2 * Math.PI * R;
  const donutSegs = (['red', 'yellow', 'green', 'done'] as Warn[])
    .map(k => ({ key: k, n: view.warnCount[k] }))
    .filter(s => s.n > 0);
  let donutAcc = 0;

  return (
    <div className="rounded-2xl p-5 bg-gradient-to-b from-cyan-50 via-white to-white border border-slate-200/70 shadow-sm">
      {/* 标题 + Tab */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-gradient-to-b from-cyan-400 to-sky-500 rounded" />
            百日攻坚 · 数据看板
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            数据自动汇总自基础信息配置 / 每日产值填报 / 月度计划倒排，截至 {today}
            {curWeek && `（当周 ${curWeek.label}）`}
          </p>
        </div>
        <div className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
          全口径（路面专项 + 路基桥隧）
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {([['overview', '作战总览'], ['analysis', '综合分析']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
      <React.Fragment>
      {/* ===== 核心指标 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: '总工程量', value: `${fmt(core.totalAmount)} 万元`, sub: `${core.projectCount} 个项目`, cls: 'text-cyan-600' },
          { label: '累计实际完成', value: `${fmt(core.actualCum)} 万元`, sub: `实际完成率 ${pct(core.totalRate)}`, cls: 'text-cyan-600' },
          { label: '剩余产值', value: `${fmt(core.remainValue)} 万元`, sub: `待完成 ${pct(core.remainPct)}`, cls: 'text-slate-900' },
          { label: '开累计划完成率', value: pct(core.totalPlanRate), sub: `实际 ${pct(core.totalRate)} · 偏差 ${devPct(core.dev)}`, cls: 'text-cyan-600' },
          { label: '进度滞后项目', value: `${core.lagCount} 个`, sub: '需重点调度', cls: core.lagCount > 0 ? 'text-rose-600' : 'text-emerald-600' },
          { label: '班组缺口', value: `${core.gapRegions} 区域`, sub: `缺口工日 ${core.gapWorkDays} 个`, cls: 'text-orange-600' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1.5">{c.label}</div>
            <div className={`text-xl font-bold ${c.cls}`}>{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ===== 今日战报 ===== */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-orange-400 rounded" />今日战报
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '当日完成产值', value: `${fmt(daily.todayValue)} 万元` },
            { label: '本周完成产值', value: `${fmt(daily.weekValue)} 万元` },
            { label: '当日完成吨数', value: `${fmt(daily.todayTons)} 吨` },
            { label: '当日投入班组', value: `${daily.todayCrews} 个` },
          ].map(c => (
            <div key={c.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5">
              <div className="text-xs text-slate-500 mb-1">{c.label}</div>
              <div className="text-lg font-bold text-cyan-600">{c.value}</div>
            </div>
          ))}
        </div>
        {!daily.hasToday && (
          <div className="mt-2 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            今日暂未录入日报（{daily.todayReportCount} 张），以上当日指标为 0；录入「每日产值填报」后自动更新。
          </div>
        )}
      </div>

      {/* ===== 多维对比（3 图） ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* 各区域 实际 vs 计划 完成率 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">各区域 实际 vs 计划 完成率</div>
          <div className="flex items-end justify-around h-48">
            {regionStats.map(rg => (
              <div key={rg.region} className="flex flex-col items-center gap-1 w-12">
                <div className="flex items-end gap-1 h-40">
                  <div className="w-4 rounded-t bg-gradient-to-t from-sky-500 to-cyan-400 relative"
                    style={{ height: `${Math.max(2, (rg.rate ?? 0) * 100)}%` }}>
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-cyan-600 whitespace-nowrap">
                      {rg.rate !== null ? (rg.rate * 100).toFixed(0) : '—'}
                    </span>
                  </div>
                  <div className="w-4 rounded-t bg-gradient-to-t from-emerald-500 to-emerald-300"
                    style={{ height: `${Math.max(2, (rg.planRate ?? 0) * 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{rg.region}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />实际完成率</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />计划完成率</span>
          </div>
        </div>

        {/* 各区域 剩余产值 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">各区域 剩余产值（万元）</div>
          <div className="space-y-2">
            {regionStats.slice().sort((a, b) => b.remainValue - a.remainValue).map(rg => {
              const max = Math.max(...regionStats.map(x => x.remainValue), 1);
              return (
                <div key={rg.region} className="flex items-center gap-2">
                  <span className="w-10 text-[11px] text-slate-500 text-right shrink-0">{rg.region}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full rounded bg-gradient-to-r from-cyan-500 to-sky-400"
                      style={{ width: `${Math.max(1, rg.remainValue / max * 100)}%` }} />
                  </div>
                  <span className="w-12 text-[11px] text-cyan-600 text-right shrink-0">{fmt(rg.remainValue)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 班组缺口 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">班组缺口（缺余为正 · 个）</div>
          <div className="space-y-2">
            {regionStats.slice().sort((a, b) => b.crewGap - a.crewGap).map(rg => {
              const max = Math.max(...regionStats.map(x => x.crewGap), 1);
              return (
                <div key={rg.region} className="flex items-center gap-2">
                  <span className="w-10 text-[11px] text-slate-500 text-right shrink-0">{rg.region}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full rounded bg-gradient-to-r from-orange-500 to-amber-400"
                      style={{ width: `${Math.max(1, rg.crewGap / max * 100)}%` }} />
                  </div>
                  <span className={`w-12 text-[11px] text-right shrink-0 ${rg.crewGap > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {rg.crewGap > 0 ? rg.crewGap.toFixed(1) : '0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== 区域作战看板 ===== */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-cyan-400 rounded" />区域作战看板
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {regionStats.map(rg => (
            <div key={rg.region}
              className={`bg-white rounded-xl p-4 border shadow-sm ${rg.hasGap ? 'border-orange-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">{rg.region}</span>
                {rg.hasGap
                  ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">⚠ 班组缺口</span>
                  : <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200">正常</span>}
              </div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold text-cyan-600">{rg.rate !== null ? `${(rg.rate * 100).toFixed(1)}%` : '—'}</span>
                <span className="text-[11px] text-slate-500">
                  计划 {pct(rg.planRate)} · 偏差 <span className={devCls(rg.dev)}>{devPct(rg.dev)}</span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400"
                  style={{ width: `${Math.max(1, (rg.rate ?? 0) * 100)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg py-1.5">
                  <div className="text-[10px] text-slate-500">剩余产值</div>
                  <div className="text-xs font-semibold text-cyan-600">{fmt(rg.remainValue)}万</div>
                </div>
                <div className="bg-slate-50 rounded-lg py-1.5">
                  <div className="text-[10px] text-slate-500">剩余工期</div>
                  <div className="text-xs font-semibold text-slate-700">{rg.remainDays}天</div>
                </div>
                <div className="bg-slate-50 rounded-lg py-1.5">
                  <div className="text-[10px] text-slate-500">班组缺</div>
                  <div className={`text-xs font-semibold ${rg.crewGap > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {rg.crewGap > 0 ? `${rg.crewGap.toFixed(1)}个` : '无'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 预警清单 ===== */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-rose-400 rounded" />预警清单
          <span className="text-[11px] font-normal text-slate-500">（进度滞后 或 班组缺口项目，按偏差升序）</span>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[12px]">
                {['区域 / 项目部 / 项目', '类别', '实际%', '计划%', '偏差', '剩余(万)', '缺口工日', '班组缺余', '需求/可用(工日)', '最晚完工'].map(h => (
                  <th key={h} className="px-3 py-2 border-b border-slate-200 whitespace-nowrap font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-slate-400 text-sm">
                    暂无预警项目，各项目进度与班组配置正常
                  </td>
                </tr>
              )}
              {alerts.map(x => (
                <tr key={x.p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-slate-500">{x.p.region}-{x.p.dept}</span>-
                    <span className="text-slate-900 font-medium">{x.p.shortName || x.p.name}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">{WORK_TYPE_LABELS[x.p.workType]}</td>
                  <td className="px-3 py-2 font-mono text-cyan-600">{pct(x.rate)}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{pct(x.planRate)}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${devCls(x.dev)}`}>{devPct(x.dev)}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{fmt(x.remainValue)}</td>
                  <td className="px-3 py-2 font-mono text-orange-600">{x.gapWorkDays > 0 ? x.gapWorkDays : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {x.crewGap > 0
                      ? <span className="text-orange-600">缺{x.crewGap.toFixed(1)}个</span>
                      : <span className="text-emerald-600">充足</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                    {x.remainWorkDays} / {x.remainDays}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{x.p.endDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </React.Fragment>
      ) : (
      <React.Fragment>
      {/* ===== 顶部条件过滤 ===== */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <div className="text-xs text-slate-500 mb-1">区域</div>
            <select className={selCls} value={regionSel}
              onChange={e => { setRegionSel(e.target.value); setDeptSel(''); }}>
              <option value="">全部</option>
              {regionOpts.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">项目部</div>
            <select className={selCls} value={deptSel} onChange={e => setDeptSel(e.target.value)}>
              <option value="">全部</option>
              {deptOpts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">路段 / 项目（关键字）</div>
            <input className={inputCls} value={kw} placeholder="如 沪昆 / 金华"
              onChange={e => setKw(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">进度预警</div>
            <select className={selCls} value={warnSel} onChange={e => setWarnSel(e.target.value)}>
              <option value="">全部</option>
              <option value="red">红色 · 严重滞后</option>
              <option value="yellow">黄色 · 滞后</option>
              <option value="green">绿色 · 正常</option>
              <option value="done">已完成</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">能否按期</div>
            <select className={selCls} value={onTimeSel} onChange={e => setOnTimeSel(e.target.value)}>
              <option value="">全部</option>
              <option value="yes">按期</option>
              <option value="no">滞后</option>
            </select>
          </div>
          <button onClick={resetFilters}
            className="h-9 px-4 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-sm font-medium">
            重置
          </button>
        </div>
        <div className="mt-2 text-[11px] text-slate-400">
          当前筛选 {view.list.length} / {projStats.length} 个项目
          {regionSel && ` · 区域：${regionSel}`}
          {deptSel && ` · 项目部：${deptSel}`}
          {kw && ` · 关键字：${kw}`}
        </div>
      </div>

      {/* ===== KPI 指标卡 ===== */}
      {(() => {
        const n = view.list.length;
        const cards = [
          { label: '项目数', value: `${n}`, sub: `筛选结果 / 共 ${projStats.length}`, color: '#3b82f6', vColor: '#1d4ed8' },
          { label: '总金额（万元）', value: fmt(view.totalAmount), sub: '合同总额', color: '#3b82f6', vColor: '#1d4ed8' },
          { label: '累计完成（万元）', value: fmt(view.actualCum), sub: `剩余 ${fmt(view.remainValue)}`, color: '#10b981', vColor: '#047857' },
          { label: '整体完成率', value: pct(view.rateW), sub: '加权 = 累计完成 / 总金额', color: '#10b981', vColor: '#047857' },
          { label: '整体工期进度偏差', value: devPct(view.schedDevW), sub: `工期率 ${pct(view.schedW)}`, color: '#ef4444', vColor: '#b91c1c' },
          { label: '实际-计划偏差', value: devPct(view.planDevW), sub: `计划率 ${pct(view.planW)}`, color: '#ef4444', vColor: '#b91c1c' },
          { label: '按期项目', value: `${view.onTimeCount} / ${n}`,
            sub: `占比 ${n > 0 ? `${((view.onTimeCount / n) * 100).toFixed(1)}%` : '—'}`, color: '#f59e0b', vColor: '#b45309' },
          { label: '预警（红 / 黄）', value: `${view.warnCount.red} / ${view.warnCount.yellow}`,
            sub: `绿 ${view.warnCount.green} · 已完成 ${view.warnCount.done}`, color: '#ef4444', vColor: '#b91c1c' },
          { label: '本周病害工效（吨/工日）', value: view.effDisease !== null ? `${r2(view.effDisease)}` : '—',
            sub: '加权 · 阈值≥300', color: '#10b981',
            vColor: view.effDisease !== null && view.effDisease >= 300 ? '#047857' : '#b91c1c' },
          { label: '本周罩面工效（吨/工日）', value: view.effOverlay !== null ? `${r2(view.effOverlay)}` : '—',
            sub: '加权 · 阈值≥800', color: '#10b981',
            vColor: view.effOverlay !== null && view.effOverlay >= 800 ? '#047857' : '#b91c1c' },
        ];
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
            {cards.map(c => (
              <div key={c.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: c.color }}>
                <div className="text-xs text-slate-500 mb-1.5">{c.label}</div>
                <div className="text-xl font-bold" style={{ color: c.vColor }}>{c.value}</div>
                <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ===== 进度预警分布 + 区域对比 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* 进度预警分布（环形图） */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />进度预警分布
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">按当前筛选</span>
          </div>
          {view.list.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">暂无匹配数据</div>
          ) : (
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0">
                {donutSegs.map(s => {
                  const len = (s.n / view.list.length) * CIRC;
                  const off = donutAcc; donutAcc += len;
                  const stroke = { red: '#ef4444', yellow: '#f59e0b', green: '#10b981', done: '#3b82f6' }[s.key];
                  return (
                    <circle key={s.key} cx="80" cy="80" r={R} fill="none" stroke={stroke} strokeWidth="18"
                      strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-off}
                      transform="rotate(-90 80 80)" />
                  );
                })}
                <text x="80" y="76" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 26, fontWeight: 700 }}>
                  {view.list.length}
                </text>
                <text x="80" y="98" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12 }}>项目</text>
              </svg>
              <div className="flex-1 space-y-2">
                {(['red', 'yellow', 'green', 'done'] as Warn[]).map(k => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <i className={`w-2.5 h-2.5 rounded-sm inline-block ${WARN_DOT[k]}`} />
                    <span className="text-slate-600 flex-1">{WARN_LABEL[k]}</span>
                    <span className="font-semibold text-slate-800">{view.warnCount[k]}</span>
                    <span className="text-slate-400 w-10 text-right">
                      {view.list.length > 0 ? `${((view.warnCount[k] / view.list.length) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 区域 · 开累完成率 vs 工期完成率 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />区域 · 开累完成率 vs 工期完成率（加权）
            </div>
            <span className="text-[10px] text-slate-400">点击区域名可联动筛选</span>
          </div>
          {view.regionRows.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">暂无匹配数据</div>
          ) : (
            <div className="space-y-1">
              {view.regionRows.map(r => (
                <div key={r.region} className="flex items-center gap-2 py-1">
                  <button onClick={() => setRegionSel(s => (s === r.region ? '' : r.region))}
                    className={`w-14 shrink-0 text-left text-xs font-medium px-1.5 py-0.5 rounded transition ${
                      regionSel === r.region ? 'bg-cyan-100 text-cyan-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {r.region}
                  </button>
                  <div className="flex-1 relative h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-slate-300 rounded-full"
                      style={{ width: `${(r.sched ?? 0) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${(r.rate ?? 0) * 100}%` }} />
                  </div>
                  <span className="w-[150px] shrink-0 text-right text-[11px] text-slate-500 whitespace-nowrap">
                    实际{pct(r.rate)} · 工期{pct(r.sched)}
                  </span>
                  <span className={`w-14 shrink-0 text-right text-[11px] font-semibold ${devTxt(r.dev)}`}>{devPct(r.dev)}</span>
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-1.5 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />实际完成率</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />工期完成率</span>
                <span>偏差：红=慢&gt;20% · 黄=慢0~20% · 绿=超前</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 项目部 · 工期进度偏差率 ===== */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />项目部 · 工期进度偏差率（百分比）
          </div>
          <span className="text-[10px] text-slate-400">向左红=慢&gt;20% · 黄=慢0~20% · 向右绿=超前</span>
        </div>
        {view.deptRows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">暂无匹配数据</div>
        ) : (() => {
          const maxDev = Math.max(0.05, ...view.deptRows.map(d => Math.abs(d.dev ?? 0)));
          return (
            <div>
              {view.deptRows.map((d, i) => {
                const w = Math.abs(d.dev ?? 0) / maxDev * 50;
                const neg = (d.dev ?? 0) < 0;
                return (
                  <div key={d.dept} className={`flex items-center gap-2 py-1 rounded px-1 ${i % 2 ? 'bg-slate-50/70' : ''}`}>
                    <span className="w-16 shrink-0 text-right text-xs text-slate-600 pr-1">{d.dept}</span>
                    <div className="flex-1 relative h-4">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300" />
                      {neg
                        ? <div className={`absolute top-0 h-full rounded-l ${devBar(d.dev)}`}
                            style={{ right: '50%', width: `${w}%` }} />
                        : <div className={`absolute top-0 h-full rounded-r ${devBar(d.dev)}`}
                            style={{ left: '50%', width: `${w}%` }} />}
                    </div>
                    <span className={`w-14 shrink-0 text-right text-[11px] font-mono font-semibold ${devTxt(d.dev)}`}>
                      {devPct(d.dev)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ===== 区域 · 本周日均工效双指标对比 ===== */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500" />区域 · 本周日均工效双指标对比（吨/工日）
            {curWeek && <span className="text-[10px] font-normal text-slate-400">（{curWeek.label}）</span>}
          </div>
          <span className="text-[10px] text-slate-400">按区域吨量加权 · 左蓝=病害 右青=罩面 · 点击区域下钻</span>
        </div>
        {view.effRows.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">暂无匹配数据</div>
        ) : (() => {
          const maxEff = Math.max(800, ...view.effRows.flatMap(r => [r.dEff ?? 0, r.oEff ?? 0]));
          const TH_D = 300, TH_O = 800;
          return (
            <div>
              <div className="relative h-52">
                <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/70"
                  style={{ bottom: `${(TH_O / maxEff) * 100}%` }}>
                  <span className="absolute -top-2 right-0 text-[9px] px-1 bg-amber-50 text-amber-600 rounded">罩面阈值 {TH_O}</span>
                </div>
                <div className="absolute left-0 right-0 border-t-2 border-dashed border-rose-400/70"
                  style={{ bottom: `${(TH_D / maxEff) * 100}%` }}>
                  <span className="absolute -top-2 right-16 text-[9px] px-1 bg-rose-50 text-rose-600 rounded">病害阈值 {TH_D}</span>
                </div>
                <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
                  {view.effRows.map(r => (
                    <div key={r.region} className="flex flex-col items-center gap-1.5 w-16">
                      <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                        {r.dEff !== null
                          ? <div className="relative w-5 rounded-t bg-blue-500"
                              style={{ height: `${Math.max(2, (r.dEff / maxEff) * 100)}%` }}>
                              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-blue-600 whitespace-nowrap">{r2(r.dEff)}</span>
                            </div>
                          : <span className="text-[9px] text-slate-300 self-end pb-0.5">—</span>}
                        {r.oEff !== null
                          ? <div className="relative w-5 rounded-t bg-teal-500"
                              style={{ height: `${Math.max(2, (r.oEff / maxEff) * 100)}%` }}>
                              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-teal-600 whitespace-nowrap">{r2(r.oEff)}</span>
                            </div>
                          : <span className="text-[9px] text-slate-300 self-end pb-0.5">—</span>}
                      </div>
                      <button onClick={() => setRegionSel(s => (s === r.region ? '' : r.region))}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition ${
                          regionSel === r.region ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {r.region}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />病害（达标≥300）</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />罩面（达标≥800）</span>
                <span className="flex items-center gap-1"><i className="w-6 border-t-2 border-dashed border-slate-400 inline-block" />虚线 = 工效阈值</span>
                <span>无本周数据时显示 —</span>
              </div>
            </div>
          );
        })()}
      </div>
      </React.Fragment>
      )}
    </div>
  );
}
