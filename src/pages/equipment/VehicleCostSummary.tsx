/**
 * 设备管理 → 固定资产管理 → 车辆费用汇总（全局查看）
 *
 * 基于「单车费用核算表」的填报数据，按 年月-年月 区间统计为一张大表：
 *  - 行 = 车辆（含区域、项目部、车牌、驾驶员、车型、车辆性质等基本信息）
 *  - 列 = 区间内车辆费用（燃油数、五项费用分列、费用合计、里程、单耗、运转天数）
 * 支持多条件搜索：时间区间 + 区域 + 项目部 + 车型 + 车辆性质 + 填报状态 + 关键字（车牌/驾驶员）
 * 支持导出当前条件下的全部结果（CSV 带 BOM）。
 */

import React, { useMemo, useState } from 'react';
import { EC, Input, Select, StatusPill, TypePill, toast, useToast } from './_shared';
import {
  REGION_DEPTS, VEHICLE_TYPES, VEHICLE_OWNERSHIPS, getVehicles,
} from './AdminVehicleLedger';
import {
  costPer100, fuelPer100, getCosts, inMonthRange, curMonth,
} from './vehicleCostStore';

const REGIONS = Object.keys(REGION_DEPTS);
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (n: number | null, d = 1) => n === null ? '—' : n.toFixed(d);
const money = (n: number) => n > 0 ? n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const int = (n: number) => n.toLocaleString('zh-CN');

/* ==================== CSV 导出工具（BOM + CRLF，Excel 可直接打开） ==================== */
const csvEsc = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = '\uFEFF' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const HEADER = ['区域', '项目部', '车牌号码', '驾驶员', '车型', '车辆性质', '核算月数', '燃油数（公升）', '油料费（元）', '过路费（元）', '修理费（元）', '保险费（元）', '其他（元）', '费用合计（元）', '行驶里程（公里）', '百公里油耗（升/百公里）', '百公里用车成本（元/百公里）', '运转天数（天）'];

interface Row {
  v: ReturnType<typeof getVehicles>[number];
  months: number;
  liters: number; fuelFee: number; tollFee: number; repairFee: number; insuranceFee: number; otherFee: number;
  cost: number; mileage: number; days: number;
  fuel100: number | null; cost100: number | null;
}

