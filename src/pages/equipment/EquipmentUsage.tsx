/**
 * 设备使用管控
 *  - 台班数据采集（每日录入）
 *  - 维保记录管理（故障/保养/日常）
 */

import React, { useMemo, useState } from 'react';
import type { ShiftRecord, MaintenanceRecord } from './types';
import {
  EC, Modal, SearchBar, Input, Select, StatusPill, useToast, toast,
} from './_shared';
import {
  getEquipments, getShiftRecords, upsertShiftRecord, deleteShiftRecord, auditShiftRecord,
  getMaintenanceRecords, upsertMaintenanceRecord, deleteMaintenanceRecord,
  SHIFT_STATUS_MAP, SHIFT_TYPE_MAP, MAINTENANCE_TYPE_MAP,
  nextDocCode, todayStr, genId,
} from './equipmentStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const TABS = [
  { key: 'shift', label: '台班数据采集', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'maintenance', label: '维保记录', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function EquipmentUsage({ onRefresh }: Props) {
  const [tab, setTab] = useState<'shift' | 'maintenance'>('shift');

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key as 'shift' | 'maintenance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white border-orange-400 text-orange-700 shadow-sm ring-2 ring-orange-100'
                : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-white'
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'shift' ? <ShiftPanel onRefresh={onRefresh} /> : <MaintenancePanel onRefresh={onRefresh} />}
    </div>
  );
}

// ==================== 台班数据采集（按日填报，多设备多项目拆分） ====================

const PROJECT_OPTIONS = [
  { value: 'proj-1', label: '项目A-国道改扩建' },
  { value: 'proj-2', label: '项目B-市政养护' },
  { value: 'proj-3', label: '项目C-基建工程' },
];
const TEAM_OPTIONS = [
  { value: 'team-1', label: '机械一班' },
  { value: 'team-2', label: '机械二班' },
  { value: 'team-3', label: '运输班' },
];

/** 编辑弹窗中的一行明细（一台设备在一个项目上的台班拆分） */
interface ShiftLine {
  key: string;              // 临时行 key
  recordId?: string;        // 已有记录 id（编辑时保留）
  equipmentId: string;
  projectId: string;
  teamId: string;
  shift: ShiftRecord['shift'];
  shifts: number;
  unitPrice: number;
  operator: string;
  fuelConsumption: number;
  fuelAmount: number;
  remark: string;
}

function newLine(): ShiftLine {
  return {
    key: genId('ln'), equipmentId: '', projectId: '', teamId: '',
    shift: 'full', shifts: 1, unitPrice: 0, operator: '',
    fuelConsumption: 0, fuelAmount: 0, remark: '',
  };
}

