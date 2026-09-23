/**
 * 调拨单管理 - 跨组织材料调拨（A→B）+ 简单流程：
 *   Draft → Submit(调出方提交) → [Confirm(调入方确认) → 调出方出库(Out Done) → 调入方入库(Completed)]
 *                                    或 Reject(驳回)
 */

import React, { useMemo, useState } from 'react';
import type { TransferOrder, DocLineItem, Material } from './types';
import {
  C, Modal, SearchBar, Input, Select, StatusPill, MaterialPicker,
  DocLineEditor, materialsToLines, useToast,
} from './_shared';
import {
  getTransferOrders, upsertTransfer, nextDocCode, todayStr, nowStr,
  genId, getOrgsForDropdown, getWarehousesByOrg,
  transferSubmit, transferConfirm, transferReject, transferDoOut, transferDoIn,
  TRANSFER_STATUS_MAP, auditStockIn, auditStockOut,
} from './materialStore';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function TransferManager({ onRefresh }: Props) {
  const orgs = useMemo(() => getOrgsForDropdown().filter(o => o.level === 'project'), []);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [kw, setKw] = useState('');
  const [list, setList] = useState<TransferOrder[]>(() => getTransferOrders());
  const refresh = () => { setList(getTransferOrders()); onRefresh?.(); };
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TransferOrder | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => {
    let r = list;
    if (statusFilter) r = r.filter(t => t.status === statusFilter);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(t => t.code.toLowerCase().includes(k) || t.fromOrgName.toLowerCase().includes(k) || t.toOrgName.toLowerCase().includes(k));
    }
    return r.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [list, statusFilter, kw]);

  const openNew = () => {
    setEdit({
      id: genId('to'), code: nextDocCode('DB-'),
      fromOrgId: '', fromOrgName: '',
      toOrgId: '', toOrgName: '',
      docDate: todayStr(), status: 'draft',
      lines: [], createdAt: nowStr(), updatedAt: nowStr(),
    });
    setOpen(true);
  };

  const saveEditing = (submit: boolean) => {
    if (!edit) return;
    if (!edit.fromOrgId || !edit.toOrgId) return toast('请选择调出和调入组织', 'error');
    if (edit.fromOrgId === edit.toOrgId) return toast('调出和调入组织不能相同', 'error');
    if (edit.lines.length === 0) return toast('请添加调拨明细', 'error');
    const fromOrg = orgs.find(o => o.id === edit.fromOrgId)!;
    const toOrg = orgs.find(o => o.id === edit.toOrgId)!;
    const e: TransferOrder = { ...edit, fromOrgName: fromOrg.name, toOrgName: toOrg.name };
    upsertTransfer(e);
    if (submit) transferSubmit(e.id);
    setEdit(null); setOpen(false);
    refresh();
    toast(submit ? '已提交，待调入方确认' : '已保存草稿', 'success');
  };

  const onPickMats = (mats: Material[]) => {
    if (!edit) return;
    const existIds = new Set(edit.lines.map(l => l.materialId));
    setEdit({ ...edit, lines: [...edit.lines, ...materialsToLines(mats.filter(m => !existIds.has(m.id)))] });
  };

  const doConfirm = (id: string) => {
    transferConfirm(id); refresh(); toast('已确认，调出方可执行出库', 'success');
  };
  const doReject = () => {
    if (!viewId || !rejectReason.trim()) return toast('请输入驳回理由', 'error');
    transferReject(viewId, rejectReason.trim());
    setRejectOpen(false); setRejectReason(''); setViewId(null);
    refresh(); toast('已驳回', 'success');
  };
  const doOut = (id: string) => {
    const t = list.find(x => x.id === id);
    if (!t) return;
    const wh = getWarehousesByOrg(t.fromOrgId)[0];
    if (!wh) return toast('调出组织暂无仓库', 'error');
    const out = transferDoOut(id, wh.id);
    if (out) auditStockOut(out.id);
    refresh();
    toast(out ? `已调出：生成调拨出库单 ${out?.code} 并完成出库` : '调出失败', 'success');
  };
  const doIn = (id: string) => {
    const t = list.find(x => x.id === id);
    if (!t) return;
    const wh = getWarehousesByOrg(t.toOrgId)[0];
    if (!wh) return toast('调入组织暂无仓库', 'error');
    const sin = transferDoIn(id, wh.id);
    if (sin) auditStockIn(sin.id);
    refresh();
    toast(sin ? `已调入：生成调拨入库单 ${sin?.code} 并完成入库` : '调入失败', 'success');
  };

  const current = viewId ? list.find(t => t.id === viewId) : null;

  return (
    <div className="p-5">
      <SearchBar onAdd={openNew} addLabel="+ 新建调拨单">
        <Input value={kw} onChange={setKw} placeholder="搜索单号/调出/调入组织" className="!w-64" />
        <Select value={statusFilter} onChange={setStatusFilter}
          options={Object.keys(TRANSFER_STATUS_MAP).map(k => ({ value: k, label: TRANSFER_STATUS_MAP[k as any] }))}
          placeholder="状态" className="!w-44" />
        <button className={C.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={C.table}>
          <thead>
            <tr>
              <th className={C.th}>单号</th>
              <th className={C.th}>调出 → 调入</th>
              <th className={C.th}>明细行</th>
              <th className={C.th}>金额(含税)</th>
              <th className={C.th}>日期</th>
              <th className={C.th}>状态</th>
              <th className={C.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className={`${C.td} text-center text-slate-400 py-10`}>暂无调拨单</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className={`${C.td} font-medium`}>{t.code}</td>
                <td className={C.td}>
                  <span className="inline-flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{t.fromOrgName}</span>
                    <svg className="w-4 h-4 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-medium">{t.toOrgName}</span>
                  </span>
                </td>
                <td className={C.td}>{t.lines.length} 项</td>
                <td className={`${C.td} text-right tabular-nums text-cyan-700 font-medium`}>¥ {(t.totalAmount || 0).toFixed(2)}</td>
                <td className={C.td}>{t.docDate}</td>
                <td className={C.td}><StatusPill status={TRANSFER_STATUS_MAP[t.status] || t.status} /></td>
                <td className={`${C.td} space-x-1 whitespace-nowrap`}>
                  <button className={C.button.tiny} onClick={() => setViewId(t.id)}>详情</button>
                  {t.status === 'draft' && <button className={C.button.tiny + ' text-cyan-700 border-cyan-300'} onClick={() => { setEdit(t); setOpen(true); }}>编辑</button>}
                  {t.status === 'draft' && <button className={C.button.tiny + ' text-sky-700 border-sky-300'} onClick={() => { transferSubmit(t.id); refresh(); toast('已提交', 'success'); }}>提交</button>}
                  {t.status === 'submitted' && (
                    <>
                      <button className={C.button.tiny + ' text-emerald-700 border-emerald-300'} onClick={() => doConfirm(t.id)}>确认调入</button>
                      <button className={C.button.tiny + ' text-rose-700 border-rose-300'} onClick={() => { setViewId(t.id); setRejectOpen(true); }}>驳回</button>
                    </>
                  )}
                  {(t.status === 'confirmed' || t.status === 'submitted') && (
                    <button className={C.button.tiny + ' text-amber-700 border-amber-300'} onClick={() => doOut(t.id)}>调出方出库</button>
                  )}
                  {t.status === 'out_done' && (
                    <button className={C.button.tiny + ' text-emerald-700 border-emerald-300'} onClick={() => doIn(t.id)}>调入方入库</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑 */}
      <Modal title={edit?.id && list.find(x => x.id === edit.id) ? `调拨单 ${edit.code}` : '新建调拨单'}
        open={open} onClose={() => { setOpen(false); setEdit(null); }} width="max-w-5xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={C.button.ghost} onClick={() => saveEditing(false)}>保存草稿</button>
          <button className={C.button.primary} onClick={() => saveEditing(true)}>提交给调入方</button>
        </>}>
        {edit && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div><label className={C.label}>单号</label><Input value={edit.code} onChange={() => {}} className="bg-slate-50" /></div>
              <div><label className={C.label}>日期</label><Input type="date" value={edit.docDate} onChange={v => setEdit({ ...edit, docDate: v })} /></div>
              <div><label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>调出组织</label>
                <Select value={edit.fromOrgId} onChange={v => setEdit({ ...edit, fromOrgId: v })}
                  options={orgs.map(o => ({ value: o.id, label: o.path }))} placeholder="选调出组织" />
              </div>
              <div><label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>调入组织</label>
                <Select value={edit.toOrgId} onChange={v => setEdit({ ...edit, toOrgId: v })}
                  options={orgs.filter(o => o.id !== edit.fromOrgId).map(o => ({ value: o.id, label: o.path }))} placeholder="选调入组织" />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <label className={C.label}>调拨原因</label>
                <Input value={edit.reason || ''} onChange={v => setEdit({ ...edit, reason: v })} placeholder="例如：项目部2路面施工急需，从项目部1调支援" />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <label className={C.label}>备注</label>
                <Input value={edit.remark || ''} onChange={v => setEdit({ ...edit, remark: v })} />
              </div>
            </div>
            <DocLineEditor
              lines={edit.lines}
              onChange={l => setEdit({ ...edit, lines: l })}
              onPickMaterials={() => setPickOpen(true)}
            />
          </>
        )}
      </Modal>
      <MaterialPicker open={pickOpen} onClose={() => setPickOpen(false)} onPick={onPickMats} />

      {/* 详情 */}
      <Modal title={`调拨单 ${current?.code || ''}`} open={!!current} onClose={() => setViewId(null)} width="max-w-5xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => setViewId(null)}>关闭</button>
          {current?.status === 'submitted' && (
            <>
              <button className={C.button.danger} onClick={() => setRejectOpen(true)}>驳回</button>
              <button className={C.button.success} onClick={() => { doConfirm(current.id); setViewId(null); }}>确认调入</button>
            </>
          )}
          {current && (current.status === 'confirmed' || current.status === 'submitted') && (
            <button className={C.button.amber} onClick={() => { doOut(current.id); setViewId(null); }}>调出方执行出库</button>
          )}
          {current?.status === 'out_done' && (
            <button className={C.button.success} onClick={() => { doIn(current.id); setViewId(null); }}>调入方执行入库</button>
          )}
        </>}>
        {current && (
          <>
            <FlowTimeline t={current} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <Info label="调出组织" value={current.fromOrgName} />
              <Info label="调入组织" value={current.toOrgName} />
              <Info label="日期" value={current.docDate} />
              <Info label="状态" value={<StatusPill status={TRANSFER_STATUS_MAP[current.status] || current.status} />} />
              <Info label="原因" value={current.reason || '-'} />
              <Info label="金额(含税)" value={`¥ ${(current.totalAmount || 0).toFixed(2)}`} />
              <Info label="关联出库单" value={current.outOrderId ? '已生成' : '-'} />
              <Info label="关联入库单" value={current.inOrderId ? '已生成' : '-'} />
            </div>
            <DocLineEditor readOnly lines={current.lines as DocLineItem[]} onChange={() => {}} onPickMaterials={() => {}} />
          </>
        )}
      </Modal>

      {/* 驳回 */}
      <Modal title="驳回调拨单" open={rejectOpen} onClose={() => setRejectOpen(false)} width="max-w-md"
        footer={<>
          <button className={C.button.ghost} onClick={() => setRejectOpen(false)}>取消</button>
          <button className={C.button.danger} onClick={doReject}>确认驳回</button>
        </>}>
        <label className={C.label}>驳回理由</label>
        <textarea rows={5} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
          placeholder="请填写驳回理由，例如：材料型号不符 / 本组织已有库存..."
          className={C.input} />
      </Modal>
    </div>
  );
}

