/**
 * 设备管理 → 固定资产管理 → 行政车辆管理
 *  - 台账维护（增 / 删 / 改 / 查），按 区域 → 项目部 归属管理
 *  - 车型：SUV / 轿车 / 商务车 / 其他（单选）
 *  - 车辆性质：自有 / 租赁（单选）；仅「租赁」需填写租赁信息
 *  - 租赁信息：租赁公司名称、租赁期限、发票类型（专票/普票）、
 *    每月不含税租赁费用/元、税率、每月含税租赁费用/元（= 不含税 × (1 + 税率)）
 *  - 数据持久化：localStorage（key: md_admin_vehicles_v1）
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EC, Modal, SearchBar, Input, Select, StatusPill, TypePill, useToast, toast,
} from './_shared';
import { genId, nowStr } from './equipmentStore';

/* ==================== 类型 ==================== */

export type VehicleType = 'SUV' | '轿车' | '商务车' | '其他';
export type VehicleOwnership = '自有' | '租赁';
export type InvoiceType = '专票' | '普票';

export interface AdminVehicle {
  id: string;
  regionName: string;          // 区域名称
  projectDept: string;         // 项目部名称
  vehicleType: VehicleType;    // 车型
  displacement: string;        // 排量
  plateNo: string;             // 车辆车牌号
  driver: string;              // 车辆驾驶员
  ownership: VehicleOwnership; // 车辆性质
  /* ===== 仅涉及租赁车辆填写 ===== */
  lessorName: string;          // 租赁公司名称
  leaseTerm: string;           // 租赁期限
  invoiceType: InvoiceType | '';  // 发票类型
  feeExclTax: number;          // 每月不含税租赁费用/元
  taxRate: number;             // 税率（%）
  feeInclTax: number;          // 每月含税租赁费用/元
  remark: string;              // 备注
  createdAt: string;
  updatedAt: string;
}

export const VEHICLE_TYPES: VehicleType[] = ['SUV', '轿车', '商务车', '其他'];
export const VEHICLE_OWNERSHIPS: VehicleOwnership[] = ['自有', '租赁'];
export const INVOICE_TYPES: InvoiceType[] = ['专票', '普票'];

/** 区域 → 项目部（与百日攻坚区域口径保持一致） */
export const REGION_DEPTS: Record<string, string[]> = {
  杭州: ['杭州南', '杭州北'],
  湖州: ['湖州'],
  嘉兴: ['嘉兴'],
  绍兴: ['绍兴'],
  金衢: ['金衢'],
  台州: ['台州北', '台州南'],
  丽水: ['丽水西', '丽水东'],
  温州: ['温州西'],
  甬舟: ['宁波', '舟山'],
  省外: ['省外项目部'],
  特种路面: ['特种路面'],
};
const REGIONS = Object.keys(REGION_DEPTS);

/* ==================== 存储 ==================== */

const VEHICLE_KEY = 'md_admin_vehicles_v1';

/** 含税费用 = 不含税 × (1 + 税率%)，保留 2 位小数 */
const inclOf = (excl: number, rate: number) => Math.round(excl * (1 + rate / 100) * 100) / 100;

