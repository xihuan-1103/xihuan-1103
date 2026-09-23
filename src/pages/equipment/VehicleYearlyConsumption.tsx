/**
 * 车辆累计消耗（按年）
 *  - 列表展示当前所有车辆，分类型、分具体车辆
 *  - 列：行驶里程（本日/本月/本年）、燃油消耗（数量/金额 本日/本月/本年）、
 *        单机油耗（本年数量升/本年里程）、维修保养费（本日/本月/本年）、保险费（元/年）
 *  - 保险费可直接编辑（存储于设备台账）
 */

import React, { useMemo, useState } from 'react';
import type { Equipment, VehicleDailyRecord } from './types';
import {
  EC, Modal, Input, Select, useToast, toast,
} from './_shared';
import {
  getVehicleDailyRecords, getEquipments, upsertEquipment, todayStr,
} from './equipmentStore';

interface Props { key?: string | number; onRefresh?: () => void; }

/** 单辆车年度累计行 */
interface YearRow {
  eq: Equipment;
  mileageToday: number; mileageMonth: number; mileageYear: number;
  fuelQtyToday: number; fuelAmountToday: number;
  fuelQtyMonth: number; fuelAmountMonth: number;
  fuelQtyYear: number; fuelAmountYear: number;
  maintToday: number; maintMonth: number; maintYear: number;
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtInt = (n: number) => Math.round(n).toLocaleString();

export default function VehicleYearlyConsumption({}: Props) {
  const [list, setList] = useState<VehicleDailyRecord[]>(() => getVehicleDailyRecords());
  const [equipments, setEquipments] = useState<Equipment[]>(() => getEquipments());
  const { ToastView } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [kw, setKw] = useState('');

  const refresh = () => { setList(getVehicleDailyRecords()); setEquipments(getEquipments()); };

  /** 可选年份：数据中的年份 ∪ 当前年 */
  const years = useMemo(() => {
    const ys = new Set<number>(list.map(r => Number(r.date.slice(0, 4))));
    ys.add(currentYear);
    return [...ys].sort((a, b) => b - a);
  }, [list, currentYear]);

  const today = todayStr();
  const month = today.slice(0, 7);

  /** 分类型聚合 */
  const grouped = useMemo(() => {
    const rows: YearRow[] = equipments.map(eq => {
      const rs = list.filter(r => r.equipmentId === eq.id && r.date.startsWith(String(year)));
      const sum = (f: (r: VehicleDailyRecord) => number, pred: (r: VehicleDailyRecord) => boolean) =>
        rs.filter(pred).reduce((s, r) => s + f(r), 0);
      return {
        eq,
        mileageToday: sum(r => r.mileage, r => r.date === today),
        mileageMonth: sum(r => r.mileage, r => r.date.startsWith(month)),
        mileageYear: sum(r => r.mileage, () => true),
        fuelQtyToday: sum(r => r.fuelQty, r => r.date === today),
        fuelAmountToday: sum(r => r.fuelAmount, r => r.date === today),
        fuelQtyMonth: sum(r => r.fuelQty, r => r.date.startsWith(month)),
        fuelAmountMonth: sum(r => r.fuelAmount, r => r.date.startsWith(month)),
        fuelQtyYear: sum(r => r.fuelQty, () => true),
        fuelAmountYear: sum(r => r.fuelAmount, () => true),
        maintToday: sum(r => r.maintenanceCost, r => r.date === today),
        maintMonth: sum(r => r.maintenanceCost, r => r.date.startsWith(month)),
        maintYear: sum(r => r.maintenanceCost, () => true),
      };
    }).filter(r => {
      if (!kw.trim()) return true;
      const k = kw.trim().toLowerCase();
      return r.eq.code.toLowerCase().includes(k) || r.eq.name.toLowerCase().includes(k) || r.eq.category.toLowerCase().includes(k);
    });

    const map = new Map<string, YearRow[]>();
    for (const r of rows) {
      const arr = map.get(r.eq.category) || [];
      arr.push(r);
      map.set(r.eq.category, arr);
    }
    return [...map.entries()];
  }, [equipments, list, year, today, month, kw]);

  const grandTotal = useMemo(() => grouped.flatMap(([, rs]) => rs).reduce((acc, r) => ({
    mileageYear: acc.mileageYear + r.mileageYear,
    fuelQtyYear: acc.fuelQtyYear + r.fuelQtyYear,
    fuelAmountYear: acc.fuelAmountYear + r.fuelAmountYear,
    maintYear: acc.maintYear + r.maintYear,
    insurance: acc.insurance + (r.eq.insuranceFee || 0),
  }), { mileageYear: 0, fuelQtyYear: 0, fuelAmountYear: 0, maintYear: 0, insurance: 0 }), [grouped]);

  // ===== 保险费编辑 =====
  const [insOpen, setInsOpen] = useState(false);
  const [insEq, setInsEq] = useState<Equipment | null>(null);
  const [insFee, setInsFee] = useState(0);

  const openIns = (eq: Equipment) => {
    setInsEq(eq);
    setInsFee(eq.insuranceFee || 0);
    setInsOpen(true);
  };

  const saveIns = () => {
    if (!insEq) return;
    if (insFee < 0) { toast('保险费不能为负数', 'error'); return; }
    upsertEquipment({ ...insEq, insuranceFee: insFee });
    toast(`「${insEq.name}」保险费已更新`, 'success');
    setInsOpen(false);
    refresh();
  };

  /** 单机油耗：本年数量（升）/ 本年里程数（km） */
  const unitFuel = (r: YearRow) =>
    r.mileageYear > 0 ? (r.fuelQtyYear / r.mileageYear).toFixed(2) : '-';

  return (
    <div>
      <ToastView />

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
        <Select value={String(year)} onChange={v => setYear(Number(v))}
          options={years.map(y => ({ value: String(y), label: `${y} 年` }))} className="!w-32" />
        <Input value={kw} onChange={setKw} placeholder="搜索车辆/类别" className="!w-60" />
        <div className="text-xs text-slate-400">
          本日/本月均指当前自然日、自然月；年度合计为 {year} 年 1 月 1 日至今的累计值
        </div>
        <div className="flex-1" />
        <button className={EC.button.ghost} onClick={refresh}>刷新</button>
      </div>

      {/* 宽表格 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={EC.table + ' min-w-[1400px]'}>
            <thead>
              <tr>
                <th className={EC.th + ' sticky left-0 bg-slate-50 z-10'} rowSpan={2}>车辆（编号 · 类别）</th>
                <th className={EC.th + ' text-center bg-slate-100/70'} colSpan={3}>行驶里程(km)</th>
                <th className={EC.th + ' text-center bg-slate-100/70'} colSpan={6}>燃油消耗</th>
                <th className={EC.th + ' text-center bg-slate-100/70'} rowSpan={2}>单机油耗<br />(升/km)</th>
                <th className={EC.th + ' text-center bg-slate-100/70'} colSpan={3}>维修保养费(元)</th>
                <th className={EC.th + ' text-center bg-slate-100/70'} rowSpan={2}>保险费<br />(元/年)</th>
              </tr>
              <tr>
                <th className={EC.th}>本日</th><th className={EC.th}>本月</th><th className={EC.th}>本年</th>
                <th className={EC.th}>本日数量(升)</th><th className={EC.th}>本日金额</th>
                <th className={EC.th}>本月数量(升)</th><th className={EC.th}>本月金额</th>
                <th className={EC.th}>本年数量(升)</th><th className={EC.th}>本年金额</th>
                <th className={EC.th}>本日</th><th className={EC.th}>本月</th><th className={EC.th}>本年</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.map(([category, rows]) => {
                // 类型小计
                const sub = rows.reduce((acc, r) => ({
                  mileageYear: acc.mileageYear + r.mileageYear,
                  fuelQtyYear: acc.fuelQtyYear + r.fuelQtyYear,
                  fuelAmountYear: acc.fuelAmountYear + r.fuelAmountYear,
                  maintYear: acc.maintYear + r.maintYear,
                  insurance: acc.insurance + (r.eq.insuranceFee || 0),
                }), { mileageYear: 0, fuelQtyYear: 0, fuelAmountYear: 0, maintYear: 0, insurance: 0 });
                return (
                  <React.Fragment key={category}>
                    {/* 类型分组头 */}
                    <tr className="bg-slate-50/80">
                      <td colSpan={15} className="px-3 py-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-slate-800">{category}</span>
                          <span className="text-xs text-slate-500">{rows.length} 辆</span>
                          <span className="text-xs text-slate-500">
                            小计（本年）：里程 {fmtInt(sub.mileageYear)} km · 燃油 {fmtInt(sub.fuelQtyYear)} 升 / ¥{fmtInt(sub.fuelAmountYear)} · 维保 ¥{fmtInt(sub.maintYear)} · 保险 ¥{fmtInt(sub.insurance)}/年
                          </span>
                        </div>
                      </td>
                    </tr>
                    {/* 具体车辆行 */}
                    {rows.map(r => (
                      <tr key={r.eq.id} className="hover:bg-slate-50">
                        <td className={EC.td + ' sticky left-0 bg-white font-medium'}>
                          <div>{r.eq.name}</div>
                          <div className="text-xs text-slate-500">{r.eq.code}</div>
                        </td>
                        <td className={EC.td + ' text-right tabular-nums'}>{fmtInt(r.mileageToday)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>{fmtInt(r.mileageMonth)}</td>
                        <td className={EC.td + ' text-right tabular-nums font-medium'}>{fmtInt(r.mileageYear)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>{fmt(r.fuelQtyToday)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>¥{fmtInt(r.fuelAmountToday)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>{fmt(r.fuelQtyMonth)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>¥{fmtInt(r.fuelAmountMonth)}</td>
                        <td className={EC.td + ' text-right tabular-nums font-medium'}>{fmt(r.fuelQtyYear)}</td>
                        <td className={EC.td + ' text-right tabular-nums text-emerald-700'}>¥{fmtInt(r.fuelAmountYear)}</td>
                        <td className={EC.td + ' text-right tabular-nums font-medium text-cyan-700'}>{unitFuel(r)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>¥{fmtInt(r.maintToday)}</td>
                        <td className={EC.td + ' text-right tabular-nums'}>¥{fmtInt(r.maintMonth)}</td>
                        <td className={EC.td + ' text-right tabular-nums font-medium text-amber-700'}>¥{fmtInt(r.maintYear)}</td>
                        <td className={EC.td + ' text-right tabular-nowrap'}>
                          <span className="tabular-nums mr-1">¥{fmtInt(r.eq.insuranceFee || 0)}</span>
                          <button className={EC.button.tiny} onClick={() => openIns(r.eq)}>编辑</button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {grouped.length === 0 && (
                <tr><td colSpan={15} className={EC.td + ' text-center text-slate-400 py-8'}>暂无车辆数据</td></tr>
              )}
              {/* 总计行 */}
              {grouped.length > 0 && (
                <tr className="bg-orange-50/60 font-semibold">
                  <td className={EC.td + ' sticky left-0 bg-[#fff7ed]'}>总计（{year} 年）</td>
                  <td className={EC.td + ' text-right tabular-nums'} colSpan={2}></td>
                  <td className={EC.td + ' text-right tabular-nums text-orange-700'}>{fmtInt(grandTotal.mileageYear)}</td>
                  <td className={EC.td + ' text-right tabular-nums'} colSpan={4}></td>
                  <td className={EC.td + ' text-right tabular-nums text-orange-700'}>{fmt(grandTotal.fuelQtyYear)}</td>
                  <td className={EC.td + ' text-right tabular-nums text-orange-700'}>¥{fmtInt(grandTotal.fuelAmountYear)}</td>
                  <td className={EC.td + ' text-right tabular-nums'}></td>
                  <td className={EC.td + ' text-right tabular-nums'} colSpan={2}></td>
                  <td className={EC.td + ' text-right tabular-nums text-orange-700'}>¥{fmtInt(grandTotal.maintYear)}</td>
                  <td className={EC.td + ' text-right tabular-nums text-orange-700'}>¥{fmtInt(grandTotal.insurance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 保险费编辑弹窗 */}
      <Modal title={`编辑保险费 - ${insEq?.name || ''}`} open={insOpen}
        onClose={() => setInsOpen(false)} width="max-w-md"
        footer={<>
          <button className={EC.button.ghost} onClick={() => setInsOpen(false)}>取消</button>
          <button className={EC.button.primary} onClick={saveIns}>保存</button>
        </>}>
        {insEq && (
          <div className="space-y-3">
            <div className="text-sm text-slate-500">
              {insEq.code} · {insEq.category} · {insEq.model}
            </div>
            <div>
              <label className={EC.label}>保险费（元/年）</label>
              <Input type="number" value={insFee} onChange={v => setInsFee(Number(v) || 0)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
