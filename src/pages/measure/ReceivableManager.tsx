/**
 * 应收单填报
 *  - 批复后的计量单 → 按合同一一对应生成应收单（方案 6.2：1 合同 : 1 应收单）
 *  - 填报后经交工计量系统（通道）推送交投财务共享
 *  - 状态：待推送 → 已推送财务共享 → 财务共享已确认（确认后进入回款跟踪）
 *  - 2026-11 交投关闭直报口子后，此链路成为养护应收的唯一通道
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Textarea, Select, SearchBar, ReceivableStatusPill, TypePill, useToast, fmtMoney,
} from './_shared';
import type { ReceivableOrder, MeasureOrder } from './types';
import {
  getReceivables, getOrders, pushReceivable, confirmReceivable, createReceivableFromOrder, paidAmountOf,
} from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function ReceivableManager({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const receivables = useMemo(() => getReceivables(), [version]);
  const orders = useMemo(() => getOrders(), [version]);

  const [kw, setKw] = useState('');
  const [status, setStatus] = useState('');

  // 生成应收单弹窗（选择计量单）
  const [genOpen, setGenOpen] = useState(false);
  const [genOrderId, setGenOrderId] = useState('');
  const [genSearch, setGenSearch] = useState('');

  const [view, setView] = useState<ReceivableOrder | null>(null);
  const [remark, setRemark] = useState('');

  const filtered = receivables.filter(r => {
    if (status && r.status !== status) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(r.code.toLowerCase().includes(k) || r.contractName.toLowerCase().includes(k) || r.measureOrderCode.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const confirmedAmount = filtered.filter(r => r.status === 'confirmed').reduce((s, r) => s + r.amount, 0);
  const draftCount = filtered.filter(r => r.status === 'draft').length;
  const paidTotal = receivables.reduce((s, r) => s + paidAmountOf(r.id), 0);

  // 可生成应收单的计量单（尚未生成应收单的）
  const genCandidates: MeasureOrder[] = useMemo(() => {
    const used = new Set(receivables.map(r => r.measureOrderId));
    return orders.filter(o => !used.has(o.id));
  }, [orders, receivables]);

  const openGen = () => {
    if (genCandidates.length === 0) { toast('所有计量单均已生成应收单', 'info'); return; }
    setGenOrderId(genCandidates[0].id);
    setGenSearch('');
    setGenOpen(true);
  };

  const doGen = () => {
    if (!genOrderId) { toast('请选择计量单', 'error'); return; }
    const r = createReceivableFromOrder(genOrderId);
    if (!r.ok) { toast(r.msg, 'error'); return; }
    refresh();
    setGenOpen(false);
    toast(r.msg, 'success');
  };

  const doPush = (r: ReceivableOrder) => {
    const err = pushReceivable(r.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`应收单 ${r.code} 已经交工计量系统填报并推送交投财务共享`, 'success');
  };

  const doConfirm = (r: ReceivableOrder) => {
    const err = confirmReceivable(r.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`交投财务共享已确认 ${r.code}，可在回款跟踪中登记回款`, 'success');
  };

  const genFiltered = genCandidates.filter(o => {
    if (!genSearch.trim()) return true;
    const k = genSearch.trim().toLowerCase();
    return o.code.toLowerCase().includes(k) || o.contractName.toLowerCase().includes(k);
  });

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">应收单数量</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">待推送</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{draftCount} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计应收金额</div>
          <div className="text-2xl font-bold text-violet-600 tabular-nums">{fmtMoney(totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计回款</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtMoney(paidTotal)}</div>
        </div>
      </div>

      <SearchBar onAdd={openGen} addLabel="+ 从计量单生成">
        <Input value={kw} onChange={setKw} placeholder="应收单号 / 计量单号 / 合同名称" className="!w-60" />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-40"
          options={[
            { value: 'draft', label: '待推送' },
            { value: 'pushed', label: '已推送财务共享' },
            { value: 'confirmed', label: '财务共享已确认' },
          ]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-12 text-center`}>序号</th>
                <th className={M.th}>应收单号</th>
                <th className={M.th}>对应计量单 / 期间</th>
                <th className={M.th}>合同（1:1）</th>
                <th className={M.th}>业主</th>
                <th className={`${M.th} text-right`}>应收金额(元)</th>
                <th className={`${M.th} text-right`}>已回款(元)</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={M.th}>推送 / 确认时间</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const paid = paidAmountOf(r.id);
                return (
                  <tr key={r.id} className="hover:bg-violet-50/40 transition-colors">
                    <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={M.td}>
                      <button className="font-mono font-medium text-violet-700 hover:underline"
                        onClick={() => { setView(r); setRemark(r.remark || ''); }}>{r.code}</button>
                    </td>
                    <td className={M.td}>
                      <div className="font-mono text-xs text-slate-600">{r.measureOrderCode}</div>
                      <div className="text-xs text-slate-500">{r.period}</div>
                    </td>
                    <td className={M.td}>
                      <div className="font-medium text-slate-800">{r.contractName}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.contractCode} · {r.projectName}</div>
                    </td>
                    <td className={M.td}>
                      <div className="text-slate-700">{r.ownerName}</div>
                      {r.ownerType === 'jtou' ? <TypePill text="交投" tone="sky" /> : <TypePill text="其他" tone="amber" />}
                    </td>
                    <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(r.amount)}</td>
                    <td className={`${M.td} text-right tabular-nums ${paid > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {paid > 0 ? fmtMoney(paid) : '—'}
                    </td>
                    <td className={`${M.td} text-center`}><ReceivableStatusPill status={r.status} /></td>
                    <td className={`${M.td} text-xs font-mono text-slate-500`}>
                      {r.pushedAt || '-'}
                      {r.confirmedAt && <div className="text-emerald-600">{r.confirmedAt}</div>}
                    </td>
                    <td className={`${M.td} text-center`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === 'draft' && (
                          <button className={M.button.tinyViolet} onClick={() => doPush(r)}>推送</button>
                        )}
                        {r.status === 'pushed' && (
                          <button className={M.button.tinyViolet} onClick={() => doConfirm(r)}>财务共享确认</button>
                        )}
                        <button className={M.button.tiny} onClick={() => { setView(r); setRemark(r.remark || ''); }}>详情</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className={`${M.td} text-center text-slate-400 py-10`}>
                  暂无应收单。请到「计量单管理」对已批复计量单点击「生成应收单」，或点击右上角「从计量单生成」。
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：应收单按合同一一对应（一个合同的计量单对应一张应收单）；经交工计量系统应收单功能填报后推送交投财务共享。
          2026-11 交投关闭直报口子后，此链路成为养护应收的唯一通道。财务共享确认后进入回款跟踪。
        </div>
      </div>

      {/* 生成应收单弹窗 */}
      <Modal title="从计量单生成应收单" open={genOpen} onClose={() => setGenOpen(false)} width="max-w-2xl"
        footer={<>
          <button className={M.button.ghost} onClick={() => setGenOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doGen}>生成应收单</button>
        </>}>
        <div className="space-y-3">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-700 leading-relaxed">
            应收单与计量单按合同一一对应（1:1）。项目部维度的汇总视图在养护平台内完成，不依赖交工计量系统。
          </div>
          <Input value={genSearch} onChange={setGenSearch} placeholder="搜索计量单号 / 合同名称" />
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
            {genFiltered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">无可选计量单（全部已生成或无批复计量单）</div>
            ) : genFiltered.map(o => (
              <div key={o.id} onClick={() => setGenOrderId(o.id)}
                className={`p-3 text-sm cursor-pointer transition-colors flex items-center justify-between
                  ${genOrderId === o.id ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                <div>
                  <div className="font-medium text-slate-800">
                    <span className="font-mono text-violet-700 mr-2">{o.code}</span>{o.contractName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {o.period} 第 {o.periodNo} 期 · 批复 {fmtMoney(o.approvedAmount)}
                    {o.deduction > 0 && <span className="text-rose-500">（扣款 {fmtMoney(o.deduction)}）</span>}
                  </div>
                </div>
                {genOrderId === o.id && <TypePill text="已选定" tone="violet" />}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 应收单详情 */}
      <Modal title={`应收单 ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-xl"
        footer={<>
          {view?.status === 'draft' && (
            <button className={M.button.primary} onClick={() => { doPush(view!); setView(null); }}>推送财务共享</button>
          )}
          {view?.status === 'pushed' && (
            <button className={M.button.primary} onClick={() => { doConfirm(view!); setView(null); }}>财务共享确认</button>
          )}
          <button className={M.button.ghost} onClick={() => setView(null)}>关闭</button>
        </>}>
        {view && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {([
                ['对应计量单', view.measureOrderCode], ['计量期间', view.period],
                ['合同名称', view.contractName], ['合同编号', view.contractCode],
                ['项目部', view.projectName], ['业主', view.ownerName],
                ['推送时间', view.pushedAt || '未推送'], ['确认时间', view.confirmedAt || '未确认'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                  <div className="font-medium text-slate-800">{v}</div>
                </div>
              ))}
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">应收金额（含税）</span>
              <span className="text-xl font-bold text-violet-700 tabular-nums">{fmtMoney(view.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700/70">已回款</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(paidAmountOf(view.id))}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-500">未回款</div>
                <div className="text-lg font-bold text-slate-700 tabular-nums">{fmtMoney(view.amount - paidAmountOf(view.id))}</div>
              </div>
            </div>
            <div>
              <label className={M.label}>备注</label>
              <Textarea value={remark} onChange={setRemark} placeholder="应收单备注（经交工计量系统填报推送）" />
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              链路：计量单（已批复）→ 交工计量系统应收单填报 → 推送交投财务共享 → 财务共享确认 → 回款跟踪登记回款。
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
