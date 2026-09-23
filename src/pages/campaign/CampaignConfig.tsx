/**
 * 百日攻坚 - 基础信息配置（项目部项目信息维护）
 *  - 列表展示已维护的项目部项目，支持新增 / 编辑 / 删除、关键字搜索
 *  - 新增（编辑）弹窗表单分两个区段：
 *      ① 项目基础信息：项目名称、项目简称、路段名称、工程类型、
 *         项目金额、合同名称、工期起始/结束时间
 *      ② 项目施工信息：基准日（固定 9.10，只读）、基准日已完成产值、
 *         路面专项总/剩余工程量、总计划/剩余工作日（病害、罩面）
 *  - 工程类型：路面专项 / 路基桥隧
 *  - 区域 / 项目部 / 填报人信息不在表单中维护（按填报账号所属组织自动带出，
 *    演示环境由预置数据提供），档案中的对应字段继续供倒排 / 填报自动带出 / 晾晒 / 看板使用
 */

import React, { useMemo, useState } from 'react';
import { M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtNum } from './_shared';
import type { CampaignProject, WorkType } from './types';
import { WORK_TYPE_LABELS } from './types';
import { getProjects, upsertProject, deleteProject, baseDateOf, genId, nowStr } from './campaignStore';

const WORK_TYPE_OPTIONS = (Object.keys(WORK_TYPE_LABELS) as WorkType[])
  .map(v => ({ value: v, label: WORK_TYPE_LABELS[v] }));

