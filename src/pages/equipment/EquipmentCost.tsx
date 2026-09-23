/**
 * 成本联动 - 设备成本仪表盘
 *  汇总设备台班、油耗、维保等成本数据
 *  按设备类别/所有权/时间维度分析
 */

import React, { useMemo, useState } from 'react';
import { EC, Input, Select } from './_shared';
import {
  getEquipments, getEquipmentUsageSummary, getShiftRecords, getMaintenanceRecords,
  EQUIPMENT_OWNERSHIP_MAP,
} from './equipmentStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function EquipmentCost({}: Props) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [own, setOwn] = useState('');

  const equipments = useMemo(() => getEquipments(), []);
  const summary = useMemo(() => getEquipmentUsageSummary(), []);
  const shifts = useMemo(() => {
    let r = getShiftRecords();
    if (dateFrom) r = r.filter(s => s.shiftDate >= dateFrom);
    if (dateTo) r = r.filter(s => s.shiftDate <= dateTo);
    if (own) r = r.filter(s => s.ownership === own);
    return r;
  }, [dateFrom, dateTo, own]);
  const maintenances = useMemo(() => {
    let r = getMaintenanceRecords();
    if (dateFrom) r = r.filter(m => m.date >= dateFrom);
    if (dateTo) r = r.filter(m => m.date <= dateTo);
    return r;
  }, [dateFrom, dateTo]);

  // 汇总指标
  const kpis = useMemo(() => {
    const totalShifts = shifts.reduce((s, r) => s + r.shifts, 0);
    const totalAmount = shifts.reduce((s, r) => s + r.totalAmount, 0);
    const totalFuel = shifts.reduce((s, r) => s + (r.fuelAmount || 0), 0);
    const totalMaint = maintenances.reduce((s, r) => s + r.totalCost, 0);
    const totalCost = totalAmount + totalFuel + totalMaint;
    return { totalShifts, totalAmount, totalFuel, totalMaint, totalCost };
  }, [shifts, maintenances]);

  // 按所有权分组
  const byOwnership = useMemo<Record<string, { label: string; shifts: number; cost: number; count: number }>>(() => {
    const groups: Record<string, { label: string; shifts: number; cost: number; count: number }> = {
      owned: { label: '自有设备', shifts: 0, cost: 0, count: 0 },
      leased: { label: '租赁设备', shifts: 0, cost: 0, count: 0 },
    };
    for (const s of shifts) {
      if (groups[s.ownership]) {
        groups[s.ownership].shifts += s.shifts;
        groups[s.ownership].cost += s.totalAmount + (s.fuelAmount || 0);
        groups[s.ownership].count++;
      }
    }
    return groups;
  }, [shifts]);

  // 按类别分组
  const byCategory = useMemo(() => {
    const map = new Map<string, { label: string; shifts: number; cost: number }>();
    for (const s of shifts) {
      const eq = equipments.find(e => e.id === s.equipmentId);
      const cat = eq?.category || '其他';
      if (!map.has(cat)) map.set(cat, { label: cat, shifts: 0, cost: 0 });
      const g = map.get(cat)!;
      g.shifts += s.shifts;
      g.cost += s.totalAmount + (s.fuelAmount || 0);
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [shifts, equipments]);

  const maxCatCost = Math.max(1, ...byCategory.map(c => c.cost));

  // Top 10 设备成本排行
  const topEquipment = useMemo(() => {
    return summary
      .filter(s => !own || s.ownership === own)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [summary, own]);

  const maxTopCost = Math.max(1, ...topEquipment.map(e => e.totalCost));

  return (
    <div className="p-5">
      {/* 筛选 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-500">时间范围：</span>
        <Input type="date" value={dateFrom} onChange={setDateFrom} className="!w-36" />
        <Input type="date" value={dateTo} onChange={setDateTo} className="!w-36" />
        <Select value={own} onChange={setOwn}
          options={[{ value: '', label: '全部所有权' }, { value: 'owned', label: '自有' }, { value: 'leased', label: '租赁' }]}
          className="!w-32" />
        <button className={EC.button.ghost} onClick={() => { setDateFrom(''); setDateTo(''); setOwn(''); }}>重置</button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KPI title="总成本(元)" value={`¥${kpis.totalCost.toLocaleString()}`} color="text-orange-600" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v-2" />
        <KPI title="台班费(元)" value={`¥${kpis.totalAmount.toLocaleString()}`} color="text-emerald-600" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KPI title="油费(元)" value={`¥${kpis.totalFuel.toLocaleString()}`} color="text-blue-600" icon="M13 10V3L4 14h7v7l9-11h-7z" />
        <KPI title="维保费(元)" value={`¥${kpis.totalMaint.toLocaleString()}`} color="text-amber-600" icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35" />
        <KPI title="总台班" value={kpis.totalShifts.toLocaleString()} color="text-cyan-600" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* 按所有权 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className={EC.sectionTitle + ' !text-base'}>
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            按所有权分布
          </h3>
          <div className="space-y-3 mt-3">
            {(Object.entries(byOwnership) as [string, { label: string; shifts: number; cost: number; count: number }][]).map(([key, g]) => {
              const pct = kpis.totalCost > 0 ? (g.cost / kpis.totalCost) * 100 : 0;
              const barColor = key === 'owned' ? 'bg-indigo-500' : 'bg-cyan-500';
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-slate-500">
                      ¥{g.cost.toLocaleString()} ({pct.toFixed(1)}%) · {g.shifts} 台班
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按类别 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className={EC.sectionTitle + ' !text-base'}>
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            按设备类别分布
          </h3>
          <div className="space-y-2 mt-3">
            {byCategory.map(c => {
              const pct = (c.cost / maxCatCost) * 100;
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>{c.label}</span>
                    <span className="tabular-nums text-slate-500">¥{c.cost.toLocaleString()} · {c.shifts} 台班</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {byCategory.length === 0 && <div className="text-center text-slate-400 py-4 text-sm">暂无数据</div>}
          </div>
        </div>
      </div>

      {/* Top 10 设备成本 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className={EC.sectionTitle + ' !text-base'}>
          <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          设备成本排行 TOP 10
        </h3>
        <div className="overflow-x-auto mt-3">
          <table className={EC.table}>
            <thead>
              <tr>
                <th className={EC.th}>排名</th>
                <th className={EC.th}>设备</th>
                <th className={EC.th}>所有权</th>
                <th className={EC.th}>总台班</th>
                <th className={EC.th}>台班费</th>
                <th className={EC.th}>油费</th>
                <th className={EC.th}>维保费</th>
                <th className={EC.th}>总成本</th>
                <th className={EC.th}>占比</th>
              </tr>
            </thead>
            <tbody>
              {topEquipment.map((e, i) => {
                const pct = (e.totalCost / maxTopCost) * 100;
                return (
                  <tr key={e.equipmentId} className="hover:bg-slate-50">
                    <td className={EC.td + ' text-center font-bold text-slate-400'}>{i + 1}</td>
                    <td className={EC.td}>
                      <div className="font-medium">{e.equipmentName}</div>
                      <div className="text-xs text-slate-500">{e.equipmentCode}</div>
                    </td>
                    <td className={EC.td}>
                      <span className={EC.pill + ' ' + (e.ownership === 'owned' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700')}>
                        {EQUIPMENT_OWNERSHIP_MAP[e.ownership]}
                      </span>
                    </td>
                    <td className={EC.td + ' text-right tabular-nums'}>{e.totalShifts}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>¥{e.totalAmount.toLocaleString()}</td>
                    <td className={EC.td + ' text-right tabular-nums text-blue-600'}>¥{e.totalFuelCost.toLocaleString()}</td>
                    <td className={EC.td + ' text-right tabular-nums text-amber-600'}>¥{e.totalMaintenanceCost.toLocaleString()}</td>
                    <td className={EC.td + ' text-right tabular-nums font-bold text-orange-600'}>¥{e.totalCost.toLocaleString()}</td>
                    <td className={EC.td}>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {topEquipment.length === 0 && (
                <tr><td colSpan={9} className={EC.td + ' text-center text-slate-400 py-8'}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, color, icon }: { title: string; value: string; color: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <span className="text-xs text-slate-500">{title}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
