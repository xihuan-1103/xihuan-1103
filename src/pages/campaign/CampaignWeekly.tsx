/**
 * 百日攻坚 - 项目部每周晾晒表（项目部每周完工百分比对比表）
 *
 * 周划分：与月度计划倒排完全一致（上周五～本周四为一周，从基准日次日起倒排）。
 * 统计口径：以项目部为行（项目部内多项目按金额加权汇总）。
 * 每周三列（计划率 / 实际率 / 偏差）：
 *   计划率 =（基准日已完成产值 + 截至该周末的周计划累计）÷ 项目总金额   ← 取自月度倒排计划
 *   实际率 =（基准日已完成产值 + 截至该周末实际累计完成产值）÷ 项目总金额 ← 取自每日产值填报
 *   偏差   = 实际率 - 计划率（正=超前 绿色，负=滞后 红色；未到期的周显示 "—"）
 * 展示窗口：默认上周 / 当周 / 下周，可通过周下拉与前后箭头切换中心周。
 * 层级切换（页面右上角）：项目部层级 / 区域中心层级 / 集团层级（同项目部晾晒）。
 */

import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { M, Select, fmtNum } from './_shared';
import type { CampaignProject, WeekSlot } from './types';
import {
  getProjects, planOf, cumValueOf, buildWeeks, baseDateOf, getExtraWeeks, todayStr,
  getDailyReports,
} from './campaignStore';

type Level = 'dept' | 'region' | 'group';

const LEVELS: { key: Level; label: string }[] = [
  { key: 'dept', label: '项目部层级' },
  { key: 'region', label: '区域中心层级' },
  { key: 'group', label: '集团层级' },
];

const DAY = 86400000;
const parseD = (s: string) => new Date(`${s}T00:00:00`);
const p2 = (n: number) => String(n).padStart(2, '0');
const ymdOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

