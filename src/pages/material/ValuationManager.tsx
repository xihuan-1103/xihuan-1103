/**
 * 库存转移（价拨）管理：
 * - 内部转移：同一组织下两个仓库间调拨（生成一条价拨出库 + 一条内部入库）
 * - 外部价拨：把材料卖给外部（生成价拨出库，可选价格模式：成本价 / 自定义价）
 */

import React, { useMemo, useState } from 'react';
import type { ValuationOrder, DocLineItem, Material } from './types';
import {
  C, Modal, SearchBar, Input, Select, StatusPill, TypePill,
  MaterialPicker, DocLineEditor, materialsToLines, useToast,
} from './_shared';
import {
  getValuationOrders, upsertValuation, submitValuation, nextDocCode, todayStr, nowStr,
  genId, getOrgsForDropdown, getWarehousesByOrg,
  queryBalances,
} from './materialStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function ValuationManager({ onRefresh }: Props) {
  const [list, setList] = useState<ValuationOrder[]>(() => getValuationOrders());
  const refresh = () => { setList(getValuationOrders()); onRefresh?.(); };
  const toast = useToast();
  const orgs = useMemo(() => getOrgsForDropdown().filter(o => o.level === 'project'), []);
  const [mode, setMode] = useState<'' | 'internal' | 'external'>('');
  const [kw, setKw] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ValuationOrder | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = list;
    if (mode) r = r.filter(o => o.mode === mode);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(o => o.code.toLowerCase().includes(k));
    }
    return r.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [list, mode, kw]);

  const openNew = (m: 'internal' | 'external') => {
    setEdit({
      id: genId('vo'),
      code: nextDocCode(m === 'internal' ? 'ZY-' : 'JB-'),
      orgId: '', orgName: '',
      mode: m,
      docDate: todayStr(),
      priceMode: 'cost',
      status: 'draft',
      lines: [],
      createdAt: nowStr(), updatedAt: nowStr(),
    });
    setOpen(true);
  };

  const onPickMats = (mats: Material[]) => {
    if (!edit) return;
    const exist = new Set(edit.lines.map(l => l.materialId));
    // 仅添加该组织+该仓库现有库存的材料
    let balanceMap: Record<string, number> = {};
    if (edit.orgId && edit.fromWarehouseId) {
      queryBalances({ orgId: edit.orgId, warehouseId: edit.fromWarehouseId })
        .forEach(b => { balanceMap[b.materialId] = b.qty; });
    }
    const add: DocLineItem[] = mats
      .filter(m => !exist.has(m.id))
      .map(m => {
        const max = balanceMap[m.id] || 0;
        return materialsToLines([m])[0]!;
      });
    setEdit({ ...edit, lines: [...edit.lines, ...add] });
  };

  const warehouses = edit?.orgId ? getWarehousesByOrg(edit.orgId) : [];

  const saveEditing = (submit: boolean) => {
    if (!edit) return;
    if (!edit.orgId) return toast('请选择组织', 'error');
    if (!edit.fromWarehouseId) return toast('请选择源仓库', 'error');
    if (edit.mode === 'internal' && !edit.toWarehouseId) return toast('请选择目标仓库', 'error');
    if (edit.mode === 'external' && edit.priceMode === 'custom' && edit.lines.some(l => !l.unitPrice || l.unitPrice <= 0)) {
      return toast('自定义价模式下，请为每行设置单价', 'error');
    }
    if (edit.lines.length === 0) return toast('请添加明细', 'error');

    // 成本价模式：查询源仓库加权平均成本作为单价
    let current: ValuationOrder = edit;
    if (current.priceMode === 'cost' && current.orgId && current.fromWarehouseId) {
      const bs = queryBalances({ orgId: current.orgId, warehouseId: current.fromWarehouseId });
      const costMap: Record<string, number> = {};
      bs.forEach(b => { costMap[b.materialId] = b.avgCost; });
      current = {
        ...current,
        lines: current.lines.map(l => ({ ...l, unitPrice: costMap[l.materialId] || l.unitPrice || 0 })),
      };
    }
    const saved = upsertValuation(current);
    if (submit) submitValuation(saved.id);
    toast(submit ? '已提交，已生成对应出/入库单' : '已保存草稿', 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const current = viewId ? list.find(l => l.id === viewId) : null;

  return (
    <div className="p-5">
      {/* 入口卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button onClick={() => openNew('internal')}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-cyan-400 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">内部仓库间转移</h3>
              </div>
              <p className="text-sm text-slate-500 mt-2">同一组织下，材料从仓库A调拨至仓库B。</p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
                <li>自动生成出库单（出库A）与入库单（入库B）</li>
                <li>支持按加权平均成本价或自定义单价</li>
              </ul>
            </div>
            <div className="text-cyan-600 group-hover:translate-x-1 transition-transform">→</div>
          </div>
        </button>
        <button onClick={() => openNew('external')}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-rose-400 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">外部价拨（对外处置）</h3>
              </div>
              <p className="text-sm text-slate-500 mt-2">对外部单位进行的材料价拨销售。</p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
                <li>自动生成价拨出库单（出库），无对应的内部入库</li>
                <li>自定义价模式：可按市场价/协议价录入单价</li>
              </ul>
            </div>
            <div className="text-rose-600 group-hover:translate-x-1 transition-transform">→</div>
          </div>
        </button>
      </div>

      <SearchBar>
        <div className="flex gap-1">
          {[
            { key: '', label: '全部' },
            { key: 'internal', label: '内部转移' },
            { key: 'external', label: '外部价拨' },
          ].map(t => (
            <button key={t.key} onClick={() => setMode(t.key as any)}
              className={`px-3 py-1.5 rounded-md text-sm border ${mode === t.key ? 'bg-cyan-50 border-cyan-500 text-cyan-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Input value={kw} onChange={setKw} placeholder="搜索单号" className="!w-52" />
        <button className={C.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={C.table}>
          <thead>
            <tr>
              <th className={C.th}>单号</th>
              <th className={C.th}>模式</th>
              <th className={C.th}>组织 / 仓库流向</th>
              <th className={C.th}>定价方式</th>
              <th className={`${C.th} text-right`}>金额</th>
              <th className={C.th}>日期</th>
              <th className={C.th}>状态</th>
              <th className={C.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className={`${C.td} text-center text-slate-400 py-10`}>暂无库存转移/价拨单</td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className={`${C.td} font-medium`}>{v.code}</td>
                <td className={C.td}>
                  <TypePill text={v.mode === 'internal' ? '内部转移' : '外部价拨'} tone={v.mode === 'internal' ? 'cyan' : 'rose'} />
                </td>
                <td className={C.td}>
                  <div className="text-slate-800 text-[12px]">{v.orgName}</div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{v.fromWarehouseName}</span>
                    <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className={`px-1.5 py-0.5 rounded ${v.mode === 'external' ? 'bg-rose-50 text-rose-600' : 'bg-cyan-50 text-cyan-700'}`}>
                      {v.mode === 'external' ? (v.externalParty || '外部单位') : v.toWarehouseName}
                    </span>
                  </div>
                </td>
                <td className={C.td}>
                  {v.priceMode === 'cost' ? <span className="text-slate-700">成本价</span> : <span className="text-rose-700 font-medium">自定义价</span>}
                </td>
                <td className={`${C.td} text-right tabular-nums text-cyan-700 font-medium`}>¥ {(v.totalAmount || 0).toFixed(2)}</td>
                <td className={C.td}>{v.docDate}</td>
                <td className={C.td}>
                  <StatusPill status={v.status === 'draft' ? 'draft' : v.status === 'done' ? 'done' : v.status} />
                </td>
                <td className={`${C.td} whitespace-nowrap space-x-1`}>
                  <button className={C.button.tiny} onClick={() => setViewId(v.id)}>查看</button>
                  {v.status === 'draft' && (
                    <>
                      <button className={C.button.tiny + ' text-cyan-700 border-cyan-300'}
                        onClick={() => { setEdit(v); setOpen(true); }}>编辑</button>
                      <button className={C.button.tiny + ' text-emerald-700 border-emerald-300'}
                        onClick={() => { submitValuation(v.id); refresh(); toast('已提交，库存变动完成', 'success'); }}>提交执行</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑 */}
      <Modal title={`${edit?.mode === 'internal' ? '内部仓库转移' : '外部价拨'} - ${edit?.code || ''}`}
        open={open} onClose={() => { setOpen(false); setEdit(null); }} width="max-w-5xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={C.button.ghost} onClick={() => saveEditing(false)}>保存草稿</button>
          <button className={C.button.success} onClick={() => saveEditing(true)}>提交执行（库存变动）</button>
        </>}>
        {edit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div><label className={C.label}>单号</label><Input value={edit.code} onChange={() => {}} className="bg-slate-50" /></div>
              <div><label className={C.label}>日期</label><Input type="date" value={edit.docDate} onChange={v => setEdit({ ...edit, docDate: v })} /></div>
              <div>
                <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>组织</label>
                <Select value={edit.orgId} onChange={v => {
                  const o = orgs.find(o => o.id === v);
                  setEdit({ ...edit, orgId: v, orgName: o?.name || '', fromWarehouseId: undefined, toWarehouseId: undefined, fromWarehouseName: '', toWarehouseName: '' });
                }} options={orgs.map(o => ({ value: o.id, label: o.path }))} placeholder="选择组织" />
              </div>
              <div>
                <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>源仓库</label>
                <Select value={edit.fromWarehouseId || ''} onChange={v => {
                  const wh = warehouses.find(w => w.id === v);
                  setEdit({ ...edit, fromWarehouseId: v, fromWarehouseName: wh?.name });
                }} options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                  placeholder={edit.orgId ? '选择源仓库' : '请先选组织'} />
              </div>
              {edit.mode === 'internal' ? (
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>目标仓库</label>
                  <Select value={edit.toWarehouseId || ''} onChange={v => {
                    const wh = warehouses.find(w => w.id === v);
                    setEdit({ ...edit, toWarehouseId: v, toWarehouseName: wh?.name });
                  }} options={warehouses.filter(w => w.id !== edit.fromWarehouseId).map(w => ({ value: w.id, label: w.name }))}
                    placeholder="选择目标仓库（不同于源仓库）" />
                </div>
              ) : (
                <div>
                  <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>对方单位</label>
                  <Input value={edit.externalParty || ''} onChange={v => setEdit({ ...edit, externalParty: v })} placeholder="外部价拨接收方名称" />
                </div>
              )}
              <div>
                <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>定价方式</label>
                <div className="flex gap-2">
                  {(['cost', 'custom'] as const).map(p => (
                    <label key={p} className={`flex-1 flex items-center gap-1.5 px-2 py-2 rounded-md border text-xs cursor-pointer ${edit.priceMode === p ? 'border-cyan-500 bg-white text-cyan-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                      <input type="radio" checked={edit.priceMode === p}
                        onChange={() => setEdit({ ...edit, priceMode: p })} className="accent-cyan-600" />
                      {p === 'cost' ? '成本价' : '自定义价'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <label className={C.label}>备注</label>
                <Input value={edit.remark || ''} onChange={v => setEdit({ ...edit, remark: v })} />
              </div>
            </div>
            <DocLineEditor
              lines={edit.lines}
              onChange={(l) => setEdit({ ...edit, lines: l })}
              onPickMaterials={() => setPickOpen(true)}
              enablePrice={edit.priceMode === 'custom'}
              qtyLabel={edit.priceMode === 'cost' ? '转移数量' : '数量'}
              extraColumns={edit.fromWarehouseId && edit.orgId ? [{
                key: '__stock', label: `源仓库现有库存`,
                render: (l) => {
                  const q = queryBalances({ orgId: edit.orgId, warehouseId: edit.fromWarehouseId })
                    .find(b => b.materialId === l.materialId)?.qty || 0;
                  return <span className="tabular-nums text-right block text-slate-600">{q.toLocaleString()} {l.unit}</span>;
                },
              }] : []}
            />
            {edit.orgId && edit.fromWarehouseId && edit.priceMode === 'cost' && (
              <div className="mt-3 text-[11px] text-slate-500">
                ℹ️ 提交时将以源仓库加权平均成本作为单价核算出/入库金额；可在「查看」中看到。
              </div>
            )}
          </>
        )}
      </Modal>
      <MaterialPicker open={pickOpen} onClose={() => setPickOpen(false)} onPick={onPickMats} />

      {/* 查看 */}
      <Modal title={`库存转移单 ${current?.code || ''}`} open={!!current} onClose={() => setViewId(null)} width="max-w-5xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => setViewId(null)}>关闭</button>
          {current?.status === 'draft' && (
            <button className={C.button.success} onClick={() => { submitValuation(current.id); refresh(); setViewId(null); toast('已提交执行', 'success'); }}>提交执行</button>
          )}
        </>}>
        {current && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              {[
                ['单号', current.code],
                ['模式', current.mode === 'internal' ? '内部转移' : '外部价拨'],
                ['组织', current.orgName],
                ['日期', current.docDate],
                ['源仓库', current.fromWarehouseName || '-'],
                ['目标', current.mode === 'internal' ? current.toWarehouseName : current.externalParty],
                ['定价', current.priceMode === 'cost' ? '成本价' : '自定义价'],
                ['金额(含税)', `¥ ${(current.totalAmount || 0).toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[11px] text-slate-500 mb-0.5">{k}</div>
                  <div className="text-slate-800 font-medium truncate">{v}</div>
                </div>
              ))}
            </div>
            <DocLineEditor readOnly lines={current.lines} onChange={() => {}} onPickMaterials={() => {}} />
            {current.remark && <div className="mt-3 text-sm text-slate-500">备注：{current.remark}</div>}
          </>
        )}
      </Modal>
    </div>
  );
}
