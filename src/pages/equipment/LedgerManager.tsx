/**
 * 设备台账管理
 *  - 自有 / 租赁设备的基础信息维护
 *  - 规格型号、综合台班单价、归属组织
 *  - 设备状态管理
 */

import React, { useMemo, useState } from 'react';
import type { Equipment, EquipmentOwnership } from './types';
import {
  EC, Modal, SearchBar, Input, Select, StatusPill, useToast, toast,
} from './_shared';
import {
  getEquipments, upsertEquipment, deleteEquipment,
  EQUIPMENT_STATUS_MAP, EQUIPMENT_OWNERSHIP_MAP, nextDocCode,
} from './equipmentStore';

interface Props { onRefresh?: () => void; }

const CATEGORIES = ['挖掘机', '压路机', '装载机', '运输车辆', '摊铺机', '推土机', '吊车', '其他'];

const EMPTY: Equipment = {
  id: '', code: '', name: '', model: '', category: '挖掘机',
  ownership: 'owned', manufacturer: '', purchaseDate: '', originalValue: 0,
  residualValue: 0, depreciatedYears: 0, unitPrice: 0, operator: '',
  orgId: 'org-project-1', orgName: '项目经理部', location: '', status: 'idle',
  remark: '', createdAt: '', updatedAt: '',
};