const r2 = (n: number) => Math.round(n * 100) / 100;
/** 率显示：null → "—"，否则 xx.x% */
const pct = (r: number | null) => r === null ? '—' : `${(r * 100).toFixed(1)}%`;
/** 偏差显示：带正负号 */
const devPct = (d: number | null) =>
  d === null ? '—' : `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;

interface WeekCell { plan: number | null; act: number | null; dev: number | null; }

interface WeeklyRow {
  region: string;
  dept: string;
  count: number;      // 项目数
  amount: number;     // 总金额（万元）
  cumDone: number;    // 累计完成（万元，截至今天）
  rate: number | null; // 完成率 = 累计完成 ÷ 总金额
  weeks: WeekCell[];  // 与展示窗口周一一对应
}

/** 项目集合截至某周末的计划分子：Σ(基准日已完成产值 + 截至该周(含)的周计划累计) */
function planNumOf(list: CampaignProject[], uptoWeek: WeekSlot, weeksAll: WeekSlot[]): number {
  const idx = weeksAll.findIndex(x => x.key === uptoWeek.key);
  return list.reduce((s, p) => s + (p.baseDoneValue || 0)
    + weeksAll.slice(0, idx + 1).reduce((x, wk) => x + planOf(p, wk.key), 0), 0);
}

/** 项目集合截至某日的实际分子：Σ(基准日已完成产值 + 每日填报累计产值) */
function actNumOf(list: CampaignProject[], upto: string): number {
  return list.reduce((s, p) => s + (p.baseDoneValue || 0) + cumValueOf(p.id, upto), 0);
}

export default function CampaignWeekly() {
  const projects = useMemo(() => getProjects(), []);
  const today = todayStr();

  const [level, setLevel] = useState<Level>('dept');
  const [deptSel, setDeptSel] = useState('');
  const [regionSel, setRegionSel] = useState('');
  const [centerSel, setCenterSel] = useState(-1);   // 中心周在全量周序列中的下标；-1 = 跟随当周

  /* ===== 周序列（与月度计划倒排一致：基准日次日起，自动延伸到 max(最晚工期结束, 今天+4周) + 手动延伸） ===== */
  const base = baseDateOf();
  const latestEnd = projects.reduce((m, p) => (p.endDate && p.endDate > m ? p.endDate : m), '');
  const autoUntil = ymdOf(new Date(Math.max(
    parseD(latestEnd || `${base}T00:00:00`).getTime() + 100 * DAY,
    Date.now() + 28 * DAY,
  )));
  const until = ymdOf(new Date(parseD(autoUntil).getTime() + getExtraWeeks() * 7 * DAY));
  const allWeeks = useMemo(() => buildWeeks(base, until), [base, until]);

  const curWeekIdx = Math.max(0, allWeeks.findIndex(w => w.start <= today && today <= w.end));
  const cIdx = (centerSel >= 0 && centerSel < allWeeks.length) ? centerSel : curWeekIdx;
  /** 展示窗口：上周 / 当周 / 下周（以中心周为基准，越界自动裁剪） */
  const shown = [cIdx - 1, cIdx, cIdx + 1]
    .filter(i => i >= 0 && i < allWeeks.length).map(i => allWeeks[i]);

  const shiftWeek = (delta: number) => {
    const next = Math.min(allWeeks.length - 1, Math.max(0, cIdx + delta));
    setCenterSel(next);
  };

  /* ===== 组织维度：按项目部分组 ===== */
  const deptGroups = useMemo(() => {
    const map = new Map<string, CampaignProject[]>();
    for (const p of projects) {
      const k = p.dept || '未分配';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return [...map.entries()].map(([dept, list]) => ({
      dept, region: list[0]?.region || '—', list,
    }));
  }, [projects]);

  const regions = useMemo(
    () => [...new Set(deptGroups.map(g => g.region).filter(Boolean))],
    [deptGroups]);

  const curDept = deptGroups.find(g => g.dept === deptSel) || deptGroups[0];
  const curRegion = (regionSel && regions.includes(regionSel)) ? regionSel : regions[0];

  /* ===== 行构建（项目部口径，金额加权） ===== */
  const allRows = useMemo(() => deptGroups.map(g => {
    const { list } = g;
    const amount = list.reduce((s, p) => s + (p.amount || 0), 0);
    const cumDone = actNumOf(list, today);
    const rate = amount > 0 ? cumDone / amount : null;
    const weeks: WeekCell[] = shown.map(w => {
      const plan = amount > 0 ? planNumOf(list, w, allWeeks) / amount : null;
      if (w.start > today) {
        // 整周尚未开始：实际率/偏差显示 "—"
        return { plan, act: null, dev: null };
      }
      const upto = w.end < today ? w.end : today;
      const act = amount > 0 ? actNumOf(list, upto) / amount : null;
      return { plan, act, dev: act !== null && plan !== null ? act - plan : null };
    });
    return { region: g.region, dept: g.dept, count: list.length, amount, cumDone, rate, weeks };
  }), [deptGroups, shown, allWeeks, today]);

  /* ===== 层级过滤 + 排序（保持区域分组顺序，组内按完成率降序） ===== */
  const rows = useMemo(() => {
    const pool = level === 'dept'
      ? allRows.filter(r => r.dept === curDept?.dept)
      : level === 'region'
        ? allRows.filter(r => r.region === curRegion)
        : allRows;
    const out: WeeklyRow[] = [];
    for (const rg of [...new Set(pool.map(r => r.region))]) {
      out.push(...pool.filter(r => r.region === rg)
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)));
    }
    return out;
  }, [level, allRows, curDept, curRegion]);

  /* ===== 合计行（金额加权） ===== */
  const total = useMemo(() => {
    const amount = rows.reduce((s, r) => s + r.amount, 0);
    const cumDone = rows.reduce((s, r) => s + r.cumDone, 0);
    const weeks: WeekCell[] = shown.map((_, i) => {
      const plan = amount > 0
        ? rows.reduce((s, r) => s + (r.weeks[i].plan ?? 0) * r.amount, 0) / amount : null;
      const act = amount > 0
        ? rows.reduce((s, r) => s + (r.weeks[i].act ?? 0) * r.amount, 0) / amount : null;
      return { plan, act, dev: act !== null && plan !== null ? act - plan : null };
    });
    return { count: rows.reduce((s, r) => s + r.count, 0), amount, cumDone, weeks };
  }, [rows, shown]);

  const totalRate = total.amount > 0 ? total.cumDone / total.amount : null;
  const leadCols = 7 + shown.length * 3;

  /* ===== 图表数据 ①：当前周报区间内每天的完成情况（随层级筛选，取自每日产值填报） ===== */
  const centerWeek = allWeeks[cIdx] || null;
  const dayRows = useMemo(() => {
    if (!centerWeek) return [];
    // 周区间逐日铺底（无填报日补 0）
    const days: {
      date: string; value: number; dQty: number; oQty: number;
      dTons: number; oTons: number; dDays: number; oDays: number;
    }[] = [];
    const idx: Record<string, number> = {};
    for (let d = parseD(centerWeek.start); d <= parseD(centerWeek.end); d = new Date(d.getTime() + DAY)) {
      const key = ymdOf(d);
      idx[key] = days.length;
      days.push({ date: key, value: 0, dQty: 0, oQty: 0, dTons: 0, oTons: 0, dDays: 0, oDays: 0 });
    }
    getDailyReports().forEach(r => {
      if (r.date < centerWeek.start || r.date > centerWeek.end) return;
      // 层级过滤：项目部 / 区域 / 集团（与下方对比表口径一致）
      if (level === 'dept' && (!curDept || r.dept !== curDept.dept)) return;
      if (level === 'region' && r.region !== curRegion) return;
      r.lines.forEach(l => {
        const cell = days[idx[r.date]];
        if (!cell) return;
        cell.value += l.dayValue || 0;
        cell.dQty += l.disease.qty || 0;
        cell.oQty += l.overlay.qty || 0;
        cell.dTons += l.disease.tons || 0;
        cell.oTons += l.overlay.tons || 0;
        cell.dDays += l.disease.days || 0;
        cell.oDays += l.overlay.days || 0;
      });
    });
    // 周累计工效（自周初累计至当日：吨 ÷ 累计施工天数）
    let cdT = 0, coT = 0, cdD = 0, coD = 0;
    return days.map(x => {
      cdT += x.dTons; coT += x.oTons; cdD += x.dDays; coD += x.oDays;
      return {
        label: x.date.slice(5),
        value: r2(x.value),
        dQty: r2(x.dQty),
        oQty: r2(x.oQty),
        dEff: cdD > 0 ? r2(cdT / cdD) : 0,
        oEff: coD > 0 ? r2(coT / coD) : 0,
      };
    });
  }, [centerWeek, level, curDept, curRegion]);

  /* ===== 图表数据 ②：每周计划率 / 实际率（当前层级汇总口径，与合计行一致） ===== */
  const weekRateData = useMemo(() => shown.map((w, j) => {
    const c = total.weeks[j];
    return {
      name: w.label + (w.key === allWeeks[curWeekIdx]?.key ? ' ·当周' : ''),
      plan: c.plan === null ? null : Number((c.plan * 100).toFixed(1)),
      act: c.act === null ? null : Number((c.act * 100).toFixed(1)),
    };
  }), [shown, total, allWeeks, curWeekIdx]);

  /** 每日完成迷你柱状图（产值 / 病害 / 罩面 / 周累计工效） */
  const miniBars = (title: string, unit: string, series: {
    key: string; name: string; fill: string;
  }[]) => (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="text-xs font-semibold text-slate-600 mb-2">
        {title}<span className="ml-1 font-normal text-slate-400">（{unit}）</span>
      </div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayRows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
            <YAxis width={38} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            {series.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.fill}
                radius={[3, 3, 0, 0]} maxBarSize={22} />
            ))}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );


  const devCls = (d: number | null) =>
    d === null ? 'text-slate-400'
      : d >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold';

  return (
    <div>
      {/* 口径说明 */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-xs text-orange-800 leading-relaxed">
        <span className="font-bold">晾晒口径：</span>
        周划分与月度计划倒排一致（上周五～本周四为一周，从基准日次日起倒排）；
        以项目部为统计口径，多项目按金额加权。
        <b>计划率</b> =（基准日已完成产值 + 截至该周末周计划累计）÷ 总金额（取自月度倒排计划）；
        <b>实际率</b> =（基准日已完成产值 + 截至该周末实际累计产值）÷ 总金额（取自每日产值填报）；
        <b>偏差</b> = 实际率 - 计划率（正=超前，负=滞后）；尚未开始的周显示 "—"。
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '参与对比项目部', value: `${rows.length} 个`, cls: 'text-orange-600' },
          { label: '总金额', value: `${fmtNum(r2(total.amount))} 万元`, cls: 'text-slate-800' },
          { label: '累计完成产值', value: `${fmtNum(r2(total.cumDone))} 万元`, cls: 'text-emerald-600' },
          { label: '整体完成率', value: pct(totalRate), cls: 'text-sky-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 工具行：周导航 + 层级筛选 + 右上角层级切换 */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
        <button className={M.button.ghost} disabled={cIdx <= 0}
          onClick={() => shiftWeek(-1)}>◀ 上一周</button>
        <div className="w-52">
          <Select value={String(cIdx)} onChange={v => setCenterSel(Number(v))}
            options={allWeeks.map((w, i) => ({
              value: String(i),
              label: `${w.label}（第${w.seq}周）${i === curWeekIdx ? ' · 当周' : ''}`,
            }))} />
        </div>
        <button className={M.button.ghost} disabled={cIdx >= allWeeks.length - 1}
          onClick={() => shiftWeek(1)}>下一周 ▶</button>
        <span className="text-xs text-slate-400">
          展示窗口：{shown.map(w => w.label).join(' / ')}
        </span>
        {level === 'dept' && deptGroups.length > 0 && (
          <div className="w-48">
            <Select value={curDept?.dept || ''} onChange={setDeptSel}
              options={deptGroups.map(g => ({ value: g.dept, label: `项目部：${g.dept}` }))} />
          </div>
        )}
        {level === 'region' && regions.length > 0 && (
          <div className="w-44">
            <Select value={curRegion || ''} onChange={setRegionSel}
              options={regions.map(r => ({ value: r, label: `区域：${r}` }))} />
          </div>
        )}
        {/* 右上角层级切换 */}
        <div className="ml-auto inline-flex rounded-lg bg-orange-50 border border-orange-200 p-0.5">
          {LEVELS.map(l => (
            <button key={l.key} onClick={() => setLevel(l.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap
                ${level === l.key ? 'bg-orange-500 text-white shadow' : 'text-orange-700 hover:bg-orange-100'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表区：当前周报区间每日完成情况 + 每周计划率/实际率（横向柱状图） */}
      {projects.length > 0 && centerWeek && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <BarChart3 size={15} className="text-orange-500" />
              每周完成情况
              <span className="text-xs font-normal text-slate-400 ml-1">
                当前周报区间 {centerWeek.start} ~ {centerWeek.end}（第{centerWeek.seq}周）
                ，数据随层级筛选联动
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* 左：当前周报区间每日完成情况（4 迷你柱状图 2×2） */}
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {miniBars('每日完成产值', '万元', [{ key: 'value', name: '完成产值', fill: '#f97316' }])}
              {miniBars('每日病害完成工程量', 'm2', [{ key: 'dQty', name: '病害', fill: '#38bdf8' }])}
              {miniBars('每日罩面完成工程量', 'km', [{ key: 'oQty', name: '罩面', fill: '#a78bfa' }])}
              {miniBars('周累计工效（自周初累计至当日）', '吨/工日', [
                { key: 'dEff', name: '病害工效', fill: '#38bdf8' },
                { key: 'oEff', name: '罩面工效', fill: '#fbbf24' },
              ])}
            </div>
            {/* 右：每周计划率 / 实际率（横向柱状图） */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                每周计划率 / 实际率<span className="ml-1 font-normal text-slate-400">（%，当前层级合计口径）</span>
              </div>
              <div style={{ height: 316 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekRateData} layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }}
                      unit="%" />
                    <YAxis type="category" dataKey="name" width={92}
                      tick={{ fontSize: 11, fill: '#334155' }} />
                    <Tooltip
                      formatter={(v: unknown) =>
                        (v === null || v === undefined || typeof v !== 'number') ? '—' : `${v}%`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
                    <Bar dataKey="plan" name="计划率" fill="#fdba74" maxBarSize={14}
                      radius={[0, 3, 3, 0]} />
                    <Bar dataKey="act" name="实际率" fill="#f97316" maxBarSize={14}
                      radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                计划率 / 实际率与下方对比表合计行口径一致（金额加权）；尚未开始的周实际率无数据。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 对比表 */}
      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
          暂无项目数据，请先在「基础信息配置」中维护项目部项目
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-amber-50/50 text-sm flex flex-wrap items-center">
            <span className="font-bold text-orange-600">项目部每周完工百分比对比表</span>
            <span className="ml-2 text-xs text-slate-500">
              {level === 'dept' && curDept && `当前项目部：${curDept.dept}`}
              {level === 'region' && `当前区域中心：${curRegion}`}
              {level === 'group' && `集团层级（覆盖 ${regions.length} 个区域）`}
              ，组内按完成率降序
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className={M.table}>
              <thead>
                <tr>
                  <th className={`${M.th} text-center w-12`} rowSpan={2}>序号</th>
                  <th className={`${M.th} text-center`} rowSpan={2}>区域</th>
                  <th className={`${M.th} text-center`} rowSpan={2}>项目部</th>
                  <th className={`${M.th} text-center`} rowSpan={2}>项目数</th>
                  <th className={`${M.th} text-right`} rowSpan={2}>总金额<br />(万元)</th>
                  <th className={`${M.th} text-right`} rowSpan={2}>累计完成<br />(万元)</th>
                  <th className={`${M.th} text-center`} rowSpan={2}>完成率</th>
                  {shown.map(w => (
                    <th key={w.key}
                      className="bg-orange-50 text-orange-800 border-b border-slate-200 px-3 py-2 text-[12px] font-bold whitespace-nowrap text-center"
                      colSpan={3}>
                      {w.label}
                      <span className={`ml-1 font-normal ${w.key === allWeeks[curWeekIdx]?.key ? 'text-orange-600' : 'text-slate-400'}`}>
                        第{w.seq}周{w.key === allWeeks[curWeekIdx]?.key ? '·当周' : ''}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {shown.map(w => (
                    <React.Fragment key={w.key}>
                      <th className={`${M.th} text-center whitespace-nowrap`}>计划率</th>
                      <th className={`${M.th} text-center whitespace-nowrap`}>实际率</th>
                      <th className={`${M.th} text-center whitespace-nowrap`}>偏差</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td className={`${M.td} text-center text-slate-400 py-10`} colSpan={leadCols}>当前层级下暂无项目部数据</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.dept} className="hover:bg-orange-50/30 transition">
                    <td className={`${M.td} text-center text-slate-400`}>{i + 1}</td>
                    <td className={`${M.td} whitespace-nowrap`}>{r.region}</td>
                    <td className={`${M.td} font-medium whitespace-nowrap`}>{r.dept}</td>
                    <td className={`${M.td} text-center`}>{r.count}</td>
                    <td className={`${M.td} text-right font-mono`}>{r.amount ? fmtNum(r.amount) : '—'}</td>
                    <td className={`${M.td} text-right font-mono`}>{r.cumDone ? fmtNum(r2(r.cumDone)) : '—'}</td>
                    <td className={`${M.td} text-center font-mono font-semibold text-orange-600`}>{pct(r.rate)}</td>
                    {r.weeks.map((c, j) => (
                      <React.Fragment key={shown[j].key}>
                        <td className={`${M.td} text-center font-mono`}>{pct(c.plan)}</td>
                        <td className={`${M.td} text-center font-mono`}>{pct(c.act)}</td>
                        <td className={`${M.td} text-center font-mono ${devCls(c.dev)}`}>{devPct(c.dev)}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="bg-amber-50/80 font-semibold">
                    <td className={`${M.td} text-center text-slate-400`}>—</td>
                    <td className={M.td} />
                    <td className={`${M.td} whitespace-nowrap`}>合计（{rows.length} 个项目部）</td>
                    <td className={`${M.td} text-center`}>{total.count}</td>
                    <td className={`${M.td} text-right font-mono`}>{total.amount ? fmtNum(total.amount) : '—'}</td>
                    <td className={`${M.td} text-right font-mono`}>{total.cumDone ? fmtNum(r2(total.cumDone)) : '—'}</td>
                    <td className={`${M.td} text-center font-mono text-orange-600`}>{pct(totalRate)}</td>
                    {total.weeks.map((c, j) => (
                      <React.Fragment key={shown[j].key}>
                        <td className={`${M.td} text-center font-mono`}>{pct(c.plan)}</td>
                        <td className={`${M.td} text-center font-mono`}>{pct(c.act)}</td>
                        <td className={`${M.td} text-center font-mono ${devCls(c.dev)}`}>{devPct(c.dev)}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