export default function VehicleCostSummary() {
  const y = new Date().getFullYear();
  const vehicles = useMemo(() => getVehicles(), []);
  const costs = useMemo(() => getCosts(), []);
  const { ToastView } = useToast();

  /* 时间搜索：年月 - 年月 */
  const [from, setFrom] = useState(`${y}-01`);
  const [to, setTo] = useState(curMonth());
  const [regionSel, setRegionSel] = useState('');
  const [deptSel, setDeptSel] = useState('');
  const [typeSel, setTypeSel] = useState('');
  const [ownSel, setOwnSel] = useState('');
  const [filledSel, setFilledSel] = useState(''); // '' 全部 | 'yes' 有费用记录 | 'no' 无费用记录
  const [kw, setKw] = useState('');

  /** 区间内、属于筛选车队的核算表记录 */
  const fleetRecords = useMemo(() => {
    const ids = new Set(vehicles.filter(v =>
      (!regionSel || v.regionName === regionSel) &&
      (!deptSel || v.projectDept === deptSel) &&
      (!typeSel || v.vehicleType === typeSel) &&
      (!ownSel || v.ownership === ownSel)
    ).map(v => v.id));
    return costs.filter(r => ids.has(r.vehicleId) && inMonthRange(r.month, from, to));
  }, [vehicles, costs, regionSel, deptSel, typeSel, ownSel, from, to]);

  /** 单车汇总行（车辆基本信息 + 区间内费用） */
  const rows: Row[] = useMemo(() => {
    const k = kw.trim().toLowerCase();
    const list = vehicles.filter(v =>
      (!regionSel || v.regionName === regionSel) &&
      (!deptSel || v.projectDept === deptSel) &&
      (!typeSel || v.vehicleType === typeSel) &&
      (!ownSel || v.ownership === ownSel) &&
      (!k || v.plateNo.toLowerCase().includes(k) || v.driver.toLowerCase().includes(k))
    ).map(v => {
      const recs = fleetRecords.filter(r => r.vehicleId === v.id);
      const liters = recs.reduce((s, r) => s + r.fuelLiters, 0);
      const fuelFee = recs.reduce((s, r) => s + r.fuelFee, 0);
      const tollFee = recs.reduce((s, r) => s + r.tollFee, 0);
      const repairFee = recs.reduce((s, r) => s + r.repairFee, 0);
      const insuranceFee = recs.reduce((s, r) => s + r.insuranceFee, 0);
      const otherFee = recs.reduce((s, r) => s + r.otherFee, 0);
      const mileage = recs.reduce((s, r) => s + r.monthMileage, 0);
      const days = recs.reduce((s, r) => s + r.runDays, 0);
      const cost = fuelFee + tollFee + repairFee + insuranceFee + otherFee;
      return {
        v, months: recs.length, liters, fuelFee, tollFee, repairFee, insuranceFee, otherFee,
        cost, mileage, days,
        fuel100: fuelPer100(liters, mileage),
        cost100: costPer100(cost, mileage),
      };
    });
    const filtered = filledSel === 'yes' ? list.filter(r => r.months > 0)
      : filledSel === 'no' ? list.filter(r => r.months === 0)
        : list;
    return filtered.sort((a, b) => b.cost - a.cost || a.v.plateNo.localeCompare(b.v.plateNo));
  }, [vehicles, fleetRecords, regionSel, deptSel, typeSel, ownSel, kw, filledSel]);

  /** 合计 */
  const total = useMemo(() => {
    const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0);
    const liters = sum(r => r.liters);
    const cost = sum(r => r.cost);
    const mileage = sum(r => r.mileage);
    const recordCount = fleetRecords.filter(r => rows.some(row => row.v.id === r.vehicleId)).length;
    return {
      vehicles: rows.length,
      active: rows.filter(r => r.months > 0).length,
      records: recordCount,
      liters, cost, mileage, days: sum(r => r.days),
      fuelFee: sum(r => r.fuelFee), tollFee: sum(r => r.tollFee),
      repairFee: sum(r => r.repairFee), insuranceFee: sum(r => r.insuranceFee), otherFee: sum(r => r.otherFee),
      fuel100: fuelPer100(liters, mileage),
      cost100: costPer100(cost, mileage),
    };
  }, [rows, fleetRecords]);

  /** 导出当前条件下的全部结果 */
  const exportAll = () => {
    if (rows.length === 0) { toast('当前筛选条件下暂无可导出的车辆', 'error'); return; }
    const data = rows.map(row => [
      row.v.regionName, row.v.projectDept, row.v.plateNo, row.v.driver || '—', row.v.vehicleType, row.v.ownership,
      row.months, Math.round(row.liters), r2(row.fuelFee), r2(row.tollFee), r2(row.repairFee), r2(row.insuranceFee), r2(row.otherFee),
      r2(row.cost), row.mileage, num(row.fuel100), num(row.cost100), row.days,
    ]);
    const totalRow = [
      `合计（${total.vehicles} 辆）`, '', '', '', '', '', total.records,
      Math.round(total.liters), r2(total.fuelFee), r2(total.tollFee), r2(total.repairFee), r2(total.insuranceFee), r2(total.otherFee),
      r2(total.cost), total.mileage, num(total.fuel100), num(total.cost100), total.days,
    ];
    downloadCsv(`车辆费用汇总_${from}至${to}.csv`, [
      [`车辆费用汇总（${from} 至 ${to}）— 数据来源：单车费用核算表`],
      [],
      HEADER, ...data, totalRow,
    ]);
    toast(`已导出 ${rows.length} 辆车的费用汇总`, 'success');
  };

  return (
    <div className="p-5">
      <ToastView />
      {/* 多条件搜索 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">时间</span>
            <Input type="month" value={from} onChange={setFrom} className="!w-36" />
            <span className="text-slate-400 text-xs">至</span>
            <Input type="month" value={to} onChange={setTo} className="!w-36" />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Select value={regionSel} onChange={v => { setRegionSel(v); setDeptSel(''); }}
            options={[{ value: '', label: '全部区域' }, ...REGIONS.map(r => ({ value: r, label: r }))]} className="!w-32" />
          <Select value={deptSel} onChange={setDeptSel}
            options={[{ value: '', label: '全部项目部' },
              ...[...new Set(regionSel ? (REGION_DEPTS[regionSel] || []) : Object.values(REGION_DEPTS).flat())].map(d => ({ value: d, label: d }))]}
            className="!w-36" />
          <Select value={typeSel} onChange={setTypeSel}
            options={[{ value: '', label: '全部车型' }, ...VEHICLE_TYPES.map(t => ({ value: t, label: t }))]} className="!w-32" />
          <Select value={ownSel} onChange={setOwnSel}
            options={[{ value: '', label: '全部性质' }, ...VEHICLE_OWNERSHIPS.map(o => ({ value: o, label: o }))]} className="!w-32" />
          <Select value={filledSel} onChange={setFilledSel}
            options={[
              { value: '', label: '全部填报状态' },
              { value: 'yes', label: '有费用记录' },
              { value: 'no', label: '无费用记录' },
            ]} className="!w-36" />
          <Input value={kw} onChange={setKw} placeholder="搜索车牌号 / 驾驶员" className="!w-44" />
          <div className="ml-auto">
            <button onClick={exportAll} className={EC.button.primary}>导出全部结果</button>
          </div>
        </div>
      </div>

      {/* 大表：车辆（含基本信息）+ 区间内费用 */}
      <div className="text-sm font-semibold text-slate-800 mb-2">
        车辆费用汇总 · {from} 至 {to}（数据来源：单车费用核算表）
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>区域</th>
              <th className={EC.th}>项目部</th>
              <th className={EC.th}>车牌号码</th>
              <th className={EC.th}>驾驶员</th>
              <th className={EC.th}>车型</th>
              <th className={EC.th}>车辆性质</th>
              <th className={EC.th + ' text-right'}>核算月数</th>
              <th className={EC.th + ' text-right'}>燃油数（公升）</th>
              <th className={EC.th + ' text-right'}>油料费（元）</th>
              <th className={EC.th + ' text-right'}>过路费（元）</th>
              <th className={EC.th + ' text-right'}>修理费（元）</th>
              <th className={EC.th + ' text-right'}>保险费（元）</th>
              <th className={EC.th + ' text-right'}>其他（元）</th>
              <th className={EC.th + ' text-right'}>费用合计（元）</th>
              <th className={EC.th + ' text-right'}>行驶里程（公里）</th>
              <th className={EC.th + ' text-right'}>百公里油耗（升/百公里）</th>
              <th className={EC.th + ' text-right'}>百公里用车成本（元/百公里）</th>
              <th className={EC.th + ' text-right'}>运转天数（天）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.v.id} className={row.months === 0 ? 'text-slate-400' : 'hover:bg-slate-50'}>
                <td className={EC.td + ' whitespace-nowrap'}>{row.v.regionName}</td>
                <td className={EC.td + ' whitespace-nowrap'}>{row.v.projectDept}</td>
                <td className={EC.td + ' font-medium text-slate-800 whitespace-nowrap'}>{row.v.plateNo}</td>
                <td className={EC.td + ' whitespace-nowrap'}>{row.v.driver || '—'}</td>
                <td className={EC.td}><TypePill text={row.v.vehicleType} tone={row.v.vehicleType === '其他' ? 'slate' : 'indigo'} /></td>
                <td className={EC.td}><StatusPill status={row.v.ownership} /></td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.months || '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.liters ? int(row.liters) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.fuelFee ? money(row.fuelFee) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.tollFee ? money(row.tollFee) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.repairFee ? money(row.repairFee) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.insuranceFee ? money(row.insuranceFee) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.otherFee ? money(row.otherFee) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums font-medium text-slate-800'}>{money(row.cost)}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.mileage ? int(row.mileage) : '—'}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{num(row.fuel100)}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{num(row.cost100)}</td>
                <td className={EC.td + ' text-right tabular-nums'}>{row.days || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className={EC.td + ' text-center text-slate-400 py-8'} colSpan={18}>所选条件下暂无车辆</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td className={EC.td + ' bg-slate-100'} colSpan={6}>合计 · {total.vehicles} 辆（有费用记录 {total.active} 辆）</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{total.records}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{int(total.liters)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.fuelFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.tollFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.repairFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.insuranceFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.otherFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(total.cost)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{int(total.mileage)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{num(total.fuel100)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{num(total.cost100)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{total.days}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="text-[11px] text-slate-400 mt-2">
        车辆费用按所选时间区间（{from} 至 {to}）内的单车费用核算表填报记录统计；单耗按 Σ分子 ÷ Σ里程 × 100 计算。
      </div>
    </div>
  );
}
