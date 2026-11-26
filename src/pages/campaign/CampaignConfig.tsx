/**
 * 百日攻坚 - 基础信息配置（项目部项目信息维护）
 *  - 列表展示已维护的项目部项目，支持新增 / 编辑 / 删除、关键字搜索
 *  - 顶部汇总卡片：项目总数（含已完工/进行中/未开工三个状态数）、班组数（点击「修改」维护班组）、累计项目金额
 *  - 班组维护弹窗：班组名称 + 类型（自营/外协）的新增 / 编辑 / 删除
 *  - 新增（编辑）弹窗表单分两个区段：
 *      ① 项目基础信息：项目名称、项目简称、路段名称、工程类型、项目状态（已完工/进行中/未开工）、
 *         项目金额、合同名称、工期起始/结束时间
 *      ② 项目施工信息：基准日（固定 9.10，只读）、基准日已完成产值、
 *         总工程量（病害 m² / 罩面 km / 超薄 km / 热再生 m² 四类）、
 *         基准日已完成工程量（同四类）、路面专项剩余工程量、总计划/截止基准日累计工作日（病害、罩面；
 *         剩余工作日为派生值：总计划工作日 − 截止基准日累计工作日）
 *  - 区域 / 项目部 / 填报人信息不在表单中维护（按填报账号所属组织自动带出，
 *    演示环境由预置数据提供），档案中的对应字段继续供倒排 / 填报自动带出 / 晾晒 / 看板使用
 */

import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtNum } from './_shared';
import type { CampaignProject, CampaignCrew, WorkType, ProjectStatus } from './types';
import { WORK_TYPE_LABELS, PROJECT_STATUS_LABELS } from './types';
import {
  getProjects, upsertProject, deleteProject, baseDateOf, genId, nowStr,
  getCrews, upsertCrew, deleteCrew as removeCrew,
} from './campaignStore';

const WORK_TYPE_OPTIONS = (Object.keys(WORK_TYPE_LABELS) as WorkType[])
  .map(v => ({ value: v, label: WORK_TYPE_LABELS[v] }));

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[])
  .map(v => ({ value: v, label: PROJECT_STATUS_LABELS[v] }));

/**
 * 工作日取数关系：总计划工作日 − 截止基准日累计工作日 = 截止基准日剩余工作日
 * 配置页录入「累计工作日」，剩余工作日由保存时自动派生写入（remain* 字段供下游模块取数，口径不变）
 */
const DAY_PAIRS = [
  { total: 'diseaseTotalDays', remain: 'diseaseRemainDays', cum: 'baseCumDaysDisease' },
  { total: 'overlayTotalDays', remain: 'overlayRemainDays', cum: 'baseCumDaysOverlay' },
  { total: 'totalUltraThinDays', remain: 'remainUltraThinDays', cum: 'baseCumDaysUltraThin' },
  { total: 'totalHotRecycleDays', remain: 'remainHotRecycleDays', cum: 'baseCumDaysHotRecycle' },
] as const;

// 由总计划工作日与累计工作日派生剩余工作日（负值归 0）
const deriveRemain = (total: unknown, cum: unknown): number =>
  Math.max(0, (Number(total) || 0) - (Number(cum) || 0));

