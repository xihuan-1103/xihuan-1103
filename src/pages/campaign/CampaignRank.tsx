/**
 * 百日攻坚 - 项目部晾晒
 *
 * 数据自动汇总，无需手动维护：
 *   - 组织维度（区域 / 项目部 / 项目名称）取自基础信息配置的项目数据
 *   - 各工种累计数据取自每日产值填报（截至晾晒日累计）：
 *     病害/罩面/超薄（累计施工天数、累计投入班组数、累计工程量、累计吨）+ 热再生 m2 + 累计完成产值
 *   - 月度倒排计划：晾晒日之后未到期的周计划不参与展示，数据随倒排推进持续滚动
 *   - 工效 = 累计吨 /（累计施工天数 × 累计投入班组数），未施工显示 "/"
 *
 * 层级切换（页面右上角）：
 *   - 项目部层级（默认）：单个项目部累计数汇总（项目部内每个项目一行 + 合计行）
 *   - 区域中心层级：当前区域下每个项目部一行数据（按累计完成产值降序晾晒）+ 合计行
 *   - 集团层级：集团下全部项目部一行数据（跨区域，按累计完成产值降序）+ 合计行
 */

import React, { useMemo, useState } from 'react';
import { M, Input, Select, TypePill, fmtNum } from './_shared';
import type { CampaignProject, RankAgg, WorkInput } from './types';
import { WORK_TYPE_LABELS, zeroRankAgg } from './types';
import { getProjects, aggProjects, effOf, todayStr } from './campaignStore';

type Level = 'dept' | 'region' | 'group';

