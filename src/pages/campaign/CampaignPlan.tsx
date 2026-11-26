/**
 * 百日攻坚 - 月度计划倒排（按周）
 *
 * 交互（参照路面专项周报）：
 *  - 选择月份 → 展示该月的每周计划数据（周卡片：周区间 / 计划合计 / 周末累计完成率）
 *  - 点击周卡片 → 该周的倒排计划填报表（行内填写「本周计划产值」即保存）
 *  - 时间选择上方折线图：全时间轴（基准日 → 末周）的每周计划产值（万元）与
 *    周末累计完成率（% 右轴）随时间变动，可切换单个项目或全部（合计）；本周竖线标识
 * 数据源：基础信息配置中维护的项目；周计划量按 项目×周 存储（weeklyPlans），
 * 完成率按全量周序累计（不受月份切换影响），与看板/晾晒/预警口径一致。
 * 周定义：上周五～本周四为一周；一周的起始日为几月，则本周属于几月；
 *         从基准日（固定 9.10）次日开始往后倒排；今天之后自动保留 4 周，
 *         「往后新增一周」可手动延伸排期。
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { M, Select, TypePill, useToast, fmtNum } from './_shared';
import type { CampaignProject, WeekSlot } from './types';
import { WORK_TYPE_LABELS } from './types';
import {
  getProjects, setWeekPlan, planOf, upsertProject,
  buildWeeks, baseDateOf, getExtraWeeks, setExtraWeeks, todayStr,
} from './campaignStore';

const DAY = 86400000;
const parseD = (s: string) => new Date(`${s}T00:00:00`);
const ymdOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (r: number | null) => r === null ? '—' : `${(r * 100).toFixed(1)}%`;

/** 截至第 idx 周（含）的计划累计（含基准日工程量） */
const cumThrough = (p: CampaignProject, weeks: WeekSlot[], idx: number) =>
  (p.baseDoneValue || 0) + weeks.slice(0, idx + 1).reduce((s, w) => s + planOf(p, w.key), 0);

