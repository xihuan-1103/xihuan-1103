/**
 * 计量单创建向导（分步，从合同发起计量）
 *  Step1 选择合同 → Step2 选择并调整计量子目（同一操作：勾选合同清单子目 + 行内调整数量/变更金额，
 *             新增子目一律从合同清单勾选，按章节分组显示，支持时间段筛选完成量）
 *  → Step3 预览计量单（图一章节汇总+图二明细）+ 手填扣款项 → 确认创建
 *
 * 使用方式：父组件条件渲染（<StatementWizard .../>），每次打开即全新实例；
 * 编辑草稿时传入 initial（从 Step2 进入，可回退调整）。
 */

import React, { useMemo, useState } from 'react';
import { M, Input, TypePill, useToast, fmtNum, fmtMoney } from './_shared';
import type { MeasureStatement, MeasureStatementLine, StatementDeductions } from './types';
import {
  getPool, getMeasureContracts, upsertStatement, nextPeriodNo, nextStatementCode,
  canMeasure, unreportedQty, periodBuiltQty, prevCumulative,
  chapterOf, chapterName, summarizeLines, genId, nowStr, builtQty,
} from './measureStore';
import StatementPreview from './StatementPreview';

interface Props {
  onClose: () => void;
  onDone: () => void;
  initial?: MeasureStatement | null;   // 编辑草稿
  defaultContractId?: string;         // 从合同入口直接发起：预选合同，跳过 Step1
}