const LEVELS: { key: Level; label: string }[] = [
  { key: 'dept', label: '项目部层级' },
  { key: 'region', label: '区域中心层级' },
  { key: 'group', label: '集团层级' },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** 多行 RankAgg 相加（合计行用） */
function sumAgg(list: RankAgg[]): RankAgg {
  const acc = zeroRankAgg();
  for (const a of list) {
    (['disease', 'overlay', 'ultraThin'] as const).forEach(k => {
      acc[k].days += a[k].days;
      acc[k].crews += a[k].crews;
      acc[k].qty += a[k].qty;
      acc[k].tons += a[k].tons;
    });
    acc.hotRecycleM2 += a.hotRecycleM2;
    acc.value += a.value;
  }
  return acc;
}

/** 名次徽章：前三名金/银/铜 */
function RankBadge({ i }: { i: number }) {
  const styles = [
    'bg-amber-100 text-amber-700',    // 第 1 名
    'bg-slate-200 text-slate-600',    // 第 2 名
    'bg-orange-100 text-orange-700',  // 第 3 名
  ];
  return (
    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold
      ${styles[i] || 'text-slate-400'}`}>
      {i + 1}
    </span>
  );
}

/** 数值显示：0 显示 "—"（未施工/无数据），非 0 千分位 */
const cellNum = (v: number) => v ? fmtNum(r2(v)) : '—';

/** 工种累计 5 格：施工天数 / 投入班组数 / 工程量 / 吨 / 工效 */
function WorkCells({ w }: { w: WorkInput }) {
  const eff = effOf(w);
  return (
    <>
      <td className={`${M.td} text-right font-mono`}>{cellNum(w.days)}</td>
      <td className={`${M.td} text-right font-mono`}>{cellNum(w.crews)}</td>
      <td className={`${M.td} text-right font-mono`}>{cellNum(w.qty)}</td>
      <td className={`${M.td} text-right font-mono`}>{cellNum(w.tons)}</td>
      <td className={`${M.td} text-center font-mono`}>
        {eff === null
          ? <span className="text-slate-400">/</span>
          : <span className="text-emerald-600 font-medium">{fmtNum(r2(eff))}</span>}
      </td>
    </>
  );
}

/**
 * 两级表头（与每日填报表结构一致）
 *  lead = 'project' → 首列「项目名称」（项目部层级，区域/项目部在筛选中体现）
 *  lead = 'dept'    → 首列「区域 + 项目部」（区域中心/集团层级）
 */
function RankHead({ lead }: { lead: 'project' | 'dept' }) {
  const group = (name: string, cols: number) => (
    <th className="bg-orange-50 text-orange-800 border-b border-slate-200 px-2 py-2 text-[12px] font-bold whitespace-nowrap"
      colSpan={cols}>{name}</th>
  );
  const sub = (label: string) => <th className={`${M.th} text-center whitespace-nowrap`}>{label}</th>;
  return (
    <>
      <tr>
        <th className={`${M.th} text-center w-14`} rowSpan={2}>名次</th>
        {lead === 'dept' && (
          <>
            <th className={`${M.th} text-center`} rowSpan={2}>区域</th>
            <th className={`${M.th} text-center`} rowSpan={2}>项目部</th>
          </>
        )}
        <th className={`${M.th} text-left`} rowSpan={2}>{lead === 'dept' ? '项目数' : '项目名称'}</th>
        {group('病害', 5)}
        {group('罩面', 5)}
        {group('超薄', 5)}
        <th className={`${M.th} text-center`} rowSpan={2}>热再生<br />m2</th>
        <th className={`${M.th} text-center`} rowSpan={2}>累计完成产值<br />(万元)</th>
      </tr>
      <tr>
        {['施工天数', '投入班组数', 'm2', '吨', '工效(吨/天·班组数)'].map(s => sub(s))}
        {['施工天数', '投入班组数', 'km', '吨', '工效(吨/天·班组数)'].map(s => sub(s))}
        {['施工天数', '投入班组数', 'km', '吨', '工效(吨/天·班组数)'].map(s => sub(s))}
      </tr>
    </>
  );
}

/** 表尾合计行 */
function TotalRow({ agg, lead, count, unit }: { agg: RankAgg; lead: 'project' | 'dept'; count: number; unit: string }) {
  return (
    <tr className="bg-amber-50/80 font-semibold">
      <td className={`${M.td} text-center text-slate-400`}>—</td>
      {lead === 'dept' && <td className={M.td} />}
      <td className={`${M.td} whitespace-nowrap`}>合计（{count} 个{unit}）</td>
      {lead === 'dept' && <td className={M.td} />}
      <WorkCells w={agg.disease} />
      <WorkCells w={agg.overlay} />
      <WorkCells w={agg.ultraThin} />
      <td className={`${M.td} text-right font-mono`}>{cellNum(agg.hotRecycleM2)}</td>
      <td className={`${M.td} text-right font-mono text-orange-600`}>{agg.value ? fmtNum(r2(agg.value)) : '—'}</td>
    </tr>
  );
}

export default function CampaignRank() {
  const projects = useMemo(() => getProjects(), []);

  const [level, setLevel] = useState<Level>('dept');
  const [date, setDate] = useState(todayStr());
  const [deptSel, setDeptSel] = useState('');
  const [regionSel, setRegionSel] = useState('');

  /* ===== 组织维度：按项目部分组（区域 → 项目部 → 项目） ===== */
  const deptGroups = useMemo(() => {
    const map = new Map<string, CampaignProject[]>();
    for (const p of projects) {
      const k = p.dept || '未分配';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return [...map.entries()].map(([dept, list]) => ({
      dept,
      region: list[0]?.region || '—',
      ids: list.map(p => p.id),
      agg: aggProjects(list.map(p => p.id), date),
    }));
  }, [projects, date]);

  const regions = useMemo(
    () => [...new Set(deptGroups.map(g => g.region).filter(Boolean))],
    [deptGroups]);

  const curDept = deptGroups.find(g => g.dept === deptSel) || deptGroups[0];
  const curRegion = (regionSel && regions.includes(regionSel)) ? regionSel : regions[0];

  /* ===== 当前视图行 ===== */
  // 项目部层级：单个项目部下每个项目一行（按累计完成产值降序）
  const projectRows = useMemo(() => {
    if (!curDept) return [];
    return projects
      .filter(p => curDept.ids.includes(p.id))
      .map(p => ({ p, agg: aggProjects([p.id], date) }))
      .sort((a, b) => b.agg.value - a.agg.value);
  }, [projects, curDept, date]);

  // 区域中心 / 集团层级：每个项目部一行（按累计完成产值降序晾晒）
  const deptRows = useMemo(() => {
    const list = level === 'region'
      ? deptGroups.filter(g => g.region === curRegion)
      : deptGroups;
    return list.slice().sort((a, b) => b.agg.value - a.agg.value);
  }, [level, deptGroups, curRegion]);

  /* ===== 汇总（全部项目部，截至晾晒日） ===== */
  const totalAgg = useMemo(
    () => aggProjects(projects.map(p => p.id), date), [projects, date]);

  const stat = {
    depts: deptGroups.length,
    regions: regions.length,
    value: r2(totalAgg.value),
    diseaseM2: r2(totalAgg.disease.qty),
    overlayKm: r2(totalAgg.overlay.qty),
  };

  const projectLeadCols = 19;  // 名次+项目名称+15工种+热再生+产值
  const deptLeadCols = 20;     // 名次+区域+项目部+15工种+热再生+产值

  return (
    <div>
      {/* 晾晒口径说明 */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-xs text-orange-800 leading-relaxed">
        <span className="font-bold">晾晒口径：</span>
        数据自动汇总无需手动维护 —— 区域 / 项目部 / 项目名称取自基础信息配置项目数据；
        病害 / 罩面 / 超薄 / 热再生 / 产值为每日产值填报截至晾晒日的<b>累计数</b>；
        工效 = 累计吨 ÷（累计施工天数 × 累计投入班组数），未施工显示 "/"。
        已预置部分临时演示项目部数据，可在基础信息配置中删除。
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: `参与晾晒项目部（${stat.regions} 个区域）`, value: `${stat.depts} 个`, cls: 'text-orange-600' },
          { label: '累计完成产值', value: `${fmtNum(stat.value)} 万元`, cls: 'text-emerald-600' },
          { label: '累计病害完成', value: `${fmtNum(stat.diseaseM2)} m2`, cls: 'text-sky-600' },
          { label: '累计罩面完成', value: `${fmtNum(stat.overlayKm)} km`, cls: 'text-violet-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 工具行：晾晒日期 + 层级筛选 + 右上角层级切换 */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
        <span className="text-xs text-slate-500 whitespace-nowrap">晾晒日期</span>
        <div className="w-44">
          <Input type="date" value={date} onChange={setDate} />
        </div>
        {level === 'dept' && deptGroups.length > 0 && (
          <div className="w-48">
            <Select value={curDept?.dept || ''} onChange={setDeptSel}
              options={deptGroups.map(g => ({ value: g.dept, label: `项目部：${g.dept}` }))} />
          </div>
        )}
        {level === 'region' && regions.length > 0 && (
          <div className="w-44">
            <Select value={curRegion || ''} onChange={setRegionSel}
              options={regions.map(r => ({ value: r, label: `区域：${r}` }))} />
          </div>
        )}
        {/* 右上角层级切换 */}
        <div className="ml-auto inline-flex rounded-lg bg-orange-50 border border-orange-200 p-0.5">
          {LEVELS.map(l => (
            <button key={l.key} onClick={() => setLevel(l.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap
                ${level === l.key ? 'bg-orange-500 text-white shadow' : 'text-orange-700 hover:bg-orange-100'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center text-sm text-slate-400">
          暂无项目数据，请先在「基础信息配置」中维护项目部项目
        </div>
      ) : level === 'dept' ? (
        /* ==================== 项目部层级：单个项目部累计数汇总 ==================== */
        curDept && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-amber-50/50 text-sm flex flex-wrap items-center">
              <span className="font-bold text-slate-800">{curDept.region}</span>
              <span className="mx-1 text-slate-400">/</span>
              <span className="font-bold text-orange-600">{curDept.dept}</span>
              <span className="ml-2 text-xs text-slate-500">
                项目部累计数汇总（含 {curDept.ids.length} 个项目），按累计完成产值降序
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className={M.table}>
                <thead><RankHead lead="project" /></thead>
                <tbody>
                  {projectRows.length === 0 && (
                    <tr><td className={`${M.td} text-center text-slate-400 py-10`} colSpan={projectLeadCols}>该项目部暂无项目</td></tr>
                  )}
                  {projectRows.map(({ p, agg }, i) => (
                    <tr key={p.id} className="hover:bg-orange-50/30 transition">
                      <td className={`${M.td} text-center`}><RankBadge i={i} /></td>
                      <td className={`${M.td} whitespace-nowrap`}>
                        <div className="font-medium">{p.shortName || p.name}</div>
                        <div className="mt-1">
                          <TypePill text={WORK_TYPE_LABELS[p.workType]} tone={p.workType === 'pavement' ? 'orange' : 'sky'} />
                        </div>
                      </td>
                      <WorkCells w={agg.disease} />
                      <WorkCells w={agg.overlay} />
                      <WorkCells w={agg.ultraThin} />
                      <td className={`${M.td} text-right font-mono`}>{cellNum(agg.hotRecycleM2)}</td>
                      <td className={`${M.td} text-right font-mono font-semibold text-orange-600`}>
                        {agg.value ? fmtNum(r2(agg.value)) : '—'}
                      </td>
                    </tr>
                  ))}
                  {projectRows.length > 0 && (
                    <TotalRow agg={sumAgg(projectRows.map(r => r.agg))} lead="project"
                      count={projectRows.length} unit="项目" />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* ==================== 区域中心 / 集团层级：每个项目部一行 ==================== */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-amber-50/50 text-sm flex flex-wrap items-center">
            {level === 'region' ? (
              <>
                <span className="font-bold text-orange-600">{curRegion}</span>
                <span className="font-bold text-slate-800"> 区域中心</span>
                <span className="ml-2 text-xs text-slate-500">下辖 {deptRows.length} 个项目部，按累计完成产值降序晾晒</span>
              </>
            ) : (
              <>
                <span className="font-bold text-orange-600">集团层级</span>
                <span className="ml-2 text-xs text-slate-500">
                  覆盖 {regions.length} 个区域中心、{deptRows.length} 个项目部，按累计完成产值降序晾晒
                </span>
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className={M.table}>
              <thead><RankHead lead="dept" /></thead>
              <tbody>
                {deptRows.length === 0 && (
                  <tr><td className={`${M.td} text-center text-slate-400 py-10`} colSpan={deptLeadCols}>当前层级下暂无项目部数据</td></tr>
                )}
                {deptRows.map((g, i) => (
                  <tr key={g.dept} className="hover:bg-orange-50/30 transition">
                    <td className={`${M.td} text-center`}><RankBadge i={i} /></td>
                    <td className={`${M.td} whitespace-nowrap`}>{g.region}</td>
                    <td className={`${M.td} font-medium whitespace-nowrap`}>{g.dept}</td>
                    <td className={`${M.td} whitespace-nowrap`}>
                      <span className="text-xs text-slate-500">{g.ids.length} 个项目</span>
                    </td>
                    <WorkCells w={g.agg.disease} />
                    <WorkCells w={g.agg.overlay} />
                    <WorkCells w={g.agg.ultraThin} />
                    <td className={`${M.td} text-right font-mono`}>{cellNum(g.agg.hotRecycleM2)}</td>
                    <td className={`${M.td} text-right font-mono font-semibold text-orange-600`}>
                      {g.agg.value ? fmtNum(r2(g.agg.value)) : '—'}
                    </td>
                  </tr>
                ))}
                {deptRows.length > 0 && (
                  <TotalRow agg={sumAgg(deptRows.map(g => g.agg))} lead="dept"
                    count={deptRows.length} unit="项目部" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
