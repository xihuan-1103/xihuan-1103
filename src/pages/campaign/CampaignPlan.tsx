/**
 * 百日攻坚 - 月度计划倒排（按周）
 *
 * 数据源：基础信息配置中维护的项目（自动显示，取数规则见列头说明）。
 * 周定义：上周五～本周四为一周；一周的起始日为几月，则本周属于几月；
 *         从基准日（固定 9.10）次日开始往后倒排。
 * 操作设计（周持续往后新增）：
 *   1. 周列自动生成到 max(最晚工期结束日, 今天之后4周)，随时间推进自然往后延伸；
 *   2. 「往后新增一周」按钮可手动延伸排期；
 *   3. 周计划量行内填写即保存，完成率 =（基准日工程量+截至该周计划累计）/总工程量 自动计算。
 */

import React, { useMemo, useState } from 'react';
import { M, Input, Select, SearchBar, TypePill, useToast, fmtNum } from './_shared';
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

/** 累计完成率：(基准日工程量 + 截至第 idx 周计划累计) / 总工程量 */
function cumRate(p: CampaignProject, weeks: WeekSlot[], idx: number): number | null {
  if (!p.pavementTotalQty) return null;
  const cum = (p.baseDoneValue || 0)
    + weeks.slice(0, idx + 1).reduce((s, w) => s + planOf(p, w.key), 0);
  return cum / p.pavementTotalQty;
}

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
  /** 周 → 在全量周序列中的序号（完成率按全量累计，不受月份筛选影响） */
  const allIdxMap = useMemo(() => new Map(allWeeks.map((w, i) => [w.key, i] as [string, number])), [allWeeks]);

  /* ===== 筛选 ===== */
  const [kw, setKw] = useState('');
  const [monthFilter, setMonthFilter] = useState('0');   // 0=全部
  const shownWeeks = monthFilter === '0'
    ? allWeeks
    : allWeeks.filter(w => w.month === Number(monthFilter));

  // 月份分组（保持时间顺序）
  const monthGroups = useMemo(() => {
    const map = new Map<number, WeekSlot[]>();
    for (const w of shownWeeks) {
      if (!map.has(w.month)) map.set(w.month, []);
      map.get(w.month)!.push(w);
    }
    return [...map.entries()];
  }, [shownWeeks]);

  const k = kw.trim().toLowerCase();
  const filtered = projects.filter(p => !k
    || [p.name, p.shortName, p.dept, p.region].some(s => (s || '').toLowerCase().includes(k)));

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
    toast(`已往后新增一周（手动延伸 ${extraWeeks + 1} 周），新周列已追加到表尾`, 'success');
  };

  const numInput = 'w-16 px-1.5 py-1 rounded border border-slate-300 text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none';
  const sumPlans = (p: CampaignProject) =>
    allWeeks.reduce((s, w) => s + planOf(p, w.key), 0);

  return (
    <div>
      {/* 规则说明 */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-xs text-orange-800 leading-relaxed">
        <span className="font-bold">倒排规则：</span>
        上周五～本周四为一周；一周的起始日为几月，则本周属于几月；从基准日（{base}）次日开始往后倒排。
        周计划量手动填写（单元格内直接编辑保存）；完成率 =（基准日工程量 + 截至该周计划累计）/ 路面专项总工程量，自动计算。
        周列自动随时间推进往后生成（今天之后保留 4 周），也可点击右上角「往后新增一周」手动延伸。
      </div>

      {/* 筛选 + 延伸操作 */}
      <SearchBar onAdd={extendOneWeek} addLabel="往后新增一周">
        <div className="w-64">
          <Input value={kw} onChange={setKw} placeholder="搜索项目名称 / 简称 / 项目部 / 区域" />
        </div>
        <div className="w-36">
          <Select value={monthFilter} onChange={setMonthFilter}
            options={[{ value: '0', label: `全部月份（${allWeeks.length}周）` },
              ...[...new Set(allWeeks.map(w => w.month))].map(m => ({ value: String(m), label: `${m}月` }))]} />
        </div>
        <span className="text-xs text-slate-400">基准日 {base}，共倒排 {allWeeks.length} 周</span>
      </SearchBar>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
          暂无项目数据，请先在「基础信息配置」中维护项目部项目
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className={M.table}>
              <thead>
                {/* 行1：固定列 + 月份组 */}
                <tr>
                  <th className={`${M.th} sticky left-0 z-10`} rowSpan={2}>区域</th>
                  <th className={`${M.th} sticky left-0 z-10`} rowSpan={2}>项目部</th>
                  <th className={M.th} rowSpan={2}>项目名称</th>
                  <th className={M.th} rowSpan={2}>集团内外</th>
                  <th className={M.th} rowSpan={2}>工程类型</th>
                  <th className={`${M.th} text-right`} rowSpan={2}>路面专项总工程量</th>
                  <th className={M.th} colSpan={2}>总计划工作日（按单班组）</th>
                  <th className={`${M.th} text-right`} rowSpan={2}>路面专项剩余工程量</th>
                  <th className={M.th} colSpan={2}>剩余工作日（按单班组）</th>
                  <th className={M.th} colSpan={2}>填报人员信息</th>
                  <th className={M.th} colSpan={2}>基准日</th>
                  {monthGroups.map(([m, ws]) => (
                    <th key={m} className="bg-orange-50 text-orange-800 border-b border-slate-200 px-3 py-2 text-[12px] font-bold whitespace-nowrap"
                      colSpan={ws.length * 2}>
                      剩余倒排计划产值目标（{m}月）
                    </th>
                  ))}
                </tr>
                {/* 行2：组内子表头 + 每月内先「周区间计划列」后「各周末累计完成率列」 */}
                <tr>
                  <th className={M.th}>病害工作日</th>
                  <th className={M.th}>罩面工作日</th>
                  <th className={M.th}>病害工作日</th>
                  <th className={M.th}>罩面工作日</th>
                  <th className={M.th}>姓名</th>
                  <th className={M.th}>联系号码</th>
                  <th className={M.th}>日期</th>
                  <th className={M.th}>工程量</th>
                  {monthGroups.map(([m, ws]) => (
                    <React.Fragment key={m}>
                      {ws.map(w => (
                        <th key={w.key}
                          className={`${M.th} ${w.key === curWeekKey ? '!bg-orange-100 !text-orange-800 font-bold' : ''} text-center whitespace-nowrap`}>
                          <div>{w.label}</div>
                          {w.key === curWeekKey
                            ? <div className="text-[10px] font-normal text-orange-600">本周</div>
                            : <div className="text-[10px] font-normal text-slate-400">第{w.seq}周</div>}
                        </th>
                      ))}
                      {ws.map(w => (
                        <th key={`${w.key}_rate`} className={`${M.th} text-center whitespace-nowrap`}>
                          第{w.seq}周末累计完成率%
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td className={`${M.td} text-center text-slate-400 py-10`} colSpan={14 + shownWeeks.length * 2}>未匹配到项目</td></tr>
                )}
                {filtered.map(p => {
                  const total = p.pavementTotalQty || 0;
                  const rateAt = (w: WeekSlot) => cumRate(p, allWeeks, allIdxMap.get(w.key) ?? 0);
                  return (
                    <tr key={p.id} className="hover:bg-orange-50/30 transition">
                      <td className={`${M.td} sticky left-0 z-10 bg-white whitespace-nowrap`}>{p.region || '—'}</td>
                      <td className={`${M.td} sticky left-0 z-10 bg-white whitespace-nowrap font-medium`}>{p.dept || '—'}</td>
                      <td className={`${M.td} font-medium whitespace-nowrap`}>{p.shortName || p.name}</td>
                      <td className={M.td}>{p.groupSide || '—'}</td>
                      <td className={M.td}>
                        <TypePill text={WORK_TYPE_LABELS[p.workType]} tone={p.workType === 'pavement' ? 'orange' : 'sky'} />
                      </td>
                      <td className={`${M.td} text-right font-mono`}>{total ? fmtNum(Math.round(total * 100) / 100) : '—'}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(p.diseaseTotalDays)}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(p.overlayTotalDays)}</td>
                      <td className={`${M.td} text-right font-mono`}>{p.pavementRemainQty ? fmtNum(Math.round(p.pavementRemainQty * 100) / 100) : '—'}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(p.diseaseRemainDays)}</td>
                      <td className={`${M.td} text-right font-mono`}>{fmtNum(p.overlayRemainDays)}</td>
                      <td className={M.td}>{p.reporter || '—'}</td>
                      <td className={M.td}>{p.reporterPhone || '—'}</td>
                      <td className={`${M.td} whitespace-nowrap`}>{p.baseDate}</td>
                      <td className={M.td}>
                        <input type="number" min={0} step="0.01" value={p.baseDoneValue ?? 0}
                          onChange={e => onBaseDoneChange(p, e.target.value)}
                          className={`${numInput} w-20`} />
                      </td>
                      {monthGroups.map(([m, ws]) => (
                        <React.Fragment key={m}>
                          {ws.map(w => (
                            <td key={w.key} className={`${M.td} text-center ${w.key === curWeekKey ? 'bg-orange-50/60' : ''}`}>
                              <input type="number" min={0} step="0.01" value={planOf(p, w.key) || ''}
                                placeholder="0"
                                onChange={e => onPlanChange(p, w, e.target.value)}
                                className={numInput} />
                            </td>
                          ))}
                          {ws.map(w => {
                            const r = rateAt(w);
                            return (
                              <td key={`${w.key}_rate`}
                                className={`${M.td} text-center font-mono text-xs ${w.key === curWeekKey ? 'bg-orange-50/60' : ''}`}>
                                {r === null ? '—' : `${(r * 100).toFixed(1)}%`}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  );
                })}
                {/* 合计行：周计划量合计 / 整体完成率 */}
                {filtered.length > 0 && (
                  <tr className="bg-slate-50 font-bold">
                    <td className={`${M.td} sticky left-0 z-10 bg-slate-50`} colSpan={2}>合计</td>
                    <td className={M.td}>{filtered.length} 个项目</td>
                    <td className={M.td} colSpan={2} />
                    <td className={`${M.td} text-right font-mono`}>
                      {fmtNum(Math.round(filtered.reduce((s, p) => s + (p.pavementTotalQty || 0), 0) * 100) / 100)}
                    </td>
                    <td className={M.td} colSpan={6} />
                    <td className={M.td} colSpan={2}>基准日工程量合计</td>
                    <td className={`${M.td} text-right font-mono`}>
                      {fmtNum(Math.round(filtered.reduce((s, p) => s + (p.baseDoneValue || 0), 0) * 100) / 100)}
                    </td>
                    {(() => {
                      const totalQty = filtered.reduce((s, p) => s + (p.pavementTotalQty || 0), 0);
                      return monthGroups.map(([m, ws]) => (
                      <React.Fragment key={m}>
                        {ws.map(w => (
                          <td key={w.key} className={`${M.td} text-center font-mono`}>
                            {fmtNum(Math.round(filtered.reduce((s, p) => s + planOf(p, w.key), 0) * 100) / 100)}
                          </td>
                        ))}
                        {ws.map(w => {
                          const gi = allIdxMap.get(w.key) ?? 0;
                          const cum = filtered.reduce((s, p) => s + (p.baseDoneValue || 0)
                            + allWeeks.slice(0, gi + 1).reduce((x, w2) => x + planOf(p, w2.key), 0), 0);
                          return (
                            <td key={`${w.key}_rate`} className={`${M.td} text-center font-mono`}>
                              {totalQty > 0 ? `${((cum / totalQty) * 100).toFixed(1)}%` : '—'}
                            </td>
                          );
                        })}
                      </React.Fragment>
                      ));
                    })()}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-400">
        提示：每月组内先列各周计划量（列头为周区间），后列各周末累计完成率%；橙色高亮为当前周（{curWeekKey ? allWeeks.find(w => w.key === curWeekKey)?.label : '尚未开始'}）。
        合计行为各周全部项目计划合计与整体累计完成率；剩余倒排总量参考：各项目周计划累计合计 {fmtNum(Math.round(projects.reduce((s, p) => s + sumPlans(p), 0) * 100) / 100)}。
      </div>
    </div>
  );
}
