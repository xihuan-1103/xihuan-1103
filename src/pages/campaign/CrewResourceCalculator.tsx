/**
 * 百日攻坚 - 数据看板 - 综合分析：班组资源测算器
 *
 * 页内展示区域测算表；点击区域名在弹窗中展示该项目部的测算表；
 * 点击项目部名再弹窗展示该项目下项目的测算表。
 *
 * 取数规则（《班组资源测算取数表.xlsx》）：
 *  - 范围：未完工项目（进行中 / 未开工）
 *  - 病害剩余工日 = Σ(单项目总计划工日 − 截止基准日累计工日 − ∑每日填报病害工日)
 *  - 罩面剩余工日 = 同病害口径（罩面字段）
 *  - 合计剩余工日 = 病害剩余工日 + 罩面剩余工日
 *  - 剩余工作日   = 项目：完工日期距今天数；区域/项目部：下属未完工项目最晚完工日期距今天数
 *  - 现有班组     = 项目部当前班组数；区域 = 区域下项目部班组数合计（项目级不展示）
 *  - 所需班组     = 合计剩余工日 / 时间利用系数 / 剩余工作日（向上取整）
 *  - 缺口         = 所需班组 − 现有班组：正 → 「缺口N」红色；负 → 「富余N」绿色；0 → 「满足」（项目级不展示）
 *  - 时间利用系数：自定义 0~1 之间的一位小数（全局生效）
 */

import React, { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Modal } from './_shared';
import type { CampaignProject } from './types';
import { getProjects, getCrews, getDailyReports, todayStr } from './campaignStore';

interface CalcRow {
  name: string;
  dRemain: number;      // 病害剩余工日
  oRemain: number;      // 罩面剩余工日
  total: number;        // 合计剩余工日
  remainDays: number | null; // 剩余工作日
  crews: number | null; // 现有班组（项目级 null）
  need: number | null;  // 所需班组
}

// 剩余工作日：完工日期距今天数（向下取整天数，已过期归 0）
function daysLeftOf(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - new Date(`${todayStr()}T00:00:00`).getTime()) / 86400000));
}

