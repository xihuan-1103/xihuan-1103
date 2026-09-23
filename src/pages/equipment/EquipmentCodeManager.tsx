/**
 * 设备编码体系管理（分类型 + 具体设备，类似材料编码体系）
 */

import React, { useMemo, useState } from 'react';
import type { EquipmentCode } from './types';
import {
  EC, Modal, SearchBar, Input, Select, TypePill, useToast, toast,
} from './_shared';
import {
  getEquipmentCodes, upsertEquipmentCode, deleteEquipmentCode,
  EQUIPMENT_CATEGORIES, genId, nowStr,
} from './equipmentStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const UNITS = ['台', '辆', '套', '个'];

export default function EquipmentCodeManager({ onRefresh }: Props) {
  const [list, setList] = useState<EquipmentCode[]>(() => getEquipmentCodes());
  const refresh = () => { setList(getEquipmentCodes()); onRefresh?.(); };
  const { ToastView } = useToast();
  const [kw, setKw] = useState('');
  const [cat, setCat] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<EquipmentCode | null>(null);

  const filtered = useMemo(() => {
    let r = list;
    if (cat) r = r.filter(c => c.category === cat);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(c => c.code.toLowerCase().includes(k) || c.name.toLowerCase().includes(k));
    }
    return r;
  }, [list, cat, kw]);

  // 按分类分组统计
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of list) map.set(c.category, (map.get(c.category) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [list]);

  const openNew = () => {
    setEdit({ id: genId('ec'), code: '', name: '', category: EQUIPMENT_CATEGORIES[0], subCategory: '', unit: '台', brand: '', spec: '', remark: '', createdAt: nowStr(), updatedAt: nowStr() });
    setOpen(true);
  };

  const setField = <K extends keyof EquipmentCode>(k: K, v: EquipmentCode[K]) =>
    setEdit(e => e ? { ...e, [k]: v } : e);

  const save = () => {
    if (!edit) return;
    if (!edit.code.trim()) return toast('请输入设备编码（体系内唯一）', 'error');
    if (!edit.name.trim()) return toast('请输入设备名称', 'error');
    if (list.some(c => c.code === edit.code && c.id !== edit.id)) return toast('编码已占用，请使用唯一编码', 'error');
    upsertEquipmentCode(edit);
    toast('已保存', 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const del = (id: string) => {
    if (!confirm('确认删除该设备编码？删除后台账中仍有历史引用。')) return;
    deleteEquipmentCode(id); refresh();
    toast('已删除', 'success');
  };

  return (
    <div className="p-5">
      <ToastView />

      {/* 分类统计 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {byCategory.map(([c, n]) => (
          <div key={c} className="bg-white rounded-lg border border-slate-200 px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{c}</span>
            <span className="text-sm font-bold text-orange-600 tabular-nums">{n}</span>
          </div>
        ))}
      </div>

      <SearchBar onAdd={openNew} addLabel="+ 新增设备编码">
        <Select value={cat} onChange={setCat}
          options={EQUIPMENT_CATEGORIES.map(c => ({ value: c, label: c }))}
          placeholder="分类" className="!w-44" />
        <Input value={kw} onChange={setKw} placeholder="搜索编码/名称" className="!w-64" />
        <button className={EC.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[70vh] overflow-auto">
        <table className={EC.table}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={EC.th}>编码</th>
              <th className={EC.th}>设备名称</th>
              <th className={EC.th}>一级分类</th>
              <th className={EC.th}>二级分类</th>
              <th className={EC.th}>单位</th>
              <th className={EC.th}>常用品牌</th>
              <th className={EC.th}>规格说明</th>
              <th className={EC.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className={`${EC.td} text-center text-slate-400 py-10`}>暂无设备编码，点击"+ 新增设备编码"</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className={`${EC.td} text-slate-500 font-mono text-[12px]`}>{c.code}</td>
                <td className={`${EC.td} font-medium text-slate-800`}>{c.name}</td>
                <td className={EC.td}><TypePill text={c.category} tone="cyan" /></td>
                <td className={EC.td}>{c.subCategory || '-'}</td>
                <td className={EC.td}>{c.unit}</td>
                <td className={`${EC.td} text-slate-500 text-xs`}>{c.brand || '-'}</td>
                <td className={`${EC.td} text-slate-500 text-xs`}>{c.spec || '-'}</td>
                <td className={`${EC.td} whitespace-nowrap space-x-1`}>
                  <button className={EC.button.tiny + ' text-cyan-700 border-cyan-300'} onClick={() => { setEdit(c); setOpen(true); }}>编辑</button>
                  <button className={EC.button.tiny + ' text-rose-700 border-rose-300'} onClick={() => del(c.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title={edit && list.some(x => x.id === edit.id) ? `编辑设备编码 ${edit.code}` : '新增设备编码'}
        open={open} onClose={() => { setOpen(false); setEdit(null); }} width="max-w-2xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}>
        {edit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={EC.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>设备编码</label>
              <Input value={edit.code} onChange={v => setField('code', v)} placeholder="例如：EQ-WJJ-001" />
            </div>
            <div>
              <label className={EC.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>设备名称</label>
              <Input value={edit.name} onChange={v => setField('name', v)} placeholder="例如：履带式液压挖掘机" />
            </div>
            <div>
              <label className={EC.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>一级分类</label>
              <Select value={edit.category} onChange={v => setField('category', v)}
                options={EQUIPMENT_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="选择分类" />
            </div>
            <div>
              <label className={EC.label}>二级分类</label>
              <Input value={edit.subCategory || ''} onChange={v => setField('subCategory', v)} placeholder="如：挖掘机" />
            </div>
            <div>
              <label className={EC.label}>计量单位</label>
              <Select value={edit.unit} onChange={v => setField('unit', v)}
                options={UNITS.map(u => ({ value: u, label: u }))} placeholder="单位" />
            </div>
            <div>
              <label className={EC.label}>常用品牌</label>
              <Input value={edit.brand || ''} onChange={v => setField('brand', v)} placeholder="如：三一/徐工/卡特彼勒" />
            </div>
            <div>
              <label className={EC.label}>规格说明</label>
              <Input value={edit.spec || ''} onChange={v => setField('spec', v)} placeholder="如：20-30吨级" />
            </div>
            <div>
              <label className={EC.label}>备注</label>
              <Input value={edit.remark || ''} onChange={v => setField('remark', v)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