export default function CampaignConfig() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const toast = useToast();

  const projects = useMemo(() => getProjects(), [version]);

  const [kw, setKw] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<CampaignProject>>({});

  const k = kw.trim().toLowerCase();
  const filtered = projects.filter(p => !k
    || [p.name, p.shortName, p.roadSection, p.contractName]
      .some(s => (s || '').toLowerCase().includes(k)));

  // 汇总
  const stat = {
    total: projects.length,
    pavement: projects.filter(p => p.workType === 'pavement').length,
    subgrade: projects.filter(p => p.workType === 'subgrade').length,
    amount: projects.reduce((s, p) => s + (p.amount || 0), 0),
  };

  const openNew = () => {
    setEdit({
      workType: 'pavement',
      baseDate: baseDateOf(),          // 基准日固定 9.10
      startDate: baseDateOf(),
      amount: 0, baseDoneValue: 0,
      pavementTotalQty: 0, pavementRemainQty: 0,
      diseaseTotalDays: 0, diseaseRemainDays: 0,
      overlayTotalDays: 0, overlayRemainDays: 0,
      weeklyPlans: {},
    });
    setEditOpen(true);
  };

  const openEdit = (p: CampaignProject) => { setEdit({ ...p }); setEditOpen(true); };

  const save = () => {
    if (!edit.name?.trim()) { toast('请填写项目名称', 'error'); return; }
    if (!edit.workType) { toast('请选择工程类型', 'error'); return; }
    if (edit.startDate && edit.endDate && edit.endDate < edit.startDate) {
      toast('工期结束时间不能早于工期起始时间', 'error'); return;
    }
    const item: CampaignProject = {
      id: edit.id || genId('cp'),
      name: edit.name!.trim(),
      shortName: (edit.shortName || '').trim(),
      roadSection: (edit.roadSection || '').trim(),
      workType: edit.workType,
      // 区域/项目部不在表单维护，保留档案原值（供倒排/填报/晾晒/看板使用）
      region: (edit.region || '').trim(),
      dept: (edit.dept || '').trim(),
      groupSide: (edit.groupSide || '').trim(),
      amount: Number(edit.amount) || 0,
      contractName: (edit.contractName || '').trim(),
      startDate: edit.startDate || '',
      endDate: edit.endDate || '',
      reporter: (edit.reporter || '').trim(),        // 不在表单维护，保留档案原值（每日填报自动带出用）
      reporterPhone: (edit.reporterPhone || '').trim(),
      baseDate: edit.baseDate || baseDateOf(),
      baseDoneValue: Number(edit.baseDoneValue) || 0,
      pavementTotalQty: Number(edit.pavementTotalQty) || 0,
      pavementRemainQty: Number(edit.pavementRemainQty) || 0,
      diseaseTotalDays: Number(edit.diseaseTotalDays) || 0,
      diseaseRemainDays: Number(edit.diseaseRemainDays) || 0,
      overlayTotalDays: Number(edit.overlayTotalDays) || 0,
      overlayRemainDays: Number(edit.overlayRemainDays) || 0,
      weeklyPlans: edit.weeklyPlans || {},
      createdAt: edit.createdAt || nowStr(),
      updatedAt: nowStr(),
    };
    upsertProject(item);
    refresh();
    setEditOpen(false);
    toast('项目信息已保存，已在列表中展示', 'success');
  };

  const remove = (p: CampaignProject) => {
    deleteProject(p.id);
    refresh();
    toast(`已删除项目「${p.shortName || p.name}」`, 'success');
  };

  return (
    <div>
      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '项目部项目总数', value: `${stat.total} 个`, cls: 'text-slate-800' },
          { label: '路面专项', value: `${stat.pavement} 个`, cls: 'text-orange-600' },
          { label: '路基桥隧', value: `${stat.subgrade} 个`, cls: 'text-sky-600' },
          { label: '累计项目金额', value: `${fmtNum(stat.amount)} 万元`, cls: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 搜索 + 新增 */}
      <SearchBar onAdd={openNew} addLabel="+ 新增项目">
        <div className="w-64">
          <Input value={kw} onChange={setKw} placeholder="搜索项目名称 / 简称 / 路段 / 合同" />
        </div>
        <span className="text-xs text-slate-400">基准日固定为当年 9 月 10 日，系统自动填充</span>
      </SearchBar>

      {/* 项目列表 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>项目名称</th>
                <th className={M.th}>项目简称</th>
                <th className={M.th}>路段名称</th>
                <th className={M.th}>工程类型</th>
                <th className={`${M.th} text-right`}>项目金额(万元)</th>
                <th className={M.th}>合同名称</th>
                <th className={M.th}>工期</th>
                <th className={`${M.th} text-right`}>基准日已完成产值(万元)</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td className={`${M.td} text-center text-slate-400 py-10`} colSpan={9}>
                    暂无项目，点击右上角「+ 新增项目」维护项目部项目信息
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-orange-50/30 transition">
                  <td className={`${M.td} font-medium`}>{p.name}</td>
                  <td className={M.td}>{p.shortName || '—'}</td>
                  <td className={M.td}>{p.roadSection || '—'}</td>
                  <td className={M.td}>
                    <TypePill text={WORK_TYPE_LABELS[p.workType]} tone={p.workType === 'pavement' ? 'orange' : 'sky'} />
                  </td>
                  <td className={`${M.td} text-right font-mono`}>{fmtNum(p.amount)}</td>
                  <td className={M.td}>{p.contractName || '—'}</td>
                  <td className={`${M.td} whitespace-nowrap`}>{p.startDate || '—'} ~ {p.endDate || '—'}</td>
                  <td className={`${M.td} text-right font-mono`}>{fmtNum(p.baseDoneValue)}</td>
                  <td className={`${M.td} text-center whitespace-nowrap`}>
                    <button className={M.button.tinyOrange} onClick={() => openEdit(p)}>编辑</button>
                    <button className={`${M.button.tiny} ml-1.5 text-rose-600 border-rose-200 hover:bg-rose-50`} onClick={() => remove(p)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增 / 编辑弹窗：基础信息 + 施工信息 两区段 */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={edit.id ? `编辑项目 ${edit.shortName || edit.name || ''}` : '新增项目部项目'}
        width="max-w-3xl"
        footer={
          <>
            <button className={M.button.ghost} onClick={() => setEditOpen(false)}>取消</button>
            <button className={M.button.primary} onClick={save}>保存</button>
          </>
        }
      >
        {/* ① 项目基础信息 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full" />
          <h4 className="text-sm font-bold text-slate-800">项目基础信息</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="md:col-span-2">
            <label className={M.label}>项目名称 *</label>
            <Input value={edit.name || ''} onChange={v => setEdit(e => ({ ...e, name: v }))} placeholder="如：杭金衢高速金华段2026年路面专项养护工程" />
          </div>
          <div>
            <label className={M.label}>项目简称</label>
            <Input value={edit.shortName || ''} onChange={v => setEdit(e => ({ ...e, shortName: v }))} placeholder="如：杭金衢路面专项" />
          </div>
          <div>
            <label className={M.label}>路段名称</label>
            <Input value={edit.roadSection || ''} onChange={v => setEdit(e => ({ ...e, roadSection: v }))} placeholder="如：杭金衢高速 K300+000～K380+000" />
          </div>
          <div>
            <label className={M.label}>工程类型 *</label>
            <Select value={edit.workType || ''} onChange={v => setEdit(e => ({ ...e, workType: v as WorkType }))} options={WORK_TYPE_OPTIONS} />
          </div>
          <div>
            <label className={M.label}>集团内外</label>
            <Input value={edit.groupSide || ''} onChange={v => setEdit(e => ({ ...e, groupSide: v }))} placeholder="如：浙高运" />
          </div>
          <div>
            <label className={M.label}>项目金额（万元）</label>
            <Input type="number" value={edit.amount ?? 0} onChange={v => setEdit(e => ({ ...e, amount: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>合同名称</label>
            <Input value={edit.contractName || ''} onChange={v => setEdit(e => ({ ...e, contractName: v }))} placeholder="如：××高速2026年路面专项养护工程施工合同" />
          </div>
          <div>
            <label className={M.label}>工期起始时间</label>
            <Input type="date" value={edit.startDate || ''} onChange={v => setEdit(e => ({ ...e, startDate: v }))} />
          </div>
          <div>
            <label className={M.label}>工期结束时间</label>
            <Input type="date" value={edit.endDate || ''} onChange={v => setEdit(e => ({ ...e, endDate: v }))} />
          </div>
        </div>

        {/* ② 项目施工信息 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full" />
          <h4 className="text-sm font-bold text-slate-800">项目施工信息</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={M.label}>基准日（固定 9.10）</label>
            <Input value={edit.baseDate || baseDateOf()} readOnly />
          </div>
          <div>
            <label className={M.label}>基准日已完成产值（万元）</label>
            <Input type="number" value={edit.baseDoneValue ?? 0} onChange={v => setEdit(e => ({ ...e, baseDoneValue: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>路面专项总工程量</label>
            <Input type="number" value={edit.pavementTotalQty ?? 0} onChange={v => setEdit(e => ({ ...e, pavementTotalQty: Number(v) }))} min={0} step="0.1" />
          </div>
          <div>
            <label className={M.label}>路面专项剩余工程量</label>
            <Input type="number" value={edit.pavementRemainQty ?? 0} onChange={v => setEdit(e => ({ ...e, pavementRemainQty: Number(v) }))} min={0} step="0.1" />
          </div>
          <div>
            <label className={M.label}>总计划工作日 - 病害</label>
            <Input type="number" value={edit.diseaseTotalDays ?? 0} onChange={v => setEdit(e => ({ ...e, diseaseTotalDays: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>剩余工作日 - 病害</label>
            <Input type="number" value={edit.diseaseRemainDays ?? 0} onChange={v => setEdit(e => ({ ...e, diseaseRemainDays: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>总计划工作日 - 罩面</label>
            <Input type="number" value={edit.overlayTotalDays ?? 0} onChange={v => setEdit(e => ({ ...e, overlayTotalDays: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>剩余工作日 - 罩面</label>
            <Input type="number" value={edit.overlayRemainDays ?? 0} onChange={v => setEdit(e => ({ ...e, overlayRemainDays: Number(v) }))} min={0} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
