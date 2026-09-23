/**
 * 设备进出场管理
 *  - 四个三级菜单（从主侧边栏进入，各自独立路由）：
 *    1) 自有设备进场（direction=in + fixedOwnership=owned）
 *    2) 租赁设备进场（direction=in + fixedOwnership=leased）
 *    3) 自有设备退场（direction=out + fixedOwnership=owned）
 *    4) 租赁设备退场（direction=out + fixedOwnership=leased）
 *  - 进场确认后自动生成/更新设备台账
 *  - 退场确认后更新台账状态
 */

import React, { useMemo, useState } from 'react';
import type { EquipmentMovement, MovementDirection, EquipmentOwnership } from './types';
import {
  EC, Modal, SearchBar, Input, Select, StatusPill, useToast, toast,
} from './_shared';
import {
  getMovements, getMovementsByFilter, upsertMovement, deleteMovement,
  confirmMovementIn, confirmMovementOut,
  MOVEMENT_STATUS_MAP, EQUIPMENT_OWNERSHIP_MAP,
  getEquipments, getEquipmentCodes, genId, todayStr,
} from './equipmentStore';

interface Props {
  key?: string | number;
  /** 单据方向：in=设备进场 out=设备退场 */
  direction: MovementDirection;
  /** 固定所有权（从三级菜单进入时锁定：自有/租赁） */
  fixedOwnership?: EquipmentOwnership;
}

const PROJECTS = [
  { value: 'proj-1', label: '项目A-国道改扩建' },
  { value: 'proj-2', label: '项目B-市政养护' },
  { value: 'proj-3', label: '项目C-基建工程' },
];

const ORGS = [
  { value: 'org-project-1', label: '项目经理部' },
  { value: 'org-project-2', label: '养护项目部' },
  { value: 'org-project-3', label: '基建项目部' },
];

const IN_SOURCES = ['公司内部调拨', '新购', '租赁合同', '其他项目调入'];
const OUT_REASONS = ['项目完工', '设备故障退回', '租赁期满归还', '调拨其他项目', '报废', '其他'];
const OUT_DESTINATIONS = ['归还供应商', '调往其他项目', '公司设备库', '报废处理', '其他'];

export default function EquipmentMovementManager({ direction, fixedOwnership }: Props) {
  return <MovementPanel direction={direction} fixedOwnership={fixedOwnership} />;
}

