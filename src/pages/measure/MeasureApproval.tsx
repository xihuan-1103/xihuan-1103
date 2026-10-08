/**
 * 批复管理（系统内自行维护计量批复）
 *  - 不再推送交投系统：所有计量单（含交投业主合同）统一在系统内维护计量批复
 *  - 待批复列表点击「维护批复」→ 打开计量单详情弹窗：
 *    · 清单明细：章节 / 子目 / 单价 / 计量数量 / 计量批复数量（默认 = 计量数量，可逐行调整）/ 批复金额（自动 = 批复数量 × 单价）
 *    · 维护该计量单最终批复金额（默认 = 行批复合计 + 扣款净额）+ 批复意见 + 上传批复附件
 *  - 审批链（方案 5.3）：内部审核 → 监理审核 → 业主批复
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Textarea, Select, SearchBar, StatementStatusPill, useToast, fmtNum, fmtMoney,
} from './_shared';
import type { MeasureStatement } from './types';
import {
  getStatements, getMeasureContracts, maintainApprove, netPayableOf, deductionsNet,
} from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function MeasureApproval({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const statements = useMemo(() => getStatements(), [version]);

  const [ownerType, setOwnerType] = useState('');
  const [status, setStatus] = useState('');

  // 批复维护弹窗
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState<MeasureStatement | null>(null);
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ approvedAmount: 0, opinion: '' });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attInput, setAttInput] = useState('');

  // 只看待批复/批复中的台账（submitted / approving）
  const filtered = statements.filter(s => {
    if (ownerType && s.ownerType !== ownerType) return false;
    if (status && s.status !== status) return false;
    return true;
  });
  const pendingList = filtered.filter(s => s.status === 'submitted' || s.status === 'approving');

  /** 打开计量单详情弹窗：维护批复（清单明细 + 最终批复金额 + 批复意见 + 附件） */
  const openDetail = (s: MeasureStatement) => {
    const qtys: Record<string, number> = {};
    s.lines.forEach(l => { qtys[l.id] = l.approvedQty ?? l.qty; });
    setLineQtys(qtys);
    setForm({
      approvedAmount: s.approvedAmount
        ?? r2(s.lines.reduce((sum, l) => sum + (l.approvedQty ?? l.qty) * l.price, 0) + deductionsNet(s.deductions)),
      opinion: s.approveOpinion || '',
    });
    setAttachments(s.attachments || []);
    setAttInput('');
    setApproving(s);
    setApproveOpen(true);
  };

  const doApprove = () => {
    if (!approving) return;
    const err = maintainApprove(approving.id, {
      approved: true,
      lineQtys,
      approvedAmount: Number(form.approvedAmount) || 0,
      opinion: form.opinion,
      attachments,
    });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setApproveOpen(false);
    toast('批复完成：行级批复数量与最终批复金额已维护，计量凭证已自动生成', 'success');
  };

  const doReject = () => {
    if (!approving) return;
    const err = maintainApprove(approving.id, { approved: false });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setApproveOpen(false);
    toast('已驳回：台账回到已驳回状态，可重新编辑申报（上报量已释放）', 'success');
  };

  /** 行批复金额 = 批复数量 × 单价 */
  const lineAmt = (l: MeasureStatement['lines'][0]) =>
    r2((lineQtys[l.id] ?? l.qty) * l.price);
  /** 行批复合计 */
  const lineTotal = r2((approving?.lines || []).reduce((s, l) => s + lineAmt(l), 0));

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
        <Select value={ownerType} onChange={setOwnerType} placeholder="全部业主" className="!w-36"
          options={[{ value: 'jtou', label: '交投业主' }, { value: 'other', label: '其他业主' }]} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-36"
          options={[
            { value: 'submitted', label: '已申报·待批复' },
            { value: 'approving', label: '批复中' },
          ]} />
      </SearchBar>

      {/* 待批复列表 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
          <h3 className="font-bold text-sm text-slate-800">待批复计量单</h3>
          <span className="text-xs text-slate-500">{pendingList.length} 期 · 全部在系统内维护计量批复（不再推送交投）</span>
        </div>
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>台账编号</th>
                <th className={M.th}>合同 / 业主</th>
                <th className={`${M.th} text-center`}>审批链</th>
                <th className={`${M.th} text-right`}>申报金额(元)</th>
                <th className={`${M.th} text-right`}>明细行数</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingList.map(s => (
                <tr key={s.id} className="hover:bg-amber-50/40 transition-colors cursor-pointer" onClick={() => openDetail(s)}>
                  <td className={M.td}>
                    <div className="font-mono font-medium text-violet-700">{s.code}</div>
                    <div className="text-xs text-slate-500">{s.period} · 第 {s.periodNo} 期 · {s.projectName}</div>
                  </td>
                  <td className={M.td}>
                    <div className="font-medium text-slate-800">{s.contractName}</div>
                    <div className="text-xs text-slate-500">{s.ownerName}</div>
                  </td>
                  <td className={`${M.td} text-center text-xs text-slate-500`}>
                    内审 <span className="text-emerald-600">✓</span> → 监理 <span className="text-emerald-600">✓</span> → <span className="text-amber-600">业主批复中</span>
                  </td>
                  <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(s.totalAmount)}</td>
                  <td className={`${M.td} text-right tabular-nums`}>{s.lines.length} 行</td>
                  <td className={`${M.td} text-center`}><StatementStatusPill status={s.status} /></td>
                  <td className={`${M.td} text-center`} onClick={e => e.stopPropagation()}>
                    <button className={M.button.tinyViolet} onClick={() => openDetail(s)}>维护批复</button>
                  </td>
                </tr>
              ))}
              {pendingList.length === 0 && (
                <tr><td colSpan={7} className={`${M.td} text-center text-slate-400 py-8`}>暂无待批复的计量单</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 计量单详情 / 维护批复弹窗 */}
      <Modal
        title={`维护计量批复 - ${approving?.code || ''}`}
        open={approveOpen} onClose={() => setApproveOpen(false)} width="max-w-4xl"
        footer={<>
          <button className={M.button.danger} onClick={doReject}>驳回</button>
          <button className={M.button.ghost} onClick={() => setApproveOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doApprove}>确认批复</button>
        </>}>
        {approving && (() => {
          const net = netPayableOf(approving);
          const diff = r2((Number(form.approvedAmount) || 0) - net);
          return (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">计量单</span><b className="font-mono">{approving.code}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">合同 / 期间</span><span>{approving.contractName} · {approving.period}（第 {approving.periodNo} 期）</span></div>
                <div className="flex justify-between"><span className="text-slate-500">业主</span><span>{approving.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">本期申报金额</span><b className="tabular-nums text-violet-700">{fmtMoney(approving.totalAmount)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">实际支付金额（申报 + 扣款净额）</span><b className="tabular-nums">{fmtMoney(net)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">明细行数</span><span>{approving.lines.length} 行（含安全生产费 {fmtMoney(approving.safeFeeAmount)}）</span></div>
              </div>

              {/* 清单明细：计量数量 + 计量批复数量 */}
              <div>
                <div className={`${M.sectionTitle} !mb-1`}>
                  <span className="w-1 h-4 bg-violet-500 rounded-full inline-block" />
                  清单明细（计量批复数量默认 = 计量数量，可逐行调整；批复金额 = 批复数量 × 单价）
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[42vh] overflow-y-auto">
                  <table className={M.table}>
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className={M.th}>章节</th>
                        <th className={M.th}>子目号 / 名称</th>
                        <th className={`${M.th} text-center`}>单位</th>
                        <th className={`${M.th} text-right`}>单价(元)</th>
                        <th className={`${M.th} text-right`}>计量数量</th>
                        <th className={`${M.th} w-28 text-right`}>计量批复数量</th>
                        <th className={`${M.th} text-right`}>批复金额(元)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approving.lines.map(l => {
                        const aq = lineQtys[l.id] ?? l.qty;
                        const over = aq > l.qty;
                        return (
                          <tr key={l.id} className={over ? 'bg-rose-50' : 'hover:bg-violet-50/40'}>
                            <td className={`${M.td} font-mono text-slate-500`}>{l.chapter || '—'}</td>
                            <td className={M.td}>
                              <div className="font-mono text-violet-700">{l.code}</div>
                              <div className="text-xs text-slate-600">{l.name}
                                {l.isSafeFee && <span className="ml-1 text-[10px] text-cyan-700">[安全生产费]</span>}
                              </div>
                            </td>
                            <td className={`${M.td} text-center`}>{l.unit}</td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(l.price)}</td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(l.qty)}</td>
                            <td className={M.td}>
                              <input type="number" step="any" min={0} value={aq}
                                onChange={e => {
                                  const v = Number(e.target.value) || 0;
                                  setLineQtys(q => ({ ...q, [l.id]: v }));
                                  // 同步行批复合计 → 最终批复金额默认值（行批复合计 + 扣款净额）
                                  const lt = r2(approving.lines.reduce((s, x) => s + (x.id === l.id ? v : (lineQtys[x.id] ?? x.qty)) * x.price, 0));
                                  setForm(f => ({ ...f, approvedAmount: r2(lt + deductionsNet(approving.deductions)) }));
                                }}
                                className={`w-24 px-2 py-1 border rounded-md text-right text-sm tabular-nums outline-none focus:ring-1
                                  ${over ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-violet-500'}`} />
                              {over && (
                                <div className="text-[10px] text-rose-600 leading-tight mt-0.5 whitespace-nowrap">超过计量数量</div>
                              )}
                            </td>
                            <td className={`${M.td} text-right tabular-nums font-medium text-violet-700`}>
                              {fmtMoney(lineAmt(l))}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold">
                        <td className={M.td} colSpan={4}>合计</td>
                        <td className={`${M.td} text-right tabular-nums`}>{fmtNum(approving.lines.reduce((s, l) => s + l.qty, 0))}</td>
                        <td className={`${M.td} text-right tabular-nums text-emerald-700`}>{fmtNum(approving.lines.reduce((s, l) => s + (lineQtys[l.id] ?? l.qty), 0))}</td>
                        <td className={`${M.td} text-right tabular-nums text-violet-700`}>{fmtMoney(lineTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 最终批复金额 + 批复意见 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={M.label}>最终批复金额(元) *（默认 = 行批复合计 + 扣款净额，可调整；与实际支付金额差额计为扣款）</label>
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
                确认批复后：行级批复数量与最终批复金额写入计量单，自动对比识别扣款、回写数据池批复量并生成计量凭证进入应收流程。
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