export default function LedgerManager({ onRefresh }: Props) {
  const [list, setList] = useState<Equipment[]>(() => getEquipments());
  const refresh = () => { setList(getEquipments()); onRefresh?.(); };
  const { ToastView } = useToast();
  const [kw, setKw] = useState('');
  const [own, setOwn] = useState('');
  const [st, setSt] = useState('');
  const [cat, setCat] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Equipment | null>(null);

  const filtered = useMemo(() => {
    let r = list;
    if (own) r = r.filter(e => e.ownership === own);
    if (st) r = r.filter(e => e.status === st);
    if (cat) r = r.filter(e => e.category === cat);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(e =>
        e.code.toLowerCase().includes(k) ||
        e.name.toLowerCase().includes(k) ||
        e.model.toLowerCase().includes(k) ||
        e.operator?.toLowerCase().includes(k)
      );
    }
    return r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [list, own, st, cat, kw]);

  const openNew = () => {
    setEdit({ ...EMPTY, id: '', code: nextDocCode('EQ-') });
    setOpen(true);
  };

  const setField = <K extends keyof Equipment>(k: K, v: Equipment[K]) =>
    setEdit(e => e ? { ...e, [k]: v } : e);

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) { toast('请填写设备名称', 'error'); return; }
    if (!edit.code.trim()) { toast('请填写设备编号', 'error'); return; }
    upsertEquipment(edit);
    toast(edit.id ? '设备已更新' : '设备已新增', 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const doDelete = (id: string) => {
    if (confirm('确定要删除该设备吗？关联的台班记录和维保记录不受影响。')) {
      deleteEquipment(id); refresh(); toast('设备已删除', 'success');
    }
  };

  return (
    <div className="p-5">
      <ToastView />
      <SearchBar onAdd={openNew} addLabel="+ 新增设备">
        <Input value={kw} onChange={setKw} placeholder="搜索设备编号/名称/型号/机手" className="!w-72" />
        <Select value={own} onChange={setOwn}
          options={[
            { value: '', label: '所有权' },
            { value: 'owned', label: '自有' },
            { value: 'leased', label: '租赁' },
          ]} className="!w-32" />
        <Select value={cat} onChange={setCat}
          options={[{ value: '', label: '全部类别' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
          className="!w-32" />
        <Select value={st} onChange={setSt}
          options={[
            { value: '', label: '全部状态' },
            ...Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => ({ value: k, label: v })),
          ]} className="!w-32" />
        <button className={EC.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>编号</th>
              <th className={EC.th}>名称/型号</th>
              <th className={EC.th}>类别</th>
              <th className={EC.th}>所有权</th>
              <th className={EC.th}>台班单价</th>
              <th className={EC.th}>机手</th>
              <th className={EC.th}>归属组织</th>
              <th className={EC.th}>状态</th>
              <th className={EC.th}>位置</th>
              <th className={EC.th}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className={EC.td + ' font-medium text-slate-800'}>{e.code}</td>
                <td className={EC.td}>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-slate-500">{e.model} · {e.manufacturer}</div>
                </td>
                <td className={EC.td}>{e.category}</td>
                <td className={EC.td}>
                  <StatusPill status={EQUIPMENT_OWNERSHIP_MAP[e.ownership]} />
                </td>
                <td className={EC.td + ' text-right tabular-nums'}>¥{e.unitPrice.toLocaleString()}/台班</td>
                <td className={EC.td}>{e.operator || '-'}</td>
                <td className={EC.td}>{e.orgName}</td>
                <td className={EC.td}>
                  <StatusPill status={EQUIPMENT_STATUS_MAP[e.status]} />
                </td>
                <td className={EC.td + ' text-slate-500 text-xs'}>{e.location || '-'}</td>
                <td className={EC.td + ' whitespace-nowrap'}>
                  <button className={EC.button.tiny} onClick={() => { setEdit(e); setOpen(true); }}>编辑</button>
                  <button className={EC.button.tiny + ' text-rose-600'} onClick={() => doDelete(e.id)}>删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className={EC.td + ' text-center text-slate-400 py-8'} colSpan={10}>暂无设备</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={edit?.id ? `编辑设备 ${edit.code}` : '新增设备'} open={open} onClose={() => { setOpen(false); setEdit(null); }} width="max-w-3xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}>
        {edit && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={EC.label}>设备编号</label>
                <Input value={edit.code} onChange={v => setField('code', v)} className="bg-slate-50" />
              </div>
              <div>
                <label className={EC.label}>设备名称 *</label>
                <Input value={edit.name} onChange={v => setField('name', v)} />
              </div>
              <div>
                <label className={EC.label}>规格型号</label>
                <Input value={edit.model} onChange={v => setField('model', v)} />
              </div>
              <div>
                <label className={EC.label}>设备类别</label>
                <Select value={edit.category} onChange={v => setField('category', v)}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className={EC.label}>所有权</label>
                <Select value={edit.ownership} onChange={v => setField('ownership', v as EquipmentOwnership)}
                  options={[
                    { value: 'owned', label: '自有' },
                    { value: 'leased', label: '租赁' },
                  ]} />
              </div>
              <div>
                <label className={EC.label}>制造厂商</label>
                <Input value={edit.manufacturer} onChange={v => setField('manufacturer', v)} />
              </div>
              <div>
                <label className={EC.label}>综合台班单价(元)</label>
                <Input type="number" value={edit.unitPrice} onChange={v => setField('unitPrice', Number(v))} />
              </div>
              <div>
                <label className={EC.label}>设备机手</label>
                <Input value={edit.operator || ''} onChange={v => setField('operator', v)} />
              </div>
              <div>
                <label className={EC.label}>状态</label>
                <Select value={edit.status} onChange={v => setField('status', v as Equipment['status'])}
                  options={Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => ({ value: k, label: v }))} />
              </div>
              <div>
                <label className={EC.label}>购置日期</label>
                <Input type="date" value={edit.purchaseDate || ''} onChange={v => setField('purchaseDate', v)} />
              </div>
              <div>
                <label className={EC.label}>原值(元)</label>
                <Input type="number" value={edit.originalValue || 0} onChange={v => setField('originalValue', Number(v))} />
              </div>
              <div>
                <label className={EC.label}>折旧年限</label>
                <Input type="number" value={edit.depreciatedYears || 0} onChange={v => setField('depreciatedYears', Number(v))} />
              </div>
              <div>
                <label className={EC.label}>归属组织</label>
                <Select value={edit.orgId} onChange={v => {
                  const orgs: Record<string, string> = {
                    'org-project-1': '项目经理部',
                    'org-project-2': '养护项目部',
                    'org-project-3': '基建项目部',
                  };
                  setField('orgId', v);
                  setField('orgName', orgs[v] || '');
                }}
                  options={[
                    { value: 'org-project-1', label: '项目经理部' },
                    { value: 'org-project-2', label: '养护项目部' },
                    { value: 'org-project-3', label: '基建项目部' },
                  ]} />
              </div>
              <div className="col-span-2">
                <label className={EC.label}>当前位置</label>
                <Input value={edit.location || ''} onChange={v => setField('location', v)} />
              </div>
              <div className="col-span-3">
                <label className={EC.label}>备注</label>
                <textarea rows={2} value={edit.remark || ''}
                  onChange={e => setField('remark', e.target.value)}
                  className={EC.input} />
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
