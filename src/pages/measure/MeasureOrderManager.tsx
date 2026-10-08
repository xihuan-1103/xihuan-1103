/**
 * 计量单管理
 *  - 以合同为维度分组展示：合同下查看该合同所有已申报（待审批）与已批复的计量单
 *  - 点击计量单可查看详情（章节汇总 + 子目明细 + 扣款）
 *  - 已批复的计量单可生成应收单（进入应收流程）；不再提供归档操作
 */

import React, { useState, useMemo } from 'react';
import {
  M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtMoney,
} from './_shared';
import type { MeasureStatement } from './types';
import {
  getStatements, getOrders, createReceivableFromOrder,
} from './measureStore';
import StatementPreview from './StatementPreview';

interface Props { key?: string | number; onRefresh?: () => void; }

/** 状态值：待审批（已申报）/ 已批复 */
const StatusPill = ({ status }: { status: string }) => {
  const approved = status === 'approved';
  return (
    <span className={`${M.pill} ${approved ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
      {approved ? '已批复' : '待审批'}
    </span>
  );
};

export default function MeasureOrderManager({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const statements = useMemo(() => getStatements(), [version]);
  const orders = useMemo(() => getOrders(), [version]);

  const [kw, setKw] = useState('');
  const [ownerType, setOwnerType] = useState('');
  const [status, setStatus] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());   // 收起的合同
  const [view, setView] = useState<MeasureStatement | null>(null);

  // 已申报（待审批）与已批复的计量单（草稿 / 已驳回不展示）
  const list = statements.filter(s => {
    if (s.status !== 'submitted' && s.status !== 'approving' && s.status !== 'approved') return false;
    if (ownerType && s.ownerType !== ownerType) return false;
    if (status === 'approved' && s.status !== 'approved') return false;
    if (status === 'submitted' && s.status === 'approved') return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(s.code.toLowerCase().includes(k) || s.contractName.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  // 按合同分组（保持插入顺序）
  const groups: [string, MeasureStatement[]][] = (() => {
    const map = new Map<string, MeasureStatement[]>();
    list.forEach(s => {
      if (!map.has(s.contractId)) map.set(s.contractId, []);
      map.get(s.contractId)!.push(s);
    });
    return [...map.entries()];
  })();

  const toggle = (cid: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(cid)) next.delete(cid); else next.add(cid);
    return next;
  });

  /** 已批复计量单 → 对应计量凭证 → 生成应收单 */
  const doGenReceivable = (s: MeasureStatement) => {
    const order = orders.find(o => o.statementId === s.id);
    if (!order) { toast('未找到该计量单对应的计量凭证', 'error'); return; }
    const r = createReceivableFromOrder(order.id);
    if (!r.ok) { toast(r.msg, 'error'); return; }
    refresh();
    toast(r.msg, 'success');
  };

  return (
    <div className="p-5">
      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="计量单编号 / 合同名称" className="!w-56" />
        <Select value={ownerType} onChange={setOwnerType} placeholder="全部业主" className="!w-40"
          options={[{ value: 'jtou', label: '交投业主' }, { value: 'other', label: '其他业主' }]} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-32"
          options={[{ value: 'submitted', label: '待审批' }, { value: 'approved', label: '已批复' }]} />
      </SearchBar>

      {/* 合同分组：合同下展示已申报 / 已批复的计量单 */}
      <div className="space-y-3">
        {groups.map(([cid, rows]) => {
          const c = rows[0];
          const approvedRows = rows.filter(s => s.status === 'approved');
          const totalDeclared = rows.reduce((s, x) => s + x.totalAmount, 0);
          const totalApprovedAmt = approvedRows.reduce((s, x) => s + (x.approvedAmount || 0), 0);
          const open = !collapsed.has(cid);
          return (
            <div key={cid} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* 合同头（点击展开/收起） */}
              <div className="px-4 py-3 bg-violet-50/50 border-b border-violet-100 cursor-pointer select-none hover:bg-violet-50/80 transition-colors"
                onClick={() => toggle(cid)}>
                <div className="flex items-center gap-3">
                  <span className={`text-slate-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{c.contractName}</div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                      <span>{c.contractCode} · {c.projectName} · 业主 {c.ownerName}</span>
                      {c.ownerType === 'jtou' ? <TypePill text="交投" tone="sky" /> : <TypePill text="其他" tone="amber" />}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {rows.length} 张（已批复 {approvedRows.length}）· 累计申报 <b className="text-violet-700 tabular-nums">{fmtMoney(totalDeclared)}</b> · 累计批复 <b className="text-emerald-700 tabular-nums">{fmtMoney(totalApprovedAmt)}</b>
                  </div>
                </div>
              </div>
              {/* 合同下计量单列表 */}
              {open && (
                <div className="overflow-x-auto">
                  <table className={M.table}>
                    <thead>
                      <tr>
                        <th className={`${M.th} w-12 text-center`}>序号</th>
                        <th className={M.th}>计量单编号 / 期数</th>
                        <th className={M.th}>计量时间</th>
                        <th className={`${M.th} text-center`}>明细行</th>
                        <th className={`${M.th} text-right`}>申报金额(元)</th>
                        <th className={`${M.th} text-right`}>批复金额(元)</th>
                        <th className={`${M.th} text-center`}>状态</th>
                        <th className={`${M.th} text-center`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((s, i) => (
                        <tr key={s.id} className="hover:bg-violet-50/40 transition-colors cursor-pointer" onClick={() => setView(s)}>
                          <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                          <td className={M.td}>
                            <div className="font-mono font-medium text-violet-700">{s.code}</div>
                            <div className="text-xs text-slate-500">第 {s.periodNo} 期 · 经办 {s.handler}</div>
                          </td>
                          <td className={M.td}><div className="font-mono">{s.createdAt}</div></td>
                          <td className={`${M.td} text-center tabular-nums`}>{s.lines.length}</td>
                          <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(s.totalAmount)}</td>
                          <td className={`${M.td} text-right tabular-nums ${s.status === 'approved' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            {s.status === 'approved' ? fmtMoney(s.approvedAmount || 0) : '—'}
                          </td>
                          <td className={`${M.td} text-center`}><StatusPill status={s.status} /></td>
                          <td className={`${M.td} text-center`} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button className={M.button.tiny} onClick={() => setView(s)}>详情</button>
                              {s.status === 'approved' && (
                                <button className={M.button.tinyViolet} onClick={() => doGenReceivable(s)}>生成应收单</button>
                              )}
                            </div>
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
        {groups.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            暂无已申报的计量单。计量台账提交批复后，将在此按合同分组展示。
          </div>
        )}
      </div>

      {/* 计量单详情 */}
      <Modal title={`计量单详情 - ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-6xl"
        footer={<>
          {view?.status === 'approved' && (
            <button className={M.button.primary} onClick={() => { doGenReceivable(view!); setView(null); }}>生成应收单</button>
          )}
          <button className={M.button.ghost} onClick={() => setView(null)}>关闭</button>
        </>}>
        {view && <StatementPreview st={view} />}
      </Modal>
    </div>
  );
}
