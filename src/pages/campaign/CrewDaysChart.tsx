/**
 * 百日攻坚 - 数据看板 - 作战总览：病害/罩面工日情况表
 *
 * 表格形式展示各统计单元的 病害、罩面两类班组工作日：
 *  - 总计划班组工作日 = Σ项目（病害/罩面 总计划工作日）
 *  - 累计完成班组工作日 = Σ项目（截止基准日累计工作日 + ∑每日填报工日）
 *  - 剩余班组工作日   = 总计划 − 累计完成（负值红色，表示超计划投入）
 *
 * 分组维度：按区域（默认）/ 按项目部 / 按项目（tab 切换），支持关键字搜索过滤。
 * 点击行名下钻：区域/项目部 → 该单元项目列表弹窗 → 点击项目 → 项目累计工日明细弹窗
 *   （固定信息：项目名称、计划总工日、截止基准日累计工日 + 每日填报工日记录，按时间展示）。
 */

import React, { useMemo, useState } from 'react';
import { Table2, Search, ChevronRight, CalendarDays } from 'lucide-react';
import { Modal } from './_shared';
import { getProjects, getDailyReports } from './campaignStore';
import type { CampaignProject } from './types';

type GroupBy = 'region' | 'dept' | 'project';

interface Row {
  name: string;
  dTotal: number; dDone: number; dRemain: number;
  oTotal: number; oDone: number; oRemain: number;
}

