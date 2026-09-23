/**
 * 实时库存查询（组织 / 仓库 / 材料 多维度聚合）
 */

import React, { useMemo, useState } from 'react';
import type { StockBalance } from './types';
import {
  C, SearchBar, Input, Select, useToast,
} from './_shared';
import {
  queryBalances, getBalances, getOrgsForDropdown, getWarehousesByOrg, saveBalances,
} from './materialStore';

export default function StockBalanceView() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const toast = useToast();
  const orgs = useMemo(() => getOrgsForDropdown().filter(o => o.level === 'project'), []);
  const [orgId, setOrgId] = useState('');
  const [wh, setWh] = useState('');
  const [kw, setKw] = useState('');

  const warehouses = orgId ? getWarehousesByOrg(orgId) : [];
  const list = useMemo((): StockBalance[] => {
    void tick;
    return queryBalances({ orgId: orgId || undefined, warehouseId: wh || undefined, materialName: kw });
  }, [orgId, wh, kw, tick]);

  const stats = useMemo(() => {
    const totalQty = list.reduce((s, b) => s + b.qty, 0);
    const totalAmt = list.reduce((s, b) => s + b.amount, 0);
    const k3 = list.filter(b => b.qty > 0).length;
    return { totalQty, totalAmt, k3 };
  }, [list]);

  return (
    <div className="p-5">
      {/* 统计卡 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="有库存物料" value={stats.k3 + ' 项'} sub="按材料×仓库×组织聚合" accent="cyan" />
        <StatCard title="库存总数量" value={stats.totalQty.toLocaleString()} sub="行项合计" accent="emerald" />
        <StatCard title="库存总金额(不含税)" value={`¥ ${stats.totalAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub="加权平均成本 × 数量" accent="amber" />
        <StatCard title="监控行项" value={list.length + ' 条'} sub="当前筛选视图下" accent="slate" />
      </div>

      <SearchBar>
        <Select value={orgId} onChange={v => { setOrgId(v); setWh(''); }}
          options={orgs.map(o => ({ value: o.id, label: o.path }))} placeholder="组织" className="!w-60" />
        <Select value={wh} onChange={setWh}
          options={warehouses.map(w => ({ value: w.id, label: w.name + (w.keeper ? `(${w.keeper})` : '') }))}
          placeholder="仓库" className={orgId ? '!w-52' : '!w-52 opacity-60 cursor-not-allowed'} />
        <Input value={kw} onChange={setKw} placeholder="搜索材料编码/名称" className="!w-60" />
        <button className={C.button.ghost} onClick={refresh}>刷新</button>
        <button className={C.button.ghost}
          onClick={() => {
            if (confirm('重置库存到初始示例数据？（所有入库/出库/价拨变动将丢失）')) {
              localStorage.removeItem('cico-mat-balances');
              localStorage.removeItem('cico-mat-counters');
              refresh();
              toast('已重置初始库存示例', 'success');
            }
          }}>重置示例</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="max-h-[65vh] overflow-auto">
          <table className={C.table}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={C.th}>组织</th>
                <th className={C.th}>仓库</th>
                <th className={C.th}>编码</th>
                <th className={C.th}>材料名称</th>
                <th className={C.th}>规格</th>
                <th className={C.th}>分类</th>
                <th className={C.th}>单位</th>
                <th className={`${C.th} text-right`}>现有数量</th>
                <th className={`${C.th} text-right`}>加权平均单价</th>
                <th className={`${C.th} text-right`}>库存金额</th>
                <th className={C.th}>最近变动</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={11} className={`${C.td} text-center text-slate-400 py-12`}>
                  当前筛选条件下无库存记录
                  <div className="text-[11px] mt-1">请先从"入库"模块完成采购/调拨/退料入库操作，或组织/仓库暂未发生业务</div>
                </td></tr>
              )}
              {list.map(b => {
                const low = b.qty < 10;
                const zero = b.qty === 0;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className={C.td}>{b.orgName}</td>
                    <td className={C.td}>{b.warehouseName}</td>
                    <td className={C.td + ' text-slate-500'}>{b.materialCode}</td>
                    <td className={`${C.td} font-medium text-slate-800`}>{b.materialName}</td>
                    <td className={C.td}>{b.spec || '-'}</td>
                    <td className={C.td}>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                        {/* 懒取材料分类 */}
                        {catOf(b.materialId)}
                      </span>
                    </td>
                    <td className={C.td}>{b.unit}</td>
                    <td className={`${C.td} text-right tabular-nums font-medium ${zero ? 'text-slate-400 line-through' : low ? 'text-amber-600' : 'text-slate-800'}`}>
                      {b.qty.toLocaleString()}
                      {low && !zero && <span className="ml-1 text-[10px] text-amber-500">⚠低位</span>}
                    </td>
                    <td className={`${C.td} text-right tabular-nums`}>{b.avgCost.toFixed(2)}</td>
                    <td className={`${C.td} text-right tabular-nums font-medium text-cyan-700`}>¥ {b.amount.toFixed(2)}</td>
                    <td className={`${C.td} text-slate-500 text-[12px]`}>{b.lastMoveDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, accent }: { title: string; value: string; sub: string; accent: 'cyan' | 'emerald' | 'amber' | 'slate' }) {
  const gradient: Record<string, string> = {
    cyan: 'from-cyan-500 to-sky-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-500',
    slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[11px] text-slate-500">{title}</div>
          <div className={`mt-1 text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${gradient[accent]}`}>{value}</div>
          <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient[accent]} opacity-90 shadow-sm`} />
      </div>
    </div>
  );
}

let _catCache: Record<string, string> | null = null;
function catOf(matId: string): string {
  if (!_catCache) {
    _catCache = {};
    try {
      const raw = localStorage.getItem('cico-mat-master');
      if (raw) {
        const arr = JSON.parse(raw) as { id: string; category?: string }[];
        arr.forEach(m => { if (m.id && m.category) _catCache![m.id] = m.category; });
      }
    } catch { /* ignore */ }
  }
  return _catCache[matId] || '-';
}