const seedVehicles = (): AdminVehicle[] => {
  const t = nowStr();
  const mk = (
    id: string, regionName: string, projectDept: string, vehicleType: VehicleType,
    displacement: string, plateNo: string, ownership: VehicleOwnership,
    lessorName = '', leaseTerm = '', invoiceType: InvoiceType | '' = '',
    feeExclTax = 0, taxRate = 0, remark = '',
  ): AdminVehicle => ({
    id, regionName, projectDept, vehicleType, displacement, plateNo, driver: '', ownership,
    lessorName, leaseTerm, invoiceType, feeExclTax, taxRate,
    feeInclTax: feeExclTax > 0 ? inclOf(feeExclTax, taxRate) : 0,
    remark, createdAt: t, updatedAt: t,
  });
  const rows: AdminVehicle[] = [
    mk('av_seed_1', '杭州', '杭州南', 'SUV', '2.0T', '浙A·8K521', '自有', '', '', '', 0, 0, '项目部日常巡查用车'),
    mk('av_seed_2', '杭州', '杭州北', '轿车', '1.8L', '浙A·6D203', '自有', '', '', '', 0, 0, ''),
    mk('av_seed_3', '台州', '台州北', '商务车', '2.0T', '浙J·3F889', '租赁',
      '台州宏达汽车租赁有限公司', '2026-01-01 至 2026-12-31', '专票', 6800, 13, '接送作业班组人员'),
    mk('av_seed_4', '丽水', '丽水西', 'SUV', '2.4L', '浙K·9M112', '自有', '', '', '', 0, 0, ''),
    mk('av_seed_5', '甬舟', '宁波', '轿车', '1.5T', '浙B·2Q776', '租赁',
      '宁波甬通汽车服务有限公司', '2026-03-01 至 2027-02-28', '普票', 4200, 6, '项目部通勤'),
    mk('av_seed_6', '温州', '温州西', '其他', '2.0T', '浙C·5T390', '自有', '', '', '', 0, 0, '皮卡，材料转运'),
    mk('av_seed_7', '绍兴', '绍兴', '商务车', '2.0T', '浙D·7H661', '租赁',
      '绍兴越通汽车服务有限公司', '2026-06-01 至 2026-12-31', '专票', 7500, 13, '夜间施工接送'),
    mk('av_seed_8', '金衢', '金衢', 'SUV', '1.5T', '浙G·4L208', '租赁',
      '金华金通汽车租赁有限公司', '2026-09-01 至 2026-12-31', '普票', 5200, 3, ''),
  ];
  const drivers = ['张伟', '李强', '王建国', '陈晓东', '刘志强', '赵鹏', '孙明', '周海'];
  return rows.map((v, i) => ({ ...v, driver: drivers[i] || '' }));
};

export function getVehicles(): AdminVehicle[] {
  try {
    const raw = localStorage.getItem(VEHICLE_KEY);
    if (raw) return JSON.parse(raw) as AdminVehicle[];
  } catch { /* 解析失败时重建种子数据 */ }
  const data = seedVehicles();
  localStorage.setItem(VEHICLE_KEY, JSON.stringify(data));
  return data;
}

function saveVehicles(list: AdminVehicle[]) {
  localStorage.setItem(VEHICLE_KEY, JSON.stringify(list));
}

function upsertVehicle(v: AdminVehicle) {
  const list = getVehicles();
  const i = list.findIndex(x => x.id === v.id);
  if (i >= 0) list[i] = v;
  else list.unshift(v);
  saveVehicles(list);
}

function deleteVehicle(id: string) {
  saveVehicles(getVehicles().filter(v => v.id !== id));
}

const EMPTY: AdminVehicle = {
  id: '', regionName: '杭州', projectDept: '', vehicleType: 'SUV', displacement: '',
  plateNo: '', driver: '', ownership: '自有', lessorName: '', leaseTerm: '', invoiceType: '',
  feeExclTax: 0, taxRate: 0, feeInclTax: 0, remark: '', createdAt: '', updatedAt: '',
};

/** 金额显示（元） */
const money = (n: number) => n > 0 ? n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

/** CSV 导入模板表头（与导出一致） */
const IMPORT_HEADER = [
  '区域名称', '项目部名称', '车型', '排量', '车辆车牌号', '车辆驾驶员', '车辆性质',
  '租赁公司名称', '租赁期限', '发票类型', '每月不含税租赁费用', '税率', '备注',
];
/** 简易 CSV 解析（支持引号转义，兼容 Excel 另存的 CSV） */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some(x => x !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  cur.push(field);
  if (cur.some(x => x !== '')) rows.push(cur);
  return rows;
};

/* ==================== 页面 ==================== */