export default function CampaignConfig() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const toast = useToast();

  const projects = useMemo(() => getProjects(), [version]);
  const crews = useMemo(() => getCrews(), [version]);

  // 项目部选项（项目档案 + 班组归属去重，供班组「所属项目部」下拉）
  const deptOpts = useMemo(
    () => [...new Set([
      ...projects.map(p => p.dept),
      ...crews.map(c => c.dept || '未分配'),
    ].filter(Boolean))].sort((a, b) => (a as string).localeCompare(b as string, 'zh')),
    [projects, crews]);

  const [kw, setKw] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<CampaignProject>>({});

  // 班组维护弹窗（crewDraft 有值 = 正在新增/编辑某条班组）
  const [crewOpen, setCrewOpen] = useState(false);
  const [crewDraft, setCrewDraft] = useState<Partial<CampaignCrew> | null>(null);

  const k = kw.trim().toLowerCase();
  const filtered = projects.filter(p => !k
    || [p.name, p.shortName, p.roadSection, p.contractName]
      .some(s => (s || '').toLowerCase().includes(k)));

  // 汇总（项目状态：未维护状态的存量档案按「进行中」统计）
  const stat = {
    total: projects.length,
    finished: projects.filter(p => (p.projectStatus || 'ongoing') === 'finished').length,
    ongoing: projects.filter(p => (p.projectStatus || 'ongoing') === 'ongoing').length,
    notstarted: projects.filter(p => (p.projectStatus || 'ongoing') === 'notstarted').length,
    amount: projects.reduce((s, p) => s + (p.amount || 0), 0),
    crews: crews.length,
  };

  const openNew = () => {
    setEdit({
      workType: 'pavement',
      projectStatus: 'ongoing',       // 新增项目默认「进行中」
      baseDate: baseDateOf(),          // 基准日固定 9.10
      startDate: baseDateOf(),
      amount: 0, baseDoneValue: 0,
      pavementTotalQty: 0,
      totalDiseaseQty: 0, totalOverlayQty: 0, totalUltraThinQty: 0, totalHotRecycleQty: 0,
      baseDoneDiseaseQty: 0, baseDoneOverlayQty: 0, baseDoneUltraThinQty: 0, baseDoneHotRecycleQty: 0,
      totalUltraThinDays: 0, totalHotRecycleDays: 0, remainUltraThinDays: 0, remainHotRecycleDays: 0,
      baseCumDaysDisease: 0, baseCumDaysOverlay: 0, baseCumDaysUltraThin: 0, baseCumDaysHotRecycle: 0,
      baseCrewDaysDisease: 0, baseCrewDaysOverlay: 0, baseCrewDaysUltraThin: 0, baseCrewDaysHotRecycle: 0,
      baseMaterialDisease: 0, baseMaterialOverlay: 0, baseMaterialUltraThin: 0, baseMaterialHotRecycle: 0,
      diseaseTotalDays: 0, diseaseRemainDays: 0,
      overlayTotalDays: 0, overlayRemainDays: 0,
      weeklyPlans: {},
    });
    setEditOpen(true);
  };

  // 编辑：累计工作日 = 总计划工作日 − 剩余工作日（由存量档案反推，保持录入口径一致）
  const openEdit = (p: CampaignProject) => {
    const cumOf = (total: number | undefined, remain: number | undefined) =>
      Math.max(0, (total || 0) - (remain || 0));
    setEdit({
      ...p,
      baseCumDaysDisease: cumOf(p.diseaseTotalDays, p.diseaseRemainDays),
      baseCumDaysOverlay: cumOf(p.overlayTotalDays, p.overlayRemainDays),
      baseCumDaysUltraThin: cumOf(p.totalUltraThinDays, p.remainUltraThinDays),
      baseCumDaysHotRecycle: cumOf(p.totalHotRecycleDays, p.remainHotRecycleDays),
    });
    setEditOpen(true);
  };

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
      projectStatus: edit.projectStatus || 'ongoing',
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
      totalDiseaseQty: Number(edit.totalDiseaseQty) || 0,
      totalOverlayQty: Number(edit.totalOverlayQty) || 0,
      totalUltraThinQty: Number(edit.totalUltraThinQty) || 0,
      totalHotRecycleQty: Number(edit.totalHotRecycleQty) || 0,
      baseDoneDiseaseQty: Number(edit.baseDoneDiseaseQty) || 0,
      baseDoneOverlayQty: Number(edit.baseDoneOverlayQty) || 0,
      baseDoneUltraThinQty: Number(edit.baseDoneUltraThinQty) || 0,
      baseDoneHotRecycleQty: Number(edit.baseDoneHotRecycleQty) || 0,
      totalUltraThinDays: Number(edit.totalUltraThinDays) || 0,
      totalHotRecycleDays: Number(edit.totalHotRecycleDays) || 0,
      remainUltraThinDays: deriveRemain(edit.totalUltraThinDays, edit.baseCumDaysUltraThin),
      remainHotRecycleDays: deriveRemain(edit.totalHotRecycleDays, edit.baseCumDaysHotRecycle),
      baseCumDaysDisease: Number(edit.baseCumDaysDisease) || 0,
      baseCumDaysOverlay: Number(edit.baseCumDaysOverlay) || 0,
      baseCumDaysUltraThin: Number(edit.baseCumDaysUltraThin) || 0,
      baseCumDaysHotRecycle: Number(edit.baseCumDaysHotRecycle) || 0,
      baseCrewDaysDisease: Number(edit.baseCrewDaysDisease) || 0,
      baseCrewDaysOverlay: Number(edit.baseCrewDaysOverlay) || 0,
      baseCrewDaysUltraThin: Number(edit.baseCrewDaysUltraThin) || 0,
      baseCrewDaysHotRecycle: Number(edit.baseCrewDaysHotRecycle) || 0,
      baseMaterialDisease: Number(edit.baseMaterialDisease) || 0,
      baseMaterialOverlay: Number(edit.baseMaterialOverlay) || 0,
      baseMaterialUltraThin: Number(edit.baseMaterialUltraThin) || 0,
      baseMaterialHotRecycle: Number(edit.baseMaterialHotRecycle) || 0,
      diseaseTotalDays: Number(edit.diseaseTotalDays) || 0,
      diseaseRemainDays: deriveRemain(edit.diseaseTotalDays, edit.baseCumDaysDisease),
      overlayTotalDays: Number(edit.overlayTotalDays) || 0,
      overlayRemainDays: deriveRemain(edit.overlayTotalDays, edit.baseCumDaysOverlay),
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

  // 班组维护：保存（新增/编辑）
  const saveCrew = () => {
    if (!crewDraft) return;
    const name = (crewDraft.name || '').trim();
    if (!name) { toast('请填写班组名称', 'error'); return; }
    if (crews.some(c => c.id !== crewDraft.id && c.name === name)) {
      toast('已存在同名班组', 'error'); return;
    }
    upsertCrew({
      id: crewDraft.id || genId('crew'),
      name,
      type: crewDraft.type || '自营',
      dept: crewDraft.dept || '未分配',
      createdAt: crewDraft.createdAt || nowStr(),
      updatedAt: nowStr(),
    });
    refresh();
    setCrewDraft(null);
    toast('班组信息已保存', 'success');
  };

  // 班组维护：删除
  const removeCrewItem = (c: CampaignCrew) => {
    if (!window.confirm(`确定删除班组「${c.name}」吗？`)) return;
    removeCrew(c.id);
    refresh();
    toast(`已删除班组「${c.name}」`, 'success');
  };

  return (
    <div>
      {/* 汇总卡片：项目总数（含状态分布）/ 班组数 / 累计项目金额 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">项目部项目总数</div>
          <div className="text-lg font-bold text-slate-800">{stat.total} 个</div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-emerald-600">已完工 <b className="font-bold">{stat.finished}</b></span>
            <span className="text-orange-600">进行中 <b className="font-bold">{stat.ongoing}</b></span>
            <span className="text-slate-500">未开工 <b className="font-bold">{stat.notstarted}</b></span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-slate-500 flex items-center gap-1"><Users size={12} />班组数</div>
            <button
              className="px-2 py-0.5 text-xs text-orange-600 border border-orange-200 rounded hover:bg-orange-50 transition-colors"
              onClick={() => { setCrewOpen(true); setCrewDraft(null); }}
            >
              修改
            </button>
          </div>
          <div className="text-lg font-bold text-orange-600">{stat.crews} 个</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">累计项目金额</div>
          <div className="text-lg font-bold text-emerald-600">{fmtNum(stat.amount)} 万元</div>
        </div>
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
            <label className={M.label}>项目状态</label>
            <Select value={edit.projectStatus || 'ongoing'} onChange={v => setEdit(e => ({ ...e, projectStatus: v as ProjectStatus }))} options={STATUS_OPTIONS} />
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
          {/* 基准日固定 9.10，取消填写框，不可修改 */}
          <div>
            <label className={M.label}>基准日</label>
            <div className="h-10 flex items-center px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-500">
              9.10（固定，不可修改）
            </div>
          </div>
          <div>
            <label className={M.label}>基准日已完成产值（万元）</label>
            <Input type="number" value={edit.baseDoneValue ?? 0} onChange={v => setEdit(e => ({ ...e, baseDoneValue: Number(v) }))} min={0} />
          </div>
          <div>
            <label className={M.label}>路面专项总工程量</label>
            <Input type="number" value={edit.pavementTotalQty ?? 0} onChange={v => setEdit(e => ({ ...e, pavementTotalQty: Number(v) }))} min={0} step="0.1" />
          </div>

          {/* 分类型施工数据表（病害 / 罩面 / 超薄 / 热再生）：总工程量、基准日已完成工程量、
              总计划工作日、截止基准日累计工作日、截止基准日累计班组日（天）、截止基准日累计用料
              （剩余工作日为派生值：总计划工作日 − 截止基准日累计工作日，保存时自动写入） */}
          <div className="md:col-span-2 border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 bg-slate-100 text-[11px] font-bold text-slate-700 border-b border-slate-200">
              <div className="px-2 py-1.5">分类</div>
              <div className="px-2 py-1.5 text-center">病害（m²）</div>
              <div className="px-2 py-1.5 text-center">罩面（km）</div>
              <div className="px-2 py-1.5 text-center">超薄（km）</div>
              <div className="px-2 py-1.5 text-center">热再生（m²）</div>
            </div>
            {([
              { label: '总工程量', unit: 'col', keys: ['totalDiseaseQty', 'totalOverlayQty', 'totalUltraThinQty', 'totalHotRecycleQty'] },
              { label: '基准日已完成工程量', unit: 'col', keys: ['baseDoneDiseaseQty', 'baseDoneOverlayQty', 'baseDoneUltraThinQty', 'baseDoneHotRecycleQty'] },
              { label: '总计划工作日', unit: 'day', keys: ['diseaseTotalDays', 'overlayTotalDays', 'totalUltraThinDays', 'totalHotRecycleDays'] },
              { label: '截止基准日累计工作日', unit: 'day', keys: ['baseCumDaysDisease', 'baseCumDaysOverlay', 'baseCumDaysUltraThin', 'baseCumDaysHotRecycle'] },
              { label: '截止基准日累计班组日', unit: 'day', keys: ['baseCrewDaysDisease', 'baseCrewDaysOverlay', 'baseCrewDaysUltraThin', 'baseCrewDaysHotRecycle'] },
              { label: '截止基准日累计用料', unit: 'col', keys: ['baseMaterialDisease', 'baseMaterialOverlay', 'baseMaterialUltraThin', 'baseMaterialHotRecycle'] },
            ] as const).map(row => (
              <div key={row.label} className="grid grid-cols-5 items-center gap-1 border-b border-slate-100 last:border-b-0">
                <div className="px-2 text-xs font-medium text-slate-600">{row.label}</div>
                {row.keys.map((k, i) => (
                  <div key={k} className="p-1 flex items-center gap-1">
                    <Input type="number" min={0} step="0.1"
                      value={Number((edit as Record<string, number | undefined>)[k] ?? 0)}
                      onChange={v => setEdit(e => {
                        const next = { ...e, [k]: Number(v) } as Partial<CampaignProject>;
                        // 总计划/累计工作日变化时，实时派生剩余工作日 = 总计划 − 累计
                        const pair = DAY_PAIRS.find(pp => pp.total === k || pp.cum === k);
                        if (pair) {
                          (next as Record<string, number | undefined>)[pair.remain] =
                            deriveRemain(next[pair.total], next[pair.cum]);
                        }
                        return next;
                      })} />
                    <span className="text-[11px] text-slate-400 shrink-0">{row.unit === 'day' ? '天' : ['m²', 'km', 'km', 'm²'][i]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 班组维护弹窗：名称 + 类型（自营/外协） */}
      <Modal
        open={crewOpen}
        onClose={() => setCrewOpen(false)}
        title="班组信息维护"
        width="max-w-xl"
        footer={
          crewDraft ? (
            <>
              <button className={M.button.ghost} onClick={() => setCrewDraft(null)}>取消</button>
              <button className={M.button.primary} onClick={saveCrew}>保存</button>
            </>
          ) : (
            <>
              <button className={M.button.ghost} onClick={() => setCrewOpen(false)}>关闭</button>
              <button className={M.button.primary} onClick={() => setCrewDraft({ type: '自营' })}>+ 新增班组</button>
            </>
          )
        }
      >
        {crewDraft ? (
          /* 新增/编辑表单 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={M.label}>班组名称 *</label>
              <Input
                value={crewDraft.name || ''}
                onChange={v => setCrewDraft(d => (d ? { ...d, name: v } : d))}
                placeholder="如：病害处治一班"
              />
            </div>
            <div>
              <label className={M.label}>班组类型</label>
              <Select
                value={crewDraft.type || '自营'}
                onChange={v => setCrewDraft(d => (d ? { ...d, type: v as CampaignCrew['type'] } : d))}
                options={[{ value: '自营', label: '自营' }, { value: '外协', label: '外协' }]}
              />
            </div>
            <div>
              <label className={M.label}>所属项目部</label>
              <Select
                value={crewDraft.dept || ''}
                onChange={v => setCrewDraft(d => (d ? { ...d, dept: v } : d))}
                options={deptOpts.map(d => ({ value: d, label: d }))}
              />
            </div>
          </div>
        ) : (
          /* 班组列表 */
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium border-b border-slate-200">班组名称</th>
                  <th className="px-3 py-2 text-center font-medium border-b border-slate-200 w-32">所属项目部</th>
                  <th className="px-3 py-2 text-center font-medium border-b border-slate-200 w-24">类型</th>
                  <th className="px-3 py-2 text-center font-medium border-b border-slate-200 w-28">操作</th>
                </tr>
              </thead>
              <tbody>
                {crews.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">暂无班组，点击「+ 新增班组」创建</td></tr>
                )}
                {crews.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-b-0 hover:bg-orange-50/40 transition-colors">
                    <td className="px-3 py-2 text-slate-800">{c.name}</td>
                    <td className="px-3 py-2 text-center text-slate-600 text-xs">{c.dept || '未分配'}</td>
                    <td className="px-3 py-2 text-center">
                      <TypePill text={c.type} tone={c.type === '自营' ? 'orange' : 'sky'} />
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <button className={M.button.tinyOrange} onClick={() => setCrewDraft({ ...c })}>编辑</button>
                      <button
                        className={`${M.button.tiny} ml-1.5 text-rose-600 border-rose-200 hover:bg-rose-50`}
                        onClick={() => removeCrewItem(c)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
