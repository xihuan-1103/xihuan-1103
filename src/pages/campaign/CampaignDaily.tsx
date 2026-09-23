/**
 * 百日攻坚 - 每日产值填报
 *
 * 字段参照项目部每日填报表：
 *   区域 / 项目部 / 项目名称 + 病害(施工天数·投入班组数·m2·吨·工效) + 罩面(…·km·吨·工效)
 *   + 超薄(…·km·吨·工效) + 热再生(m2) + 本日完成产值(万元)
 * 工效 = 吨 /(施工天数 × 投入班组数)，天或班组为 0 显示 "/"（未施工）。
 *
 * 列表：按日期降序的填报记录卡片（块头：日期/区域/项目部/填报人/填报时间 + 编辑本日/删除本日），
 *       块内多项目表格 + 合计行 + 各项目累计产值（截至该日本日产值累计）。
 * 新增弹窗：支持一次填报多个项目（「+ 添加项目」增行），提交后自动生成填报时间。
 */

import React, { useMemo, useState } from 'react';
import { M, Modal, Input, Select, SearchBar, useToast, fmtNum } from './_shared';
import type { CampaignProject, DailyReport, DailyReportLine, WorkInput } from './types';
import { emptyWorkInput } from './types';
import {
  getProjects, getDailyReports, upsertDailyReport, deleteDailyReport,
  cumValueOf, effOf, genId, nowStr, todayStr,
} from './campaignStore';

/* 编辑态项目行 */
interface EditLine extends DailyReportLine { }

