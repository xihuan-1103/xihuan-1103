/**
 * 计量单管理
 *  - 批复后自动生成（与计量台账一一对应），含申报量/批复量/扣款
 *  - 状态：生效 → 归档
 *  - 可从计量单直接生成应收单（进入应收流程）
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtNum, fmtMoney,
} from './_shared';
import type { MeasureOrder } from './types';
import {
  getOrders, archiveOrder, createReceivableFromOrder,
} from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function MeasureOrderManager({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const orders = useMemo(() => getOrders(), [version]);

  const [kw, setKw] = useState('');
  const [ownerType, setOwnerType] = useState('');
  const [status, setStatus] = useState('');

  const [view, setView] = useState<MeasureOrder | null>(null);

  const filtered = orders.filter(o => {
    if (ownerType && o.ownerType !== ownerType) return false;
    if (status && o.status !== status) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(o.code.toLowerCase().includes(k) || o.contractName.toLowerCase().includes(k) || o.statementCode.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const totalApproved = filtered.reduce((s, o) => s + o.approvedAmount, 0);
  const totalDeduction = filtered.reduce((s, o) => s + o.deduction, 0);
  const archivedCount = filtered.filter(o => o.archived).length;

  const doArchive = (o: MeasureOrder) => {
    if (o.archived) return;
    if (!confirm(`归档计量单 ${o.code}？归档后进入结算依据留存。`)) return;
    archiveOrder(o.id);
    refresh();
    toast('计量单已归档', 'success');
  };

  const doGenReceivable = (o: MeasureOrder) => {
    const r = createReceivableFromOrder(o.id);
    if (!r.ok) { toast(r.msg, 'error'); return; }
    refresh();
    toast(r.msg, 'success');
  };

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">计量单数量</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计批复金额</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtMoney(totalApproved)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计扣款</div>
          <div className="text-2xl font-bold text-rose-600 tabular-nums">{fmtMoney(totalDeduction)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">已归档</div>
          <div className="text-2xl font-bold text-slate-500 tabular-nums">{archivedCount} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
      </div>

      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="计量单号 / 台账号 / 合同名称" className="!w-56" />
        <Select value={ownerType} onChange={setOwnerType} placeholder="全部业主路径" className="!w-40"
          options={[{ value: 'jtou', label: '交投' }, { value: 'other', label: '其他业主' }]} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-32"
          options={[{ value: 'effective', label: '生效' }, { value: 'archived', label: '已归档' }]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-12 text-center`}>序号</th>
                <th className={M.th}>计量单号</th>
                <th className={M.th}>对应台账 / 期间</th>
                <th className={M.th}>合同</th>
                <th className={M.th}>业主</th>
                <th className={`${M.th} text-center`}>明细行</th>
                <th className={`${M.th} text-right`}>申报金额(元)</th>
                <th className={`${M.th} text-right`}>批复金额(元)</th>
                <th className={`${M.th} text-right`}>扣款(元)</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o, i) => (
                <tr key={o.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                  <td className={M.td}>
                    <button className="font-mono font-medium text-violet-700 hover:underline"
                      onClick={() => setView(o)}>{o.code}</button>
                  </td>
                  <td className={M.td}>
                    <div className="font-mono text-xs text-slate-600">{o.statementCode}</div>
                    <div className="text-xs text-slate-500">{o.period} · 第 {o.periodNo} 期</div>
                  </td>
                  <td className={M.td}>
                    <div className="font-medium text-slate-800">{o.contractName}</div>
                    <div className="text-xs text-slate-500 font-mono">{o.contractCode}</div>
                  </td>
                  <td className={M.td}>
                    <div className="text-slate-700">{o.ownerName}</div>
                    {o.ownerType === 'jtou' ? <TypePill text="交投" tone="sky" /> : <TypePill text="其他" tone="amber" />}
                  </td>
                  <td className={`${M.td} text-center tabular-nums`}>{o.lines.length}</td>
                  <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(o.declaredAmount)}</td>
                  <td className={`${M.td} text-right tabular-nums font-medium text-emerald-600`}>{fmtMoney(o.approvedAmount)}</td>
                  <td className={`${M.td} text-right tabular-nums ${o.deduction > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>{fmtMoney(o.deduction)}</td>
                  <td className={`${M.td} text-center`}>
                    {o.archived
                      ? <TypePill text="已归档" tone="slate" />
                      : <TypePill text="生效" tone="emerald" />}
                  </td>
                  <td className={`${M.td} text-center`}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button className={M.button.tiny} onClick={() => setView(o)}>查看</button>
                      <button className={M.button.tinyViolet} onClick={() => doGenReceivable(o)}>生成应收单</button>
                      {!o.archived && (
                        <button className={M.button.tiny} onClick={() => doArchive(o)}>归档</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className={`${M.td} text-center text-slate-400 py-10`}>
                  暂无计量单。计量台账批复通过后，计量单将自动生成。
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：计量单在台账批复通过后自动生成（申报/批复/扣款对比随批复落地），是应收单填报与推送的依据。「生成应收单」按合同一一对应（一个合同的计量单对应一张应收单）。
        </div>
      </div>

      {/* 计量单详情 */}
      <Modal title={`计量单 ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-4xl"
        footer={<>
          {view && !view.archived && (
            <button className={M.button.primary} onClick={() => { doGenReceivable(view); setView(null); }}>生成应收单</button>
          )}
          <button className={M.button.ghost} onClick={() => setView(null)}>关闭</button>
        </>}>
        {view && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {([
                ['对应台账', view.statementCode], ['计量期间', `${view.period}（第 ${view.periodNo} 期）`],
                ['批复时间', view.approveTime],
                ['合同名称', view.contractName], ['合同编号', view.contractCode],
                ['项目部', view.projectName],
                ['业主', view.ownerName], ['批复路径', view.ownerType === 'jtou' ? '交投系统推送批复' : '系统内自闭环'],
                ['状态', view.archived ? '已归档' : '生效'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                  <div className="font-medium text-slate-800">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-0.5">申报金额</div>
                <div className="text-lg font-bold tabular-nums">{fmtMoney(view.declaredAmount)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700/70 mb-0.5">批复金额</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(view.approvedAmount)}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <div className="text-xs text-rose-700/70 mb-0.5">扣款</div>
                <div className="text-lg font-bold text-rose-600 tabular-nums">{fmtMoney(view.deduction)}</div>
              </div>
            </div>
            <div>
              <div className={M.sectionTitle}>计量明细（申报 / 批复对比）</div>
              <table className={`${M.table} border border-slate-200`}>
                <thead>
                  <tr>
                    <th className={M.th}>子目号</th>
                    <th className={M.th}>子目名称</th>
                    <th className={`${M.th} text-center`}>单位</th>
                    <th className={`${M.th} text-right`}>单价(元)</th>
                    <th className={`${M.th} text-right`}>申报量</th>
                    <th className={`${M.th} text-right`}>批复量</th>
                    <th className={`${M.th} text-right`}>申报金额(元)</th>
                    <th className={`${M.th} text-right`}>批复金额(元)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view.lines.map(l => (
                    <tr key={l.id}>
                      <td className={`${M.td} font-mono text-violet-700`}>{l.code}</td>
                      <td className={`${M.td} font-medium`}>{l.name}</td>
                      <td className={`${M.td} text-center`}>{l.unit}</td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtNum(l.price)}</td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtNum(l.declaredQty)}</td>
                      <td className={`${M.td} text-right tabular-nums font-medium text-emerald-700`}>{fmtNum(l.approvedQty)}</td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(l.declaredAmount)}</td>
                      <td className={`${M.td} text-right tabular-nums font-medium text-emerald-700`}>{fmtMoney(l.approvedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