/** 项目累计工日明细弹窗（固定信息 + 每日填报记录） */
function ProjectDaysModal({ project, onClose }: { project: CampaignProject; onClose: () => void }) {
  // 该项目在每日填报中存在工日的记录（按日期汇总）
  const entries = useMemo(() => {
    const m = new Map<string, { d: number; o: number }>();
    getDailyReports().forEach(r => r.lines.forEach(l => {
      if (l.projectId !== project.id) return;
      const d = l.disease.days || 0;
      const o = l.overlay.days || 0;
      if (d <= 0 && o <= 0) return;
      const cell = m.get(r.date) ?? { d: 0, o: 0 };
      cell.d += d; cell.o += o;
      m.set(r.date, cell);
    }));
    return [...m.entries()]
      .map(([date, v]) => ({ date, ...v, sum: v.d + v.o }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [project.id]);

  const dTotal = project.diseaseTotalDays || 0;
  const oTotal = project.overlayTotalDays || 0;
  const dBase = project.baseCumDaysDisease || 0;
  const oBase = project.baseCumDaysOverlay || 0;
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  const fixed = [
    { label: '计划总工日', d: dTotal, o: oTotal },
    { label: '截止基准日累计工日', d: dBase, o: oBase },
  ];

  return (
    <Modal title="项目累计工日明细" open onClose={onClose} width="max-w-3xl"
      footer={
        <button onClick={onClose}
          className="px-4 h-9 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">关闭</button>
      }>
      {/* 固定信息 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-200">固定信息</div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-800 border-b border-slate-100">
          {project.name}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white text-xs text-slate-500">
              <th className="px-4 py-2 text-left font-medium border-b border-slate-100 w-40"></th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">病害（工日）</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">罩面（工日）</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">合计（工日）</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(f => (
              <tr key={f.label} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-600">{f.label}</td>
                <td className="px-3 py-2 text-right text-slate-700">{fmt(f.d)}</td>
                <td className="px-3 py-2 text-right text-slate-700">{fmt(f.o)}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">{fmt(f.d + f.o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 每日填报工日记录 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
          <CalendarDays size={13} className="text-orange-500" />
          每日填报工日记录（按时间排序）
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium border-b border-slate-100">时间</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">病害工日</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">罩面工日</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-100">当日合计</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">该项目暂无每日填报工日记录</td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr key={e.date} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{e.date}</td>
                <td className="px-3 py-2 text-right text-slate-700">{e.d > 0 ? fmt(e.d) : '—'}</td>
                <td className="px-3 py-2 text-right text-slate-700">{e.o > 0 ? fmt(e.o) : '—'}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">{fmt(e.sum)}</td>
              </tr>
            ))}
            {entries.length > 0 && (
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className="px-4 py-2 text-slate-700">填报合计（{entries.length} 天）</td>
                <td className="px-3 py-2 text-right text-slate-700">{fmt(entries.reduce((s, e) => s + e.d, 0))}</td>
                <td className="px-3 py-2 text-right text-slate-700">{fmt(entries.reduce((s, e) => s + e.o, 0))}</td>
                <td className="px-3 py-2 text-right text-slate-800">{fmt(entries.reduce((s, e) => s + e.sum, 0))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function CrewDaysChart() {
  const [groupBy, setGroupBy] = useState<GroupBy>('region');
  const [kw, setKw] = useState('');
  // 下钻状态：unitOpen = 区域/项目部弹窗（单元名）；projOpen = 项目明细弹窗（项目 id）
  const [unitOpen, setUnitOpen] = useState<string | null>(null);
  const [projOpen, setProjOpen] = useState<string | null>(null);

  const projects = useMemo(() => getProjects(), []);

  // 每日填报工日合计（按项目 × 工种）
  const filled = useMemo(() => {
    const m = new Map<string, { d: number; o: number }>();
    getDailyReports().forEach(r => r.lines.forEach(l => {
      const cell = m.get(l.projectId) ?? { d: 0, o: 0 };
      cell.d += l.disease.days || 0;
      cell.o += l.overlay.days || 0;
      m.set(l.projectId, cell);
    }));
    return m;
  }, []);

  /** 单个项目的行数据 */
  const projRow = (p: CampaignProject): Row => {
    const f = filled.get(p.id) ?? { d: 0, o: 0 };
    const dTotal = p.diseaseTotalDays || 0;
    const oTotal = p.overlayTotalDays || 0;
    const dDone = (p.baseCumDaysDisease || 0) + f.d;
    const oDone = (p.baseCumDaysOverlay || 0) + f.o;
    return { name: p.name, dTotal, dDone, dRemain: dTotal - dDone, oTotal, oDone, oRemain: oTotal - oDone };
  };

  // 分组聚合（保留单元 → 项目列表，供下钻取数）
  const groups = useMemo(() => {
    const m = new Map<string, CampaignProject[]>();
    projects.forEach(p => {
      const key = groupBy === 'region'
        ? (p.region || '未分配')
        : groupBy === 'dept'
          ? (p.dept || '未分配')
          : p.name;
      m.set(key, [...(m.get(key) || []), p]);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
  }, [projects, groupBy]);

  const rows: Row[] = useMemo(() => groups.map(([name, list]) => ({
    name,
    dTotal: list.reduce((s, p) => s + projRow(p).dTotal, 0),
    dDone: list.reduce((s, p) => s + projRow(p).dDone, 0),
    dRemain: list.reduce((s, p) => s + projRow(p).dRemain, 0),
    oTotal: list.reduce((s, p) => s + projRow(p).oTotal, 0),
    oDone: list.reduce((s, p) => s + projRow(p).oDone, 0),
    oRemain: list.reduce((s, p) => s + projRow(p).oRemain, 0),
  })), [groups]);

  // 搜索过滤
  const k = kw.trim().toLowerCase();
  const filtered = k
    ? rows.filter(r => r.name.toLowerCase().includes(k))
    : rows;

  // 合计行
  const sum = filtered.reduce((s, r) => ({
    dTotal: s.dTotal + r.dTotal, dDone: s.dDone + r.dDone, dRemain: s.dRemain + r.dRemain,
    oTotal: s.oTotal + r.oTotal, oDone: s.oDone + r.oDone, oRemain: s.oRemain + r.oRemain,
  }), { dTotal: 0, dDone: 0, dRemain: 0, oTotal: 0, oDone: 0, oRemain: 0 });

  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
  const th = 'px-3 py-2 text-right font-medium text-slate-600 whitespace-nowrap';
  const td = 'px-3 py-2 text-right text-slate-700 whitespace-nowrap';
  // 剩余列：负值红色（超计划投入），正值正常
  const remainCls = (v: number) => `${td} font-medium ${v < 0 ? 'text-rose-600' : 'text-slate-700'}`;
  const unitName = groupBy === 'region' ? '区域' : groupBy === 'dept' ? '项目部' : '项目';

  // 行点击：按项目 → 直接看项目明细；按区域/项目部 → 先看单元内项目列表
  const onRowClick = (name: string) => {
    if (groupBy === 'project') {
      const p = projects.find(x => x.name === name);
      if (p) setProjOpen(p.id);
    } else {
      setUnitOpen(name);
    }
  };

  const unitProjects = unitOpen
    ? projects.filter(p =>
        (groupBy === 'region' ? p.region || '未分配' : p.dept || '未分配') === unitOpen)
    : [];
  const projDetail = projOpen ? projects.find(p => p.id === projOpen) : undefined;

  // 表格行渲染（主表与单元弹窗共用）
  const renderRow = (r: Row, i: number, onClick: () => void) => (
    <tr key={r.name} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} hover:bg-orange-50/50 transition-colors`}>
      <td className="px-3 py-2">
        <button onClick={onClick}
          className="text-left text-sm font-medium text-slate-800 hover:text-orange-600 flex items-center gap-1 group">
          <ChevronRight size={13} className="text-slate-300 group-hover:text-orange-500 shrink-0" />
          {r.name}
        </button>
      </td>
      <td className={td}>{fmt(r.dTotal)}</td>
      <td className={td}>{fmt(r.dDone)}</td>
      <td className={remainCls(r.dRemain)}>{fmt(r.dRemain)}</td>
      <td className={td}>{fmt(r.oTotal)}</td>
      <td className={td}>{fmt(r.oDone)}</td>
      <td className={remainCls(r.oRemain)}>{fmt(r.oRemain)}</td>
    </tr>
  );

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-4">
      {/* 标题（左）+ 分组 tab + 搜索（右） */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Table2 size={15} className="text-orange-500" />
            病害/罩面工日情况
          </div>
          <p className="text-xs text-slate-400 mt-1 ml-0.5">总计划 · 累计完成 · 剩余，点击名称可下钻查看项目累计工日明细</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 分组切换 */}
          <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
            {([['region', '按区域'], ['dept', '按项目部'], ['project', '按项目']] as const).map(([g, label]) => (
              <button key={g}
                className={`px-3 h-8 font-medium transition-colors ${groupBy === g ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-orange-50'}`}
                onClick={() => setGroupBy(g)}>
                {label}
              </button>
            ))}
          </div>
          {/* 搜索 */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={kw}
              onChange={e => setKw(e.target.value)}
              placeholder={`搜索${unitName}名称`}
              className="h-8 w-52 pl-7 pr-3 text-xs rounded-lg border border-slate-300 outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs">
            <tr>
              <th rowSpan={2} className="px-3 py-2.5 text-left font-medium text-slate-600 border-b border-slate-200">{unitName}</th>
              <th colSpan={3} className="px-3 py-1.5 text-center font-semibold text-sky-700 border-b border-r border-slate-200 bg-sky-50/50">病害（工日）</th>
              <th colSpan={3} className="px-3 py-1.5 text-center font-semibold text-amber-700 border-b border-slate-200 bg-amber-50/50">罩面（工日）</th>
            </tr>
            <tr>
              <th className={th + ' border-b border-slate-200'}>总计划</th>
              <th className={th + ' border-b border-slate-200'}>累计完成</th>
              <th className={th + ' border-b border-r border-slate-200'}>剩余</th>
              <th className={th + ' border-b border-slate-200'}>总计划</th>
              <th className={th + ' border-b border-slate-200'}>累计完成</th>
              <th className={th + ' border-b border-slate-200'}>剩余</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400 text-sm">
                  {k ? `没有匹配「${kw}」的${unitName}` : '暂无数据'}
                </td>
              </tr>
            )}
            {filtered.map((r, i) => renderRow(r, i, () => onRowClick(r.name)))}
            {filtered.length > 0 && (
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-slate-700">合计（{filtered.length} 个{unitName}）</td>
                <td className={td}>{fmt(sum.dTotal)}</td>
                <td className={td}>{fmt(sum.dDone)}</td>
                <td className={remainCls(sum.dRemain)}>{fmt(sum.dRemain)}</td>
                <td className={td}>{fmt(sum.oTotal)}</td>
                <td className={td}>{fmt(sum.oDone)}</td>
                <td className={remainCls(sum.oRemain)}>{fmt(sum.oRemain)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 取数说明 */}
      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        取数（{groupBy === 'region' ? '按区域汇总' : groupBy === 'dept' ? '按项目部汇总' : '按项目'}）：
        总计划 = Σ项目总计划工作日；累计完成 = Σ（截止基准日累计工作日 + ∑每日填报工日）；剩余 = 总计划 − 累计完成（<span className="text-rose-500">负值红色，表示超计划投入</span>）。
        当前共 {rows.length} 个{unitName}，展示 {filtered.length} 个。
      </p>

      {/* 区域/项目部 → 项目列表弹窗 */}
      <Modal title={`${unitOpen || ''} · 病害/罩面工日情况`} open={!!unitOpen} onClose={() => setUnitOpen(null)}
        width="max-w-4xl"
        footer={
          <button onClick={() => setUnitOpen(null)}
            className="px-4 h-9 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">关闭</button>
        }>
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <th rowSpan={2} className="px-3 py-2.5 text-left font-medium text-slate-600 border-b border-slate-200">项目</th>
                <th colSpan={3} className="px-3 py-1.5 text-center font-semibold text-sky-700 border-b border-r border-slate-200 bg-sky-50/50">病害（工日）</th>
                <th colSpan={3} className="px-3 py-1.5 text-center font-semibold text-amber-700 border-b border-slate-200 bg-amber-50/50">罩面（工日）</th>
              </tr>
              <tr>
                <th className={th + ' border-b border-slate-200'}>总计划</th>
                <th className={th + ' border-b border-slate-200'}>累计完成</th>
                <th className={th + ' border-r border-slate-200'}>剩余</th>
                <th className={th + ' border-b border-slate-200'}>总计划</th>
                <th className={th + ' border-b border-slate-200'}>累计完成</th>
                <th className={th + ' border-b border-slate-200'}>剩余</th>
              </tr>
            </thead>
            <tbody>
              {unitProjects.map((p, i) => renderRow(projRow(p), i, () => setProjOpen(p.id)))}
              {unitProjects.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400 text-sm">该单元下暂无项目</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">点击项目名称可查看该项目的累计工日明细（固定信息 + 每日填报记录）。</p>
      </Modal>

      {/* 项目累计工日明细弹窗 */}
      {projDetail && <ProjectDaysModal project={projDetail} onClose={() => setProjOpen(null)} />}
    </div>
  );
}