export default function CampaignPlan() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const toast = useToast();

  const projects = useMemo(() => getProjects(), [version]);
  const extraWeeks = getExtraWeeks();

  /* ===== 周序列：基准日次日起，到 max(最晚工期结束, 今天+4周+手动延伸) ===== */
  const base = baseDateOf();
  const today = todayStr();
  const latestEnd = projects.reduce((m, p) =>
    (p.endDate && p.endDate > m ? p.endDate : m), '');
  const autoUntil = ymdOf(new Date(Math.max(
    parseD(latestEnd || `${base}T00:00:00`).getTime() + 100 * DAY,
    Date.now() + 28 * DAY,
  )));
  const until = ymdOf(new Date(parseD(autoUntil).getTime() + extraWeeks * 7 * DAY));

  const allWeeks = useMemo(() => buildWeeks(base, until), [base, until]);
  const curWeekKey = allWeeks.find(w => w.start <= today && today <= w.end)?.key;
  /** 周 → 全量周序中的序号（完成率按全量累计，不受月份切换影响） */
  const allIdxMap = useMemo(() => new Map(allWeeks.map((w, i) => [w.key, i] as [string, number])), [allWeeks]);

  /* ===== 月份 → 该月各周（默认当前所在月 / 当前周） ===== */
  const months = useMemo(() => [...new Set(allWeeks.map(w => w.month))], [allWeeks]);
  const [month, setMonth] = useState(curWeekKey
    ? allWeeks.find(w => w.key === curWeekKey)!.month
    : months[0]);
  const [weekKey, setWeekKey] = useState(curWeekKey || '');
  const monthWeeks = useMemo(() => allWeeks.filter(w => w.month === month), [allWeeks, month]);
  useEffect(() => {
    if (monthWeeks.length && !monthWeeks.some(w => w.key === weekKey)) {
      const cw = monthWeeks.find(w => w.key === curWeekKey);
      setWeekKey((cw || monthWeeks[0]).key);
    }
  }, [monthWeeks, weekKey, curWeekKey]);
  const slot: WeekSlot | undefined =
    monthWeeks.find(w => w.key === weekKey) || monthWeeks[0];

  /* ===== 区域/项目部筛选（参照路面专项周报） ===== */
  const [regionSel, setRegionSel] = useState('');
  const [deptSel, setDeptSel] = useState('');
  const regions = useMemo(() => [...new Set(projects.map(p => p.region))], [projects]);
  const depts = useMemo(
    () => [...new Set(projects.filter(p => !regionSel || p.region === regionSel).map(p => p.dept))],
    [projects, regionSel]);
  const rows = useMemo(() => projects
    .filter(p => (!regionSel || p.region === regionSel) && (!deptSel || p.dept === deptSel))
    .sort((a, b) => a.region.localeCompare(b.region, 'zh') || a.dept.localeCompare(b.dept, 'zh') || a.name.localeCompare(b.name, 'zh')),
    [projects, regionSel, deptSel]);

  /* ===== 编辑 ===== */
  const onPlanChange = (p: CampaignProject, w: WeekSlot, raw: string) => {
    setWeekPlan(p, w.key, Math.max(0, Number(raw) || 0));
    refresh();
  };
  const onBaseDoneChange = (p: CampaignProject, raw: string) => {
    upsertProject({ ...p, baseDoneValue: Math.max(0, Number(raw) || 0) });
    refresh();
  };
  const extendOneWeek = () => {
    setExtraWeeks(extraWeeks + 1);
    refresh();
    toast(`已往后新增一周（手动延伸 ${extraWeeks + 1} 周），可在末月选择新周填报`, 'success');
  };

  /* ===== 所选周合计 ===== */
  const sums = useMemo(() => {
    if (!slot) return null;
    const gi = allIdxMap.get(slot.key) ?? 0;
    return {
      qty: rows.reduce((s, p) => s + (p.pavementTotalQty || 0), 0),
      dTotal: rows.reduce((s, p) => s + (p.diseaseTotalDays || 0), 0),
      oTotal: rows.reduce((s, p) => s + (p.overlayTotalDays || 0), 0),
      dRemain: rows.reduce((s, p) => s + (p.diseaseRemainDays || 0), 0),
      oRemain: rows.reduce((s, p) => s + (p.overlayRemainDays || 0), 0),
      base: rows.reduce((s, p) => s + (p.baseDoneValue || 0), 0),
      plan: rows.reduce((s, p) => s + planOf(p, slot.key), 0),
      cum: rows.reduce((s, p) => s + cumThrough(p, allWeeks, gi), 0),
    };
  }, [rows, slot, allWeeks, allIdxMap]);

  /* ===== 折线图：全时间轴的每周计划产值 + 周末累计完成率（随时间变动） ===== */
  const [chartProject, setChartProject] = useState('');   // ''=全部（按当前筛选范围合计）
  const chartScope = useMemo(() =>
    chartProject ? projects.filter(p => p.id === chartProject) : rows,
    [chartProject, projects, rows]);
  const chartData = useMemo(() => {
    const totalQty = chartScope.reduce((s, p) => s + (p.pavementTotalQty || 0), 0);
    return allWeeks.map((w, i) => {
      const plan = chartScope.reduce((s, p) => s + planOf(p, w.key), 0);
      const cum = chartScope.reduce((s, p) => s + cumThrough(p, allWeeks, i), 0);
      return {
        label: w.label,
        plan: plan ? r2(plan) : 0,
        rate: totalQty > 0 ? +(cum / totalQty * 100).toFixed(1) : null,
        cur: w.key === curWeekKey,
      };
    });
  }, [allWeeks, chartScope, curWeekKey]);

  const numInput = 'w-24 px-1.5 py-1 rounded border border-slate-300 text-xs text-right font-mono focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none';

  return (
    <div>
      {/* 规则说明 */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-xs text-orange-800 leading-relaxed">
        <span className="font-bold">倒排规则：</span>
        上周五～本周四为一周；一周的起始日为几月，则本周属于几月；从基准日（{base}）次日开始往后倒排。
        <span className="font-bold"> 操作：</span>
        选择月份 → 查看该月的每周计划数据（周卡片含计划合计与周末累计完成率），点击周卡片切换到该周的填报表；
        周计划量在表格内直接填写保存；完成率 =（基准日工程量 + 截至该周计划累计）/ 路面专项总工程量，自动计算；
        周列自动随时间推进往后生成（今天之后保留 4 周），也可点击「往后新增一周」手动延伸。
      </div>

      {/* 月份 + 区域/项目部筛选 + 延伸操作 */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
        <Select value={String(month)} onChange={v => setMonth(Number(v))}
          options={months.map(m => ({ value: String(m), label: `${m}月` }))}
          className="!w-28" />
        <Select value={regionSel} onChange={v => { setRegionSel(v); setDeptSel(''); }}
          options={regions.map(r => ({ value: r, label: r }))} placeholder="全部区域" className="!w-36" />
        <Select value={deptSel} onChange={setDeptSel}
          options={depts.map(d => ({ value: d, label: d }))} placeholder="全部项目部" className="!w-36" />
        {(regionSel || deptSel) && (
          <button onClick={() => { setRegionSel(''); setDeptSel(''); }}
            className="text-xs text-slate-500 hover:text-orange-600 underline">重置</button>
        )}
        <span className="text-xs text-slate-400">基准日 {base}，共倒排 {allWeeks.length} 周</span>
        <div className="ml-auto">
          <button onClick={extendOneWeek}
            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition">往后新增一周</button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
          暂无项目数据，请先在「基础信息配置」中维护项目部项目
        </div>
      ) : (
        <div>
          {/* 折线图：计划产值与累计完成率随时间变动 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold text-slate-800">
                计划产值与累计完成率走势
                <span className="ml-2 text-xs font-normal text-slate-400">全时间轴（{allWeeks.length} 周），随周计划填报实时变动</span>
              </div>
              <div className="w-56">
                <Select value={chartProject} onChange={setChartProject}
                  options={[
                    { value: '', label: `全部项目（合计，${rows.length} 个）` },
                    ...projects.map(p => ({ value: p.id, label: p.shortName || p.name })),
                  ]} />
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 40, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }}
                    interval={chartData.length > 16 ? 1 : 0}
                    angle={chartData.length > 16 ? -45 : 0}
                    height={chartData.length > 16 ? 44 : 24}
                    textAnchor={chartData.length > 16 ? 'end' : 'middle'} />
                  <YAxis yAxisId="left" width={38} tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: '万元', position: 'insideTopLeft', fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} width={38}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: '完成率', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v: number | string, n: string) =>
                    n === '计划产值' ? `${v} 万元` : `${v}%`}
                    labelFormatter={(l: string) => `周 ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {curWeekKey && (() => {
                    const cw = allWeeks.find(w => w.key === curWeekKey);
                    return cw ? (
                      <ReferenceLine yAxisId="left" x={cw.label} stroke="#f97316"
                        strokeDasharray="4 3" label={{ value: '本周', fontSize: 10, fill: '#ea580c', position: 'top' }} />
                    ) : null;
                  })()}
                  <Line yAxisId="left" type="monotone" dataKey="plan" name="每周计划产值" stroke="#f97316"
                    strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" name="周末累计完成率" stroke="#0284c7"
                    strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 该月各周计划数据（卡片） */}
          {monthWeeks.length > 0 ? (
            <div className="grid gap-2 mb-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {monthWeeks.map(w => {
                const gi = allIdxMap.get(w.key) ?? 0;
                const planSum = rows.reduce((s, p) => s + planOf(p, w.key), 0);
                const totalQty = rows.reduce((s, p) => s + (p.pavementTotalQty || 0), 0);
                const cumSum = rows.reduce((s, p) => s + cumThrough(p, allWeeks, gi), 0);
                const rate = totalQty > 0 ? cumSum / totalQty : null;
                const active = slot?.key === w.key;
                return (
                  <button key={w.key} onClick={() => setWeekKey(w.key)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition ${
                      active ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">{w.label}</span>
                      {w.key === curWeekKey
                        ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                            active ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>本周</span>
                        : <span className={`text-[10px] ${active ? 'text-orange-100' : 'text-slate-400'}`}>第{w.seq}周</span>}
                    </div>
                    <div className={`mt-1.5 text-xs space-y-0.5 ${active ? 'text-orange-50' : 'text-slate-600'}`}>
                      <div className="flex justify-between gap-2">
                        <span>计划合计</span>
                        <span className="font-mono">{planSum ? fmtNum(r2(planSum)) : '—'} 万元</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>周末累计完成率</span>
                        <span className="font-mono">{pct(rate)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-sm mb-4">
              {month}月暂无倒排周
            </div>
          )}

          {/* 所选周的计划填报表 */}
          {slot && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-slate-800">
                  第{slot.seq}周计划（{slot.label}）
                  {slot.key === curWeekKey && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">本周</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">周区间 {slot.start} ~ {slot.end}；行内填写「本周计划产值」即时保存</div>
              </div>

              <table className={M.table}>
                <thead>
                  <tr>
                    <th rowSpan={2} className={M.th}>区域</th>
                    <th rowSpan={2} className={M.th}>中心/项目部</th>
                    <th rowSpan={2} className={M.th}>项目名称</th>
                    <th rowSpan={2} className={M.th}>工程类型</th>
                    <th rowSpan={2} className={`${M.th} text-right`}>路面专项总工程量</th>
                    <th colSpan={2} className={M.th}>总计划工作日（按单班组）</th>
                    <th colSpan={2} className={M.th}>剩余工作日（按单班组）</th>
                    <th rowSpan={2} className={M.th}>基准日工程量</th>
                    <th rowSpan={2} className={`${M.th} !bg-orange-100 !text-orange-800`}>本周计划产值（万元）</th>
                    <th rowSpan={2} className={`${M.th} text-right`}>截至本周末累计计划</th>
                    <th rowSpan={2} className={`${M.th} text-right`}>本周末累计完成率</th>
                  </tr>
                  <tr>
                    <th className={M.th}>病害</th>
                    <th className={M.th}>罩面</th>
                    <th className={M.th}>病害</th>
                    <th className={M.th}>罩面</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td className={`${M.td} text-center text-slate-400 py-10`} colSpan={13}>当前筛选条件下无项目</td></tr>
                  )}
                  {rows.map(p => {
                    const gi = allIdxMap.get(slot.key) ?? 0;
                    const plan = planOf(p, slot.key);
                    const cum = cumThrough(p, allWeeks, gi);
                    const rate = p.pavementTotalQty ? cum / p.pavementTotalQty : null;
                    return (
                      <tr key={p.id} className="hover:bg-orange-50/30 transition">
                        <td className={M.td}>{p.region || '—'}</td>
                        <td className={`${M.td} whitespace-nowrap font-medium`}>{p.dept || '—'}</td>
                        <td className={`${M.td} whitespace-nowrap font-medium`}>{p.shortName || p.name}</td>
                        <td className={M.td}>
                          <TypePill text={WORK_TYPE_LABELS[p.workType]} tone={p.workType === 'pavement' ? 'orange' : 'sky'} />
                        </td>
                        <td className={`${M.td} text-right font-mono`}>{p.pavementTotalQty ? fmtNum(r2(p.pavementTotalQty)) : '—'}</td>
                        <td className={`${M.td} text-right font-mono`}>{fmtNum(p.diseaseTotalDays)}</td>
                        <td className={`${M.td} text-right font-mono`}>{fmtNum(p.overlayTotalDays)}</td>
                        <td className={`${M.td} text-right font-mono`}>{fmtNum(p.diseaseRemainDays)}</td>
                        <td className={`${M.td} text-right font-mono`}>{fmtNum(p.overlayRemainDays)}</td>
                        <td className={M.td}>
                          <input type="number" min={0} step="0.01" value={p.baseDoneValue ?? 0}
                            onChange={e => onBaseDoneChange(p, e.target.value)}
                            className={`${numInput} w-20`} />
                        </td>
                        <td className={`${M.td} text-center`}>
                          <input type="number" min={0} step="0.01" value={plan || ''}
                            placeholder="0" onChange={e => onPlanChange(p, slot, e.target.value)}
                            className={`${numInput} bg-orange-50/40`} />
                        </td>
                        <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(cum))}</td>
                        <td className={`${M.td} text-right font-mono`}>{pct(rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* 合计行（冻结在表格最底部） */}
                {sums && rows.length > 0 && (
                  <tfoot>
                    <tr className="sticky bottom-0 bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className={M.td}>合计</td>
                      <td className={M.td}>—</td>
                      <td className={M.td}>{rows.length} 个项目</td>
                      <td className={M.td}>—</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.qty))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.dTotal))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.oTotal))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.dRemain))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.oRemain))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.base))}</td>
                      <td className={`${M.td} text-center font-mono`}>{fmtNum(r2(sums.plan))}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(r2(sums.cum))}</td>
                      <td className={`${M.td} text-right font-mono`}>{pct(sums.qty ? sums.cum / sums.qty : null)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="mt-2 text-xs text-slate-400">
                合计行冻结在表格最底部；累计完成率按全量周序累计（不受月份切换影响），路基桥隧等无总工程量的项目显示「—」。
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