export default function CrewResourceCalculator() {
  const [coef, setCoef] = useState(0.8);          // 时间利用系数（0~1，一位小数）
  const [deptModal, setDeptModal] = useState<string | null>(null);            // 弹窗：区域名 → 项目部测算
  const [projModal, setProjModal] = useState<{ region: string; dept: string } | null>(null); // 弹窗：项目部 → 项目测算

  const projects = useMemo(() => getProjects(), []);
  const crews = useMemo(() => getCrews(), []);

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

  // 未完工项目（进行中 / 未开工）
  const active = useMemo(
    () => projects.filter(p => (p.projectStatus || 'ongoing') !== 'finished'),
    [projects]);

  // 项目级测算行
  const projRow = (p: CampaignProject): CalcRow => {
    const f = filled.get(p.id) ?? { d: 0, o: 0 };
    const dRemain = (p.diseaseTotalDays || 0) - (p.baseCumDaysDisease || 0) - f.d;
    const oRemain = (p.overlayTotalDays || 0) - (p.baseCumDaysOverlay || 0) - f.o;
    const total = dRemain + oRemain;
    const remainDays = daysLeftOf(p.endDate);
    const need = (remainDays !== null && remainDays > 0 && coef > 0 && total > 0)
      ? Math.ceil(total / (coef * remainDays)) : 0;
    return { name: p.name, dRemain, oRemain, total, remainDays, crews: null, need };
  };

  // 现有班组按项目部归集
  const crewCountByDept = useMemo(() => {
    const m = new Map<string, number>();
    crews.forEach(c => m.set(c.dept || '未分配', (m.get(c.dept || '未分配') || 0) + 1));
    return m;
  }, [crews]);

  // 上卷聚合（区域 / 项目部）：剩余工日求和、剩余工作日取最晚完工、现有班组按项目部归集
  const groupRow = (name: string, list: CampaignProject[], isRegion: boolean): CalcRow => {
    const rows = list.map(projRow);
    const dRemain = rows.reduce((s, r) => s + r.dRemain, 0);
    const oRemain = rows.reduce((s, r) => s + r.oRemain, 0);
    const remainDaysList = rows.map(r => r.remainDays).filter((x): x is number => x !== null);
    const remainDays = remainDaysList.length ? Math.max(...remainDaysList) : null;
    const total = dRemain + oRemain;
    const crewsN = isRegion
      ? [...new Set(list.map(p => p.dept || '未分配'))].reduce((s, d) => s + (crewCountByDept.get(d) || 0), 0)
      : (crewCountByDept.get(name) || 0);
    const need = (remainDays !== null && remainDays > 0 && coef > 0 && total > 0)
      ? Math.ceil(total / (coef * remainDays)) : 0;
    return { name, dRemain, oRemain, total, remainDays, crews: crewsN, need };
  };

  const regions = useMemo(() => {
    const m = new Map<string, CampaignProject[]>();
    active.forEach(p => {
      const rg = p.region || '未分配';
      m.set(rg, [...(m.get(rg) || []), p]);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
  }, [active]);

  const regionRows = useMemo(
    () => regions.map(([rg, list]) => groupRow(rg, list, true)),
    [regions, crewCountByDept, coef]); // eslint-disable-line react-hooks/exhaustive-deps

  // 项目部测算弹窗数据
  const deptRows = useMemo(() => {
    if (!deptModal) return [];
    const m = new Map<string, CampaignProject[]>();
    active.filter(p => (p.region || '未分配') === deptModal).forEach(p => {
      const d = p.dept || '未分配';
      m.set(d, [...(m.get(d) || []), p]);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
      .map(([d, list]) => groupRow(d, list, false));
  }, [deptModal, active, crewCountByDept, coef]); // eslint-disable-line react-hooks/exhaustive-deps

  // 项目测算弹窗数据
  const projRows = useMemo(() => {
    if (!projModal) return [];
    return active.filter(p => (p.region || '未分配') === projModal.region && (p.dept || '未分配') === projModal.dept)
      .map(projRow);
  }, [projModal, active, coef]); // eslint-disable-line react-hooks/exhaustive-deps

  // 缺口标签：所需 − 现有；正→缺口（红）、负→富余（绿）、0→满足
  const GapPill = ({ row }: { row: CalcRow }) => {
    const gap = (row.need ?? 0) - (row.crews ?? 0);
    if (gap > 0) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">缺口{gap}</span>;
    if (gap < 0) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">富余{-gap}</span>;
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">满足</span>;
  };

  const fmt1 = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
  const th = 'px-3 py-2 text-right font-medium text-slate-600 whitespace-nowrap';
  const td = 'px-3 py-2 text-right text-slate-700 whitespace-nowrap';

  const Header = ({ level }: { level: 'region' | 'dept' | 'project' }) => (
    <thead className="bg-slate-50 text-xs">
      <tr>
        <th className="px-3 py-2 text-left font-medium text-slate-600">
          {level === 'region' ? '区域' : level === 'dept' ? '项目部' : '项目名称'}
        </th>
        <th className={th}>病害剩余工日</th>
        <th className={th}>罩面剩余工日</th>
        <th className={th}>合计剩余工日</th>
        <th className={th}>剩余工作日</th>
        {level !== 'project' && <th className={th}>现有班组</th>}
        <th className={th}>所需班组</th>
        {level !== 'project' && <th className={th}>缺口</th>}
      </tr>
    </thead>
  );

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-4">
      {/* 标题 + 时间利用系数 */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Calculator size={15} className="text-orange-500" />
          班组资源测算器
          <span className="text-xs font-normal text-slate-400 ml-1">点击区域 / 项目部名称可弹窗下钻 · 仅统计未完工项目</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          时间利用系数
          <input
            type="number" min={0} max={1} step={0.1}
            value={coef}
            onChange={e => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setCoef(Math.min(1, Math.max(0, Math.round(v * 10) / 10)));
            }}
            className="w-16 h-7 px-2 text-xs rounded border border-slate-300 outline-none focus:border-orange-500"
          />
        </label>
      </div>

      {/* 区域测算表（页内） */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <Header level="region" />
          <tbody>
            {regionRows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">暂无未完工项目数据</td></tr>
            )}
            {regionRows.map(r => (
              <tr key={r.name} className="border-t border-slate-100 hover:bg-orange-50/40 transition-colors">
                <td className="px-3 py-2">
                  <button className="text-orange-600 font-medium hover:underline" onClick={() => setDeptModal(r.name)}>
                    {r.name}
                  </button>
                </td>
                <td className={td}>{fmt1(r.dRemain)}</td>
                <td className={td}>{fmt1(r.oRemain)}</td>
                <td className={`${td} font-semibold`}>{fmt1(r.total)}</td>
                <td className={td}>{r.remainDays === null ? '—' : r.remainDays}</td>
                <td className={td}>{r.crews}</td>
                <td className={`${td} font-semibold`}>{r.need}</td>
                <td className="px-3 py-2 text-right"><GapPill row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 取数说明 */}
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
        取数：病害/罩面剩余工日 = 总计划工日 − 截止基准日累计工日 − ∑每日填报工日（未完工项目合计）；
        所需班组 = 合计剩余工日 ÷ 时间利用系数 ÷ 剩余工作日（向上取整）；
        缺口 = 所需 − 现有（<span className="text-rose-500">正=缺口</span> / <span className="text-emerald-600">负=富余</span> / 0=满足）；
        现有班组按项目部归集，在「基础信息配置 → 班组维护」中维护归属。
      </p>

      {/* 项目部测算弹窗 */}
      <Modal
        open={deptModal !== null}
        onClose={() => setDeptModal(null)}
        title={`${deptModal || ''} · 项目部班组测算`}
        width="max-w-3xl"
        footer={
          <button className="px-4 h-9 rounded-lg text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setDeptModal(null)}>关闭</button>
        }
      >
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <Header level="dept" />
            <tbody>
              {deptRows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">该区域下暂无未完工项目</td></tr>
              )}
              {deptRows.map(r => (
                <tr key={r.name} className="border-t border-slate-100 hover:bg-orange-50/40 transition-colors">
                  <td className="px-3 py-2">
                    <button
                      className="text-orange-600 font-medium hover:underline"
                      onClick={() => { setProjModal({ region: deptModal || '', dept: r.name }); }}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className={td}>{fmt1(r.dRemain)}</td>
                  <td className={td}>{fmt1(r.oRemain)}</td>
                  <td className={`${td} font-semibold`}>{fmt1(r.total)}</td>
                  <td className={td}>{r.remainDays === null ? '—' : r.remainDays}</td>
                  <td className={td}>{r.crews}</td>
                  <td className={`${td} font-semibold`}>{r.need}</td>
                  <td className="px-3 py-2 text-right"><GapPill row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">点击项目部名称可查看该项目部下项目的测算明细。</p>
      </Modal>

      {/* 项目测算弹窗 */}
      <Modal
        open={projModal !== null}
        onClose={() => setProjModal(null)}
        title={`${projModal?.dept || ''}（${projModal?.region || ''}）· 项目班组测算`}
        width="max-w-3xl"
        footer={
          <button className="px-4 h-9 rounded-lg text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setProjModal(null)}>关闭</button>
        }
      >
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <Header level="project" />
            <tbody>
              {projRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">该项目部下暂无未完工项目</td></tr>
              )}
              {projRows.map(r => (
                <tr key={r.name} className="border-t border-slate-100 hover:bg-orange-50/40 transition-colors">
                  <td className="px-3 py-2 text-slate-800">{r.name}</td>
                  <td className={td}>{fmt1(r.dRemain)}</td>
                  <td className={td}>{fmt1(r.oRemain)}</td>
                  <td className={`${td} font-semibold`}>{fmt1(r.total)}</td>
                  <td className={td}>{r.remainDays === null ? '—' : r.remainDays}</td>
                  <td className={`${td} font-semibold`}>{r.need}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">项目级测算不展示现有班组与缺口（按取数表规则）。</p>
      </Modal>
    </div>
  );
}
