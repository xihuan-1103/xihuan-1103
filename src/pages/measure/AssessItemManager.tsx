/**
 * 考核奖励/扣款项维护（基础信息配置）
 *  - 维护发起计量第三步「计量支付汇总表」中可选择的考核/扣款项目
 *  - 支持新增 / 编辑 / 删除 / 查询（名称唯一；类型：扣款 / 奖励）
 *  - 向导第三步从本菜单配置的项目中选择，选择后可维护本期完成金额
 */

import React, { useMemo, useState } from 'react';
import { M, Modal, Input, Select, SearchBar, useToast } from './_shared';
import type { AssessItem } from './types';
import { getAssessItems, upsertAssessItem, deleteAssessItem } from './measureStore';

interface Props { key?: string | number; }

/** 类型徽章：扣款（扣）/ 奖励（加） */
function KindPill({ kind }: { kind: AssessItem['kind'] }) {
  return kind === 'deduction'
    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200">扣</span>
    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">奖</span>;
}

export default function AssessItemManager(_: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const toast = useToast();

  const items = useMemo(() => getAssessItems(), [version]);

  const [kw, setKw] = useState('');
  const [kind, setKind] = useState('');

  // 新增/编辑弹窗
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssessItem | null>(null);
  const [form, setForm] = useState({ name: '', kind: 'deduction' as 'deduction' | 'reward', remark: '' });

  const filtered = items.filter(x => {
    if (kind && x.kind !== kind) return false;
    if (kw.trim() && !x.name.toLowerCase().includes(kw.trim().toLowerCase())
      && !(x.remark || '').toLowerCase().includes(kw.trim().toLowerCase())) return false;
    return true;
  });
  const deductCount = items.filter(x => x.kind === 'deduction').length;
  const rewardCount = items.filter(x => x.kind === 'reward').length;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', kind: 'deduction', remark: '' });
    setOpen(true);
  };

  const openEdit = (x: AssessItem) => {
    setEditing(x);
    setForm({ name: x.name, kind: x.kind, remark: x.remark || '' });
    setOpen(true);
  };

  const doSave = () => {
    const err = upsertAssessItem({ id: editing?.id, name: form.name, kind: form.kind, remark: form.remark });
    if (err) { toast(err, 'error'); return; }
    refresh();
    setOpen(false);
    toast(editing ? `已更新考核项「${form.name.trim()}」` : `已新增考核项「${form.name.trim()}」`, 'success');
  };

  const doDelete = (x: AssessItem) => {
    if (!confirm(`确定删除考核项「${x.name}」？删除后不影响已创建计量单的历史数据，但后续发起计量将不再可选该项。`)) return;
    const err = deleteAssessItem(x.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`已删除考核项「${x.name}」`, 'success');
  };

  return (
    <div className="p-5">
      {/* 说明 + 统计 */}
      <div className="bg-violet-50/60 border border-violet-100 rounded-lg px-4 py-3 mb-4 text-sm text-slate-600 leading-relaxed">
        维护发起计量（第三步 · 预览与确认）中「计量支付汇总表」可选择的考核奖励/扣款项目；
        当前共 <b className="text-violet-700">{items.length}</b> 项（扣款 <b className="text-rose-600">{deductCount}</b> 项 · 奖励 <b className="text-emerald-600">{rewardCount}</b> 项）。
        选择项目后可维护该项目的本期完成金额，到上期末完成金额按该合同历史计量自动累计。
      </div>

      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="项目名称 / 备注" className="!w-52" />
        <Select value={kind} onChange={setKind} placeholder="全部类型" className="!w-36"
          options={[
            { value: 'deduction', label: '扣款项' },
            { value: 'reward', label: '奖励项' },
          ]} />
        <div className="flex-1" />
        <button className={M.button.primary} onClick={openCreate}>+ 新增项目</button>
      </SearchBar>

      {/* 配置项列表 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-14 text-center`}>序号</th>
                <th className={M.th}>项目名称</th>
                <th className={`${M.th} text-center`}>类型</th>
                <th className={M.th}>备注说明</th>
                <th className={`${M.th} text-center`}>更新时间</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((x, i) => (
                <tr key={x.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                  <td className={`${M.td} font-medium`}>{x.name}</td>
                  <td className={`${M.td} text-center`}><KindPill kind={x.kind} /></td>
                  <td className={`${M.td} text-xs text-slate-500`}>{x.remark || '—'}</td>
                  <td className={`${M.td} text-center text-xs text-slate-500 font-mono`}>{x.updatedAt}</td>
                  <td className={`${M.td} text-center`}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button className={M.button.tiny} onClick={() => openEdit(x)}>编辑</button>
                      <button className="px-2 py-1 rounded text-[12px] border border-rose-300 text-rose-600 hover:bg-rose-50 transition"
                        onClick={() => doDelete(x)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className={`${M.td} text-center text-slate-400 py-10`}>暂无考核/扣款配置项</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：扣款项在计量支付汇总表中冲减实际支付金额，奖励项增加实际支付金额；已创建计量单中的历史选择快照不受删除/改名影响。
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal title={editing ? `编辑考核项 - ${editing.name}` : '新增考核项'} open={open} onClose={() => setOpen(false)} width="max-w-md"
        footer={<>
          <button className={M.button.ghost} onClick={() => setOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doSave}>{editing ? '保存修改' : '确认新增'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className={M.label}>项目名称 *</label>
            <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="如：考核扣款 / 保留金 / 优质工程奖励" />
          </div>
          <div>
            <label className={M.label}>类型 *</label>
            <Select value={form.kind} onChange={v => setForm({ ...form, kind: v as 'deduction' | 'reward' })}
              options={[
                { value: 'deduction', label: '扣款项（冲减支付金额）' },
                { value: 'reward', label: '奖励项（增加支付金额）' },
              ]} />
          </div>
          <div>
            <label className={M.label}>备注说明</label>
            <Input value={form.remark} onChange={v => setForm({ ...form, remark: v })} placeholder="业务口径说明（可选）" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