function ShiftPanel({ onRefresh }: { onRefresh?: () => void }) {
  const [list, setList] = useState<ShiftRecord[]>(() => getShiftRecords());
  const refresh = () => { setList(getShiftRecords()); onRefresh?.(); };
  const { ToastView } = useToast();
  const [kw, setKw] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [own, setOwn] = useState('');

  const [open, setOpen] = useState(false);
  const [editDate, setEditDate] = useState(todayStr());
  const [recorder, setRecorder] = useState('当前用户');
  const [lines, setLines] = useState<ShiftLine[]>([newLine()]);

  const equipments = useMemo(() => getEquipments(), []);

  const filtered = useMemo(() => {
    let r = list;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(s => s.equipmentCode.toLowerCase().includes(k) || s.equipmentName.toLowerCase().includes(k) || s.projectName?.toLowerCase().includes(k));
    }
    if (dateFrom) r = r.filter(s => s.shiftDate >= dateFrom);
    if (dateTo) r = r.filter(s => s.shiftDate <= dateTo);
    if (own) r = r.filter(s => s.ownership === own);
    return r.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
  }, [list, kw, dateFrom, dateTo, own]);

  /** 按日期分组（每天一个填报单元） */
  const grouped = useMemo(() => {
    const map = new Map<string, ShiftRecord[]>();
    for (const r of filtered) {
      const arr = map.get(r.shiftDate) || [];
      arr.push(r);
      map.set(r.shiftDate, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalShifts = filtered.reduce((s, r) => s + r.shifts, 0);
  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);

  const openNew = () => {
    setEditDate(todayStr());
    setRecorder('当前用户');
    setLines([newLine()]);
    setOpen(true);
  };

  /** 编辑某一天的全部台班明细 */
  const openEditDay = (date: string) => {
    const dayRecords = getShiftRecords().filter(r => r.shiftDate === date);
    setEditDate(date);
    if (dayRecords.length > 0) setRecorder(dayRecords[0].recorder);
    setLines(dayRecords.map(r => ({
      key: genId('ln'), recordId: r.id,
      equipmentId: r.equipmentId, projectId: r.projectId || '', teamId: r.teamId || '',
      shift: r.shift, shifts: r.shifts, unitPrice: r.unitPrice,
      operator: r.operator || '', fuelConsumption: r.fuelConsumption || 0,
      fuelAmount: r.fuelAmount || 0, remark: r.remark || '',
    })));
    setOpen(true);
  };

  const setLine = (key: string, patch: Partial<ShiftLine>) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l));

  /** 选择设备后带出台账信息 */
  const onLineEquipment = (key: string, eqId: string) => {
    const eq = equipments.find(e => e.id === eqId);
    if (eq) {
      setLine(key, {
        equipmentId: eqId, unitPrice: eq.unitPrice,
        operator: eq.operator || '',
      });
    } else {
      setLine(key, { equipmentId: '' });
    }
  };

  const addLine = () => setLines(ls => [...ls, newLine()]);
  const removeLine = (key: string) => setLines(ls => (ls.length > 1 ? ls.filter(l => l.key !== key) : ls));

  const save = () => {
    if (!editDate) { toast('请选择日期', 'error'); return; }
    // 校验明细行
    for (const l of lines) {
      if (!l.equipmentId) { toast('存在未选择设备的明细行', 'error'); return; }
      if (!l.projectId) { toast('存在未选择项目的明细行（设备需挂接到使用的项目）', 'error'); return; }
      if (l.shifts <= 0) { toast('台班数必须大于 0', 'error'); return; }
    }
    // 同一设备 + 同一项目 不能重复
    const dup = lines.find((l, i) => lines.findIndex(x => x.equipmentId === l.equipmentId && x.projectId === l.projectId) !== i);
    if (dup) {
      const eq = equipments.find(e => e.id === dup.equipmentId);
      toast(`设备「${eq?.name || ''}」在同一项目上存在重复行，请合并`, 'error');
      return;
    }
    // 同一设备拆分到多个项目时，总台班数不能超过 3（早/中/夜三班）
    const byEq = new Map<string, number>();
    for (const l of lines) byEq.set(l.equipmentId, (byEq.get(l.equipmentId) || 0) + l.shifts);
    for (const [eqId, sum] of byEq) {
      if (sum > 3) {
        const eq = equipments.find(e => e.id === eqId);
        toast(`设备「${eq?.name || ''}」当日总台班数为 ${sum}，超过 3 个班次上限，请检查拆分`, 'error');
        return;
      }
    }

    // 保存：保留编辑行，删除被移除的行
    const existing = getShiftRecords().filter(r => r.shiftDate === editDate);
    const keepIds = new Set(lines.filter(l => l.recordId).map(l => l.recordId));
    existing.filter(r => !keepIds.has(r.id)).forEach(r => deleteShiftRecord(r.id));

    let seq = existing.length + 1;
    for (const l of lines) {
      const eq = equipments.find(e => e.id === l.equipmentId);
      const proj = PROJECT_OPTIONS.find(p => p.value === l.projectId);
      const team = TEAM_OPTIONS.find(t => t.value === l.teamId);
      upsertShiftRecord({
        id: l.recordId || genId('sr'),
        code: `SR-${editDate.replace(/-/g, '')}-${String(seq++).padStart(2, '0')}`,
        shiftDate: editDate,
        shift: l.shift,
        equipmentId: l.equipmentId,
        equipmentCode: eq?.code || '',
        equipmentName: eq?.name || '',
        projectId: l.projectId,
        projectName: proj?.label || '',
        teamId: l.teamId,
        teamName: team?.label || '',
        ownership: eq?.ownership || 'owned',
        shifts: l.shifts,
        unitPrice: l.unitPrice,
        totalAmount: Math.round(l.shifts * l.unitPrice),
        fuelConsumption: l.fuelConsumption,
        fuelAmount: l.fuelAmount,
        operator: l.operator,
        recorder,
        status: 'draft',
        remark: l.remark,
        createdAt: '', updatedAt: '',
      });
    }
    toast(`「${editDate}」台班填报已保存（${lines.length} 条明细）`, 'success');
    setOpen(false); refresh();
  };

  const doDeleteDay = (date: string) => {
    const dayRecords = getShiftRecords().filter(r => r.shiftDate === date);
    if (confirm(`确定删除「${date}」当天的全部 ${dayRecords.length} 条台班记录？`)) {
      dayRecords.forEach(r => deleteShiftRecord(r.id));
      refresh();
      toast('已删除当日台班记录', 'success');
    }
  };

  /** 提交当日全部记录 */
  const doSubmitDay = (date: string) => {
    getShiftRecords().filter(r => r.shiftDate === date && r.status === 'draft')
      .forEach(r => auditShiftRecord(r.id));
    refresh();
    toast(`「${date}」台班已提交`, 'success');
  };

  const linesTotalShifts = lines.reduce((s, l) => s + l.shifts, 0);
  const linesTotalAmount = lines.reduce((s, l) => s + Math.round(l.shifts * l.unitPrice), 0);

  return (
    <div>
      <ToastView />
      {/* 汇总 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">填报天数</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{grouped.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">总台班数</div>
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{totalShifts}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">总金额(元)</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">¥{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <SearchBar onAdd={openNew} addLabel="+ 台班按日填报">
        <Input value={kw} onChange={setKw} placeholder="搜索设备/项目" className="!w-60" />
        <Input type="date" value={dateFrom} onChange={setDateFrom} placeholder="起始日期" className="!w-36" />
        <Input type="date" value={dateTo} onChange={setDateTo} placeholder="结束日期" className="!w-36" />
        <Select value={own} onChange={setOwn}
          options={[{ value: '', label: '所有权' }, { value: 'owned', label: '自有' }, { value: 'leased', label: '租赁' }]}
          className="!w-24" />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>设备</th>
              <th className={EC.th}>班次</th>
              <th className={EC.th}>项目（拆分明细）</th>
              <th className={EC.th}>班组</th>
              <th className={EC.th}>台班</th>
              <th className={EC.th}>单价</th>
              <th className={EC.th}>金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grouped.map(([date, records]) => {
              const dayShifts = records.reduce((s, r) => s + r.shifts, 0);
              const dayAmount = records.reduce((s, r) => s + r.totalAmount, 0);
              const allSubmitted = records.every(r => r.status !== 'draft');
              return (
                <React.Fragment key={date}>
                  {/* 日期分组头 */}
                  <tr className="bg-slate-50/80">
                    <td colSpan={7} className="px-3 py-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800">{date}</span>
                          <span className="text-xs text-slate-500">
                            {new Set(records.map(r => r.equipmentId)).size} 台设备 · {records.length} 条明细 · 合计 {dayShifts} 台班 · ¥{dayAmount.toLocaleString()}
                          </span>
                          <StatusPill status={allSubmitted ? SHIFT_STATUS_MAP[records[0].status] : '草稿'} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!allSubmitted && (
                            <button className={EC.button.tiny + ' text-emerald-700 border-emerald-300'} onClick={() => doSubmitDay(date)}>提交当日</button>
                          )}
                          <button className={EC.button.tiny} onClick={() => openEditDay(date)}>编辑当日</button>
                          <button className={EC.button.tiny + ' text-rose-600'} onClick={() => doDeleteDay(date)}>删除当日</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* 当日明细行（每台设备 × 每个项目一行） */}
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={EC.td}>
                        <div className="font-medium">{r.equipmentName}</div>
                        <div className="text-xs text-slate-500">{r.equipmentCode}</div>
                      </td>
                      <td className={EC.td}>{SHIFT_TYPE_MAP[r.shift]}</td>
                      <td className={EC.td}>{r.projectName || '-'}</td>
                      <td className={EC.td}>{r.teamName || '-'}</td>
                      <td className={EC.td + ' text-right tabular-nums font-medium'}>{r.shifts}</td>
                      <td className={EC.td + ' text-right tabular-nums'}>¥{r.unitPrice}</td>
                      <td className={EC.td + ' text-right tabular-nums font-medium text-emerald-700'}>¥{r.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {grouped.length === 0 && (
              <tr><td colSpan={7} className={EC.td + ' text-center text-slate-400 py-8'}>暂无台班记录，点击「台班按日填报」开始</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={`台班按日填报 - ${editDate}`} open={open}
        onClose={() => setOpen(false)} width="max-w-5xl"
        footer={<>
          <div className="flex-1 text-sm text-slate-500">
            当日合计：<span className="font-semibold text-orange-600">{linesTotalShifts}</span> 台班 ·
            <span className="font-semibold text-emerald-600 ml-1">¥{linesTotalAmount.toLocaleString()}</span>
          </div>
          <button className={EC.button.ghost} onClick={() => setOpen(false)}>取消</button>
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
            同一设备在多个项目使用时，请拆分为多行并分配各自项目的台班数
          </div>
        </div>

        {/* 明细行编辑器 */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className={EC.table}>
            <thead>
              <tr>
                <th className={EC.th + ' w-[220px]'}>设备 *</th>
                <th className={EC.th + ' w-[180px]'}>项目 *</th>
                <th className={EC.th + ' w-[100px]'}>班次</th>
                <th className={EC.th + ' w-[90px]'}>台班数</th>
                <th className={EC.th + ' w-[100px]'}>单价(元)</th>
                <th className={EC.th + ' w-[100px]'}>金额(元)</th>
                <th className={EC.th + ' w-[60px]'}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map(l => {
                const eq = equipments.find(e => e.id === l.equipmentId);
                // 同一设备已拆分行数提示
                const splitCount = lines.filter(x => x.equipmentId === l.equipmentId).length;
                return (
                  <tr key={l.key}>
                    <td className={EC.td}>
                      <Select value={l.equipmentId} onChange={v => onLineEquipment(l.key, v)}
                        options={[{ value: '', label: '选择设备' }, ...equipments.map(e => ({ value: e.id, label: `${e.name} (${e.code})` }))]} />
                      {splitCount > 1 && (
                        <div className="text-[11px] text-amber-600 mt-0.5">该设备已拆分 {splitCount} 个项目使用</div>
                      )}
                    </td>
                    <td className={EC.td}>
                      <Select value={l.projectId} onChange={v => setLine(l.key, { projectId: v })}
                        options={[{ value: '', label: '选择项目' }, ...PROJECT_OPTIONS]} />
                    </td>
                    <td className={EC.td}>
                      <Select value={l.shift} onChange={v => setLine(l.key, { shift: v as ShiftRecord['shift'] })}
                        options={Object.entries(SHIFT_TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))} />
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.shifts} onChange={v => setLine(l.key, { shifts: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td}>
                      <Input type="number" value={l.unitPrice} onChange={v => setLine(l.key, { unitPrice: Number(v) || 0 })} />
                    </td>
                    <td className={EC.td + ' text-right tabular-nums font-medium text-emerald-700'}>
                      ¥{Math.round(l.shifts * l.unitPrice).toLocaleString()}
                      <div className="text-[11px] text-slate-400 font-normal">
                        {eq?.ownership === 'leased' ? '租赁' : eq ? '自有' : ''}
                        {l.operator ? ` · ${l.operator}` : ''}
                      </div>
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
          + 添加设备（当天使用的设备，多项目拆分时重复添加同一设备并选择不同项目）
        </button>
      </Modal>
    </div>
  );
}

// ==================== 维保记录 ====================

function MaintenancePanel({ onRefresh }: { onRefresh?: () => void }) {
  const [list, setList] = useState<MaintenanceRecord[]>(() => getMaintenanceRecords());
  const refresh = () => { setList(getMaintenanceRecords()); onRefresh?.(); };
  const { ToastView } = useToast();
  const [kw, setKw] = useState('');
  const [type, setType] = useState('');
  const [st, setSt] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<MaintenanceRecord | null>(null);

  const equipments = useMemo(() => getEquipments(), []);

  const filtered = useMemo(() => {
    let r = list;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(m => m.code.toLowerCase().includes(k) || m.equipmentName.toLowerCase().includes(k));
    }
    if (type) r = r.filter(m => m.type === type);
    if (st) r = r.filter(m => m.status === st);
    return r.sort((a, b) => b.date.localeCompare(a.date));
  }, [list, kw, type, st]);

  const totalCost = filtered.reduce((s, r) => s + r.totalCost, 0);

  const openNew = () => {
    const eq = equipments[0];
    setEdit({
      id: '', code: nextDocCode('MR-'), equipmentId: eq?.id || '',
      equipmentCode: eq?.code || '', equipmentName: eq?.name || '',
      type: 'regular', date: todayStr(), content: '', parts: '',
      laborCost: 0, partsCost: 0, totalCost: 0, operator: '',
      status: 'draft', remark: '', createdAt: '', updatedAt: '',
    });
    setOpen(true);
  };

  const setField = <K extends keyof MaintenanceRecord>(k: K, v: MaintenanceRecord[K]) =>
    setEdit(e => e ? { ...e, [k]: v } : e);

  const onEquipmentChange = (eqId: string) => {
    const eq = equipments.find(e => e.id === eqId);
    if (eq) {
      setEdit(e => e ? { ...e, equipmentId: eq.id, equipmentCode: eq.code, equipmentName: eq.name } : e);
    }
  };

  const save = () => {
    if (!edit) return;
    if (!edit.equipmentId) { toast('请选择设备', 'error'); return; }
    const total = (edit.laborCost || 0) + (edit.partsCost || 0);
    upsertMaintenanceRecord({ ...edit, totalCost: total, id: edit.id || genId('mr') });
    toast(edit.id ? '维保记录已更新' : '维保记录已新增', 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const doDelete = (id: string) => {
    if (confirm('确定删除该维保记录？')) { deleteMaintenanceRecord(id); refresh(); }
  };

  return (
    <div>
      <ToastView />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">记录数</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">维保费合计(元)</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">¥{totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">涉及设备</div>
          <div className="text-2xl font-bold text-cyan-600 tabular-nums">
            {new Set(filtered.map(m => m.equipmentId)).size}
          </div>
        </div>
      </div>

      <SearchBar onAdd={openNew} addLabel="+ 新增维保记录">
        <Input value={kw} onChange={setKw} placeholder="搜索设备/单号" className="!w-60" />
        <Select value={type} onChange={setType}
          options={[{ value: '', label: '全部类型' }, ...Object.entries(MAINTENANCE_TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))]}
          className="!w-32" />
        <Select value={st} onChange={setSt}
          options={[{ value: '', label: '状态' }, { value: 'draft', label: '草稿' }, { value: 'submitted', label: '已提交' }, { value: 'audited', label: '已审核' }]}
          className="!w-28" />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>编号</th>
              <th className={EC.th}>设备</th>
              <th className={EC.th}>类型</th>
              <th className={EC.th}>日期</th>
              <th className={EC.th}>内容</th>
              <th className={EC.th}>人工费</th>
              <th className={EC.th}>配件费</th>
              <th className={EC.th}>合计</th>
              <th className={EC.th}>状态</th>
              <th className={EC.th}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className={EC.td + ' font-medium'}>{m.code}</td>
                <td className={EC.td}>
                  <div>{m.equipmentName}</div>
                  <div className="text-xs text-slate-500">{m.equipmentCode}</div>
                </td>
                <td className={EC.td}><StatusPill status={MAINTENANCE_TYPE_MAP[m.type]} /></td>
                <td className={EC.td}>{m.date}</td>
                <td className={EC.td + ' max-w-[200px] truncate'} title={m.content}>{m.content}</td>
                <td className={EC.td + ' text-right tabular-nums'}>¥{(m.laborCost || 0).toLocaleString()}</td>
                <td className={EC.td + ' text-right tabular-nums'}>¥{(m.partsCost || 0).toLocaleString()}</td>
                <td className={EC.td + ' text-right tabular-nums font-medium text-amber-700'}>¥{m.totalCost.toLocaleString()}</td>
                <td className={EC.td}><StatusPill status={m.status === 'draft' ? '草稿' : m.status === 'submitted' ? '已提交' : '已审核'} /></td>
                <td className={EC.td + ' whitespace-nowrap'}>
                  <button className={EC.button.tiny} onClick={() => { setEdit(m); setOpen(true); }}>编辑</button>
                  <button className={EC.button.tiny + ' text-rose-600'} onClick={() => doDelete(m.id)}>删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className={EC.td + ' text-center text-slate-400 py-8'}>暂无维保记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={edit?.id ? `编辑维保 ${edit.code}` : '新增维保记录'} open={open}
        onClose={() => { setOpen(false); setEdit(null); }} width="max-w-2xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={EC.label}>设备 *</label>
              <Select value={edit.equipmentId} onChange={onEquipmentChange}
                options={[
                  { value: '', label: '选择设备' },
                  ...equipments.map(e => ({ value: e.id, label: `${e.name} (${e.code})` })),
                ]} />
            </div>
            <div>
              <label className={EC.label}>类型</label>
              <Select value={edit.type} onChange={v => setField('type', v as MaintenanceRecord['type'])}
                options={Object.entries(MAINTENANCE_TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))} />
            </div>
            <div>
              <label className={EC.label}>日期</label>
              <Input type="date" value={edit.date} onChange={v => setField('date', v)} />
            </div>
            <div>
              <label className={EC.label}>维保人员</label>
              <Input value={edit.operator || ''} onChange={v => setField('operator', v)} />
            </div>
            <div className="col-span-2">
              <label className={EC.label}>维保内容</label>
              <textarea rows={2} value={edit.content} onChange={e => setField('content', e.target.value)} className={EC.input} />
            </div>
            <div className="col-span-2">
              <label className={EC.label}>更换配件</label>
              <Input value={edit.parts || ''} onChange={v => setField('parts', v)} />
            </div>
            <div>
              <label className={EC.label}>人工费(元)</label>
              <Input type="number" value={edit.laborCost || 0} onChange={v => setField('laborCost', Number(v))} />
            </div>
            <div>
              <label className={EC.label}>配件费(元)</label>
              <Input type="number" value={edit.partsCost || 0} onChange={v => setField('partsCost', Number(v))} />
            </div>
            <div className="col-span-2 flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-sm text-amber-700">总费用：</span>
              <span className="text-lg font-bold text-amber-700 tabular-nums">
                ¥{((edit.laborCost || 0) + (edit.partsCost || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
