/**
 * 车辆每日消耗
 *  - 按日创建：选择日期后维护当天所有车辆的
 *    行驶里程、燃油消耗（本日数量/本日耗用金额）、维修保养费用
 *  - 列表按日期分组展示每日明细
 */

import React, { useMemo, useState } from 'react';
import type { VehicleDailyRecord } from './types';
import {
  EC, Modal, SearchBar, Input, Select, useToast, toast,
} from './_shared';
import {
  getVehicleDailyRecords, upsertVehicleDailyRecord, deleteVehicleDailyRecord,
  getEquipments, genId, todayStr,
} from './equipmentStore';

interface Props { key?: string | number; onRefresh?: () => void; }

/** 编辑弹窗中的一行（一辆车当日的消耗） */
interface DailyLine {
  key: string;              // 临时行 key
  recordId?: string;        // 已有记录 id（编辑时保留）
  equipmentId: string;
  mileage: number;
  fuelQty: number;
  fuelAmount: number;
  maintenanceCost: number;
  remark: string;
}

const newLine = (): DailyLine => ({
  key: genId('ln'), equipmentId: '', mileage: 0,
  fuelQty: 0, fuelAmount: 0, maintenanceCost: 0, remark: '',
});

export default function VehicleDailyConsumption({ onRefresh }: Props) {
  const [list, setList] = useState<VehicleDailyRecord[]>(() => getVehicleDailyRecords());
  const refresh = () => { setList(getVehicleDailyRecords()); onRefresh?.(); };
  const { ToastView } = useToast();
  const [kw, setKw] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [open, setOpen] = useState(false);
  const [editDate, setEditDate] = useState(todayStr());
  const [origDate, setOrigDate] = useState<string | null>(null); // 编辑中的原始日期（保存时清理旧日数据）
  const [recorder, setRecorder] = useState('当前用户');
  const [lines, setLines] = useState<DailyLine[]>([newLine()]);

  const equipments = useMemo(() => getEquipments(), []);

  const filtered = useMemo(() => {
    let r = list;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(v => v.equipmentCode.toLowerCase().includes(k) || v.equipmentName.toLowerCase().includes(k) || v.category.toLowerCase().includes(k));
    }
    if (dateFrom) r = r.filter(v => v.date >= dateFrom);
    if (dateTo) r = r.filter(v => v.date <= dateTo);
    return r;
  }, [list, kw, dateFrom, dateTo]);

  /** 按日期分组 */
  const grouped = useMemo(() => {
    const map = new Map<string, VehicleDailyRecord[]>();
    for (const r of filtered) {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalMileage = filtered.reduce((s, r) => s + r.mileage, 0);
  const totalFuelQty = filtered.reduce((s, r) => s + r.fuelQty, 0);
  const totalFuelAmount = filtered.reduce((s, r) => s + r.fuelAmount, 0);
  const totalMaint = filtered.reduce((s, r) => s + r.maintenanceCost, 0);

  const openNew = () => {
    setEditDate(todayStr());
    setOrigDate(null);
    setRecorder('当前用户');
    setLines([newLine()]);
    setOpen(true);
  };

  /** 编辑某一天的全部消耗明细 */
  const openEditDay = (date: string) => {
    const dayRecords = getVehicleDailyRecords().filter(r => r.date === date);
    setEditDate(date);
    setOrigDate(date);
    if (dayRecords.length > 0) setRecorder(dayRecords[0].recorder);
    setLines(dayRecords.map(r => ({
      key: genId('ln'), recordId: r.id,
      equipmentId: r.equipmentId,
      mileage: r.mileage, fuelQty: r.fuelQty, fuelAmount: r.fuelAmount,
      maintenanceCost: r.maintenanceCost, remark: r.remark || '',
    })));
    setOpen(true);
  };

  const setLine = (key: string, patch: Partial<DailyLine>) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l));

  const addLine = () => setLines(ls => [...ls, newLine()]);
  const removeLine = (key: string) => setLines(ls => (ls.length > 1 ? ls.filter(l => l.key !== key) : ls));

  const save = () => {
    if (!editDate) { toast('请选择日期', 'error'); return; }
    for (const l of lines) {
      if (!l.equipmentId) { toast('存在未选择车辆的明细行', 'error'); return; }
      if (l.mileage < 0 || l.fuelQty < 0 || l.fuelAmount < 0 || l.maintenanceCost < 0) {
        toast('里程/燃油/维保费用不能为负数', 'error'); return;
      }
    }
    // 同一车辆当日不能重复
    const dup = lines.find((l, i) => lines.findIndex(x => x.equipmentId === l.equipmentId) !== i);
    if (dup) {
      const eq = equipments.find(e => e.id === dup.equipmentId);
      toast(`车辆「${eq?.name || ''}」当日已存在重复行，请合并`, 'error');
      return;
    }

    // 清理原始日期中已被删除/移走的行
    if (origDate) {
      const keepIds = new Set(lines.filter(l => l.recordId).map(l => l.recordId));
      getVehicleDailyRecords().filter(r => r.date === origDate && !keepIds.has(r.id))
        .forEach(r => deleteVehicleDailyRecord(r.id));
    }

    for (const l of lines) {
      const eq = equipments.find(e => e.id === l.equipmentId);
      upsertVehicleDailyRecord({
        id: l.recordId || genId('vd'),
        date: editDate,
        equipmentId: l.equipmentId,
        equipmentCode: eq?.code || '',
        equipmentName: eq?.name || '',
        category: eq?.category || '',
        mileage: l.mileage,
        fuelQty: l.fuelQty,
        fuelAmount: l.fuelAmount,
        maintenanceCost: l.maintenanceCost,
        recorder,
        remark: l.remark,
        createdAt: '', updatedAt: '',
      });
    }
    toast(`「${editDate}」车辆消耗已保存（${lines.length} 辆车）`, 'success');
    setOpen(false); setOrigDate(null); refresh();
  };

  const doDeleteDay = (date: string) => {
    const dayRecords = getVehicleDailyRecords().filter(r => r.date === date);
    if (confirm(`确定删除「${date}」当天的全部 ${dayRecords.length} 条车辆消耗记录？`)) {
      dayRecords.forEach(r => deleteVehicleDailyRecord(r.id));
      refresh();
      toast('已删除当日车辆消耗记录', 'success');
    }
  };

  const linesTotalMileage = lines.reduce((s, l) => s + l.mileage, 0);
  const linesTotalFuel = lines.reduce((s, l) => s + l.fuelQty, 0);
  const linesTotalAmount = lines.reduce((s, l) => s + l.fuelAmount + l.maintenanceCost, 0);

  return (
    <div>
      <ToastView />
      {/* 汇总 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">填报天数</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{grouped.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">总里程(km)</div>
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{totalMileage.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">总燃油(升)</div>
          <div className="text-2xl font-bold text-cyan-600 tabular-nums">{totalFuelQty.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">燃油总金额(元)</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">¥{totalFuelAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">维保总费用(元)</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">¥{totalMaint.toLocaleString()}</div>
        </div>
      </div>

      <SearchBar onAdd={openNew} addLabel="+ 车辆消耗按日填报">
        <Input value={kw} onChange={setKw} placeholder="搜索车辆/类别" className="!w-60" />
        <Input type="date" value={dateFrom} onChange={setDateFrom} placeholder="起始日期" className="!w-36" />
        <Input type="date" value={dateTo} onChange={setDateTo} placeholder="结束日期" className="!w-36" />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>车辆</th>
              <th className={EC.th}>行驶里程(km)</th>
              <th className={EC.th}>本日燃油数量(升)</th>
              <th className={EC.th}>本日耗用金额(元)</th>
              <th className={EC.th}>本日维修保养费(元)</th>
              <th className={EC.th}>记录人</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grouped.map(([date, records]) => {
              const dayMileage = records.reduce((s, r) => s + r.mileage, 0);
              const dayFuel = records.reduce((s, r) => s + r.fuelQty, 0);
              const dayFuelAmt = records.reduce((s, r) => s + r.fuelAmount, 0);
              const dayMaint = records.reduce((s, r) => s + r.maintenanceCost, 0);
              return (
                <React.Fragment key={date}>
                  {/* 日期分组头 */}
                  <tr className="bg-slate-50/80">
                    <td colSpan={6} className="px-3 py-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800">{date}</span>
                          <span className="text-xs text-slate-500">
                            {records.length} 辆车 · 里程 {dayMileage} km · 燃油 {dayFuel} 升 / ¥{dayFuelAmt.toLocaleString()} · 维保 ¥{dayMaint.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button className={EC.button.tiny} onClick={() => openEditDay(date)}>编辑当日</button>
                          <button className={EC.button.tiny + ' text-rose-600'} onClick={() => doDeleteDay(date)}>删除当日</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* 当日明细行 */}
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={EC.td}>
                        <div className="font-medium">{r.equipmentName}</div>
                        <div className="text-xs text-slate-500">{r.equipmentCode} · {r.category}</div>
                      </td>
                      <td className={EC.td + ' text-right tabular-nums font-medium'}>{r.mileage}</td>
                      <td className={EC.td + ' text-right tabular-nums'}>{r.fuelQty}</td>
                      <td className={EC.td + ' text-right tabular-nums text-emerald-700'}>¥{r.fuelAmount.toLocaleString()}</td>
                      <td className={EC.td + ' text-right tabular-nums text-amber-700'}>¥{r.maintenanceCost.toLocaleString()}</td>
                      <td className={EC.td}>{r.recorder}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {grouped.length === 0 && (
              <tr><td colSpan={6} className={EC.td + ' text-center text-slate-400 py-8'}>暂无车辆消耗记录，点击「车辆消耗按日填报」开始</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={`车辆每日消耗填报 - ${editDate}`} open={open}
        onClose={() => { setOpen(false); setOrigDate(null); }} width="max-w-5xl"
        footer={<>
          <div className="flex-1 text-sm text-slate-500">
            当日合计：<span className="font-semibold text-orange-600">{linesTotalMileage}</span> km ·
            <span className="font-semibold text-cyan-600 ml-1">{linesTotalFuel}</span> 升 ·
            <span className="font-semibold text-emerald-600 ml-1">¥{linesTotalAmount.toLocaleString()}</span>
          </div>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setOrigDate(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存当日填报</button>
        </>}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-44">
            <label className={EC.label}>填报日期 *</label>
            <Input type="date" value={editDate} onChange={setEditDate} />
          </div>
          <div className="w-44">
            <label className={EC.label}>记录人</label>
            <Input value={recorder} onChange={setRecorder} />
          </div>
          <div className="flex-1 text-xs text-slate-400 pt-5">
            维护当天所有车辆的行驶里程、燃油消耗（数量/金额）与维修保养费用
          </div>
        </div>

        {/* 明细行编辑器 */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className={EC.table}>
            <thead>
              <tr>
                <th className={EC.th + ' w-[240px]'}>车辆 *</th>
                <th className={EC.th + ' w-[120px]'}>行驶里程(km)</th>
                <th className={EC.th + ' w-[130px]'}>燃油数量(升)</th>
                <th className={EC.th + ' w-[130px]'}>耗用金额(元)</th>
                <th className={EC.th + ' w-[130px]'}>维修保养费(元)</th>
                <th className={EC.th + ' w-[160px]'}>备注</th>
                <th className={EC.th + ' w-[60px]'}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map(l => {
                const eq = equipments.find(e => e.id === l.equipmentId);
                return (
                  <tr key={l.key}>
                    <td className={EC.td}>
                      <Select value={l.equipmentId} onChange={v => setLine(l.key, { equipmentId: v })}
                        options={[{ value: '', label: '选择车辆' }, ...equipments.map(e => ({ value: e.id, label: `${e.name} (${e.code})` }))]} />
                      {eq && <div className="text-[11px] text-slate-400 mt-0.5">{eq.category}{eq.ownership === 'leased' ? ' · 租赁' : ' · 自有'}</div>}
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.mileage} onChange={v => setLine(l.key, { mileage: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.fuelQty} onChange={v => setLine(l.key, { fuelQty: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.fuelAmount} onChange={v => setLine(l.key, { fuelAmount: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.maintenanceCost} onChange={v => setLine(l.key, { maintenanceCost: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td}>
                      <Input value={l.remark} onChange={v => setLine(l.key, { remark: v })} />
                    </td>
                    <td className={EC.td}>
                      <button className={EC.button.tiny + ' text-rose-600'} onClick={() => removeLine(l.key)}
                        title={lines.length > 1 ? '删除该行' : '至少保留一行'}>删</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="mt-3 px-3 py-1.5 rounded-md border border-dashed border-orange-400 text-orange-600 text-sm hover:bg-orange-50 transition w-full"
          onClick={addLine}>
          + 添加车辆（当天使用的车辆逐一添加）
        </button>
      </Modal>
    </div>
  );
}