function FlowTimeline({ t }: { t: TransferOrder }) {
  const steps = [
    { key: 'draft', label: '调出方创建', active: true, at: t.createdAt },
    { key: 'submitted', label: '调出方提交', active: !!t.submitAt, at: t.submitAt },
    { key: 'confirmed', label: '调入方确认', active: !!t.confirmAt || !!t.confirmBy, at: t.confirmAt },
    { key: 'out', label: '调出方出库', active: !!t.outAt || !!t.outBy, at: t.outAt },
    { key: 'in',  label: '调入方入库', active: !!t.inAt || !!t.inBy, at: t.inAt },
  ];
  const reached = (k: string) => {
    if (k === 'draft') return true;
    if (k === 'submitted') return t.status !== 'draft';
    if (k === 'confirmed') return ['confirmed', 'out_done', 'completed'].includes(t.status);
    if (k === 'out') return ['out_done', 'completed'].includes(t.status);
    if (k === 'in') return t.status === 'completed';
    return false;
  };
  return (
    <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-3 mb-4 overflow-x-auto text-xs">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1 min-w-[84px]">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${reached(s.key) ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i + 1}
            </div>
            <div className={`text-[11px] ${reached(s.key) ? 'text-cyan-700 font-medium' : 'text-slate-400'}`}>{s.label}</div>
            {s.at && <div className="text-[10px] text-slate-400">{new Date(s.at).toLocaleString('zh-CN', { hour12: false }).slice(5, 16)}</div>}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${reached(s.key) && reached(steps[i + 1].key) ? 'bg-cyan-500' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
      {t.status === 'rejected' && (
        <div className="ml-auto flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1 rounded-md whitespace-nowrap">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="font-medium">已驳回：{t.rejectReason}</span>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-800 font-medium">{value}</div>
    </div>
  );
}
