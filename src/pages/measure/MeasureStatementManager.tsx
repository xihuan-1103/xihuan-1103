/**
 * 计量台账（v2 重构：接入创建向导与计量单预览）
 *  - 新建：分步向导（选合同 → 选时间段完成的子目 → 调整 → 预览+手填扣款 → 创建）
 *  - 编辑：草稿重新打开向导调整（Step3 起，可回退）
 *  - 提交：回写数据池已上报量，进入批复管理
 *  - 预览：计量支付报表样式（图一章节汇总+扣款 / 图二章节子目明细）
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtMoney,
} from './_shared';
import type { MeasureStatement } from './types';
import {
  getStatements, getMeasureContracts, deleteStatementSafe,
  submitStatement, reopenStatement,
} from './measureStore';
import StatementWizard from './StatementWizard';
import StatementPreview from './StatementPreview';

interface Props { key?: string | number; onRefresh?: () => void; }

/** 状态值：草稿 / 待审批（已提交待批复）/ 已批复 / 已驳回 */
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: `${M.pill} bg-slate-100 text-slate-700` },
  submitted: { label: '待审批', cls: `${M.pill} bg-blue-50 text-blue-700` },
  approving: { label: '待审批', cls: `${M.pill} bg-blue-50 text-blue-700` },
  approved: { label: '已批复', cls: `${M.pill} bg-emerald-50 text-emerald-700` },
  rejected: { label: '已驳回', cls: `${M.pill} bg-rose-50 text-rose-700` },
};

const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS[status];
  return <span className={s?.cls || M.pill}>{s?.label || status}</span>;
};

export default function MeasureStatementManager({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const statements = useMemo(() => getStatements(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);

  const [kw, setKw] = useState('');
  const [contractId, setContractId] = useState('');
  const [status, setStatus] = useState('');

  // 创建/编辑向导
  const [wizard, setWizard] = useState<{ open: boolean; initial: MeasureStatement | null }>({ open: false, initial: null });

  // 计量单预览
  const [view, setView] = useState<MeasureStatement | null>(null);

  const filtered = statements.filter(s => {
    if (contractId && s.contractId !== contractId) return false;
    if (status && s.status !== status) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(s.code.toLowerCase().includes(k) || s.contractName.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  /* ===== 操作 ===== */

  const openNewWizard = () => setWizard({ open: true, initial: null });

  const openEditWizard = (s: MeasureStatement) => {
    if (s.status !== 'draft') { toast('仅草稿状态可编辑', 'error'); return; }
    setWizard({ open: true, initial: s });
  };

  const doSubmit = (s: MeasureStatement) => {
    const err = submitStatement(s.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`计量单 ${s.code} 已提交批复，数据池已上报量已回写`, 'success');
  };

  const doReopen = (s: MeasureStatement) => {
    reopenStatement(s.id);
    refresh();
    toast('已转回草稿（数据池上报量已释放），可修改后重新提交', 'success');
  };

  const doDelete = (s: MeasureStatement) => {
    if (!confirm(`确定删除草稿 ${s.code}？`)) return;
    if (!deleteStatementSafe(s.id)) { toast('仅草稿状态可删除', 'error'); return; }
    refresh();
    toast('已删除', 'success');
  };

  return (
    <div className="p-5">
      <SearchBar onAdd={openNewWizard} addLabel="+ 发起计量（向导）">
        <Input value={kw} onChange={setKw} placeholder="计量单编号 / 合同名称" className="!w-48" />
        <Select value={contractId} onChange={setContractId} placeholder="全部合同" className="!w-52"
          options={contracts.map(c => ({ value: c.id, label: c.code }))} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-36"
          options={['draft', 'submitted', 'approved', 'rejected'].map(v => ({ value: v, label: STATUS[v].label }))} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-12 text-center`}>序号</th>
                <th className={M.th}>计量单编号 / 期数</th>
                <th className={M.th}>计量时间</th>
                <th className={M.th}>合同</th>
                <th className={M.th}>业主</th>
                <th className={`${M.th} text-center`}>明细行</th>
                <th className={`${M.th} text-right`}>本期申报(元)</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                  <td className={M.td}>
                    <button className="font-mono font-medium text-violet-700 hover:underline" onClick={() => setView(s)}>{s.code}</button>
                    <div className="text-xs text-slate-500">第 {s.periodNo} 期 · 经办 {s.handler}</div>
                  </td>
                  <td className={M.td}>
                    <div className="font-mono">{s.createdAt}</div>
                  </td>
                  <td className={M.td}>
                    <div className="font-medium text-slate-800">{s.contractName}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.contractCode} · {s.projectName}</div>
                  </td>
                  <td className={M.td}>
                    <div className="text-slate-700">{s.ownerName}</div>
                    {s.ownerType === 'jtou'
                      ? <TypePill text="交投业主" tone="sky" />
                      : <TypePill text="其他业主" tone="amber" />}
                  </td>
                  <td className={`${M.td} text-center tabular-nums`}>{s.lines.length}</td>
                  <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(s.totalAmount)}</td>
                  <td className={`${M.td} text-center`}><StatusPill status={s.status} /></td>
                  <td className={`${M.td} text-center`}>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {s.status === 'draft' && <button className={M.button.tiny} onClick={() => openEditWizard(s)}>编辑</button>}
                      {s.status === 'draft' && <button className={M.button.tinyViolet} onClick={() => doSubmit(s)}>提交批复</button>}
                      {s.status === 'rejected' && <button className={M.button.tiny} onClick={() => doReopen(s)}>重新编辑</button>}
                      <button className={M.button.tiny} onClick={() => setView(s)}>预览</button>
                      {s.status === 'draft' && (
                        <button className="px-2 py-1 rounded text-[12px] border border-rose-300 text-rose-600 hover:bg-rose-50 transition"
                          onClick={() => doDelete(s)}>删</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className={`${M.td} text-center text-slate-400 py-10`}>
                  暂无计量单，点击「发起计量」通过向导创建（也可在计量数据池的合同下直接发起）
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：发起计量 = 选合同 → 勾选合同清单子目并行内调整（数量/变更金额，新增子目一律从合同清单勾选）→ 预览（章节汇总+子目明细）→ 手填扣款 → 确认创建。
          提交批复后回写数据池已上报量；驳回后「重新编辑」会释放上报量。
        </div>
      </div>

      {/* ===== 创建/编辑向导 ===== */}
      {wizard.open && (
        <StatementWizard
          key={wizard.initial?.id || 'new'}
          initial={wizard.initial}
          onClose={() => setWizard({ open: false, initial: null })}
          onDone={() => { setWizard({ open: false, initial: null }); refresh(); }}
        />
      )}

      {/* ===== 计量单预览（图一/图二） ===== */}
      <Modal title={`计量单预览 - ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-6xl"
        footer={<>
          {view?.status === 'draft' && (
            <button className={M.button.primary} onClick={() => { doSubmit(view!); setView(null); }}>提交批复</button>
          )}
          <button className={M.button.ghost} onClick={() => setView(null)}>关闭</button>
        </>}>
        {view && <StatementPreview st={view} />}
      </Modal>
    </div>
  );
}
