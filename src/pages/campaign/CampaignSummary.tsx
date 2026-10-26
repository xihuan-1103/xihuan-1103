/**
 * 百日攻坚总表 · 攻坚汇总
 *  - 数据来源：Excel "浙江交科养护集团2026年百日攻坚台账V3.2.xlsx" 百日攻坚总表 sheet
 *  - 按区域分组展示，列分组表头（4 组共 21 列）
 *  - 区域可展开/收起
 *  - 顶部 KPI 汇总（总金额 / 累计完成 / 完成率 / 本周完成 / 按期 / 滞后 / 已完成）
 *  - 列分组：基本信息(5列) · 金额进度(7列) · 工效预警(5列) · 当前进度(4列)
 *  - 进度类字段（理论完成率/进度偏差/进度预警/距完工天数/还需天数/能否按期）按当前日期动态计算
 */
import React, { useMemo, useState } from 'react';
import { M, TypePill } from './_shared';
import {
  getSummaryRows, groupSummaryByRegion, regionSummaryOf,
  theoryRateOf, schedDevOf, schedWarnOf, daysLeftOf, needDaysOf, onTimeOf,
} from './campaignStore';
import type { CampaignSummaryRow } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (r: number | null) => r === null ? '—' : `${(r * 100).toFixed(1)}%`;
const devCls = (d: number | string) =>
  typeof d === 'string' ? 'text-sky-600 font-semibold'
  : d >= 0 ? 'text-emerald-600' : d < -0.2 ? 'text-rose-600 font-semibold' : 'text-amber-600';
