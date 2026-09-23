/**
 * 批复管理（方案 5.2 两条路径）
 *  - 交投业主：与交投系统打通 →「推送交投批复」→ 等待回传 →「批复回传」录入批复金额 → 批复与申报自动对比识别扣款
 *  - 其他业主：系统内自闭环 →「自闭环批复」直接录入批复结果（批准/驳回）
 *  - 审批链（方案 5.3）：内部审核 → 监理审核 → 业主批复
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Textarea, Select, SearchBar, StatementStatusPill, TypePill, useToast, fmtNum, fmtMoney,
} from './_shared';
import type { MeasureStatement } from './types';
import {
  getStatements, getMeasureContracts, pushToOwner, jtouApprove, selfApprove, netPayableOf,
} from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function MeasureApproval({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const statements = useMemo(() => getStatements(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);

  const [ownerType, setOwnerType] = useState('');
  const [status, setStatus] = useState('');

  // 批复弹窗（交投回传 / 其他业主自闭环共用）
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState<MeasureStatement | null>(null);
  const [form, setForm] = useState({ approvedAmount: 0, opinion: '', rejectReason: '' });

  // 只看待批复/批复中的台账（submitted / approving），同时提供已批复的历史对比
  const filtered = statements.filter(s => {
    if (ownerType && s.ownerType !== ownerType) return false;
    if (status && s.status !== status) return false;
    return true;
  });
  const pendingList = filtered.filter(s => s.status === 'submitted' || s.status === 'approving');
  const historyList = filtered.filter(s => s.status === 'approved' || s.status === 'rejected');

  const openApprove = (s: MeasureStatement) => {
    setApproving(s);
    setForm({ approvedAmount: netPayableOf(s), opinion: '', rejectReason: '' });
    setApproveOpen(true);
  };

  const doPush = (s: MeasureStatement) => {
    const err = pushToOwner(s.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`计量数据已推送交投养护管理平台（${s.code}），等待批复结果回传`, 'success');
  };

  const doApprove = () => {
    if (!approving) return;
    if (approving.ownerType === 'jtou') {
      const err = jtouApprove(approving.id, {
        approvedAmount: Number(form.approvedAmount) || 0, opinion: form.opinion,
      });
      if (err) { toast(err, 'error'); return; }
      refresh();
      setApproveOpen(false);
      toast('交投批复结果已回传：已批复，扣款对比已生成，计量单已自动创建', 'success');
    } else {
      if (!form.rejectReason && Number(form.approvedAmount) !== approving.totalAmount && Number(form.approvedAmount) >= 0) {
        // 允许调整金额（自闭环常见）
      }
      const err = selfApprove(approving.id, {
        approved: true, approvedAmount: Number(form.approvedAmount) || 0, opinion: form.opinion,
      });
      if (err) { toast(err, 'error'); return; }
      refresh();
      setApproveOpen(false);
      toast('自闭环批复完成：已批复，计量单已自动创建', 'success');
    }
  };

  const doReject = () => {
    if (!approving) return;
    if (!form.rejectReason.trim()) { toast('请填写驳回原因', 'error'); return; }
    const err = selfApprove(approving.id, {
      approved: false, rejectReason: form.rejectReason,
    });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setApproveOpen(false);
    toast('已驳回：台账回到已驳回状态，可重新编辑申报（上报量已释放）', 'success');
  };

  const pushCount = pendingList.filter(s => s.ownerType === 'jtou').length;
  const selfCount = pendingList.filter(s => s.ownerType === 'other').length;

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">待批复（交投推送）</div>
          <div className="text-2xl font-bold text-sky-600 tabular-nums">{pushCount} <span className="text-sm font-normal text-slate-400">期</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">待批复（其他自闭环）</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{selfCount} <span className="text-sm font-normal text-slate-400">期</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">本期待批金额</div>
          <div className="text-2xl font-bold text-violet-600 tabular-nums">
            {fmtMoney(pendingList.reduce((s, x) => s + x.totalAmount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">历史累计扣款</div>
          <div className="text-2xl font-bold text-rose-600 tabular-nums">
            {fmtMoney(historyList.reduce((s, x) => s + (x.deduction || 0), 0))}
          </div>
        </div>
      </div>

      <SearchBar>
        <Select value={ownerType} onChange={setOwnerType} placeholder="全部业主路径" className="!w-40"
          options={[{ value: 'jtou', label: '交投·推送批复' }, { value: 'other', label: '其他·自闭环' }]} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-36"
          options={[
            { value: 'submitted', label: '已申报·待批复' },
            { value: 'approving', label: '批复中(交投)' },
            { value: 'approved', label: '已批复' },
            { value: 'rejected', label: '已驳回' },
          ]} />
      </SearchBar>

      {/* 待批复列表 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
          <h3 className="font-bold text-sm text-slate-800">待批复计量台账</h3>
          <span className="text-xs text-slate-500">{pendingList.length} 期</span>
        </div>
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>台账编号</th>
                <th className={M.th}>合同 / 业主</th>
                <th className={`${M.th} text-center`}>批复路径</th>
                <th className={`${M.th} text-center`}>审批链</th>
                <th className={`${M.th} text-right`}>申报金额(元)</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingList.map(s => (
                <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className={M.td}>
                    <div className="font-mono font-medium text-violet-700">{s.code}</div>
                    <div className="text-xs text-slate-500">{s.period} · 第 {s.periodNo} 期 · {s.projectName}</div>
                  </td>
                  <td className={M.td}>
                    <div className="font-medium text-slate-800">{s.contractName}</div>
                    <div className="text-xs text-slate-500">{s.ownerName}</div>
                  </td>
                  <td className={`${M.td} text-center`}>
                    {s.ownerType === 'jtou'
                      ? <TypePill text="交投·系统推送" tone="sky" />
                      : <TypePill text="其他·自闭环" tone="amber" />}
                  </td>
                  <td className={`${M.td} text-center text-xs text-slate-500`}>
                    内审 <span className="text-emerald-600">✓</span> → 监理 <span className="text-emerald-600">✓</span> → <span className="text-amber-600">业主批复中</span>
                  </td>
                  <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(s.totalAmount)}</td>
                  <td className={`${M.td} text-center`}><StatementStatusPill status={s.status} /></td>
                  <td className={`${M.td} text-center`}>
                    {s.ownerType === 'jtou' && s.status === 'submitted' && (
                      <button className={M.button.tinyViolet} onClick={() => doPush(s)}>推送交投批复</button>
                    )}
                    {s.ownerType === 'jtou' && s.status === 'approving' && (
                      <button className={M.button.tinyViolet} onClick={() => openApprove(s)}>批复回传</button>
                    )}
                    {s.ownerType === 'other' && s.status === 'submitted' && (
                      <button className={M.button.tinyViolet} onClick={() => openApprove(s)}>自闭环批复</button>
                    )}
                  </td>
                </tr>
              ))}
              {pendingList.length === 0 && (
                <tr><td colSpan={7} className={`${M.td} text-center text-slate-400 py-8`}>暂无待批复的计量台账</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 批复历史（含扣款对比） */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
          <h3 className="font-bold text-sm text-slate-800">批复历史与扣款对比</h3>
          <span className="text-xs text-slate-500">{historyList.length} 期</span>
        </div>
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>台账编号</th>
                <th className={M.th}>合同 / 业主</th>
                <th className={`${M.th} text-right`}>申报金额(元)</th>
                <th className={`${M.th} text-right`}>批复金额(元)</th>
                <th className={`${M.th} text-right`}>扣款(元)</th>
                <th className={`${M.th} text-center`}>对比结论</th>
                <th className={M.th}>批复时间 / 意见</th>
                <th className={`${M.th} text-center`}>状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map(s => {
                const d = (s.approvedAmount !== undefined)
                  ? Math.round((s.approvedAmount - s.totalAmount) * 100) / 100 : 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className={M.td}>
                      <div className="font-mono font-medium text-violet-700">{s.code}</div>
                      <div className="text-xs text-slate-500">{s.period} · 第 {s.periodNo} 期</div>
                    </td>
                    <td className={M.td}>
                      <div className="font-medium text-slate-800">{s.contractName}</div>
                      <div className="text-xs text-slate-500">{s.ownerName}</div>
                    </td>
                    <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(s.totalAmount)}</td>
                    <td className={`${M.td} text-right tabular-nums font-medium text-emerald-600`}>
                      {s.approvedAmount !== undefined ? fmtMoney(s.approvedAmount) : '—'}
                    </td>
                    <td className={`${M.td} text-right tabular-nums ${d < 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      {s.status === 'approved' ? fmtMoney(s.deduction || 0) : '—'}
                    </td>
                    <td className={`${M.td} text-center`}>
                      {s.status === 'rejected'
                        ? <TypePill text="已驳回" tone="rose" />
                        : Math.abs(d) < 0.01
                          ? <TypePill text="申报=批复" tone="emerald" />
                          : <TypePill text={`扣减 ${fmtMoney(Math.abs(d))}`} tone="rose" />}
                    </td>
                    <td className={M.td}>
                      <div className="text-xs font-mono text-slate-600">{s.approvedAt || '-'}</div>
                      <div className="text-[11px] text-slate-500">{s.approveOpinion || s.rejectReason || '-'}</div>
                    </td>
                    <td className={`${M.td} text-center`}><StatementStatusPill status={s.status} /></td>
                  </tr>
                );
              })}
              {historyList.length === 0 && (
                <tr><td colSpan={8} className={`${M.td} text-center text-slate-400 py-8`}>暂无批复历史</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：交投业主经系统推送批复、批复结果回传自动更新；其他业主在系统内自闭环批复。批复回传后申报与批复自动对比、识别扣款，并自动生成计量单进入应收流程。
        </div>
      </div>

      {/* 批复弹窗 */}
      <Modal
        title={approving?.ownerType === 'jtou'
          ? `交投批复结果回传 - ${approving?.code || ''}`
          : `自闭环批复 - ${approving?.code || ''}`}
        open={approveOpen} onClose={() => setApproveOpen(false)} width="max-w-xl"
        footer={approving?.ownerType === 'other' ? (<>
          <button className={M.button.danger} onClick={doReject}>驳回</button>
          <button className={M.button.ghost} onClick={() => setApproveOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doApprove}>批复通过</button>
        </>) : (<>
          <button className={M.button.ghost} onClick={() => setApproveOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doApprove}>确认回传</button>
        </>)}>
        {approving && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">申报台账</span><b className="font-mono">{approving.code}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">合同 / 期间</span><span>{approving.contractName} · {approving.period}（第 {approving.periodNo} 期）</span></div>
              <div className="flex justify-between"><span className="text-slate-500">本期申报金额</span><b className="tabular-nums text-violet-700">{fmtMoney(approving.totalAmount)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">明细行数</span><span>{approving.lines.length} 行（含安全生产费 {fmtMoney(approving.safeFeeAmount)}）</span></div>
            </div>
            <div>
              <label className={M.label}>批复金额(元) *（≤ 申报金额，差额将计为扣款）</label>
              <Input type="number" step="0.01" min={0} value={form.approvedAmount}
                onChange={v => setForm({ ...form, approvedAmount: Number(v) || 0 })} />
              {form.approvedAmount < approving.totalAmount && (
                <div className="text-xs text-rose-600 mt-1">
                  将识别扣款：{fmtMoney(approving.totalAmount - form.approvedAmount)}
                </div>
              )}
            </div>
            <div>
              <label className={M.label}>批复意见 / 扣款说明</label>
              <Textarea value={form.opinion} onChange={v => setForm({ ...form, opinion: v })}
                placeholder="如：现场复核扣减 XX 元（厚度不足）" />
            </div>
            {approving.ownerType === 'other' && (
              <div>
                <label className={M.label}>驳回原因（驳回时必填）</label>
                <Input value={form.rejectReason} onChange={v => setForm({ ...form, rejectReason: v })}
                  placeholder="驳回后台账可重新编辑申报" />
              </div>
            )}
            <div className="text-xs text-slate-400 leading-relaxed">
              {approving.ownerType === 'jtou'
                ? '模拟交投系统批复结果回传：确认后自动更新台账与数据池批复量、生成扣款对比与计量单。'
                : '其他业主系统内自闭环：批复通过自动生成计量单；驳回则释放数据池上报量，可修改重报。'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
