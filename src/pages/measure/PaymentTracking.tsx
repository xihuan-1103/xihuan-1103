/**
 * 回款跟踪（计量—回款对比台账）
 *  - 按应收单跟踪回款进度：应收金额 / 已回款 / 未回款 / 回款率
 *  - 回款流水：登记回款（多笔部分回款），校验不超应收
 *  - 项目部汇总视图：多合同的计量/回款汇总（1:N 结构在平台内完成，不依赖交工计量系统）
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Select, SearchBar, ReceivableStatusPill, TypePill, useToast, fmtMoney,
} from './_shared';
import type { ReceivableOrder, PaymentRecord } from './types';
import { getReceivables, getPayments, addPayment, paidAmountOf } from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function PaymentTracking({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const receivables = useMemo(() => getReceivables(), [version]);
  const payments = useMemo(() => getPayments(), [version]);

  const [kw, setKw] = useState('');
  const [projectName, setProjectName] = useState('');
  const [onlyUnpaid, setOnlyUnpaid] = useState('');

  // 登记回款弹窗
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState<ReceivableOrder | null>(null);
  const [form, setForm] = useState({ amount: 0, payDate: new Date().toISOString().slice(0, 10), method: '电汇', remark: '' });

  // 流水视图
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowOf, setFlowOf] = useState<ReceivableOrder | null>(null);

  const projects: string[] = [...new Set(receivables.map(r => r.projectName))];

  const filtered = receivables.filter(r => {
    if (projectName && r.projectName !== projectName) return false;
    if (onlyUnpaid === 'unpaid' && paidAmountOf(r.id) >= r.amount - 0.01) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(r.code.toLowerCase().includes(k) || r.contractName.toLowerCase().includes(k) || r.measureOrderCode.toLowerCase().includes(k))) {
        if (!r.ownerName.toLowerCase().includes(k)) return false;
      }
    }
    return true;
  });

  const totalReceivable = filtered.reduce((s, r) => s + r.amount, 0);
  const totalPaid = filtered.reduce((s, r) => s + paidAmountOf(r.id), 0);
  const totalUnpaid = totalReceivable - totalPaid;
  const paidRate = totalReceivable > 0 ? Math.round(totalPaid / totalReceivable * 100) : 0;

  // 项目部汇总（多合同 1:N 汇总视图）
  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; contracts: number; declared: number; receivable: number; paid: number }>();
    for (const r of receivables) {
      if (!map.has(r.projectName)) {
        map.set(r.projectName, { name: r.projectName, contracts: 0, declared: 0, receivable: 0, paid: 0 });
      }
      const g = map.get(r.projectName)!;
      g.contracts += 1;
      g.receivable += r.amount;
      g.paid += paidAmountOf(r.id);
    }
    return [...map.values()];
  }, [receivables]);

  const openPay = (r: ReceivableOrder) => {
    setPaying(r);
    const unpaid = r.amount - paidAmountOf(r.id);
    setForm({ amount: unpaid, payDate: new Date().toISOString().slice(0, 10), method: '电汇', remark: '' });
    setPayOpen(true);
  };

  const doPay = () => {
    if (!paying) return;
    const rec: Omit<PaymentRecord, 'id' | 'code' | 'createdAt'> = {
      receivableId: paying.id, receivableCode: paying.code,
      contractCode: paying.contractCode, contractName: paying.contractName,
      projectName: paying.projectName, ownerName: paying.ownerName,
      amount: Number(form.amount) || 0, payDate: form.payDate, method: form.method, remark: form.remark,
    };
    const r = addPayment(rec);
    if (!r.ok) { toast(r.msg, 'error'); return; }
    refresh();
    setPayOpen(false);
    toast(r.msg, 'success');
  };

  const flowRecords = flowOf ? payments.filter(p => p.receivableId === flowOf.id) : [];

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计应收金额</div>
          <div className="text-2xl font-bold text-violet-600 tabular-nums">{fmtMoney(totalReceivable)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计已回款</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtMoney(totalPaid)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">未回款余额</div>
          <div className="text-2xl font-bold text-rose-600 tabular-nums">{fmtMoney(totalUnpaid)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">整体回款率</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidRate}%` }} />
            </div>
            <span className="text-lg font-bold text-emerald-600 tabular-nums">{paidRate}%</span>
          </div>
        </div>
      </div>

      {/* 项目部汇总（1:N 合同结构汇总视图） */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-slate-500 rounded-full" />
          <h3 className="font-bold text-sm text-slate-800">项目部汇总视图（1 项目部 : N 收入合同）</h3>
        </div>
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>项目部</th>
                <th className={`${M.th} text-center`}>涉及合同数</th>
                <th className={`${M.th} text-right`}>累计应收(元)</th>
                <th className={`${M.th} text-right`}>累计回款(元)</th>
                <th className={`${M.th} text-right`}>未回款(元)</th>
                <th className={`${M.th} text-center`}>回款率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byProject.map(g => {
                const rate = g.receivable > 0 ? Math.round(g.paid / g.receivable * 100) : 0;
                return (
                  <tr key={g.name} className="hover:bg-slate-50">
                    <td className={`${M.td} font-medium`}>{g.name}</td>
                    <td className={`${M.td} text-center tabular-nums`}>{g.contracts}</td>
                    <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(g.receivable)}</td>
                    <td className={`${M.td} text-right tabular-nums text-emerald-600 font-medium`}>{fmtMoney(g.paid)}</td>
                    <td className={`${M.td} text-right tabular-nums text-rose-600`}>{fmtMoney(g.receivable - g.paid)}</td>
                    <td className={`${M.td} text-center`}>
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {byProject.length === 0 && (
                <tr><td colSpan={6} className={`${M.td} text-center text-slate-400 py-6`}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 计量—回款对比台账 */}
      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="应收单号 / 合同 / 业主" className="!w-52" />
        <Select value={projectName} onChange={setProjectName} placeholder="全部项目部" className="!w-36"
          options={projects.map(p => ({ value: p, label: p }))} />
        <Select value={onlyUnpaid} onChange={setOnlyUnpaid} placeholder="全部应收单" className="!w-36"
          options={[{ value: 'unpaid', label: '仅未结清' }]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-violet-50/60 border-b border-violet-100 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
          <h3 className="font-bold text-sm text-slate-800">计量—回款对比台账</h3>
          <span className="text-xs text-slate-500">{filtered.length} 张应收单</span>
        </div>
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-12 text-center`}>序号</th>
                <th className={M.th}>应收单号 / 计量单</th>
                <th className={M.th}>合同</th>
                <th className={M.th}>业主</th>
                <th className={`${M.th} text-right`}>应收金额(元)</th>
                <th className={`${M.th} text-right`}>已回款(元)</th>
                <th className={`${M.th} text-right`}>未回款(元)</th>
                <th className={`${M.th} text-center`}>回款率</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const paid = paidAmountOf(r.id);
                const unpaid = r.amount - paid;
                const rate = r.amount > 0 ? Math.round(paid / r.amount * 100) : 0;
                return (
                  <tr key={r.id} className={`hover:bg-violet-50/40 transition-colors ${unpaid > 0.01 ? '' : 'bg-emerald-50/30'}`}>
                    <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={M.td}>
                      <div className="font-mono font-medium text-violet-700">{r.code}</div>
                      <div className="text-xs text-slate-500 font-mono">计量 {r.measureOrderCode} · {r.period}</div>
                    </td>
                    <td className={M.td}>
                      <div className="font-medium text-slate-800">{r.contractName}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.contractCode} · {r.projectName}</div>
                    </td>
                    <td className={M.td}>{r.ownerName}</td>
                    <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(r.amount)}</td>
                    <td className={`${M.td} text-right tabular-nums text-emerald-600 font-medium`}>{fmtMoney(paid)}</td>
                    <td className={`${M.td} text-right tabular-nums ${unpaid > 0.01 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      {unpaid > 0.01 ? fmtMoney(unpaid) : '已结清'}
                    </td>
                    <td className={`${M.td} text-center`}>
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">{rate}%</span>
                      </div>
                    </td>
                    <td className={`${M.td} text-center`}><ReceivableStatusPill status={r.status} /></td>
                    <td className={`${M.td} text-center`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === 'confirmed' && (
                          <button className={M.button.tinyViolet} onClick={() => openPay(r)} disabled={unpaid <= 0.01}>
                            {unpaid <= 0.01 ? '已结清' : '登记回款'}
                          </button>
                        )}
                        <button className={M.button.tiny} onClick={() => { setFlowOf(r); setFlowOpen(true); }}>回款流水</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className={`${M.td} text-center text-slate-400 py-10`}>暂无应收单数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：仅「财务共享已确认」的应收单可登记回款；支持一单多笔部分回款，累计回款不可超出应收金额。回款确认后形成计量—回款对比台账。
        </div>
      </div>

      {/* 登记回款弹窗 */}
      <Modal title={`登记回款 - ${paying?.code || ''}`} open={payOpen} onClose={() => setPayOpen(false)} width="max-w-lg"
        footer={<>
          <button className={M.button.ghost} onClick={() => setPayOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doPay}>确认登记</button>
        </>}>
        {paying && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">合同 / 项目部</span><span>{paying.contractName} · {paying.projectName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">业主（付款方）</span><span>{paying.ownerName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">应收金额</span><b className="tabular-nums">{fmtMoney(paying.amount)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">已回款 / 未回款</span>
                <b className="tabular-nums">{fmtMoney(paidAmountOf(paying.id))} / <span className="text-rose-600">{fmtMoney(paying.amount - paidAmountOf(paying.id))}</span></b>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={M.label}>本次回款金额(元) *</label>
                <Input type="number" step="0.01" min={0} value={form.amount}
                  onChange={v => setForm({ ...form, amount: Number(v) || 0 })} />
                {form.amount > paying.amount - paidAmountOf(paying.id) + 0.01 && (
                  <div className="text-xs text-rose-600 mt-1">超出未回款余额</div>
                )}
              </div>
              <div>
                <label className={M.label}>回款日期 *</label>
                <Input type="date" value={form.payDate} onChange={v => setForm({ ...form, payDate: v })} />
              </div>
              <div>
                <label className={M.label}>回款方式</label>
                <Select value={form.method} onChange={v => setForm({ ...form, method: v })}
                  options={[{ value: '电汇', label: '电汇' }, { value: '承兑汇票', label: '承兑汇票' }, { value: '支票', label: '支票' }]} />
              </div>
              <div>
                <label className={M.label}>备注</label>
                <Input value={form.remark} onChange={v => setForm({ ...form, remark: v })} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 回款流水弹窗 */}
      <Modal title={`回款流水 - ${flowOf?.code || ''}`} open={flowOpen} onClose={() => setFlowOpen(false)} width="max-w-2xl"
        footer={<>
          {flowOf && flowOf.status === 'confirmed' && (
            <button className={M.button.primary} onClick={() => { setFlowOpen(false); openPay(flowOf); }}>+ 登记回款</button>
          )}
          <button className={M.button.ghost} onClick={() => setFlowOpen(false)}>关闭</button>
        </>}>
        {flowOf && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <div className="text-xs text-slate-500">应收</div>
                <div className="font-bold tabular-nums">{fmtMoney(flowOf.amount)}</div>
              </div>
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                <div className="text-xs text-emerald-700/70">已回款</div>
                <div className="font-bold text-emerald-700 tabular-nums">{fmtMoney(paidAmountOf(flowOf.id))}</div>
              </div>
              <div className="flex-1 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                <div className="text-xs text-rose-700/70">未回款</div>
                <div className="font-bold text-rose-600 tabular-nums">{fmtMoney(flowOf.amount - paidAmountOf(flowOf.id))}</div>
              </div>
            </div>
            {flowRecords.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-sm border border-dashed border-slate-200 rounded-lg">暂无回款流水</div>
            ) : (
              <table className={M.table}>
                <thead>
                  <tr>
                    <th className={M.th}>回款单号</th>
                    <th className={M.th}>回款日期</th>
                    <th className={M.th}>方式</th>
                    <th className={`${M.th} text-right`}>金额(元)</th>
                    <th className={M.th}>备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flowRecords.map(p => (
                    <tr key={p.id}>
                      <td className={`${M.td} font-mono`}>{p.code}</td>
                      <td className={M.td}>{p.payDate}</td>
                      <td className={M.td}>{p.method}</td>
                      <td className={`${M.td} text-right tabular-nums font-medium text-emerald-600`}>{fmtMoney(p.amount)}</td>
                      <td className={`${M.td} text-xs text-slate-500`}>{p.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