const devPct = (d: number | string) =>
  typeof d === 'string' ? d : `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;
const fmtAmt = (n: number) => r2(n).toLocaleString();

/** 理论完成率/进度偏差等进度类字段统一走 campaignStore 动态计算（theoryRateOf/schedDevOf/...） */

/**
 * 工效预警（动态计算，不取种子 warn 快照）：
 *  - 病害：本周病害施工天数>0（工效为数字）且工效<300 → 偏低；≥300 → 正常
 *  - 罩面：本周罩面施工天数>0（工效为数字）且工效<800 → 偏低；≥800 → 正常
 *  - 组合：两者都偏低 → "病害、罩面工效偏低"；其一偏低 → 对应预警；有施工且均正常 → "正常"；均无施工 → "无施工"
 */
const effWarnOf = (r: CampaignSummaryRow): string => {
  const dLow = typeof r.weekDiseaseEff === 'number' && r.weekDiseaseEff < 300;
  const oLow = typeof r.weekOverlayEff === 'number' && r.weekOverlayEff < 800;
  if (dLow && oLow) return '病害、罩面工效偏低';
  if (dLow) return '病害工效偏低';
  if (oLow) return '罩面工效偏低';
  if (typeof r.weekDiseaseEff !== 'number' && typeof r.weekOverlayEff !== 'number') return '无施工';
  return '正常';
};

function effPill(v: number | string) {
  if (typeof v === 'string') return <span className="text-slate-400">{v}</span>;
  return <span className="font-mono">{r2(v)}</span>;
}

function warnPill(text: string) {
  if (text === '无施工') return <TypePill text="无施工" tone="slate" />;
  if (text === '正常') return <TypePill text="正常" tone="emerald" />;
  if (text.includes('偏低')) return <TypePill text={text} tone="rose" />;
  return <TypePill text={text} tone="amber" />;
}

/** 进度预警：已完工(sky)/正常施工(绿)/轻微滞后(黄)/滞后(橙)/严重滞后(红) */
function schedWarnPill(text: string) {
  if (text === '已完工') return <TypePill text="已完工" tone="sky" />;
  if (text === '正常施工') return <TypePill text="正常施工" tone="emerald" />;
  if (text === '轻微滞后') return <TypePill text="轻微滞后" tone="amber" />;
  if (text === '滞后') return <TypePill text="滞后" tone="orange" />;
  if (text === '严重滞后') return <TypePill text="严重滞后" tone="rose" />;
  return <TypePill text={text} tone="slate" />;
}

function onTimePill(text: string) {
  if (text === '按期') return <TypePill text="按期" tone="emerald" />;
  if (text === '不能按期') return <TypePill text="滞后" tone="rose" />;
  if (text === '已完工') return <TypePill text="已完工" tone="sky" />;
  return <TypePill text={text} tone="slate" />;
}

/** 区域展开/收起的分组表格 */
function RegionGroup({
  region, rows, index, defaultOpen,
}: { region: string; rows: CampaignSummaryRow[]; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = regionSummaryOf(rows);

  return (
    <div className="mb-3 border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* 区域头 */}
      <button onClick={() => setOpen(!open)}
        className={`w-full px-4 py-2.5 flex items-center gap-2 text-left transition ${
          index % 2 ? 'bg-orange-50/60' : 'bg-slate-50/60'} hover:bg-orange-50 cursor-pointer`}>
        <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${
          open ? 'bg-orange-500 text-white' : 'bg-orange-200 text-orange-700'}`}>
          {open ? '−' : '+'}
        </span>
        <span className="font-bold text-slate-800 text-[15px]">{region}</span>
        <span className="text-xs text-slate-500">{s.projectCount} 个项目</span>
        <span className="mx-3 w-px h-4 bg-slate-300" />
        <span className="text-xs text-slate-500">总金额</span>
        <span className="font-mono font-semibold text-slate-800">{fmtAmt(s.totalAmt)} 万</span>
        <span className="mx-3 w-px h-4 bg-slate-300" />
        <span className="text-xs text-slate-500">累计完成</span>
        <span className="font-mono font-semibold text-orange-600">{fmtAmt(s.cumDone)} 万</span>
        <span className="text-xs text-slate-400 ml-1">· {pct(s.doneRate)}</span>
        <span className="mx-3 w-px h-4 bg-slate-300" />
        <span className="text-xs text-slate-500">本周</span>
        <span className="font-mono font-semibold text-slate-700">{fmtAmt(s.weekValue)} 万</span>
        <span className="ml-auto text-xs text-slate-400">
          按期 <span className="text-emerald-600 font-semibold">{s.onTimeCount}</span> ·
          滞后 <span className="text-rose-600 font-semibold">{s.lagCount}</span> ·
          已完 <span className="text-sky-600 font-semibold">{s.doneCount}</span>
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr className="bg-white">
                <th className={M.th}>序号</th>
                <th className={M.th}>区域</th>
                <th className={M.th}>项目部</th>
                <th className={M.th}>路段/项目</th>
                <th className={M.th}>集团内外</th>

                <th className={`${M.th} text-right`}>总金额(万)</th>
                <th className={`${M.th} text-right`}>剩余金额(万)</th>
                <th className={`${M.th} text-right`}>累计完成(万)</th>
                <th className={`${M.th} text-right`}>完成率</th>
                <th className={`${M.th} text-right`}>理论完成率</th>
                <th className={`${M.th} text-right`}>进度偏差</th>
                <th className={`${M.th} text-right`}>本周产值(万)</th>

                <th className={`${M.th} text-right`}>本周病害吨</th>
                <th className={`${M.th} text-right`}>本周罩面吨</th>
                <th className={`${M.th} text-right`}>病害工效</th>
                <th className={`${M.th} text-right`}>罩面工效</th>
                <th className={M.th}>工效预警</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const tRate = theoryRateOf(r);
                const sDev = schedDevOf(r);
                const dLeft = daysLeftOf(r);
                const nDays = needDaysOf(r);
                return (
                <tr key={r.seq} className={`hover:bg-orange-50/40 transition ${i % 2 ? 'bg-slate-50/40' : ''}`}>
                  <td className={`${M.td} font-mono text-slate-500 w-12`}>{r.seq}</td>
                  <td className={`${M.td} w-14`}>
                    <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[11px] font-medium">{r.region}</span>
                  </td>
                  <td className={M.td}>{r.dept}</td>
                  <td className={`${M.td} font-medium text-slate-900 min-w-[140px]`}>{r.road}</td>
                  <td className={M.td}>
                    <TypePill text={r.groupSide} tone={r.groupSide === '集团外' ? 'slate' : 'cyan'} />
                  </td>

                  <td className={`${M.td} text-right tabular-nums`}>{fmtAmt(r.totalAmt)}</td>
                  <td className={`${M.td} text-right tabular-nums ${r.remainAmt > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {r.remainAmt > 0 ? fmtAmt(r.remainAmt) : '—'}
                  </td>
                  <td className={`${M.td} text-right tabular-nums font-semibold text-orange-600`}>{fmtAmt(r.cumDone)}</td>
                  <td className={`${M.td} text-right tabular-nums ${r.doneRate >= 0.999 ? 'text-sky-600 font-semibold' : r.doneRate < 0.5 ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>
                    {pct(r.doneRate)}
                  </td>
                  <td className={`${M.td} text-right tabular-nums text-slate-600`}>
                    {tRate !== null ? pct(tRate) : '/'}
                  </td>
                  <td className={`${M.td} text-right tabular-nums font-semibold ${sDev === null ? 'text-slate-400' : devCls(sDev)}`}>
                    {sDev === null ? '/' : devPct(sDev)}
                  </td>
                  <td className={`${M.td} text-right tabular-nums text-slate-700`}>{r.weekValue > 0 ? fmtAmt(r.weekValue) : '—'}</td>

                  <td className={`${M.td} text-right tabular-nums`}>{r.weekDiseaseTon > 0 ? fmtAmt(r.weekDiseaseTon) : '—'}</td>
                  <td className={`${M.td} text-right tabular-nums`}>{r.weekOverlayTon > 0 ? fmtAmt(r.weekOverlayTon) : '—'}</td>
                  <td className={`${M.td} text-right tabular-nums`}>{effPill(r.weekDiseaseEff)}</td>
                  <td className={`${M.td} text-right tabular-nums`}>{effPill(r.weekOverlayEff)}</td>
                  <td className={M.td}>{warnPill(effWarnOf(r))}</td>

                  {/* 当前进度（按最新数据动态计算） */}
                  <td className={M.td}>{schedWarnPill(schedWarnOf(r))}</td>
                  <td className={`${M.td} text-right tabular-nums ${typeof dLeft === 'number' && dLeft < 0 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                    {dLeft ?? '/'}
                  </td>
                  <td className={`${M.td} text-right tabular-nums text-slate-500`}>{nDays ?? '/'}</td>
                  <td className={M.td}>{onTimePill(onTimeOf(r))}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CampaignSummary() {
  const rows = useMemo(() => getSummaryRows(), []);
  const regionMap = useMemo(() => groupSummaryByRegion(rows), [rows]);
  const regions = useMemo(() => Array.from(regionMap.keys()), [regionMap]);

  const totalAll = useMemo(() => {
    const dataRows = rows.filter(r => !r._isSummary);
    const totalAmt = dataRows.reduce((s, r) => s + r.totalAmt, 0);
    const cumDone = dataRows.reduce((s, r) => s + r.cumDone, 0);
    const weekValue = dataRows.reduce((s, r) => s + r.weekValue, 0);
    const weekDT = dataRows.reduce((s, r) => s + (typeof r.weekDiseaseTon === 'number' ? r.weekDiseaseTon : 0), 0);
    const weekOT = dataRows.reduce((s, r) => s + (typeof r.weekOverlayTon === 'number' ? r.weekOverlayTon : 0), 0);
    return { totalAmt, cumDone, weekValue, weekDT, weekOT };
  }, [rows]);

  const doneRateAll = totalAll.totalAmt > 0 ? totalAll.cumDone / totalAll.totalAmt : null;
  const onTimeCount = rows.filter(r => !r._isSummary && onTimeOf(r) === '按期').length;
  const lagCount = rows.filter(r => !r._isSummary && onTimeOf(r) === '不能按期').length;
  const doneCount = rows.filter(r => !r._isSummary && r.doneRate >= 1).length;

  return (
    <div className="p-5 space-y-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded" />
            百日攻坚总表
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            数据口径：各项目部日报 + 计划倒排 + 汇总台账 · 共 {rows.filter(r => !r._isSummary).length} 个项目 · {regions.length} 个区域
          </p>
        </div>
        <div className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
          攻坚汇总 · 系统自动汇总
        </div>
      </div>

      {/* 顶部 KPI 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: '项目总数', value: `${rows.filter(r => !r._isSummary).length}`, sub: `${regions.length} 个区域`, cls: 'text-slate-900' },
          { label: '总金额（万元）', value: fmtAmt(totalAll.totalAmt), sub: '合同总额', cls: 'text-orange-600' },
          { label: '累计完成（万元）', value: fmtAmt(totalAll.cumDone), sub: `完成率 ${pct(doneRateAll)}`, cls: 'text-emerald-600' },
          { label: '本周完成（万元）', value: fmtAmt(totalAll.weekValue), sub: `病害 ${fmtAmt(totalAll.weekDT)} 吨 · 罩面 ${fmtAmt(totalAll.weekOT)} 吨`, cls: 'text-cyan-600' },
          { label: '按期项目', value: `${onTimeCount}`, sub: '进度正常', cls: 'text-emerald-600' },
          { label: '滞后项目', value: `${lagCount}`, sub: '需重点调度', cls: lagCount > 0 ? 'text-rose-600' : 'text-slate-400' },
          { label: '已完成项目', value: `${doneCount}`, sub: '攻坚收官', cls: 'text-sky-600' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5">
            <div className="text-xs text-slate-500 mb-1">{c.label}</div>
            <div className={`text-lg font-bold ${c.cls}`}>{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 区域分组总表 */}
      {regions.map((rg, idx) => (
        <RegionGroup key={rg} region={rg} rows={regionMap.get(rg) || []} index={idx} defaultOpen={idx < 3} />
      ))}
    </div>
  );
}