const STEPS = [
  { n: 1, label: '选择合同' },
  { n: 2, label: '选择并调整子目' },
  { n: 3, label: '预览与确认' },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const monthFirst = () => `${todayStr().slice(0, 7)}-01`;

export default function StatementWizard({ onClose, onDone, initial, defaultContractId }: Props) {
  const isEdit = !!initial;
  const toast = useToast();

  const pool = useMemo(() => getPool(), []);
  const contracts = useMemo(() => getMeasureContracts(), []);

  const [step, setStep] = useState(isEdit ? 2 : defaultContractId ? 2 : 1);
  const [contractId, setContractId] = useState(initial?.contractId || defaultContractId || '');
  const [periodStart, setPeriodStart] = useState(initial?.periodStart || monthFirst());
  const [periodEnd, setPeriodEnd] = useState(initial?.periodEnd || todayStr());
  const [lines, setLines] = useState<MeasureStatementLine[]>(
    initial ? initial.lines.map(l => ({ ...l })) : []);
  const [deductions, setDeductions] = useState<StatementDeductions>(initial?.deductions || {});
  const [handler, setHandler] = useState(initial?.handler || '陈技术');
  const [remark, setRemark] = useState(initial?.remark || '');

  const contract = contracts.find(c => c.id === contractId);

  /* ===== Step2：新增子目（从合同清单选择）+ 已选列表编辑 ===== */

  const [pickKw, setPickKw] = useState('');

  /** 新增子目候选：该合同下可计量（正式·合同内）且未选入本期计量单的子目，按章节分组 */
  const pickChapters = useMemo(() => {
    if (!contractId) return [] as [string, typeof pool][];
    const k = pickKw.trim().toLowerCase();
    const items = pool.filter(p => p.contractId === contractId && canMeasure(p)
      && !lines.some(l => l.poolItemId === p.id)
      && (!k || p.code.toLowerCase().includes(k) || p.name.toLowerCase().includes(k)));
    const map = new Map<string, typeof pool>();
    for (const p of items) {
      const ch = chapterOf(p.code);
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch)!.push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pool, contractId, lines, pickKw]);

  /** 时间段变更：重算已选（非手动）行的默认量 */
  const setRange = (from: string, to: string) => {
    setPeriodStart(from);
    setPeriodEnd(to);
    setLines(prev => prev.map(l => {
      if (l.manual || !l.poolItemId) return l;
      const p = pool.find(x => x.id === l.poolItemId);
      if (!p) return l;
      const qty = Math.max(0, Math.min(periodBuiltQty(p, from, to), unreportedQty(p)));
      return { ...l, qty, amount: r2(qty * l.price) };
    }));
  };

  /** 从合同清单添加子目到本期计量单（新增子目一律从该合同的合同清单中选择，不可自行创建） */
  const addItem = (p: typeof pool[0]) => {
    const qty = Math.max(0, Math.min(periodBuiltQty(p, periodStart, periodEnd), unreportedQty(p)));
    const prev = prevCumulative(p.contractId, p.id, periodStart);
    setLines(prevLines => [...prevLines, {
      id: genId('msl'), poolItemId: p.id, chapter: chapterOf(p.code),
      code: p.code, name: p.name, unit: p.unit, price: p.price,
      contractQty: p.totalQty, changeAmount: 0,
      qty, amount: r2(qty * p.price),
      prevCumQty: prev.qty, prevCumAmount: prev.amount,
      isSafeFee: p.isSafeFee,
    }]);
  };

  /** 行内调整：修改数量/变更金额（勾选行） */
  const updateLine = (id: string, patch: Partial<MeasureStatementLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const nl = { ...l, ...patch };
      return { ...nl, amount: r2((nl.qty || 0) * (nl.price || 0)) };
    }));
  };
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  /* ===== Step3：组装与确认 ===== */

  const buildSt = (): MeasureStatement => {
    const c = contracts.find(x => x.id === contractId)!;
    const period = periodStart.slice(0, 7);
    const { totalAmount, safeFeeAmount } = summarizeLines(lines);
    return {
      id: initial?.id || genId('ms'),
      code: initial?.code || nextStatementCode(period),
      period, periodNo: initial?.periodNo || nextPeriodNo(contractId, period),
      periodStart, periodEnd,
      contractId, contractCode: c.code, contractName: c.name,
      projectName: c.projectName, ownerType: c.ownerType, ownerName: c.ownerName,
      lines, totalAmount, safeFeeAmount, deductions,
      status: 'draft', handler, remark,
      createdAt: initial?.createdAt || nowStr(), updatedAt: nowStr(),
    };
  };

  const validateLines = (): boolean => {
    if (lines.length === 0) { toast('请从合同清单中勾选至少一行计量子目', 'error'); return false; }
    for (const l of lines) {
      if (l.qty <= 0) { toast(`子目 ${l.code} 本期数量必须大于 0`, 'error'); return false; }
    }
    return true;
  };

  /** 超出未上报计量量的子目（允许超出，仅标记提示） */
  const exceededLines = lines.filter(l => {
    if (l.manual || !l.poolItemId) return false;
    const p = pool.find(x => x.id === l.poolItemId);
    return !!p && l.qty > unreportedQty(p);
  });

  const confirmCreate = () => {
    if (!validateLines()) return;
    upsertStatement(buildSt());
    onDone();
    if (exceededLines.length > 0) {
      toast(`计量单已创建（草稿）。注意：${exceededLines.length} 项子目本期数量超出未上报计量量（${exceededLines.map(l => l.code).join('、')}）`, 'info');
    } else {
      toast('计量单已创建（草稿），可提交批复', 'success');
    }
  };

  const goNext = () => {
    if (step === 1 && !contractId) { toast('请选择合同', 'error'); return; }
    if (step === 2 && !validateLines()) return;
    if (step === 2 && exceededLines.length > 0) {
      toast(`提示：${exceededLines.length} 项子目本期数量超出未上报计量量（${exceededLines.map(l => l.code).join('、')}），将按填写的数量计入计量单`, 'info');
    }
    setStep(s => Math.min(3, s + 1));
  };
  const goPrev = () => setStep(s => Math.max(1, s - 1));

  const curTotal = r2(lines.reduce((s, l) => s + l.amount, 0));

  /* ===== 渲染 ===== */

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        {/* 头部：标题 + 步骤条 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-base">
              {isEdit ? `编辑计量单 ${initial?.code}` : '发起计量（创建计量单）'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
          </div>
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition
                    ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className={`text-xs font-medium ${step === s.n ? 'text-violet-700' : 'text-slate-500'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${step > s.n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6">
          {/* ===== Step1 选择合同 ===== */}
          {step === 1 && (
            <div>
              <div className="text-sm text-slate-500 mb-3">请选择要发起计量的收入合同（数据池中仅正式·合同内子目可计量）：</div>
              <div className="grid grid-cols-1 gap-3">
                {contracts.map(c => {
                  const items = pool.filter(p => p.contractId === c.id && canMeasure(p));
                  const unrep = items.reduce((s, p) => s + unreportedQty(p) * p.price, 0);
                  const on = contractId === c.id;
                  return (
                    <button key={c.id} onClick={() => setContractId(c.id)}
                      className={`text-left rounded-xl border-2 p-4 transition ${on
                        ? 'border-violet-500 bg-violet-50/60 shadow-sm' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {c.code} · {c.projectName} · 合同额 {fmtMoney(c.amount)}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            业主：{c.ownerName}
                            {c.ownerType === 'jtou' ? '（交投·推送批复）' : '（其他·自闭环批复）'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">可计量子目</div>
                          <div className="text-xl font-bold text-violet-600 tabular-nums">{items.length} <span className="text-xs font-normal">项</span></div>
                          <div className="text-xs text-orange-600 mt-0.5">未上报价值 {fmtMoney(unrep)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== Step2 选择并调整子目（新增子目从合同清单选择，选中后上方列表可编辑） ===== */}
          {step === 2 && contract && (
            <div className="space-y-4">
              <div className="bg-violet-50/60 border border-violet-100 rounded-lg p-3 text-sm">
                <b className="text-slate-800">{contract.name}</b>
                <span className="text-slate-500 font-mono text-xs ml-2">{contract.code} · {contract.projectName}</span>
              </div>

              {/* 时间段 */}
              <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-lg p-4">
                <div>
                  <label className={M.label}>计量时间段 起 *</label>
                  <Input type="date" value={periodStart} onChange={v => setRange(v, periodEnd)} className="!w-40" />
                </div>
                <div className="pb-2 text-slate-400">~</div>
                <div>
                  <label className={M.label}>止（截止日期）*</label>
                  <Input type="date" value={periodEnd} onChange={v => setRange(periodStart, v)} className="!w-40" />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <button className={M.button.tinyViolet} onClick={() => setRange(monthFirst(), todayStr())}>本月</button>
                  <button className={M.button.tiny} onClick={() => {
                    const d = new Date(); d.setDate(0);
                    const p = (n: number) => String(n).padStart(2, '0');
                    const ym = `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
                    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                    setRange(`${ym}-01`, `${ym}-${p(last)}`);
                  }}>上月</button>
                </div>
                <div className="ml-auto text-xs text-slate-500 pb-2">
                  从下方合同清单添加子目默认带出该时间段完成量（≤未上报计量量），添加后在上方已选列表中编辑数量
                </div>
              </div>

              {/* 已选计量子目（选中后在此显示，可编辑数量） */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-violet-50/60 border-b border-violet-100 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1 h-4 bg-violet-500 rounded-full inline-block" />
                    已选计量子目
                  </div>
                  <div className="text-xs text-slate-500">
                    共 <b className="text-violet-700">{lines.length}</b> 项 · 本期金额合计 <b className="text-violet-700">{fmtMoney(curTotal)}</b>
                    {exceededLines.length > 0 && (
                      <span className="ml-2 text-rose-600">⚠ {exceededLines.length} 项超出未上报计量量（{exceededLines.map(l => l.code).join('、')}），允许计量，已标记</span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className={M.table}>
                    <thead>
                      <tr>
                        <th className={M.th}>章节</th>
                        <th className={M.th}>子目号</th>
                        <th className={M.th}>子目名称</th>
                        <th className={`${M.th} text-right`}>单价(元)</th>
                        <th className={`${M.th} text-right`}>合同数量</th>
                        <th className={`${M.th} w-28 text-right`}>本期数量</th>
                        <th className={`${M.th} text-right`}>本期金额(元)</th>
                        <th className={`${M.th} w-24 text-right`}>变更金额(元)</th>
                        <th className={`${M.th} text-right`}>上期末累计量/额</th>
                        <th className={`${M.th} text-center`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.length === 0 && (
                        <tr><td colSpan={10} className={`${M.td} text-center text-slate-400 py-8`}>
                          暂未选择子目，请从下方「新增子目」的合同清单中添加
                        </td></tr>
                      )}
                      {lines.map(l => {
                        const p = pool.find(x => x.id === l.poolItemId);
                        const over = !l.manual && !!p && l.qty > unreportedQty(p);   // 本期数量超出未上报计量量（允许，仅标记提示）
                        return (
                          <tr key={l.id} className={l.manual ? 'bg-amber-50/40' : over ? 'bg-rose-50' : 'bg-violet-50/40'}>
                            <td className={`${M.td} font-mono text-slate-500`}>{l.chapter || '—'}</td>
                            <td className={`${M.td} font-mono text-violet-700`}>
                              {l.code}
                              {l.manual && <span className="ml-1"><TypePill text="手动" tone="amber" /></span>}
                              {!l.manual && over && <div className="mt-0.5"><TypePill text="超未上报量" tone="rose" /></div>}
                            </td>
                            <td className={`${M.td} font-medium`}>
                              {l.name}
                              {l.isSafeFee && <span className="ml-1"><TypePill text="安全生产费" tone="cyan" /></span>}
                            </td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(l.price)}</td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(l.contractQty)}</td>
                            <td className={M.td}>
                              <input type="number" step="any" value={l.qty}
                                onChange={e => updateLine(l.id, { qty: Number(e.target.value) || 0 })}
                                className={`w-24 px-2 py-1 border rounded-md text-right text-sm tabular-nums outline-none focus:ring-1
                                  ${over ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-violet-500'}`} />
                              {over && p && (
                                <div className="text-[10px] text-rose-600 leading-tight mt-0.5 whitespace-nowrap">
                                  超出未上报量 {fmtNum(unreportedQty(p))}
                                </div>
                              )}
                            </td>
                            <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(l.amount)}</td>
                            <td className={M.td}>
                              <input type="number" step="0.01" value={l.changeAmount || 0}
                                onChange={e => updateLine(l.id, { changeAmount: Number(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 border border-slate-300 rounded-md text-right text-sm tabular-nums focus:ring-1 focus:ring-violet-500 outline-none" />
                            </td>
                            <td className={`${M.td} text-right tabular-nums text-slate-500`}>
                              {fmtNum(l.prevCumQty)} / {fmtMoney(l.prevCumAmount)}
                            </td>
                            <td className={`${M.td} text-center`}>
                              <button className="px-2 py-1 rounded text-[12px] border border-rose-300 text-rose-600 hover:bg-rose-50 transition"
                                onClick={() => removeLine(l.id)}>移除</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 新增子目：从该合同的合同清单中选择（不可自行创建） */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-1 h-4 bg-slate-400 rounded-full inline-block" />
                    新增子目
                    <span className="text-xs font-normal text-slate-400">从该合同的合同清单中选择，不可自行创建</span>
                  </div>
                  <Input value={pickKw} onChange={setPickKw} placeholder="子目号 / 名称" className="!w-44" />
                </div>
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className={M.table}>
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className={M.th}>子目号</th>
                        <th className={M.th}>子目名称</th>
                        <th className={`${M.th} text-right`}>单价(元)</th>
                        <th className={`${M.th} text-right`}>合同数量</th>
                        <th className={`${M.th} text-right`}>已施工</th>
                        <th className={`${M.th} text-right`}>该时段完成</th>
                        <th className={`${M.th} text-right`}>未上报计量量</th>
                        <th className={`${M.th} text-center`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pickChapters.length === 0 && (
                        <tr><td colSpan={8} className={`${M.td} text-center text-slate-400 py-8`}>
                          该合同下暂无可添加的可计量（正式·合同内）子目{lines.length > 0 ? '（已全部选入）' : ''}
                        </td></tr>
                      )}
                      {pickChapters.map(([ch, items]) => (
                        <React.Fragment key={ch || 'other'}>
                          {/* 章节层级行 */}
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="px-3 py-1.5">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <span className="w-1 h-3 bg-violet-400 rounded-full inline-block" />
                                章节 {ch || '—'} · {chapterName(ch)}
                                <span className="text-slate-400 font-normal">
                                  （{items.length} 子目 · 合同价 {fmtMoney(items.reduce((s, p) => s + (p.totalQty || 0) * p.price, 0))}）
                                </span>
                              </div>
                            </td>
                          </tr>
                          {items.map(p => {
                            const pb = periodBuiltQty(p, periodStart, periodEnd);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className={`${M.td} font-mono text-violet-700`}>{p.code}</td>
                                <td className={`${M.td} font-medium`}>
                                  {p.name}
                                  {p.isSafeFee && <span className="ml-1"><TypePill text="安全生产费" tone="cyan" /></span>}
                                </td>
                                <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.price)}</td>
                                <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.totalQty)}</td>
                                <td className={`${M.td} text-right tabular-nums`}>{fmtNum(builtQty(p))}</td>
                                <td className={`${M.td} text-right tabular-nums ${pb > 0 ? 'font-bold text-violet-700' : 'text-slate-400'}`}>
                                  {pb > 0 ? fmtNum(pb) : '—'}
                                </td>
                                <td className={`${M.td} text-right tabular-nums font-medium text-orange-600`}>{fmtNum(unreportedQty(p))}</td>
                                <td className={`${M.td} text-center`}>
                                  <button className={M.button.tinyViolet} onClick={() => addItem(p)}>+ 添加</button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-xs text-slate-400">
                新增子目从该合同的合同清单中选择（仅正式·合同内子目，不可自行创建），添加后默认带出该时间段完成量（≤未上报计量量）并显示在上方已选列表中编辑数量；
                本期数量允许超过未上报计量量，超出子目将标记提示；该时段无完成量的子目添加后请手动填写本期数量
              </div>
            </div>
          )}

          {/* ===== Step3 预览 + 手填 ===== */}
          {step === 3 && contract && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 bg-white border border-slate-200 rounded-lg p-4">
                <div>
                  <label className={M.label}>经办技术员</label>
                  <Input value={handler} onChange={setHandler} />
                </div>
                <div className="col-span-2">
                  <label className={M.label}>备注</label>
                  <Input value={remark} onChange={setRemark} placeholder="选填" />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-slate-500 leading-relaxed">
                    确认后计量单以<b>草稿</b>存档，可在计量台账列表提交批复
                  </div>
                </div>
              </div>
              <StatementPreview st={buildSt()} editable onDeductionsChange={setDeductions} />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-xl">
          <div className="text-xs text-slate-500">
            {step === 2 && (exceededLines.length > 0
              ? <span>计量时段 {periodStart} ~ {periodEnd} · 已选 {lines.length} 项 · 本期金额合计 {fmtMoney(curTotal)} · <span className="text-rose-600 font-medium">⚠ {exceededLines.length} 项超出未上报计量量（已标记，允许计量）</span></span>
              : `计量时段 ${periodStart} ~ ${periodEnd} · 已选 ${lines.length} 项 · 本期金额合计 ${fmtMoney(curTotal)}`)}
            {step === 3 && (exceededLines.length > 0
              ? <span className="text-rose-600">⚠ {exceededLines.length} 项子目本期数量超出未上报计量量（{exceededLines.map(l => l.code).join('、')}），确认后将按填写数量创建</span>
              : '实际支付金额 = 本期完成 + 调整 − 扣款')}
          </div>
          <div className="flex gap-2">
            <button className={M.button.ghost} onClick={onClose}>取消</button>
            {step > 1 && <button className={M.button.ghost} onClick={goPrev}>上一步</button>}
            {step < 3 && <button className={M.button.primary} onClick={goNext}>下一步</button>}
            {step === 3 && <button className={M.button.primary} onClick={confirmCreate}>确认并创建计量单</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
