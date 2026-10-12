/**
 * 批复管理（系统内自行维护计量批复）
 *  - 不再推送交投系统：所有计量单（含交投业主合同）统一在系统内维护计量批复
 *  - 待批复计量单按合同归集展示：合同头显示基本信息（编号/业主/项目部/合同金额）
 *    与累计批复金额、收款金额；合同下展示待批复计量单的技术信息（计量时段/申报金额/实际支付/经办）
 *  - 点击「维护批复」→ 打开原计量单弹窗（直接在计量单上操作，两步向导）：
 *    · 第 1 步（计量清单明细）：按下报明细清单调整行「批复计量量」（默认 = 上报值，批复金额自动 = 批复量 × 单价）
 *    · 第 2 步（计量单预览表）：核对计量支付汇总表，在考核/扣款行维护「批复计量金额」（新单选择行 / 老单固定字段），
 *      得出最终批复金额（默认 = 批复后实际支付金额，随批复值联动），维护批复意见 + 上传批复附件后确认
 *  - 弹窗加大（接近全屏），表格压缩间距避免横向滚动
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  M, Modal, Input, Textarea, Select, SearchBar, StatementStatusPill, useToast, fmtMoney,
} from './_shared';
import type { MeasureStatement } from './types';
import {
  getStatements, getMeasureContracts, getPayments, maintainApprove, netPayableOf, deductionsNet,
} from './measureStore';
import { StatementHeader, ChapterSummaryTable, ChapterDetailTables } from './StatementPreview';

interface Props { key?: string | number; onRefresh?: () => void; }

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function MeasureApproval({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const statements = useMemo(() => getStatements(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);
  const payments = useMemo(() => getPayments(), [version]);

  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');   // 计量时间（按计量单创建时间）：仅作为搜索条件

  // 批复维护弹窗（两步向导：① 调整计量明细 ② 预览计量总表 / 维护批复金额）
  const [approveOpen, setApproveOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [approving, setApproving] = useState<MeasureStatement | null>(null);
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});          // 行 id → 批复计量量
  const [assessApproved, setAssessApproved] = useState<Record<string, number>>({});  // 考核项 itemId → 批复计量金额
  const [dedApproved, setDedApproved] = useState<Record<string, number>>({});     // 老单固定扣款字段 key → 批复计量金额
  const [form, setForm] = useState({ approvedAmount: 0, opinion: '' });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attInput, setAttInput] = useState('');

  // 只看待批复/批复中的台账（submitted / approving）
  const filtered = statements.filter(s => {
    if (month && (s.createdAt || '').slice(0, 7) !== month) return false;
    if (status && s.status !== status) return false;
    return true;
  });
  const pendingList = filtered.filter(s => s.status === 'submitted' || s.status === 'approving');

  // 待批复计量单按合同归集（合同头显示基本信息 + 累计批复金额 + 收款金额）
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const byContract: [string, MeasureStatement[]][] = (() => {
    const map = new Map<string, MeasureStatement[]>();
    for (const s of pendingList) {
      if (!map.has(s.contractId)) map.set(s.contractId, []);
      map.get(s.contractId)!.push(s);
    }
    return [...map.entries()];
  })();

  // 调试/直达：?detail=<id或单号> 自动打开维护批复弹窗
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('detail');
    if (!q) return;
    const s = statements.find(x => x.id === q || x.code === q);
    if (s && (s.status === 'submitted' || s.status === 'approving')) {
      openDetail(s);
      if (new URLSearchParams(window.location.search).get('step') === '2') setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 打开计量单弹窗：直接在原计量单上维护批复（明细行批复计量量 + 考核项批复计量金额 + 最终批复金额/意见/附件） */
  const openDetail = (s: MeasureStatement) => {
    const qtys: Record<string, number> = {};
    s.lines.forEach(l => { qtys[l.id] = l.approvedQty ?? l.qty; });
    setLineQtys(qtys);
    setAssessApproved({});
    setDedApproved({});
    setForm({
      approvedAmount: s.approvedAmount
        ?? r2(s.lines.reduce((sum, l) => sum + (l.approvedQty ?? l.qty) * l.price, 0) + deductionsNet(s.deductions, s.assessLines)),
      opinion: s.approveOpinion || '',
    });
    setAttachments(s.attachments || []);
    setAttInput('');
    setApproving(s);
    setStep(1);
    setApproveOpen(true);
  };

  /** 批复口径默认金额 = 行批复合计 + 批复考核净额（老单无考核选择行时按固定扣款字段批复值） */
  const defaultAmountOf = (q: Record<string, number>, a: Record<string, number>, dd: Record<string, number>) => {
    if (!approving) return 0;
    const lineTotal = r2(approving.lines.reduce((s, l) => s + (q[l.id] ?? l.qty) * l.price, 0));
    return r2(lineTotal + deductionsNet(approving.deductions, approving.assessLines, a, dd));
  };
  /** 明细行调整批复计量量 → 联动最终批复金额默认值 */
  const applyQty = (id: string, v: number) => {
    const q = { ...lineQtys, [id]: v };
    setLineQtys(q);
    setForm(f => ({ ...f, approvedAmount: defaultAmountOf(q, assessApproved, dedApproved) }));
  };
  /** 考核/扣款项调整批复计量金额 → 联动最终批复金额默认值 */
  const applyAssess = (itemId: string, v: number) => {
    const a = { ...assessApproved, [itemId]: v };
    setAssessApproved(a);
    setForm(f => ({ ...f, approvedAmount: defaultAmountOf(lineQtys, a, dedApproved) }));
  };
  /** 老单固定扣款字段调整批复计量金额 → 联动最终批复金额默认值 */
  const applyDed = (key: string, v: number) => {
    const dd = { ...dedApproved, [key]: v };
    setDedApproved(dd);
    setForm(f => ({ ...f, approvedAmount: defaultAmountOf(lineQtys, assessApproved, dd) }));
  };

  const doApprove = () => {
    if (!approving) return;
    const err = maintainApprove(approving.id, {
      approved: true,
      lineQtys,
      assessApproved,
      dedApproved,
      approvedAmount: Number(form.approvedAmount) || 0,
      opinion: form.opinion,
      attachments,
    });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setApproveOpen(false);
    toast('批复完成：批复计量量与考核批复金额已写入计量单，计量凭证已自动生成', 'success');
  };

  const doReject = () => {
    if (!approving) return;
    const err = maintainApprove(approving.id, { approved: false });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setApproveOpen(false);
    toast('已驳回：台账回到已驳回状态，可重新编辑申报（上报量已释放）', 'success');
  };

  const addAttachment = () => {
    const name = attInput.trim();
    if (!name) return;
    if (attachments.includes(name)) { toast('该附件已存在', 'error'); return; }
    setAttachments([...attachments, name]);
    setAttInput('');
  };

  return (
    <div className="p-5">
      <SearchBar>
        <Input type="month" value={month} onChange={setMonth} placeholder="计量时间" className="!w-44" />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-36"
          options={[
            { value: 'submitted', label: '已申报·待批复' },
            { value: 'approving', label: '批复中' },
          ]} />
      </SearchBar>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
        <h3 className="font-bold text-sm text-slate-800">待批复计量单（按合同归集）</h3>
        <span className="text-xs text-slate-500">{byContract.length} 个合同 · {pendingList.length} 期待批复 · 全部在系统内维护计量批复</span>
      </div>

      <div className="space-y-3">
        {byContract.map(([cid, rows]) => {
          const first = rows[0];
          const c = contracts.find(x => x.id === cid);
          const open = !collapsed[cid];
          // 累计批复金额：该合同全部已批复计量单的批复金额合计
          const approvedTotal = statements
            .filter(s => s.contractId === cid && s.status === 'approved')
            .reduce((s, x) => s + (x.approvedAmount || 0), 0);
          // 收款金额：该合同回款流水合计
          const paidTotal = payments
            .filter(p => p.contractCode === first.contractCode)
            .reduce((s, p) => s + p.amount, 0);
          return (
            <div key={cid} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* 合同头（点击展开/收起该合同下的待批复计量单） */}
              <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 cursor-pointer select-none flex items-center gap-4 hover:bg-amber-50"
                onClick={() => setCollapsed(x => ({ ...x, [cid]: !x[cid] }))}>
                <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800">{first.contractName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {first.contractCode} · {first.projectName} · 业主：{first.ownerName}
                    {c ? ` · 合同金额：${fmtMoney(c.amount)}` : ''}
                  </div>
                </div>
                <div className="text-xs text-slate-500 whitespace-nowrap">{rows.length} 期待批复</div>
                <div className="w-32 text-right hidden lg:block">
                  <div className="text-[11px] text-slate-400">累计批复金额</div>
                  <div className="text-sm font-bold text-slate-700 tabular-nums">{fmtMoney(approvedTotal)}</div>
                </div>
                <div className="w-32 text-right hidden lg:block">
                  <div className="text-[11px] text-slate-400">收款金额</div>
                  <div className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(paidTotal)}</div>
                </div>
                <span className="text-xs text-slate-400">{open ? '收起 ▲' : '展开 ▼'}</span>
              </div>
              {/* 该合同下的待批复计量单（技术信息 + 维护批复操作） */}
              {open && (
                <div className="overflow-x-auto">
                  <table className={M.table}>
                    <thead>
                      <tr>
                        <th className={M.th}>计量单号</th>
                        <th className={`${M.th} text-center`}>计量期数</th>
                        <th className={M.th}>计量时间</th>
                        <th className={`${M.th} text-right`}>申报金额(元)</th>
                        <th className={`${M.th} text-right`}>申报实际支付(元)</th>
                        <th className={`${M.th} text-center`}>明细行数</th>
                        <th className={M.th}>经办技术员</th>
                        <th className={`${M.th} text-center`}>状态</th>
                        <th className={`${M.th} text-center`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map(s => (
                        <tr key={s.id} className="hover:bg-amber-50/40 transition-colors cursor-pointer" onClick={() => openDetail(s)}>
                          <td className={M.td}>
                            <div className="font-mono font-medium text-violet-700">{s.code}</div>
                          </td>
                          <td className={`${M.td} text-center font-medium`}>第 {s.periodNo} 期</td>
                          <td className={M.td}>
                            <div className="text-sm text-slate-700">{s.createdAt}</div>
                          </td>
                          <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(s.totalAmount)}</td>
                          <td className={`${M.td} text-right tabular-nums text-violet-700`}>{fmtMoney(netPayableOf(s))}</td>
                          <td className={`${M.td} text-right tabular-nums`}>{s.lines.length} 行</td>
                          <td className={M.td}>{s.handler}</td>
                          <td className={`${M.td} text-center`}><StatementStatusPill status={s.status} /></td>
                          <td className={`${M.td} text-center`} onClick={e => e.stopPropagation()}>
                            <button className={M.button.tinyViolet} onClick={() => openDetail(s)}>维护批复</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {byContract.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">暂无待批复的计量单</div>
        )}
        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
          说明：待批复计量单按合同归集展示，合同头显示基本信息与累计批复金额、收款金额；点击合同头可展开/收起，在计量单上点击「维护批复」进入两步批复流程（① 调整计量明细清单 ② 预览计量总表 / 维护批复金额）。
        </div>
      </div>

      {/* 计量单详情 / 维护批复弹窗（两步向导：① 调整计量明细 ② 预览计量总表 / 维护批复金额） */}
      <Modal
        title={`维护计量批复 - ${approving?.code || ''}`}
        open={approveOpen} onClose={() => setApproveOpen(false)} width="max-w-[1600px]"
        footer={step === 1 ? (
          <>
            <button className={M.button.ghost} onClick={() => setApproveOpen(false)}>取消</button>
            <button className={M.button.primary} onClick={() => setStep(2)}>下一步：预览计量总表 →</button>
          </>
        ) : (
          <>
            <button className={M.button.danger} onClick={doReject}>驳回</button>
            <button className={M.button.ghost} onClick={() => setStep(1)}>← 上一步：调整明细</button>
            <button className={M.button.primary} onClick={doApprove}>确认批复</button>
          </>
        )}>
        {approving && (() => {
          const approveCtl = {
            lineQtys,
            onLineQtyChange: applyQty,
            assessApproved,
            onAssessApprovedChange: applyAssess,
            dedApproved,
            onDedApprovedChange: applyDed,
          };
          const net = netPayableOf(approving);
          const diff = r2((Number(form.approvedAmount) || 0) - net);
          const lineTotalApproved = r2(approving.lines.reduce((s, l) => s + (lineQtys[l.id] ?? l.qty) * l.price, 0));
          // 压缩表格间距（大弹窗内多列明细表不产生横向滚动）
          const tight = '[&_table]:text-xs [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!px-2 [&_td]:!py-1.5 [&_input]:!w-20 [&_input]:!px-1.5 [&_input]:!py-0.5 [&_input]:!text-xs';
          return (
            <div className="space-y-3">
              {/* 步骤条 */}
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>① 调整计量明细清单</span>
                <span className="text-slate-300">→</span>
                <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>② 预览计量总表 · 维护批复金额</span>
              </div>

              {step === 1 ? (
                <>
                  <StatementHeader st={approving} />
                  <div className="text-xs text-slate-500">
                    第 1 步：按下报的计量明细清单调整各行「批复计量量」（默认 = 上报计量量；批复金额 = 批复量 × 单价，自动计算，超上报量会红字提示）。
                  </div>
                  <div className={`border border-slate-200 rounded-lg p-3 bg-slate-50/40 ${tight}`}>
                    <ChapterDetailTables st={approving} approve={approveCtl} />
                  </div>
                  <div className="flex items-center justify-end gap-6 text-sm px-1">
                    <span className="text-slate-500">申报金额合计：<b className="text-slate-700">{fmtMoney(approving.totalAmount)}</b></span>
                    <span className="text-slate-500">行批复合计（按批复计量量）：<b className="text-violet-700">{fmtMoney(lineTotalApproved)}</b></span>
                  </div>
                </>
              ) : (
                <>
                  <StatementHeader st={approving} />
                  <div className="text-xs text-slate-500">
                    第 2 步：核对计量支付汇总表，在考核/扣款行维护「批复计量金额」（默认 = 本期完成金额）；最终批复金额随批复值自动联动，可调整。
                  </div>
                  <div className={`border border-slate-200 rounded-lg p-3 bg-slate-50/40 ${tight}`}>
                    <ChapterSummaryTable st={approving} approve={approveCtl} />
                  </div>

                  {/* 最终批复金额 + 批复意见 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={M.label}>最终批复金额(元) *（默认 = 批复后实际支付金额，可调整；与申报实际支付金额差额计为扣款）</label>
                      <Input type="number" step="0.01" min={0}
                        value={form.approvedAmount}
                        onChange={v => setForm({ ...form, approvedAmount: Number(v) || 0 })} />
                      {diff < 0 && (
                        <div className="text-xs text-rose-600 mt-1">将识别扣款：{fmtMoney(Math.abs(diff))}</div>
                      )}
                    </div>
                    <div>
                      <label className={M.label}>批复意见 / 扣款说明</label>
                      <Textarea value={form.opinion} onChange={v => setForm({ ...form, opinion: v })}
                        placeholder="如：现场复核扣减 XX 元（厚度不足）" />
                    </div>
                  </div>

                  {/* 批复附件 */}
                  <div>
                    <label className={M.label}>批复附件（业主批复单 / 现场复核记录等）</label>
                    <div className="flex gap-2">
                      <Input value={attInput} onChange={setAttInput} placeholder="输入附件名称后添加（如：9月计量批复单.pdf）" />
                      <button className={M.button.ghost} onClick={addAttachment}>+ 添加</button>
                    </div>
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {attachments.map(a => (
                          <div key={a} className="flex items-center justify-between gap-2 bg-violet-50/60 border border-violet-100 rounded-md px-3 py-1.5">
                            <span className="text-sm text-slate-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full inline-block" />
                              {a}
                            </span>
                            <button className="text-rose-500 hover:text-rose-700 text-xs"
                              onClick={() => setAttachments(attachments.filter(x => x !== a))}>移除</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 leading-relaxed">
                    确认批复后：行级批复计量量、考核/扣款批复金额与最终批复金额写入计量单，自动对比识别扣款、回写数据池批复量并生成计量凭证进入应收流程。
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
