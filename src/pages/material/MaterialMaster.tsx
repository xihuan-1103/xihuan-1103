/**
 * 基础数据（材料编码体系 + 仓库）
 */

import React, { useMemo, useState } from 'react';
import type { Material, Warehouse } from './types';
import {
  C, Modal, SearchBar, Input, Select, StatusPill, TypePill, useToast,
} from './_shared';
import {
  getMaterials, saveMaterials, getWarehouses, saveWarehouses,
  getOrgsForDropdown, todayStr, nowStr, genId,
} from './materialStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const CATEGORIES = ['沥青材料', '水泥材料', '砂石料', '钢材', '劳保用品', '五金工具', '化工材料', '机械配件', '其他'];
const UNITS = ['吨', '公斤', '克', '米', '平方米', '立方米', '个', '件', '箱', '套', '卷', '米²', '台', '百个', '顶'];

export default function MaterialMaster({ onRefresh }: Props) {
  const [tab, setTab] = useState<'mat' | 'wh'>('mat');
  const [materials, setMaterials] = useState<Material[]>(() => getMaterials());
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => getWarehouses());
  const refresh = () => { setMaterials(getMaterials()); setWarehouses(getWarehouses()); onRefresh?.(); };
  const toast = useToast();
  const orgs = useMemo(() => getOrgsForDropdown().filter(o => o.level === 'project'), []);

  /* -------- Materials -------- */
  const [kw, setKw] = useState('');
  const [cat, setCat] = useState('');
  const filteredMats = useMemo(() => {
    let r = materials;
    if (cat) r = r.filter(m => m.category === cat);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(m => m.code.toLowerCase().includes(k) || m.name.toLowerCase().includes(k));
    }
    return r;
  }, [materials, cat, kw]);

  const [open, setOpen] = useState(false);
  const [mat, setMat] = useState<Material | null>(null);

  const openNewMat = () => {
    setMat({ id: genId('mat'), code: '', name: '', category: CATEGORIES[0], unit: '吨', price: 0, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() });
    setOpen(true);
  };
  const saveMat = () => {
    if (!mat) return;
    if (!mat.code.trim()) return toast('请输入材料编码（在体系内唯一）', 'error');
    if (!mat.name.trim()) return toast('请输入材料名称', 'error');
    if (materials.some(m => m.code === mat.code && m.id !== mat.id)) return toast('编码已占用，请使用唯一编码', 'error');
    const next = [...materials];
    const idx = next.findIndex(m => m.id === mat.id);
    if (idx >= 0) next[idx] = { ...mat, updatedAt: nowStr() };
    else next.unshift({ ...mat, updatedAt: nowStr() });
    saveMaterials(next); setMaterials(next);
    toast('已保存', 'success');
    setOpen(false); setMat(null);
  };
  const delMat = (id: string) => {
    if (!confirm('确认删除该材料编码？删除后单据中仍有历史引用。')) return;
    const next = materials.filter(m => m.id !== id);
    saveMaterials(next); setMaterials(next);
    toast('已删除', 'success');
  };

  /* -------- Warehouses -------- */
  const [whOpen, setWhOpen] = useState(false);
  const [wh, setWh] = useState<Warehouse | null>(null);
  const [orgWh, setOrgWh] = useState('');
  const filteredWh = useMemo(() => {
    let r = warehouses;
    if (orgWh) r = r.filter(w => w.orgId === orgWh);
    return r;
  }, [warehouses, orgWh]);
  const openNewWh = () => {
    setWh({ id: genId('wh'), name: '', orgId: orgs[0]?.id || '', keeper: '', address: '', enabled: true });
    setWhOpen(true);
  };
  const saveWh = () => {
    if (!wh) return;
    if (!wh.name.trim()) return toast('请输入仓库名称', 'error');
    if (!wh.orgId) return toast('请选择所属组织', 'error');
    const next = [...warehouses];
    const idx = next.findIndex(w => w.id === wh.id);
    if (idx >= 0) next[idx] = wh;
    else next.unshift(wh);
    saveWarehouses(next); setWarehouses(next);
    toast('已保存', 'success'); setWhOpen(false); setWh(null);
  };
  const delWh = (id: string) => {
    if (!confirm('确认删除仓库？')) return;
    const next = warehouses.filter(w => w.id !== id);
    saveWarehouses(next); setWarehouses(next);
    toast('已删除', 'success');
  };

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-4">
        {[{ key: 'mat', label: `材料编码体系（${materials.length}）` }, { key: 'wh', label: `仓库档案（${warehouses.length}）` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${tab === t.key ? 'bg-white border-cyan-500 text-cyan-700 shadow-sm ring-2 ring-cyan-100' : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mat' ? (
        <>
          <SearchBar onAdd={openNewMat} addLabel="+ 新增材料">
            <Select value={cat} onChange={setCat}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              placeholder="分类" className="!w-44" />
            <Input value={kw} onChange={setKw} placeholder="搜索编码/名称" className="!w-64" />
            <button className={C.button.ghost} onClick={refresh}>刷新</button>
          </SearchBar>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[70vh] overflow-auto">
            <table className={C.table}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={C.th}>编码</th>
                  <th className={C.th}>名称</th>
                  <th className={C.th}>分类</th>
                  <th className={C.th}>规格</th>
                  <th className={C.th}>单位</th>
                  <th className={`${C.th} text-right`}>参考含税单价(元)</th>
                  <th className={`${C.th} text-right`}>税率</th>
                  <th className={C.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredMats.length === 0 && (
                  <tr><td colSpan={8} className={`${C.td} text-center text-slate-400 py-10`}>暂无材料，点击"+ 新增材料"</td></tr>
                )}
                {filteredMats.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className={`${C.td} text-slate-500 font-mono text-[12px]`}>{m.code}</td>
                    <td className={`${C.td} font-medium text-slate-800`}>{m.name}</td>
                    <td className={C.td}><TypePill text={m.category} tone="cyan" /></td>
                    <td className={C.td}>{m.spec || '-'}</td>
                    <td className={C.td}>{m.unit}</td>
                    <td className={`${C.td} text-right tabular-nums`}>{(m.price || 0).toFixed(2)}</td>
                    <td className={`${C.td} text-right`}>{(m.taxRate || 0) * 100}%</td>
                    <td className={`${C.td} whitespace-nowrap space-x-1`}>
                      <button className={C.button.tiny + ' text-cyan-700 border-cyan-300'} onClick={() => { setMat(m); setOpen(true); }}>编辑</button>
                      <button className={C.button.tiny + ' text-rose-700 border-rose-300'} onClick={() => delMat(m.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal title={mat && materials.some(x => x.id === mat.id) ? `编辑材料 ${mat.code}` : '新增材料'}
            open={open} onClose={() => { setOpen(false); setMat(null); }} width="max-w-2xl"
            footer={<>
              <button className={C.button.ghost} onClick={() => { setOpen(false); setMat(null); }}>取消</button>
              <button className={C.button.primary} onClick={saveMat}>保存</button>
            </>}>
            {mat && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>材料编码</label>
                  <Input value={mat.code} onChange={v => setMat({ ...mat, code: v })} placeholder="例如：LQ-001" />
                </div>
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>材料名称</label>
                  <Input value={mat.name} onChange={v => setMat({ ...mat, name: v })} placeholder="例如：SBS改性沥青(I-C)" />
                </div>
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>分类</label>
                  <Select value={mat.category} onChange={v => setMat({ ...mat, category: v })}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="选择分类" />
                </div>
                <div>
                  <label className={C.label}>规格型号</label>
                  <Input value={mat.spec || ''} onChange={v => setMat({ ...mat, spec: v })} placeholder="如 I-C 型、P.O 42.5、HRB400 φ16" />
                </div>
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>计量单位</label>
                  <Select value={mat.unit} onChange={v => setMat({ ...mat, unit: v })}
                    options={UNITS.map(u => ({ value: u, label: u }))} placeholder="单位" />
                </div>
                <div>
                  <label className={C.label}>参考单价（元，含税）</label>
                  <Input type="number" step="0.01" value={mat.price ?? ''} onChange={v => setMat({ ...mat, price: Number(v) || 0 })} />
                </div>
                <div>
                  <label className={C.label}>税率</label>
                  <Select value={String(mat.taxRate ?? 0.13)} onChange={v => setMat({ ...mat, taxRate: Number(v) })}
                    options={['0', '0.03', '0.06', '0.09', '0.13'].map(r => ({ value: r, label: (Number(r) * 100) + '%' }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={C.label}>备注</label>
                  <Input value={mat.remark || ''} onChange={v => setMat({ ...mat, remark: v })} />
                </div>
              </div>
            )}
          </Modal>
        </>
      ) : (
        <>
          <SearchBar onAdd={openNewWh} addLabel="+ 新增仓库">
            <Select value={orgWh} onChange={setOrgWh}
              options={orgs.map(o => ({ value: o.id, label: o.path }))}
              placeholder="按所属组织过滤" className="!w-72" />
            <button className={C.button.ghost} onClick={refresh}>刷新</button>
          </SearchBar>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className={C.table}>
              <thead>
                <tr>
                  <th className={C.th}>仓库名称</th>
                  <th className={C.th}>所属组织</th>
                  <th className={C.th}>地址</th>
                  <th className={C.th}>仓管员</th>
                  <th className={C.th}>启用状态</th>
                  <th className={C.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredWh.length === 0 && (
                  <tr><td colSpan={6} className={`${C.td} text-center text-slate-400 py-10`}>暂无仓库档案</td></tr>
                )}
                {filteredWh.map(w => {
                  const o = orgs.find(o => o.id === w.orgId);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className={`${C.td} font-medium`}>{w.name}</td>
                      <td className={C.td}>{o?.path || w.orgId}</td>
                      <td className={C.td}>{w.address || '-'}</td>
                      <td className={C.td}>{w.keeper || '-'}</td>
                      <td className={C.td}>
                        <StatusPill status={w.enabled ? '启用' : '停用'} color={w.enabled ? `${C.pill} bg-emerald-50 text-emerald-700` : `${C.pill} bg-slate-100 text-slate-500`} />
                      </td>
                      <td className={`${C.td} whitespace-nowrap space-x-1`}>
                        <button className={C.button.tiny + ' text-cyan-700 border-cyan-300'} onClick={() => { setWh(w); setWhOpen(true); }}>编辑</button>
                        <button className={C.button.tiny + ' text-rose-700 border-rose-300'} onClick={() => delWh(w.id)}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Modal title={wh && warehouses.some(x => x.id === wh.id) ? '编辑仓库' : '新增仓库'}
            open={whOpen} onClose={() => { setWhOpen(false); setWh(null); }} width="max-w-xl"
            footer={<>
              <button className={C.button.ghost} onClick={() => { setWhOpen(false); setWh(null); }}>取消</button>
              <button className={C.button.primary} onClick={saveWh}>保存</button>
            </>}>
            {wh && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>仓库名称</label>
                  <Input value={wh.name} onChange={v => setWh({ ...wh, name: v })} placeholder="如：中心材料库、2号料场" />
                </div>
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>所属组织</label>
                  <Select value={wh.orgId} onChange={v => setWh({ ...wh, orgId: v })}
                    options={orgs.map(o => ({ value: o.id, label: o.path }))} placeholder="选择组织" />
                </div>
                <div>
                  <label className={C.label}>仓管员</label>
                  <Input value={wh.keeper || ''} onChange={v => setWh({ ...wh, keeper: v })} placeholder="如：张三" />
                </div>
                <div>
                  <label className={C.label}>状态</label>
                  <Select value={wh.enabled ? '1' : '0'} onChange={v => setWh({ ...wh, enabled: v === '1' })}
                    options={[{ value: '1', label: '启用' }, { value: '0', label: '停用' }]} />
                </div>
                <div className="md:col-span-2">
                  <label className={C.label}>地址</label>
                  <Input value={wh.address || ''} onChange={v => setWh({ ...wh, address: v })} />
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