const numOr0 = (v: string) => Math.max(0, Number(v) || 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 两级表头（列表卡片与弹窗共用） */
function TwoLevelHead({ editable }: { editable?: boolean }) {
  const group = (name: string, unit: string, cols: number) => (
    <th className="bg-orange-50 text-orange-800 border-b border-slate-200 px-2 py-2 text-[12px] font-bold whitespace-nowrap"
      colSpan={cols}>{name}</th>
  );
  const sub = (label: string) => <th className={`${M.th} text-center whitespace-nowrap`}>{label}</th>;
  return (
    <>
      <tr>
        <th className={`${M.th} text-left`} rowSpan={2}>项目</th>
        {group('病害', 'm2', 5)}
        {group('罩面', 'km', 5)}
        {group('超薄', 'km', 5)}
        <th className={`${M.th} text-center`} rowSpan={2}>热再生<br />m2</th>
        <th className={`${M.th} text-center`} rowSpan={2}>本日完成产值<br />(万元)</th>
        <th className={`${M.th} text-center`} rowSpan={2}>累计产值<br />(万元)</th>
        {editable && <th className={`${M.th} text-center`} rowSpan={2}>操作</th>}
      </tr>
      <tr>
        {sub('施工天数')}{sub('投入班组数')}{sub('m2')}{sub('吨')}{sub('工效(吨/天·班组数)')}
        {sub('施工天数')}{sub('投入班组数')}{sub('km')}{sub('吨')}{sub('工效(吨/天·班组数)')}
        {sub('施工天数')}{sub('投入班组数')}{sub('km')}{sub('吨')}{sub('工效(吨/天·班组数)')}
      </tr>
    </>
  );
}

export default function CampaignDaily() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const toast = useToast();

  const projects = useMemo(() => getProjects(), [version]);
  const reports = useMemo(() =>
    getDailyReports().slice().sort((a, b) =>
      b.date.localeCompare(a.date) || b.filledAt.localeCompare(a.filledAt)), [version]);

  const projName = (pid: string) =>
    projects.find(p => p.id === pid)?.shortName
    || projects.find(p => p.id === pid)?.name || '未知项目';

  /* ===== 筛选 ===== */
  const [kw, setKw] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const k = kw.trim().toLowerCase();
  const filtered = reports.filter(r => {
    if (dateFilter && r.date !== dateFilter) return false;
    if (deptFilter && r.dept !== deptFilter) return false;
    if (!k) return true;
    return [r.region, r.dept, r.reporter, ...r.lines.map(l => projName(l.projectId))]
      .some(s => (s || '').toLowerCase().includes(k));
  });

  const depts = [...new Set(reports.map(r => r.dept).filter(Boolean))];

  /* ===== 汇总 ===== */
  const stat = {
    today: reports.filter(r => r.date === todayStr()).length,
    total: reports.length,
    value: r2(reports.reduce((s, r) => s + r.lines.reduce((x, l) => x + (l.dayValue || 0), 0), 0)),
    depts: new Set(reports.map(r => r.dept)).size,
  };

  /* ===== 新增 / 编辑弹窗（支持多个项目） ===== */
  const emptyLine = (): EditLine => ({
    projectId: '', disease: emptyWorkInput(), overlay: emptyWorkInput(),
    ultraThin: emptyWorkInput(), hotRecycleM2: 0, dayValue: 0,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    id?: string; date: string; region: string; dept: string;
    reporter: string; reporterPhone: string; filledAt: string; lines: EditLine[];
  }>({ date: '', region: '', dept: '', reporter: '', reporterPhone: '', filledAt: '', lines: [] });

  const openNew = () => {
    setForm({
      date: todayStr(),
      region: '', dept: '', reporter: '', reporterPhone: '', filledAt: '',
      lines: [emptyLine(), emptyLine(), emptyLine()],   // 初始 3 行空行
    });
    setOpen(true);
  };

  const openEdit = (r: DailyReport) => {
    setForm({
      id: r.id, date: r.date, region: r.region, dept: r.dept,
      reporter: r.reporter, reporterPhone: r.reporterPhone, filledAt: r.filledAt,
      lines: r.lines.map(l => ({
        projectId: l.projectId,
        disease: { ...l.disease }, overlay: { ...l.overlay }, ultraThin: { ...l.ultraThin },
        hotRecycleM2: l.hotRecycleM2, dayValue: l.dayValue,
      })),
    });
    setOpen(true);
  };

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (i: number) =>
    setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const updateLine = (i: number, patch: Partial<EditLine>) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));

  const updateWork = (i: number, key: 'disease' | 'overlay' | 'ultraThin', patch: Partial<WorkInput>) =>
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, idx) => idx === i ? { ...l, [key]: { ...l[key], ...patch } } : l),
    }));

  /** 选择项目：带出区域/项目部/填报人（填报账号信息随项目） */
  const pickProject = (i: number, pid: string) => {
    const p = projects.find(x => x.id === pid);
    updateLine(i, { projectId: pid });
    if (p) setForm(f => ({
      ...f,
      region: p.region || f.region, dept: p.dept || f.dept,
      reporter: p.reporter || f.reporter, reporterPhone: p.reporterPhone || f.reporterPhone,
    }));
  };

  const submit = () => {
    if (!form.date) { toast('请选择填报日期', 'error'); return; }
    const lines = form.lines
      .filter(l => l.projectId)
      .map(l => ({
        projectId: l.projectId,
        disease: { ...l.disease }, overlay: { ...l.overlay }, ultraThin: { ...l.ultraThin },
        hotRecycleM2: numOr0(String(l.hotRecycleM2)), dayValue: numOr0(String(l.dayValue)),
      }));
    if (lines.length === 0) { toast('请至少选择一个项目进行填报（未选择项目的空行不会提交）', 'error'); return; }
    const dup = lines.length !== new Set(lines.map(l => l.projectId)).size;
    if (dup) { toast('存在重复选择的项目，请调整', 'error'); return; }
    const exists = reports.find(r => r.id !== form.id && r.date === form.date && r.dept === form.dept);
    if (exists) { toast(`${form.date} 项目部「${form.dept}」已有填报记录，请直接编辑原记录`, 'error'); return; }

    const p0 = projects.find(p => p.id === lines[0].projectId)!;
    upsertDailyReport({
      id: form.id || genId('dr'),
      date: form.date,
      region: form.region || p0.region,
      dept: form.dept || p0.dept,
      reporter: form.reporter || p0.reporter,
      reporterPhone: form.reporterPhone || p0.reporterPhone,
      filledAt: form.id ? (form.filledAt || nowStr()) : nowStr(),   // 编辑保留原填报时间
      lines,
    });
    refresh();
    setOpen(false);
    toast(form.id ? '本日填报已更新' : '填报成功，记录已按日期归档展示', 'success');
  };

  const removeReport = (r: DailyReport) => {
    deleteDailyReport(r.id);
    refresh();
    toast(`已删除 ${r.date} 项目部「${r.dept}」的填报记录`, 'success');
  };

  /* ===== 渲染辅助 ===== */
  const numInput = 'w-14 px-1.5 py-1 rounded border border-slate-300 text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none';
  const effCell = (v: number | null) =>
    v === null ? <span className="text-slate-400">/</span>
      : <span className="text-emerald-600 font-medium">{r2(v).toLocaleString()}</span>;

  const sumWork = (r: DailyReport, key: 'disease' | 'overlay' | 'ultraThin', field: 'days' | 'crews' | 'qty' | 'tons') =>
    r2(r.lines.reduce((s, l) => s + (l[key][field] || 0), 0));

  return (
    <div>
      {/* 汇总 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '今日填报单数', value: `${stat.today} 张`, cls: 'text-orange-600' },
          { label: '填报单总数', value: `${stat.total} 张`, cls: 'text-slate-800' },
          { label: '累计完成产值', value: `${fmtNum(stat.value)} 万元`, cls: 'text-emerald-600' },
          { label: '涉及项目部', value: `${stat.depts} 个`, cls: 'text-sky-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 筛选 + 新增 */}
      <SearchBar onAdd={openNew} addLabel="+ 每日填报">
        <div className="w-64">
          <Input value={kw} onChange={setKw} placeholder="搜索项目 / 项目部 / 填报人" />
        </div>
        <div className="w-44">
          <Input type="date" value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="w-40">
          <Select value={deptFilter} onChange={setDeptFilter}
            options={depts.map(d => ({ value: d, label: `项目部：${d}` }))} placeholder="全部项目部" />
        </div>
      </SearchBar>

      {/* 填报记录（按日期降序，含各项目累计产值） */}
      {projects.length === 0 && (
        <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-xs text-orange-800">
          尚未维护项目信息，请先在「基础信息配置」中新增项目部项目，再进行每日填报。
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
          暂无填报记录，点击右上角「+ 每日填报」开始填报
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <span>📋</span> 填报记录（按日期分组，含各项目累计产值）
          </div>
          {filtered.map(r => {
            const totalLine = {
              disease: {
                days: sumWork(r, 'disease', 'days'), crews: sumWork(r, 'disease', 'crews'),
                qty: sumWork(r, 'disease', 'qty'), tons: sumWork(r, 'disease', 'tons'),
              } as WorkInput,
              overlay: {
                days: sumWork(r, 'overlay', 'days'), crews: sumWork(r, 'overlay', 'crews'),
                qty: sumWork(r, 'overlay', 'qty'), tons: sumWork(r, 'overlay', 'tons'),
              } as WorkInput,
              ultraThin: {
                days: sumWork(r, 'ultraThin', 'days'), crews: sumWork(r, 'ultraThin', 'crews'),
                qty: sumWork(r, 'ultraThin', 'qty'), tons: sumWork(r, 'ultraThin', 'tons'),
              } as WorkInput,
            };
            const daySum = r2(r.lines.reduce((s, l) => s + (l.dayValue || 0), 0));
            const cumSum = r2(r.lines.reduce((s, l) => s + cumValueOf(l.projectId, r.date), 0));
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* 块头 */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
                  <span className="text-sm font-bold text-slate-800">📅 {r.date}</span>
                  <span className="text-slate-500">区域：<b className="text-slate-700">{r.region || '—'}</b></span>
                  <span className="text-slate-500">项目部：<b className="text-slate-700">{r.dept || '—'}</b></span>
                  <span className="text-slate-500">填报人：<b className="text-slate-700">{r.reporter || '—'}</b></span>
                  <span className="text-slate-500">填报时间：<b className="text-slate-700">{r.filledAt || '—'}</b></span>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition"
                      onClick={() => openEdit(r)}>编辑本日</button>
                    <button className="px-3 py-1.5 rounded-md bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 transition"
                      onClick={() => removeReport(r)}>删除本日</button>
                  </div>
                </div>
                {/* 明细表 */}
                <div className="overflow-x-auto">
                  <table className={M.table}>
                    <thead><TwoLevelHead /></thead>
                    <tbody>
                      {r.lines.map((l, i) => (
                        <tr key={`${r.id}_${i}`} className="hover:bg-orange-50/30 transition">
                          <td className={`${M.td} whitespace-nowrap font-medium`}>{projName(l.projectId)}</td>
                          {[l.disease, l.overlay, l.ultraThin].map((w, wi) => (
                            <React.Fragment key={wi}>
                              <td className={`${M.td} text-right font-mono`}>{w.days || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.crews || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.qty || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.tons || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{effCell(effOf(w))}</td>
                            </React.Fragment>
                          ))}
                          <td className={`${M.td} text-right font-mono`}>{l.hotRecycleM2 || '—'}</td>
                          <td className={`${M.td} text-right font-mono font-bold`}>{l.dayValue || '—'}</td>
                          <td className={`${M.td} text-right font-mono text-slate-600`}>
                            {fmtNum(r2(cumValueOf(l.projectId, r.date)))}
                          </td>
                        </tr>
                      ))}
                      {/* 合计行 */}
                      <tr className="bg-amber-50/80 font-bold">
                        <td className={M.td}>合计</td>
                        {(['disease', 'overlay', 'ultraThin'] as const).map(key => {
                          const w = totalLine[key];
                          return (
                            <React.Fragment key={key}>
                              <td className={`${M.td} text-right font-mono`}>{w.days || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.crews || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.qty || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>{w.tons || '—'}</td>
                              <td className={`${M.td} text-right font-mono`}>
                                {effCell(w.days > 0 && w.crews > 0 ? w.tons / (w.days * w.crews) : null)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`${M.td} text-right font-mono`}>
                          {r2(r.lines.reduce((s, l) => s + (l.hotRecycleM2 || 0), 0)) || '—'}
                        </td>
                        <td className={`${M.td} text-right font-mono`}>{daySum || '—'}</td>
                        <td className={`${M.td} text-right font-mono`}>{cumSum || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增 / 编辑弹窗：支持填报多个项目 */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? `编辑填报 ${form.date}（项目部：${form.dept || '—'}）` : '每日产值填报'}
        width="max-w-6xl"
        footer={
          <>
            <button className={M.button.ghost} onClick={() => setOpen(false)}>取消</button>
            <button className={M.button.primary} onClick={submit}>提交填报</button>
          </>
        }
      >
        {/* 头部元信息 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className={M.label}>时间</label>
            <Input type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          </div>
          <div>
            <label className={M.label}>区域</label>
            <Input value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} placeholder="选择项目后自动带出" />
          </div>
          <div>
            <label className={M.label}>项目部</label>
            <Input value={form.dept} onChange={v => setForm(f => ({ ...f, dept: v }))} placeholder="选择项目后自动带出" />
          </div>
          <div>
            <label className={M.label}>填报人</label>
            <Input value={form.reporter} readOnly placeholder="随项目账号自动带出" />
          </div>
          <div>
            <label className={M.label}>填报时间</label>
            <Input value={form.filledAt} readOnly placeholder="提交后自动生成" />
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">工效 = 吨 /(施工天数 × 投入班组数)，自动计算；天或班组数为 0 显示 "/"（未施工）</span>
          <button className={M.button.tinyOrange} onClick={addLine}>+ 添加项目</button>
        </div>

        {/* 明细行（多项目） */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className={M.table}>
              <thead><TwoLevelHead editable /></thead>
              <tbody>
                {form.lines.map((l, i) => {
                  const pickedOthers = form.lines.filter((_, idx) => idx !== i).map(x => x.projectId);
                  const projOptions = projects
                    .filter(p => !pickedOthers.includes(p.id))
                    .map(p => ({ value: p.id, label: p.shortName || p.name }));
                  return (
                    <tr key={i}>
                      <td className={`${M.td} whitespace-nowrap`}>
                        <Select value={l.projectId} onChange={v => pickProject(i, v)}
                          options={projOptions} placeholder="请选择项目" className="!w-44 !text-xs" />
                      </td>
                      {(['disease', 'overlay', 'ultraThin'] as const).map(key => {
                        const w = l[key];
                        const num = (field: 'days' | 'crews' | 'qty' | 'tons') => (
                          <input type="number" min={0} step="0.01"
                            value={(w[field] as number) || ''}
                            placeholder="0"
                            onChange={e => updateWork(i, key, { [field]: numOr0(e.target.value) } as Partial<WorkInput>)}
                            className={numInput} />
                        );
                        return (
                          <React.Fragment key={key}>
                            <td className={M.td}>{num('days')}</td>
                            <td className={M.td}>{num('crews')}</td>
                            <td className={M.td}>{num('qty')}</td>
                            <td className={M.td}>{num('tons')}</td>
                            <td className={`${M.td} text-right font-mono bg-emerald-50/70`}>
                              {effCell(effOf(w))}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={M.td}>
                        <input type="number" min={0} step="0.01" value={l.hotRecycleM2 || ''}
                          placeholder="0"
                          onChange={e => updateLine(i, { hotRecycleM2: numOr0(e.target.value) })}
                          className={numInput} />
                      </td>
                      <td className={M.td}>
                        <input type="number" min={0} step="0.01" value={l.dayValue || ''}
                          placeholder="0"
                          onChange={e => updateLine(i, { dayValue: numOr0(e.target.value) })}
                          className={`${numInput} w-16`} />
                      </td>
                      <td className={M.td}>
                        <span className="text-slate-400 text-xs">提交后计算</span>
                      </td>
                      <td className={M.td}>
                        <button className={`${M.button.tiny} text-rose-600 border-rose-200 hover:bg-rose-50`}
                          onClick={() => removeLine(i)}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          共 {form.lines.length} 行，其中已选项目 {form.lines.filter(l => l.projectId).length} 行；未选择项目的空行不会提交。
        </div>
      </Modal>
    </div>
  );
}