function MovementPanel({ direction, fixedOwnership }: { direction: MovementDirection; fixedOwnership?: EquipmentOwnership }) {
  const [list, setList] = useState<EquipmentMovement[]>(() => getMovements());
  const { ToastView } = useToast();
  const [own, setOwn] = useState<EquipmentOwnership | ''>('');
  const [kw, setKw] = useState('');
  const [st, setSt] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<EquipmentMovement | null>(null);

  const equipments = useMemo(() => getEquipments(), []);
  const equipmentCodes = useMemo(() => getEquipmentCodes(), []);

  const filtered = useMemo(() => {
    let r = getMovementsByFilter(direction, fixedOwnership || own || undefined);
    if (st) r = r.filter(m => m.status === st);
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      r = r.filter(m => m.code.toLowerCase().includes(k) || m.equipmentName.toLowerCase().includes(k) || m.equipmentCode.toLowerCase().includes(k));
    }
    return r;
  }, [list, direction, fixedOwnership, own, st, kw]);

  const label = direction === 'in' ? '进场' : '退场';
  const prefix = direction === 'in' ? 'JC-' : 'TC-';

  const refresh = () => setList(getMovements());

  const openNew = () => {
    setEdit({
      id: '', code: `${prefix}${todayStr().replace(/-/g, '')}`,
      direction, ownership: fixedOwnership || 'owned',
      equipmentCode: '', equipmentName: '', model: '', category: '',
      inDate: direction === 'in' ? todayStr() : undefined,
      outDate: direction === 'out' ? todayStr() : undefined,
      orgId: 'org-project-1', orgName: '项目经理部',
      handler: '当前用户', status: 'draft',
      createdAt: '', updatedAt: '',
    });
    setOpen(true);
  };

  const setField = <K extends keyof EquipmentMovement>(k: K, v: EquipmentMovement[K]) =>
    setEdit(e => e ? { ...e, [k]: v } : e);

  /** 从设备编码体系选择设备 */
  const onCodeChange = (codeId: string) => {
    const ec = equipmentCodes.find(c => c.id === codeId);
    if (ec) {
      setEdit(e => e ? { ...e, equipmentCode: ec.code, equipmentName: ec.name, category: ec.category, model: ec.spec || '' } : e);
    }
  };

  /** 从已有台账选择设备（退场场景，fixedOwnership 锁定时从对应所有权的台账中筛选） */
  const onEquipmentChange = (eqId: string) => {
    const eq = equipments.find(e => e.id === eqId);
    if (eq) {
      setEdit(e => e ? {
        ...e, equipmentId: eq.id, equipmentCode: eq.code, equipmentName: eq.name,
        model: eq.model, category: eq.category,
        ownership: fixedOwnership || eq.ownership,
      } : e);
    }
  };

  const save = () => {
    if (!edit) return;
    if (!edit.equipmentName.trim()) { toast('请填写设备名称', 'error'); return; }
    if (!edit.equipmentCode.trim()) { toast('请填写设备编码', 'error'); return; }
    upsertMovement({ ...edit, id: edit.id || genId('mv') });
    toast(`${label}单已保存`, 'success');
    setOpen(false); setEdit(null); refresh();
  };

  const doDelete = (id: string) => {
    if (confirm('确定删除该单据？')) { deleteMovement(id); refresh(); }
  };

  const doConfirm = (m: EquipmentMovement) => {
    if (direction === 'in') {
      const eq = confirmMovementIn(m);
      toast(eq ? `进场确认成功，已更新设备台账（${eq.name}）` : '进场确认成功', 'success');
    } else {
      confirmMovementOut(m);
      toast('退场确认成功，已更新设备台账状态', 'success');
    }
    refresh();
  };

  return (
    <div className="p-5">
      <ToastView />
      <SearchBar onAdd={openNew} addLabel={`+ 新增${label}单`}>
        <Input value={kw} onChange={setKw} placeholder={`搜索${label}单号/设备`} className="!w-60" />
        {!fixedOwnership && (
          <Select value={own} onChange={v => setOwn(v as EquipmentOwnership)}
            options={[
              { value: '', label: '全部所有权' },
              { value: 'owned', label: '自有' },
              { value: 'leased', label: '租赁' },
            ]} className="!w-28" />
        )}
        <Select value={st} onChange={setSt}
          options={[{ value: '', label: '状态' }, ...Object.entries(MOVEMENT_STATUS_MAP).map(([k, v]) => ({ value: k, label: v }))]}
          className="!w-28" />
        <button className={EC.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={EC.table}>
          <thead>
            <tr>
              <th className={EC.th}>单据编号</th>
              <th className={EC.th}>设备</th>
              <th className={EC.th}>所有权</th>
              {direction === 'in' ? (
                <>
                  <th className={EC.th}>进场日期</th>
                  <th className={EC.th}>来源</th>
                  <th className={EC.th}>供应商/产权</th>
                </>
              ) : (
                <>
                  <th className={EC.th}>退场日期</th>
                  <th className={EC.th}>退场原因</th>
                  <th className={EC.th}>去向</th>
                </>
              )}
              <th className={EC.th}>归属组织</th>
              <th className={EC.th}>状态</th>
              <th className={EC.th}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className={EC.td + ' font-medium'}>{m.code}</td>
                <td className={EC.td}>
                  <div className="font-medium">{m.equipmentName}</div>
                  <div className="text-xs text-slate-500">{m.equipmentCode} · {m.model}</div>
                </td>
                <td className={EC.td}>
                  <StatusPill status={EQUIPMENT_OWNERSHIP_MAP[m.ownership]} />
                </td>
                {direction === 'in' ? (
                  <>
                    <td className={EC.td}>{m.inDate || '-'}</td>
                    <td className={EC.td}>{m.source || '-'}</td>
                    <td className={EC.td}>{m.supplierOrOwner || '-'}</td>
                  </>
                ) : (
                  <>
                    <td className={EC.td}>{m.outDate || '-'}</td>
                    <td className={EC.td}>{m.outReason || '-'}</td>
                    <td className={EC.td}>{m.destination || '-'}</td>
                  </>
                )}
                <td className={EC.td}>{m.orgName}</td>
                <td className={EC.td}><StatusPill status={MOVEMENT_STATUS_MAP[m.status]} /></td>
                <td className={EC.td + ' whitespace-nowrap'}>
                  {m.status !== 'confirmed' && (
                    <button className={EC.button.tiny + ' text-emerald-700 border-emerald-300'} onClick={() => doConfirm(m)}>确认</button>
                  )}
                  <button className={EC.button.tiny} onClick={() => { setEdit(m); setOpen(true); }}>编辑</button>
                  <button className={EC.button.tiny + ' text-rose-600'} onClick={() => doDelete(m.id)}>删除</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className={EC.td + ' text-center text-slate-400 py-8'}>暂无{label}单据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={edit?.id ? `编辑${label}单 ${edit.code}` : `新增${label}单`} open={open}
        onClose={() => { setOpen(false); setEdit(null); }} width="max-w-3xl"
        footer={<>
          <button className={EC.button.ghost} onClick={() => { setOpen(false); setEdit(null); }}>取消</button>
          <button className={EC.button.primary} onClick={save}>保存</button>
        </>}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={EC.label}>单据编号</label>
              <Input value={edit.code} onChange={v => setField('code', v)} className="bg-slate-50" />
            </div>
            <div>
              <label className={EC.label}>所有权</label>
              {fixedOwnership ? (
                <Input value={EQUIPMENT_OWNERSHIP_MAP[edit.ownership]} readOnly />
              ) : (
                <Select value={edit.ownership} onChange={v => setField('ownership', v as EquipmentOwnership)}
                  options={[
                    { value: 'owned', label: '自有' },
                    { value: 'leased', label: '租赁' },
                  ]} />
              )}
            </div>

            {direction === 'in' ? (
              <div>
                <label className={EC.label}>从编码体系选择设备</label>
                <Select value={equipmentCodes.find(c => c.code === edit.equipmentCode)?.id || ''}
                  onChange={onCodeChange}
                  options={[
                    { value: '', label: '选择设备编码' },
                    ...equipmentCodes.map(c => ({ value: c.id, label: `${c.code} ${c.name}` })),
                  ]} />
              </div>
            ) : (
              <div>
                <label className={EC.label}>从台账选择设备</label>
                <Select value={edit.equipmentId || ''} onChange={onEquipmentChange}
                  options={[
                    { value: '', label: '选择台账设备' },
                    ...equipments.map(e => ({ value: e.id, label: `${e.code} ${e.name}` })),
                  ]} />
              </div>
            )}

            <div>
              <label className={EC.label}>设备编码 *</label>
              <Input value={edit.equipmentCode} onChange={v => setField('equipmentCode', v)} />
            </div>
            <div>
              <label className={EC.label}>设备名称 *</label>
              <Input value={edit.equipmentName} onChange={v => setField('equipmentName', v)} />
            </div>
            <div>
              <label className={EC.label}>规格型号</label>
              <Input value={edit.model} onChange={v => setField('model', v)} />
            </div>
            <div>
              <label className={EC.label}>设备类别</label>
              <Input value={edit.category} onChange={v => setField('category', v)} />
            </div>

            {direction === 'in' ? (
              <>
                <div>
                  <label className={EC.label}>进场日期</label>
                  <Input type="date" value={edit.inDate || ''} onChange={v => setField('inDate', v)} />
                </div>
                <div>
                  <label className={EC.label}>进场来源</label>
                  <Select value={edit.source || ''} onChange={v => setField('source', v)}
                    options={IN_SOURCES.map(s => ({ value: s, label: s }))} placeholder="选择来源" />
                </div>
                <div>
                  <label className={EC.label}>关联项目</label>
                  <Select value={edit.projectId || ''} onChange={v => {
                    const p = PROJECTS.find(x => x.value === v);
                    setField('projectId', v);
                    setField('projectName', p?.label || '');
                  }} options={PROJECTS} placeholder="选择项目" />
                </div>
                <div>
                  <label className={EC.label}>归属组织</label>
                  <Select value={edit.orgId} onChange={v => {
                    const o = ORGS.find(x => x.value === v);
                    setField('orgId', v);
                    setField('orgName', o?.label || '');
                  }} options={ORGS} />
                </div>
                <div>
                  <label className={EC.label}>存放位置</label>
                  <Input value={edit.location || ''} onChange={v => setField('location', v)} />
                </div>
                <div>
                  <label className={EC.label}>供应商 / 产权单位</label>
                  <Input value={edit.supplierOrOwner || ''} onChange={v => setField('supplierOrOwner', v)} />
                </div>

                {edit.ownership === 'leased' && (
                  <>
                    <div>
                      <label className={EC.label}>租期开始</label>
                      <Input type="date" value={edit.leaseStartDate || ''} onChange={v => setField('leaseStartDate', v)} />
                    </div>
                    <div>
                      <label className={EC.label}>租期结束</label>
                      <Input type="date" value={edit.leaseEndDate || ''} onChange={v => setField('leaseEndDate', v)} />
                    </div>
                    <div>
                      <label className={EC.label}>计费方式</label>
                      <Select value={edit.leaseUnit || ''} onChange={v => setField('leaseUnit', v as 'day' | 'month')}
                        options={[
                          { value: 'day', label: '按台班' },
                          { value: 'month', label: '按月租' },
                        ]} placeholder="选择" />
                    </div>
                    <div>
                      <label className={EC.label}>租金（元/台班 或 元/月）</label>
                      <Input type="number" value={edit.leasePrice || 0} onChange={v => setField('leasePrice', Number(v))} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className={EC.label}>退场日期</label>
                  <Input type="date" value={edit.outDate || ''} onChange={v => setField('outDate', v)} />
                </div>
                <div>
                  <label className={EC.label}>退场原因</label>
                  <Select value={edit.outReason || ''} onChange={v => setField('outReason', v)}
                    options={OUT_REASONS.map(s => ({ value: s, label: s }))} placeholder="选择原因" />
                </div>
                <div>
                  <label className={EC.label}>去向</label>
                  <Select value={edit.destination || ''} onChange={v => setField('destination', v)}
                    options={OUT_DESTINATIONS.map(s => ({ value: s, label: s }))} placeholder="选择去向" />
                </div>
                {edit.ownership === 'leased' && (
                  <div>
                    <label className={EC.label}>租赁结算金额（元）</label>
                    <Input type="number" value={edit.settlementAmount || 0} onChange={v => setField('settlementAmount', Number(v))} />
                  </div>
                )}
              </>
            )}

            <div>
              <label className={EC.label}>经办人</label>
              <Input value={edit.handler} onChange={v => setField('handler', v)} />
            </div>
            <div className="col-span-2">
              <label className={EC.label}>备注</label>
              <textarea rows={2} value={edit.remark || ''} onChange={e => setField('remark', e.target.value)} className={EC.input} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