export default function AdminVehicleLedger() {
  const [list, setList] = useState<AdminVehicle[]>(() => getVehicles());
  const refresh = () => setList(getVehicles());
  const { ToastView } = useToast();

  /* 查询条件 */
  const [typeSel, setTypeSel] = useState('');
  const [ownSel, setOwnSel] = useState('');
  const [kw, setKw] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AdminVehicle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = list;
    if (typeSel) r = r.filter(v => v.vehicleType === typeSel);
    if (ownSel) r = r.filter(v => v.ownership === ownSel);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(v =>
        v.plateNo.toLowerCase().includes(k) ||
        v.driver.toLowerCase().includes(k) ||
        v.regionName.toLowerCase().includes(k) ||
        v.projectDept.toLowerCase().includes(k) ||
        v.lessorName.toLowerCase().includes(k) ||
        v.remark.toLowerCase().includes(k));
    }
    return [...r].sort((a, b) => a.plateNo.localeCompare(b.plateNo));
  }, [list, typeSel, ownSel, kw]);

  /* 汇总：租赁车辆月含税费用合计 */
  const leaseSummary = useMemo(() => {
    const leased = filtered.filter(v => v.ownership === '租赁');
    return {
      total: filtered.length,
      leased: leased.length,
      monthly: leased.reduce((s, v) => s + v.feeInclTax, 0),
    };
  }, [filtered]);

  const openNew = () => {
    setEdit({ ...EMPTY, id: genId('av'), createdAt: nowStr(), updatedAt: nowStr() });
    setOpen(true);
  };

  const setField = <K extends keyof AdminVehicle>(k: K, v: AdminVehicle[K]) =>
    setEdit(e => e ? { ...e, [k]: v } : e);

  /** 切换车辆性质：自有 → 清空租赁信息 */
  const setOwnership = (v: VehicleOwnership) => setEdit(e => {
    if (!e) return e;
    if (v === '自有') {
      return { ...e, ownership: v, lessorName: '', leaseTerm: '', invoiceType: '', feeExclTax: 0, taxRate: 0, feeInclTax: 0 };
    }
    return { ...e, ownership: v };
  });

  const setRegion = (v: string) => setEdit(e => e ? { ...e, regionName: v, projectDept: '' } : e);

  const save = () => {
    if (!edit) return;
    if (!edit.regionName) return toast('请选择区域名称', 'error');
    if (!edit.projectDept) return toast('请选择项目部名称', 'error');
    if (!edit.vehicleType) return toast('请选择车型', 'error');
    if (!edit.plateNo.trim()) return toast('请填写车辆车牌号', 'error');
    if (list.some(v => v.plateNo.trim() === edit.plateNo.trim() && v.id !== edit.id)) {
      return toast('车辆车牌号已存在，请勿重复登记', 'error');
    }
    if (edit.ownership === '租赁') {
      if (!edit.lessorName.trim()) return toast('租赁车辆请填写租赁公司名称', 'error');
      if (!edit.leaseTerm.trim()) return toast('租赁车辆请填写租赁期限', 'error');
      if (!edit.invoiceType) return toast('租赁车辆请选择发票类型', 'error');
      if (edit.feeExclTax <= 0) return toast('租赁车辆请填写每月不含税租赁费用', 'error');
    }
    const record: AdminVehicle = {
      ...edit,
      plateNo: edit.plateNo.trim(),
      feeInclTax: edit.ownership === '租赁' ? inclOf(edit.feeExclTax, edit.taxRate) : 0,
      updatedAt: nowStr(),
    };
    upsertVehicle(record);
    toast(edit.id ? '车辆信息已更新' : '车辆已新增', 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const doDelete = (v: AdminVehicle) => {
    if (!confirm(`确认删除车辆「${v.plateNo}」？删除后不可恢复。`)) return;
    deleteVehicle(v.id);
    toast('已删除', 'success');
    refresh();
  };

  /** 导入 CSV：按表头匹配字段，车牌号已存在则更新，否则新增 */
  const importVehicles = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''));
      if (rows.length < 2) { toast('文件为空或格式不正确', 'error'); return; }
      const header = rows[0].map(h => h.trim());
      const idx = (name: string) => header.indexOf(name);
      if (idx('车辆车牌号') < 0) {
        toast('表头不匹配，请使用导出的文件作为模板填写后导入', 'error'); return;
      }
      const existing = getVehicles();
      let added = 0, updated = 0;
      const t = nowStr();
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const plateNo = (r[idx('车辆车牌号')] || '').trim();
        if (!plateNo) continue;
        const ownership = (r[idx('车辆性质')] || '自有') as VehicleOwnership;
        const feeExclTax = Number(r[idx('每月不含税租赁费用')]) || 0;
        const taxRate = Number(r[idx('税率')]) || 0;
        const record: AdminVehicle = {
          id: '', regionName: r[idx('区域名称')] || '杭州', projectDept: r[idx('项目部名称')] || '',
          vehicleType: (r[idx('车型')] as VehicleType) || 'SUV', displacement: r[idx('排量')] || '',
          plateNo, driver: r[idx('车辆驾驶员')] || '',
          ownership, lessorName: r[idx('租赁公司名称')] || '', leaseTerm: r[idx('租赁期限')] || '',
          invoiceType: (r[idx('发票类型')] as InvoiceType | '') || '', feeExclTax, taxRate,
          feeInclTax: ownership === '租赁' ? inclOf(feeExclTax, taxRate) : 0,
          remark: r[idx('备注')] || '', createdAt: t, updatedAt: t,
        };
        const found = existing.find(v => v.plateNo === plateNo);
        if (found) {
          Object.assign(found, { ...record, id: found.id, createdAt: found.createdAt });
          updated++;
        } else {
          existing.unshift({ ...record, id: genId('av') });
          added++;
        }
      }
      saveVehicles(existing);
      refresh();
      toast(`导入完成：新增 ${added} 辆，更新 ${updated} 辆`, 'success');
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="p-5">
      <ToastView />

      <SearchBar onAdd={openNew} addLabel="+ 新增车辆">
        <Select value={typeSel} onChange={setTypeSel}
          options={[{ value: '', label: '全部车型' }, ...VEHICLE_TYPES.map(t => ({ value: t, label: t }))]}
          className="!w-32" />
        <Select value={ownSel} onChange={setOwnSel}
          options={[{ value: '', label: '全部性质' }, ...VEHICLE_OWNERSHIPS.map(o => ({ value: o, label: o }))]}
          className="!w-32" />
        <Input value={kw} onChange={setKw} placeholder="搜索车牌号 / 驾驶员 / 租赁公司 / 备注" className="!w-64" />
        <button className={EC.button.ghost} onClick={refresh}>搜索</button>
        <button className={EC.button.ghost} onClick={() => fileRef.current?.click()}>导入</button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importVehicles(f); e.target.value = ''; }} />
      </SearchBar>

      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span>共 <strong className="text-slate-800 tabular-nums">{leaseSummary.total}</strong> 辆</span>
        <span>租赁 <strong className="text-cyan-700 tabular-nums">{leaseSummary.leased}</strong> 辆</span>
        <span>租赁月含税费用合计 <strong className="text-slate-800 tabular-nums">¥{money(leaseSummary.monthly)}</strong></span>
        <span className="text-slate-400">仅「租赁」车辆需填写租赁信息</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th} rowSpan={2}>车型</th>
              <th className={EC.th} rowSpan={2}>排量</th>
              <th className={EC.th} rowSpan={2}>车辆车牌号</th>
              <th className={EC.th} rowSpan={2}>车辆驾驶员</th>
              <th className={EC.th} rowSpan={2}>车辆性质</th>
              <th className={`${EC.th} text-center bg-cyan-50/60 text-cyan-800`} colSpan={6}>仅涉及租赁车辆填写</th>
              <th className={EC.th} rowSpan={2}>备注</th>
              <th className={EC.th} rowSpan={2}>操作</th>
            </tr>
            <tr>
              <th className={`${EC.th} bg-cyan-50/40`}>租赁公司名称</th>
              <th className={`${EC.th} bg-cyan-50/40`}>租赁期限</th>
              <th className={`${EC.th} bg-cyan-50/40`}>发票类型</th>
              <th className={`${EC.th} bg-cyan-50/40 text-right`}>每月不含税租赁费用/元</th>
              <th className={`${EC.th} bg-cyan-50/40 text-right`}>税率</th>
              <th className={`${EC.th} bg-cyan-50/40 text-right`}>每月含税租赁费用/元</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className={EC.td}><TypePill text={v.vehicleType} tone={v.vehicleType === '其他' ? 'slate' : 'indigo'} /></td>
                <td className={EC.td + ' font-mono text-xs'}>{v.displacement || '—'}</td>
                <td className={EC.td + ' font-medium text-slate-800 whitespace-nowrap'}>{v.plateNo}</td>
                <td className={EC.td + ' whitespace-nowrap'}>{v.driver || '—'}</td>
                <td className={EC.td}><StatusPill status={v.ownership} /></td>
                {v.ownership === '租赁' ? (
                  <>
                    <td className={EC.td}>{v.lessorName || '—'}</td>
                    <td className={EC.td + ' whitespace-nowrap text-xs'}>{v.leaseTerm || '—'}</td>
                    <td className={EC.td}>{v.invoiceType || '—'}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{money(v.feeExclTax)}</td>
                    <td className={EC.td + ' text-right tabular-nums'}>{v.taxRate}%</td>
                    <td className={EC.td + ' text-right tabular-nums font-medium text-slate-800'}>{money(v.feeInclTax)}</td>
                  </>
                ) : (
                  <td colSpan={6} className="px-3 py-2 border-b border-slate-100 text-center text-slate-300 text-xs">
                    自有车辆无需填写
                  </td>
                )}
                <td className={EC.td + ' text-slate-500 text-xs max-w-[180px]'}>{v.remark || '—'}</td>
                <td className={EC.td + ' whitespace-nowrap'}>
                  <button className={EC.button.tiny} onClick={() => { setEdit(v); setOpen(true); }}>编辑</button>
                  <button className={EC.button.tiny + ' text-rose-600 ml-1'} onClick={() => doDelete(v)}>删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className={EC.td + ' text-center text-slate-400 py-8'} colSpan={13}>暂无车辆记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={edit?.id && list.some(v => v.id === edit.id) ? `编辑车辆 ${edit.plateNo}` : '新增行政车辆'}
        open={open}
        onClose={() => { setOpen(false); setEdit(null); }}
        width="max-w-4xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}
      >
        {edit && (
          <>
            <div className="text-xs font-semibold text-slate-500 mb-2">基础信息</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={EC.label}>区域名称 *</label>
                <Select value={edit.regionName} onChange={setRegion}
                  options={REGIONS.map(r => ({ value: r, label: r }))} />
              </div>
              <div>
                <label className={EC.label}>项目部名称 *</label>
                <Select value={edit.projectDept} onChange={v => setField('projectDept', v)}
                  options={(REGION_DEPTS[edit.regionName] || []).map(d => ({ value: d, label: d }))}
                  placeholder="请选择项目部" />
              </div>
              <div>
                <label className={EC.label}>车型 *</label>
                <Select value={edit.vehicleType} onChange={v => setField('vehicleType', v as VehicleType)}
                  options={VEHICLE_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <div>
                <label className={EC.label}>排量</label>
                <Input value={edit.displacement} onChange={v => setField('displacement', v)} placeholder="如 2.0T / 1.8L" />
              </div>
              <div>
                <label className={EC.label}>车辆车牌号 *</label>
                <Input value={edit.plateNo} onChange={v => setField('plateNo', v)} placeholder="如 浙A·8K521" />
              </div>
              <div>
                <label className={EC.label}>车辆驾驶员</label>
                <Input value={edit.driver} onChange={v => setField('driver', v)} placeholder="如 张伟" />
              </div>
              <div>
                <label className={EC.label}>车辆性质 *</label>
                <Select value={edit.ownership} onChange={v => setOwnership(v as VehicleOwnership)}
                  options={VEHICLE_OWNERSHIPS.map(o => ({ value: o, label: o }))} />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold text-slate-500 mb-2">
                租赁信息
                <span className="ml-2 font-normal text-slate-400">仅车辆性质为「租赁」时需填写</span>
              </div>
              {edit.ownership === '租赁' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border border-cyan-100 bg-cyan-50/40 p-3">
                  <div>
                    <label className={EC.label}>租赁公司名称 *</label>
                    <Input value={edit.lessorName} onChange={v => setField('lessorName', v)} placeholder="如 台州宏达汽车租赁有限公司" />
                  </div>
                  <div>
                    <label className={EC.label}>租赁期限 *</label>
                    <Input value={edit.leaseTerm} onChange={v => setField('leaseTerm', v)} placeholder="如 2026-01-01 至 2026-12-31" />
                  </div>
                  <div>
                    <label className={EC.label}>发票类型 *</label>
                    <Select value={edit.invoiceType} onChange={v => setField('invoiceType', v as InvoiceType)}
                      options={INVOICE_TYPES.map(i => ({ value: i, label: i }))} placeholder="请选择发票类型" />
                  </div>
                  <div>
                    <label className={EC.label}>每月不含税租赁费用/元 *</label>
                    <Input type="number" value={edit.feeExclTax}
                      onChange={v => setField('feeExclTax', Math.max(0, Number(v) || 0))} />
                  </div>
                  <div>
                    <label className={EC.label}>税率（%）</label>
                    <Input type="number" value={edit.taxRate}
                      onChange={v => setField('taxRate', Math.min(100, Math.max(0, Number(v) || 0)))} />
                  </div>
                  <div>
                    <label className={EC.label}>每月含税租赁费用/元（自动计算）</label>
                    <Input value={inclOf(edit.feeExclTax, edit.taxRate).toFixed(2)} readOnly />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                  自有车辆无需填写租赁信息；如需登记租赁信息，请先将车辆性质切换为「租赁」。
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className={EC.label}>备注</label>
              <textarea
                value={edit.remark}
                onChange={e => setField('remark', e.target.value)}
                rows={2}
                placeholder="如：项目部日常巡查用车"
                className={EC.input + ' resize-none'}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
