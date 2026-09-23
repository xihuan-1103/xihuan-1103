/**
 * 计量单预览组件（计量支付报表样式）
 *  - 图一：章节汇总表（合同价及变更金额 / 到本期末完成 / 到上期末完成 / 本期完成）
 *          + 底部扣款/调整手填项（索赔/违约/考核/迟付款利息/动员预付款/材料垫付款/保留金…）+ 实际支付金额
 *  - 图二：章节子目明细表（按章节分组：项目编号/名称/单位/合同数量/累计完成占合同%/期末/上期末/本期）
 *  - editable=true 时扣款项可手填（向导第4步），否则只读预览
 */

import React from 'react';
import { M, Input, fmtNum, fmtMoney } from './_shared';
import type { MeasureStatement, MeasureStatementLine, StatementDeductions } from './types';
import { aggregateByChapter, netPayableOf, chapterName } from './measureStore';

/** 报表表格边框样式（打印风格，实线边框） */
const BC = 'border border-slate-400';
const RTH = `${M.th} ${BC} text-center font-semibold bg-slate-100 text-slate-700`;
const RTD = `${M.td} ${BC}`;
const RTD_R = `${M.td} ${BC} text-right tabular-nums`;
const RTD_C = `${M.td} ${BC} text-center`;

/** 扣款/调整手填字段（图一底部，sign: 1=增加 / -1=扣减） */
export const DEDUCTION_FIELDS: { key: keyof StatementDeductions; label: string; sign: 1 | -1 }[] = [
  { key: 'claim', label: '索赔金额', sign: -1 },
  { key: 'penalty', label: '违约罚款', sign: -1 },
  { key: 'assessmentDeduction', label: '考核扣款', sign: -1 },
  { key: 'assessmentReward', label: '考核奖励', sign: 1 },
  { key: 'lateInterest', label: '迟付款利息', sign: -1 },
  { key: 'mobilizationAdvance', label: '动员预付款', sign: 1 },
  { key: 'mobilizationAdvanceBack', label: '扣回动员预付款', sign: -1 },
  { key: 'materialAdvance', label: '材料设备垫付款', sign: 1 },
  { key: 'materialAdvanceBack', label: '扣回材料设备垫付款', sign: -1 },
  { key: 'retention', label: '保留金', sign: -1 },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ==================== 图一：章节汇总表 ==================== */

export function ChapterSummaryTable({ st, editable = false, onDeductionsChange }: {
  st: MeasureStatement;
  editable?: boolean;
  onDeductionsChange?: (d: StatementDeductions) => void;
}) {
  const aggs = aggregateByChapter(st.lines);
  const d = st.deductions || {};
  const sumBy = (f: (g: typeof aggs[0]) => number) => r2(aggs.reduce((s, g) => s + f(g), 0));
  const subtotal = sumBy(g => g.contractAmount);          // 小计·合同价
  const subtotalChange = sumBy(g => g.changeTotal);      // 小计·变更总金额
  const subtotalChanged = sumBy(g => g.changedAmount);   // 小计·变更后金额
  const subtotalEnd = sumBy(g => g.toEndAmount);         // 小计·到本期末完成
  const subtotalPrev = sumBy(g => g.prevCumAmount);       // 小计·到上期末完成
  const subtotalCur = sumBy(g => g.curAmount);            // 小计·本期完成
  const priceAdj = d.priceAdjustment || 0;
  const total = r2(subtotal + priceAdj);                  // 合计
  const net = netPayableOf(st);

  const setDed = (key: keyof StatementDeductions, v: string) => {
    onDeductionsChange?.({ ...d, [key]: Number(v) || 0 } as StatementDeductions);
  };

  return (
    <div>
      <div className={`${M.sectionTitle} !mb-1`}>
        <span className="w-1 h-4 bg-violet-500 rounded-full inline-block" />
        计量支付汇总表（按章节）
      </div>
      <table className={`${M.table} ${BC}`}>
        <thead>
          <tr>
            <th className={`${RTH} w-16`} rowSpan={2}>章节编号</th>
            <th className={RTH} rowSpan={2}>项目内容</th>
            <th className={RTH} colSpan={3}>合同价及变更金额</th>
            <th className={RTH} colSpan={2}>到本期末完成</th>
            <th className={RTH} colSpan={2}>到上期末完成</th>
            <th className={RTH} colSpan={2}>本期完成</th>
          </tr>
          <tr>
            <th className={RTH}>合同价(元)</th>
            <th className={RTH}>变更总金额(元)</th>
            <th className={RTH}>变更后金额(元)</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>其中变更(元)</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>其中变更(元)</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>其中变更(元)</th>
          </tr>
        </thead>
        <tbody>
          {aggs.map(g => (
            <tr key={g.chapter} className="hover:bg-violet-50/40">
              <td className={`${RTD_C} font-mono font-bold text-violet-700`}>{g.chapter}</td>
              <td className={RTD}>{g.name}</td>
              <td className={RTD_R}>{fmtMoney(g.contractAmount)}</td>
              <td className={RTD_R}>{fmtMoney(g.changeTotal)}</td>
              <td className={RTD_R}>{fmtMoney(g.changedAmount)}</td>
              <td className={`${RTD_R} font-medium`}>{fmtMoney(g.toEndAmount)}</td>
              <td className={RTD_R}>{fmtMoney(g.curChange)}</td>
              <td className={RTD_R}>{fmtMoney(g.prevCumAmount)}</td>
              <td className={RTD_R}>{fmtMoney(g.curChange)}</td>
              <td className={`${RTD_R} font-bold text-violet-700`}>{fmtMoney(g.curAmount)}</td>
              <td className={RTD_R}>{fmtMoney(g.curChange)}</td>
            </tr>
          ))}
          {aggs.length === 0 && (
            <tr><td className={`${RTD_C} text-slate-400 py-6`} colSpan={11}>暂无计量明细行</td></tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td className={`${RTD_C}`} colSpan={2}>小计</td>
            <td className={RTD_R}>{fmtMoney(subtotal)}</td>
            <td className={RTD_R}>{fmtMoney(subtotalChange)}</td>
            <td className={RTD_R}>{fmtMoney(subtotalChanged)}</td>
            <td className={RTD_R}>{fmtMoney(subtotalEnd)}</td>
            <td className={RTD_R}>{fmtMoney(0)}</td>
            <td className={RTD_R}>{fmtMoney(subtotalPrev)}</td>
            <td className={RTD_R}>{fmtMoney(0)}</td>
            <td className={RTD_R}>{fmtMoney(subtotalCur)}</td>
            <td className={RTD_R}>{fmtMoney(0)}</td>
          </tr>
          <tr>
            <td className={`${RTD_C} bg-slate-50`} colSpan={2}>价格调整</td>
            <td className={RTD_R} colSpan={3}>{editable
              ? <input type="number" step="0.01" value={d.priceAdjustment ?? 0}
                  onChange={e => setDed('priceAdjustment', e.target.value)}
                  className="w-32 px-2 py-1 border border-slate-300 rounded text-right text-sm tabular-nums focus:ring-1 focus:ring-violet-500 outline-none" />
              : fmtMoney(priceAdj)}</td>
            <td className={RTD_R} colSpan={6}>合计：<b className="text-slate-900">{fmtMoney(total)}</b></td>
          </tr>
        </tbody>
      </table>

      {/* 图一底部：扣款/调整项 + 实际支付金额 */}
      <div className="mt-3">
        <table className={`${M.table} ${BC}`}>
          <thead>
            <tr>
              <th className={`${RTH} w-56`}>项目</th>
              <th className={RTH}>到本期末完成金额(元)</th>
              <th className={RTH}>到上期末完成金额(元)</th>
              <th className={RTH}>本期完成金额(元)</th>
            </tr>
          </thead>
          <tbody>
            {DEDUCTION_FIELDS.map(f => (
              <tr key={f.key} className="hover:bg-violet-50/40">
                <td className={RTD}>
                  {f.label}
                  {f.sign < 0 && <span className="ml-1 text-[11px] text-rose-500">(扣)</span>}
                  {f.sign > 0 && <span className="ml-1 text-[11px] text-emerald-600">(加)</span>}
                </td>
                <td className={RTD_R}>—</td>
                <td className={RTD_R}>—</td>
                <td className={RTD_R}>
                  {editable
                    ? <input type="number" step="0.01" value={(d as any)[f.key] ?? 0}
                        onChange={e => setDed(f.key, e.target.value)}
                        className="w-36 px-2 py-1 border border-slate-300 rounded text-right text-sm tabular-nums focus:ring-1 focus:ring-violet-500 outline-none" />
                    : fmtMoney((d as any)[f.key] || 0)}
                </td>
              </tr>
            ))}
            <tr className="bg-violet-50 font-bold">
              <td className={RTD}>实际支付金额</td>
              <td className={RTD_R}>—</td>
              <td className={RTD_R}>—</td>
              <td className={`${RTD_R} text-violet-700 text-base`}>{fmtMoney(net)}</td>
            </tr>
          </tbody>
        </table>
        {editable && (
          <div className="mt-1.5 text-[11px] text-slate-400">
            实际支付金额 = 本期完成合计 + Σ增加项 − Σ扣减项，当前为 <b className="text-violet-600">{fmtMoney(net)}</b>；扣款项在确认创建前可随时修改，创建后随计量单存档。
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== 图二：章节子目明细表 ==================== */

/** 行数据派生 */
function lineDerived(l: MeasureStatementLine) {
  const endQty = r2(l.prevCumQty + l.qty);
  const endAmount = r2(l.prevCumAmount + l.amount);
  const pct = l.contractQty && l.contractQty > 0
    ? `${((endQty / l.contractQty) * 100).toFixed(2)}%` : '—';
  return { endQty, endAmount, pct };
}

export function ChapterDetailTable({ chapter, chapterLabel, lines, st }: {
  chapter: string;
  chapterLabel: string;
  lines: MeasureStatementLine[];
  st: Pick<MeasureStatement, 'code' | 'periodNo' | 'periodEnd'>;
}) {
  const sum = (f: (l: MeasureStatementLine) => number) => r2(lines.reduce((s, l) => s + f(l), 0));
  return (
    <div className="mb-5">
      {/* 章节表头信息（图二样式） */}
      <div className="flex items-center justify-between text-xs text-slate-600 mb-1 px-0.5">
        <span>清单编号：<b className="font-mono">{chapter || '—'}</b>（{chapterLabel}）</span>
        <span>支付期号：<b className="font-mono">{st.code}</b></span>
        <span>第 {st.periodNo} 期</span>
        <span>截止日期：{st.periodEnd || '—'}</span>
      </div>
      <table className={`${M.table} ${BC}`}>
        <thead>
          <tr>
            <th className={`${RTH} w-24`} rowSpan={2}>项目编号</th>
            <th className={RTH} rowSpan={2}>项目名称</th>
            <th className={`${RTH} w-16`} rowSpan={2}>计量单位</th>
            <th className={RTH} colSpan={3}>合同数量</th>
            <th className={`${RTH} w-24`} rowSpan={2}>累计完成占合同(%)</th>
            <th className={RTH} colSpan={2}>到本期末完成</th>
            <th className={RTH} colSpan={2}>到上期末完成</th>
            <th className={RTH} colSpan={2}>本期完成</th>
          </tr>
          <tr>
            <th className={RTH}>单价(元)</th>
            <th className={RTH}>数量</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>数量</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>数量</th>
            <th className={RTH}>金额(元)</th>
            <th className={RTH}>数量</th>
            <th className={RTH}>金额(元)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(l => {
            const dv = lineDerived(l);
            return (
              <tr key={l.id} className={`hover:bg-violet-50/40 ${l.manual ? 'bg-amber-50/40' : ''}`}>
                <td className={`${RTD_C} font-mono text-violet-700`}>
                  {l.code}
                  {l.manual && <div className="text-[10px] text-amber-600">手动新增</div>}
                </td>
                <td className={RTD}>
                  {l.name}
                  {l.isSafeFee && <span className="ml-1 text-[10px] text-cyan-700">[安全生产费]</span>}
                </td>
                <td className={RTD_C}>{l.unit}</td>
                <td className={RTD_R}>{fmtNum(l.price)}</td>
                <td className={RTD_R}>{fmtNum(l.contractQty)}</td>
                <td className={RTD_R}>{l.contractQty ? fmtMoney(r2(l.contractQty * l.price)) : '—'}</td>
                <td className={RTD_C}>{dv.pct}</td>
                <td className={RTD_R}>{fmtNum(dv.endQty)}</td>
                <td className={`${RTD_R} font-medium`}>{fmtMoney(dv.endAmount)}</td>
                <td className={RTD_R}>{fmtNum(l.prevCumQty)}</td>
                <td className={RTD_R}>{fmtMoney(l.prevCumAmount)}</td>
                <td className={`${RTD_R} font-bold text-violet-700`}>{fmtNum(l.qty)}</td>
                <td className={`${RTD_R} font-medium text-violet-700`}>{fmtMoney(l.amount)}</td>
              </tr>
            );
          })}
          <tr className="bg-slate-50 font-bold">
            <td className={RTD_C} colSpan={2}>本章小计</td>
            <td className={RTD}>—</td>
            <td className={RTD}>—</td>
            <td className={RTD_R}>{fmtNum(sum(l => l.contractQty || 0))}</td>
            <td className={RTD_R}>{fmtMoney(sum(l => (l.contractQty || 0) * l.price))}</td>
            <td className={RTD}>—</td>
            <td className={RTD_R}>{fmtNum(sum(l => l.prevCumQty + l.qty))}</td>
            <td className={RTD_R}>{fmtMoney(sum(l => l.prevCumAmount + l.amount))}</td>
            <td className={RTD_R}>{fmtNum(sum(l => l.prevCumQty))}</td>
            <td className={RTD_R}>{fmtMoney(sum(l => l.prevCumAmount))}</td>
            <td className={RTD_R}>{fmtNum(sum(l => l.qty))}</td>
            <td className={`${RTD_R} text-violet-700`}>{fmtMoney(sum(l => l.amount))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** 图二：按章节分组渲染全部明细 */
export function ChapterDetailTables({ st }: { st: MeasureStatement }) {
  const groups = new Map<string, MeasureStatementLine[]>();
  for (const l of st.lines) {
    const ch = l.chapter;
    if (!groups.has(ch)) groups.set(ch, []);
    groups.get(ch)!.push(l);
  }
  const chapters = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  if (chapters.length === 0) {
    return <div className="text-center text-slate-400 py-6 text-sm border border-dashed border-slate-300 rounded-lg">暂无子目明细</div>;
  }
  return (
    <div>
      <div className={`${M.sectionTitle} !mb-2`}>
        <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
        计量子目明细（按章节归类）
      </div>
      {chapters.map(ch => (
        <ChapterDetailTable key={ch} chapter={ch} chapterLabel={chapterName(ch)}
          lines={groups.get(ch)!} st={st} />
      ))}
    </div>
  );
}

/* ==================== 计量单完整预览 ==================== */

export default function StatementPreview({ st, editable = false, onDeductionsChange }: {
  st: MeasureStatement;
  editable?: boolean;
  onDeductionsChange?: (d: StatementDeductions) => void;
}) {
  return (
    <div className="bg-white">
      {/* 报表头 */}
      <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
        <h2 className="text-lg font-bold text-slate-900">工程价款计量支付报表</h2>
        <div className="text-sm text-slate-700 mt-1">
          （第 {st.periodNo} 期 · {st.period}{st.periodStart && st.periodEnd ? ` · 计量时段 ${st.periodStart} ~ ${st.periodEnd}` : ''}）
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-4">
        <div>合同名称：<b>{st.contractName}</b></div>
        <div>合同编号：<b className="font-mono">{st.contractCode}</b></div>
        <div>业主（批复方）：{st.ownerName}</div>
        <div>项目部：{st.projectName}</div>
        <div>批复路径：{st.ownerType === 'jtou' ? '交投系统推送批复' : '系统内自闭环批复'}</div>
        <div>经办技术员：{st.handler}</div>
      </div>

      {/* 图一：章节汇总 */}
      <ChapterSummaryTable st={st} editable={editable} onDeductionsChange={onDeductionsChange} />

      {/* 图二：章节明细 */}
      <div className="mt-5">
        <ChapterDetailTables st={st} />
      </div>

      {/* 批复信息 */}
      {st.status === 'approved' && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="text-xs text-emerald-700/70">批复金额</div>
            <div className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(st.approvedAmount)}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <div className="text-xs text-rose-700/70">扣款</div>
            <div className="text-lg font-bold text-rose-600 tabular-nums">{fmtMoney(st.deduction || 0)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">批复时间 / 意见</div>
            <div className="text-sm font-bold text-slate-700">{st.approvedAt}</div>
            <div className="text-xs text-slate-500">{st.approveOpinion || '-'}</div>
          </div>
        </div>
      )}

      {/* 签字栏 */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-300 text-center text-sm text-slate-600">
        <div className="pb-8">技术员：{st.handler}</div>
        <div className="pb-8">内部审核：</div>
        <div className="pb-8">监理审核：</div>
        <div className="pb-8">业主批复：</div>
      </div>
    </div>
  );
}
