/**
 * 设备管理 → 固定资产管理 → 单车费用核算表
 *
 * 按「车辆 × 月份」填报单车运行费用（字段与台账图片一致）：
 *  燃油数（公升）、油料费、过路费、修理费、保险费、其他、本月里程、运转情况（天）、备注
 * 派生列：
 *  百公里油耗（升/百公里）= 燃油数 ÷ 本月里程 × 100
 *  百公里用车成本（元/百公里）= 费用合计 ÷ 本月里程 × 100
 *  累计行驶里程数（公里）= 该车截至本月的各月里程之和
 * 表格行来自「行政车辆管理」的车辆台账，逐车填报。
 */

import React, { useMemo, useState } from 'react';
import {
  EC, Modal, SearchBar, Input, Select, StatusPill, TypePill, useToast, toast,
} from './_shared';
import { nowStr } from './equipmentStore';
import {
  VEHICLE_TYPES, VEHICLE_OWNERSHIPS,
  getVehicles, type AdminVehicle,
} from './AdminVehicleLedger';
import {
  curMonth, costOf, costPer100, costSum, emptyCost, fuelPer100,
  getCosts, upsertCost, type VehicleCostRecord,
} from './vehicleCostStore';

const num = (n: number | null, digits = 1) => n === null ? '—' : n.toFixed(digits);
const money = (n: number) => n > 0 ? n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export default function VehicleCostLedger() {
  const vehicles = useMemo(() => getVehicles(), []);
  const [costs, setCosts] = useState<VehicleCostRecord[]>(() => getCosts());
  const { ToastView } = useToast();
  const refresh = () => setCosts(getCosts());

  const [month, setMonth] = useState(curMonth());
  const [typeSel, setTypeSel] = useState('');
  const [ownershipSel, setOwnershipSel] = useState('');
  const [kw, setKw] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<VehicleCostRecord | null>(null);
  const [curVehicle, setCurVehicle] = useState<AdminVehicle | null>(null);

  const rows = useMemo(() => vehicles.filter(v =>
    (!typeSel || v.vehicleType === typeSel) &&
    (!ownershipSel || v.ownership === ownershipSel) &&
    (!kw.trim() || v.plateNo.toLowerCase().includes(kw.trim().toLowerCase()) || v.driver.includes(kw.trim()))
  ).sort((a, b) => a.vehicleType.localeCompare(b.vehicleType, 'zh') || a.plateNo.localeCompare(b.plateNo)), [vehicles, typeSel, ownershipSel, kw]);

  /** 当月各车记录（可能未填报） */
  const cells = useMemo(() => rows.map(v => {
    const rec = costOf(costs, v.id, month);
    const cum = costs.filter(r => r.vehicleId === v.id && r.month <= month)
      .reduce((s, r) => s + r.monthMileage, 0);
    return { v, rec, cum };
  }), [rows, costs, month]);

  /** 合计（仅统计已填报） */
  const totals = useMemo(() => {
    const filled = cells.filter(c => c.rec).map(c => c.rec!);
    const sum = (f: (r: VehicleCostRecord) => number) => filled.reduce((s, r) => s + f(r), 0);
    return {
      count: filled.length,
      total: rows.length,
      liters: sum(r => r.fuelLiters),
      fuelFee: sum(r => r.fuelFee),
      toll: sum(r => r.tollFee),
      repair: sum(r => r.repairFee),
      insurance: sum(r => r.insuranceFee),
      other: sum(r => r.otherFee),
      mileage: sum(r => r.monthMileage),
      cost: filled.reduce((s, r) => s + costSum(r), 0),
      days: sum(r => r.runDays),
    };
  }, [cells, rows.length]);

  const openEdit = (v: AdminVehicle) => {
    const rec = costOf(costs, v.id, month);
    setCurVehicle(v);
    setEdit(rec ? { ...rec } : emptyCost(v.id, month));
    setOpen(true);
  };

  const setField = <K extends keyof VehicleCostRecord>(k: K, val: VehicleCostRecord[K]) =>
    setEdit(e => e ? { ...e, [k]: val } : e);

  const numField = (k: 'fuelLiters' | 'fuelFee' | 'tollFee' | 'repairFee' | 'insuranceFee' | 'otherFee' | 'monthMileage' | 'runDays') =>
    (val: string) => setField(k, Math.max(0, Number(val) || 0));

  const save = () => {
    if (!edit) return;
    if (edit.monthMileage <= 0) return toast('请填写本月里程（公里）', 'error');
    upsertCost({ ...edit, month, updatedAt: nowStr() });
    toast('单车费用已保存', 'success');
    setOpen(false); setEdit(null); setCurVehicle(null); refresh();
  };

  /* 弹窗实时派生值 */
  const editCost = edit ? costSum(edit) : 0;
  const editFuel100 = edit ? fuelPer100(edit.fuelLiters, edit.monthMileage) : null;
  const editCost100 = edit ? costPer100(editCost, edit.monthMileage) : null;
  const editCum = useMemo(() => {
    if (!edit) return 0;
    const base = costs.filter(r => r.vehicleId === edit.vehicleId && r.month < edit.month)
      .reduce((s, r) => s + r.monthMileage, 0);
    return base + (edit.monthMileage || 0);
  }, [edit, costs]);

  return (
    <div className="p-5">
      <ToastView />

      <SearchBar>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">核算月份</span>
          <Input type="month" value={month} onChange={setMonth} className="!w-40" />
        </div>
        <Select value={typeSel} onChange={setTypeSel}
          options={[{ value: '', label: '全部车型' }, ...VEHICLE_TYPES.map(t => ({ value: t, label: t }))]} className="!w-32" />
        <Select value={ownershipSel} onChange={setOwnershipSel}
          options={[{ value: '', label: '全部性质' }, ...VEHICLE_OWNERSHIPS.map(o => ({ value: o, label: o }))]} className="!w-32" />
        <Input value={kw} onChange={setKw} placeholder="搜索车牌号 / 驾驶员" className="!w-56" />
      </SearchBar>

      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span>车辆 <strong className="text-slate-800 tabular-nums">{rows.length}</strong> 辆</span>
        <span>已填报 <strong className="text-emerald-700 tabular-nums">{totals.count}</strong> 辆</span>
        <span>未填报 <strong className="text-rose-600 tabular-nums">{totals.total - totals.count}</strong> 辆</span>
        <span className="text-slate-400">费用按「车辆 × 月份」登记，同一车辆同一月份只保留一条</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>车牌号码</th>
              <th className={EC.th}>驾驶员</th>
              <th className={EC.th}>车型</th>
              <th className={EC.th}>车辆性质</th>
              <th className={EC.th + ' text-right'}>燃油数（公升）</th>
              <th className={EC.th + ' text-right'}>油料费（元）</th>
              <th className={EC.th + ' text-right'}>过路费（元）</th>
              <th className={EC.th + ' text-right'}>修理费（元）</th>
              <th className={EC.th + ' text-right'}>保险费（元）</th>
              <th className={EC.th + ' text-right'}>其他（元）</th>
              <th className={EC.th + ' text-right'}>本月里程（公里）</th>
              <th className={EC.th + ' text-right'}>百公里油耗（升/百公里）</th>
              <th className={EC.th + ' text-right'}>累计行驶里程数（公里）</th>
              <th className={EC.th + ' text-right'}>运转情况（天）</th>
              <th className={EC.th + ' text-right'}>百公里用车成本（元/百公里）</th>
              <th className={EC.th}>备注</th>
              <th className={EC.th}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cells.map(({ v, rec, cum }) => (
              <tr key={v.id} className={rec ? 'hover:bg-slate-50' : 'bg-amber-50/40 hover:bg-amber-50'}>
                <td className={EC.td + ' font-medium text-slate-800 whitespace-nowrap'}>{v.plateNo}</td>
                <td className={EC.td + ' whitespace-nowrap'}>{v.driver || '—'}</td>
                <td className={EC.td}><TypePill text={v.vehicleType} tone={v.vehicleType === '其他' ? 'slate' : 'indigo'} /></td>
                <td className={EC.td}><StatusPill status={v.ownership} /></td>
                {rec ? (
                  <>
                    <td className={EC.td + ' text-right tabular-nums'}>{rec.fuelLiters || '—'}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(rec.fuelFee)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(rec.tollFee)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(rec.repairFee)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(rec.insuranceFee)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(rec.otherFee)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{rec.monthMileage.toLocaleString('zh-CN')}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{num(fuelPer100(rec.fuelLiters, rec.monthMileage))}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{cum.toLocaleString('zh-CN')}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{rec.runDays || '—'}</td>
                    <td className={EC.td + ' text-right tabular-nums font-medium text-slate-800'}>{num(costPer100(costSum(rec), rec.monthMileage))}</td>
                    <td className={EC.td + ' text-xs text-slate-500 max-w-[160px]'}>{rec.remark || '—'}</td>
                  </>
                ) : (
                  <td colSpan={11} className="px-3 py-2 border-b border-slate-100 text-xs text-amber-700">
                    本月未填报（累计里程 {cum.toLocaleString('zh-CN')} 公里）
                  </td>
                )}
                <td className={EC.td}>
                  <button className={EC.button.tiny} onClick={() => openEdit(v)}>{rec ? '编辑' : '填报'}</button>
                </td>
              </tr>
            ))}
            {cells.length === 0 && (
              <tr><td className={EC.td + ' text-center text-slate-400 py-8'} colSpan={17}>暂无车辆，请先在「行政车辆管理」中登记车辆</td></tr>
            )}
          </tbody>
          {cells.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td className={EC.td + ' sticky bottom-0 bg-slate-100'} colSpan={4}>合计（已填报 {totals.count} 辆）</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{totals.liters.toLocaleString('zh-CN')}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(totals.fuelFee)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(totals.toll)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(totals.repair)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(totals.insurance)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{money(totals.other)}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{totals.mileage.toLocaleString('zh-CN')}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{num(fuelPer100(totals.liters, totals.mileage))}</td>
                <td className={EC.td + ' text-right bg-slate-100 text-slate-400'}>—</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{totals.days}</td>
                <td className={EC.td + ' text-right tabular-nums bg-slate-100'}>{num(costPer100(totals.cost, totals.mileage))}</td>
                <td className={EC.td + ' bg-slate-100'} colSpan={2}>费用合计 ¥{money(totals.cost)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal
        title={`${curVehicle?.plateNo || ''} · ${month} 单车费用填报`}
        open={open}
        onClose={() => { setOpen(false); setEdit(null); setCurVehicle(null); }}
        width="max-w-4xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); setCurVehicle(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}
      >
        {edit && curVehicle && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm bg-slate-50 rounded-lg p-3">
              <div><span className="text-slate-500 text-xs">车牌号码</span><div className="font-medium">{curVehicle.plateNo}</div></div>
              <div><span className="text-slate-500 text-xs">驾驶员</span><div className="font-medium">{curVehicle.driver || '—'}</div></div>
              <div><span className="text-slate-500 text-xs">车型 / 性质</span><div className="font-medium">{curVehicle.vehicleType} · {curVehicle.ownership}</div></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={EC.label}>核算月份</label>
                <Input type="month" value={edit.month} readOnly />
              </div>
              <div>
                <label className={EC.label}>燃油数（公升）</label>
                <Input type="number" value={edit.fuelLiters} onChange={numField('fuelLiters')} />
              </div>
              <div>
                <label className={EC.label}>油料费（元）</label>
                <Input type="number" value={edit.fuelFee} onChange={numField('fuelFee')} />
              </div>
              <div>
                <label className={EC.label}>过路费（元）</label>
                <Input type="number" value={edit.tollFee} onChange={numField('tollFee')} />
              </div>
              <div>
                <label className={EC.label}>修理费（元）</label>
                <Input type="number" value={edit.repairFee} onChange={numField('repairFee')} />
              </div>
              <div>
                <label className={EC.label}>保险费（元）</label>
                <Input type="number" value={edit.insuranceFee} onChange={numField('insuranceFee')} />
              </div>
              <div>
                <label className={EC.label}>其他（元）</label>
                <Input type="number" value={edit.otherFee} onChange={numField('otherFee')} />
              </div>
              <div>
                <label className={EC.label}>本月里程（公里）*</label>
                <Input type="number" value={edit.monthMileage} onChange={numField('monthMileage')} />
              </div>
              <div>
                <label className={EC.label}>运转情况（天）</label>
                <Input type="number" value={edit.runDays} onChange={numField('runDays')} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 rounded-lg border border-orange-100 bg-orange-50/40 p-3">
              <div>
                <span className={EC.label}>费用合计（元）</span>
                <div className="text-sm font-semibold tabular-nums text-slate-800">¥{money(editCost)}</div>
              </div>
              <div>
                <span className={EC.label}>百公里油耗（升/百公里）</span>
                <div className="text-sm font-semibold tabular-nums text-slate-800">{num(editFuel100)}</div>
              </div>
              <div>
                <span className={EC.label}>累计行驶里程数（公里）</span>
                <div className="text-sm font-semibold tabular-nums text-slate-800">{editCum.toLocaleString('zh-CN')}</div>
              </div>
              <div>
                <span className={EC.label}>百公里用车成本（元/百公里）</span>
                <div className="text-sm font-semibold tabular-nums text-slate-800">{num(editCost100)}</div>
              </div>
            </div>

            <div className="mt-4">
              <label className={EC.label}>备注</label>
              <textarea value={edit.remark} onChange={e => setField('remark', e.target.value)} rows={2}
                placeholder="如：含一次常规保养"
                className={EC.input + ' resize-none'} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
