/**
 * 百日攻坚 · 预警中心（攻坚汇总 → 预警中心）
 *
 * 规则来源：《百日攻坚-预警规则梳理表.xlsx》（新版含「预警等级」列，预警内容含对应时间）
 *  一、项目数据异常提醒（提示对象=对应项目部；异常3「当日施工天数>1」按新版已取消，改为填报端限制最大 1）
 *  二、项目预警提示（工期红橙预警 / 日·周·累计工效偏低，项目部/区域/公司三级）
 *  四、整体备注：已完工项目不预警；每日数据刷新 7:00，周类预警每周四 16:00
 *  预警等级：红 / 橙 / 黄，Tab 与 KPI 按等级分类；「已处理」预警沉至列表底部
 *
 * 计算口径：
 *  - 剩余工程量 = 项目金额 −（基准日已完成产值 + Σ每日填报本日产值）
 *  - 剩余单班组工作日 = 截止基准日剩余工作日 − Σ施工天数（病害/罩面分别）
 *  - 工效 = 吨数 ÷ 投入班组数（吨/班组），阈值：病害 200、罩面 800
 *  - 工期预警 = 理论完成率 − 实际完成率：≥20% 红色；0～20% 橙色
 */
import React, { useMemo, useState } from 'react';
import { M, TypePill } from './_shared';
import {
  getProjects, getDailyReports, buildWeeks, baseDateOf, todayStr, ymd,
} from './campaignStore';
import type { CampaignProject, DailyReportLine, WorkInput, WeekSlot } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/* 病害/罩面工效阈值（吨/班组） */
const DISEASE_EFF_MIN = 200;
const OVERLAY_EFF_MIN = 800;

type Level = 'red' | 'orange' | 'yellow';
type Category = 'data' | 'schedule' | 'eff' | 'remind';

interface AlertItem {
  key: string;
  category: Category;
  item: string;              // 预警项
  level: Level;
  name: string;              // 项目名称（提醒类可为空）
  region: string;
  dept: string;
  value: string;             // 当前触发值
  message: string;           // 预警内容
  target: string;            // 提示对象
  timing: string;            // 提示时点/频率
  pushTime?: string;         // 预警推送时间（构建完成后统一赋值）
}

const LEVEL_TONE: Record<Level, { tone: 'rose' | 'orange' | 'amber'; label: string }> = {
  red:    { tone: 'rose',    label: '红色' },
  orange: { tone: 'orange',  label: '橙色' },
  yellow: { tone: 'amber',   label: '黄色' },
};

const CATEGORY_LABEL: Record<Category, string> = {
  data: '数据异常',
  schedule: '工期预警',
  eff: '工效预警',
  remind: '填报提醒',
};

const JOB_LABEL: Record<'disease' | 'overlay' | 'ultraThin', string> = {
  disease: '病害', overlay: '罩面', ultraThin: '超薄',
};

/* 作业数据取值辅助 */
const wOf = (l: DailyReportLine, k: 'disease' | 'overlay' | 'ultraThin'): WorkInput => l[k];

/* 日期中文格式：2026-11-03 → 2026年11月3日 */
const fmtCn = (d: string) => `${d.slice(0, 4)}年${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;

/* 周区间中文格式：同月压缩为「2026年11月1日-7日」，跨月为「2026年10月30日-11月5日」 */
const weekTextRange = (start: string, end: string) =>
  start.slice(0, 7) === end.slice(0, 7)
    ? `${fmtCn(start)}-${Number(end.slice(8, 10))}日`
    : `${fmtCn(start)}-${fmtCn(end)}`;
const weekTextOf = (w: WeekSlot) => weekTextRange(w.start, w.end);

/* 按标准周（周五~周四）对日报行分组：weekKey -> line[] */
function groupLinesByWeek(reports: { date: string; lines: DailyReportLine[] }[], weeks: WeekSlot[]) {
  const map = new Map<string, DailyReportLine[]>();
  for (const w of weeks) map.set(w.key, []);
  for (const r of reports) {
    for (const w of weeks) {
      if (r.date >= w.start && r.date <= w.end) {
        map.get(w.key)!.push(...r.lines);
        break;
      }
    }
  }
  return map;
}

/* ==================== 预警计算 ==================== */
function buildAlerts(): AlertItem[] {
  const today = todayStr();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const projects = getProjects();
  const reports = getDailyReports();
  const weeks = buildWeeks(baseDateOf(), today);
  const alerts: AlertItem[] = [];

  const push = (a: AlertItem) => alerts.push(a);

  /* 各项目在某日期前（含）的日报行 */
  const linesOf = (pid: string) =>
    reports.flatMap(r => r.lines.filter(l => l.projectId === pid).map(l => ({ date: r.date, line: l })));

  for (const p of projects) {
    const ls = linesOf(p.id);
    const cumValue = p.baseDoneValue + ls.reduce((s, x) => s + (x.line.dayValue || 0), 0);
    const doneRate = p.amount > 0 ? cumValue / p.amount : 0;

    /* 整体备注 1：已完工项目不用考虑预警内容 */
    if (p.amount > 0 && doneRate >= 1) continue;

    /* 异常6：未开工但已过预计开工日期（累计产值=0 且工期起始 < 当前） */
    if (cumValue === 0 && p.startDate && p.startDate < today) {
      push({
        key: `a6-${p.id}`, category: 'data', item: '未开工但已过预计开工日期', level: 'yellow',
        name: p.name, region: p.region, dept: p.dept,
        value: `累计产值 0 · 开工 ${p.startDate}`,
        message: `（${p.name}）该项目尚未产生产值且已超过预计开工日期，请更新预计开工日期`,
        target: '对应项目部', timing: '每日数据刷新',
      });
    }

    /* 异常7：已过预计结束日期未完工 */
    if (p.endDate && p.endDate < today && doneRate < 1) {
      push({
        key: `a7-${p.id}`, category: 'data', item: '已过预计结束日期未完工', level: 'yellow',
        name: p.name, region: p.region, dept: p.dept,
        value: `完工日期 ${p.endDate} · 完成率 ${pct(doneRate)}`,
        message: `（${p.name}）已超过预计结束日期但尚未完工，请更新预计结束日期`,
        target: '对应项目部', timing: '每日数据刷新',
      });
    }

    /* 异常1：剩余工程量为负 */
    const remain = p.amount - cumValue;
    if (remain < 0) {
      push({
        key: `a1-${p.id}`, category: 'data', item: '剩余工程量为负', level: 'red',
        name: p.name, region: p.region, dept: p.dept,
        value: `剩余 ${r2(remain)} 万元`,
        message: `（${p.name}）剩余工程量出现负数，请修改总工程量或者核对输入的工程量是否准确`,
        target: '对应项目部', timing: '每日填报提交时校验 / 每日数据刷新',
      });
    }

    /* 异常2：剩余单班组工作日为负（病害/罩面分别判断） */
    const disDays = ls.reduce((s, x) => s + (x.line.disease.days || 0), 0);
    const ovlDays = ls.reduce((s, x) => s + (x.line.overlay.days || 0), 0);
    if (p.diseaseRemainDays - disDays < 0) {
      push({
        key: `a2d-${p.id}`, category: 'data', item: '剩余单班组工作日为负（病害）', level: 'red',
        name: p.name, region: p.region, dept: p.dept,
        value: `剩余 ${r2(p.diseaseRemainDays - disDays)} 天`,
        message: `（${p.name}）病害剩余单班组工作日为负数，请修改总计划工作日`,
        target: '对应项目部', timing: '每日填报提交时校验 / 每日数据刷新',
      });
    }
    if (p.overlayRemainDays - ovlDays < 0) {
      push({
        key: `a2o-${p.id}`, category: 'data', item: '剩余单班组工作日为负（罩面）', level: 'red',
        name: p.name, region: p.region, dept: p.dept,
        value: `剩余 ${r2(p.overlayRemainDays - ovlDays)} 天`,
        message: `（${p.name}）罩面剩余单班组工作日为负数，请修改总计划工作日`,
        target: '对应项目部', timing: '每日填报提交时校验 / 每日数据刷新',
      });
    }

    /* 异常3「当日施工天数>1」：新版规则表已取消（改为填报端限制最大 1），不再预警 */

    /* 周维度统计（标准周：周五~周四） */
    const weekMap = groupLinesByWeek(
      reports.map(r => ({ date: r.date, lines: r.lines.filter(l => l.projectId === p.id) })), weeks);

    for (const [wk, lines] of weekMap) {
      if (!lines.length) continue;
      const slot = weeks.find(w => w.key === wk)!;

      /* 异常4：周累计投入班组数 < 周累计施工天数（分病害/罩面/超薄） */
      for (const k of ['disease', 'overlay', 'ultraThin'] as const) {
        const days = lines.reduce((s, l) => s + (l[k].days || 0), 0);
        const crews = lines.reduce((s, l) => s + (l[k].crews || 0), 0);
        if (days > 0 && crews < days) {
          push({
            key: `a4-${p.id}-${wk}-${k}`, category: 'data', item: '周累计投入班组数小于周累计施工天数', level: 'orange',
            name: p.name, region: p.region, dept: p.dept,
            value: `${slot.label} ${JOB_LABEL[k]}：Σ班组 ${crews} < Σ天数 ${days}`,
            message: `（${p.name}）（${weekTextOf(slot)}）周累计投入班组数小于周累计天数，请核对修改本周每天的投入班组数据`,
            target: '对应项目部', timing: '每日数据刷新',
          });
        }
      }

      /* 周工效偏低：Σ周吨 ÷ Σ周班组 < 阈值（病害 200 / 罩面 800）
         —— 一.5 数据异常·周平均工效偏低（红，请说明原因）+ 二.3 工效预警·周工效偏低（橙） */
      for (const [k, min] of [['disease', DISEASE_EFF_MIN], ['overlay', OVERLAY_EFF_MIN]] as const) {
        const crews = lines.reduce((s, l) => s + (l[k].crews || 0), 0);
        const tons = lines.reduce((s, l) => s + (l[k].tons || 0), 0);
        const eff = crews > 0 ? tons / crews : null;
        if (eff !== null && eff < min) {
          push({
            key: `a5-${p.id}-${wk}-${k}`, category: 'data', item: '周平均工效偏低', level: 'red',
            name: p.name, region: p.region, dept: p.dept,
            value: `周${JOB_LABEL[k]}工效 ${r2(eff)} 吨/班组 < ${min}`,
            message: `（${p.name}）本周（${weekTextOf(slot)}）${JOB_LABEL[k]}平均工效偏低，请说明工效偏低原因`,
            target: '对应项目部', timing: '每周四',
          });
          push({
            key: `e3-${p.id}-${wk}-${k}`, category: 'eff', item: '周工效偏低预警', level: 'orange',
            name: p.name, region: p.region, dept: p.dept,
            value: `周${JOB_LABEL[k]}工效 ${r2(eff)} 吨/班组 < ${min}`,
            message: `（${p.name}）周（${weekTextOf(slot)}）${JOB_LABEL[k]}工效偏低预警`,
            target: '项目部 / 区域 / 公司', timing: '每周四',
          });
        }
      }
    }

    /* 二.2 日工效偏低：日吨 ÷ 日班组 < 阈值 */
    for (const { date, line } of ls) {
      for (const [k, min] of [['disease', DISEASE_EFF_MIN], ['overlay', OVERLAY_EFF_MIN]] as const) {
        const w = wOf(line, k);
        if (w.days > 0 && w.crews > 0) {
          const eff = w.tons / w.crews;
          if (eff < min) {
            push({
              key: `e2-${p.id}-${date}-${k}`, category: 'eff', item: '日累计工效偏低预警', level: 'orange',
              name: p.name, region: p.region, dept: p.dept,
              value: `${date} ${JOB_LABEL[k]}工效 ${r2(eff)} 吨/班组 < ${min}`,
              message: `（${p.name}）日（${fmtCn(date)}）${JOB_LABEL[k]}工效偏低预警`,
              target: '项目部 / 区域 / 公司', timing: '每日',
            });
          }
        }
      }
    }

    /* 二.4 累计工效偏低：Σ累计吨 ÷ Σ累计班组 < 阈值 */
    for (const [k, min] of [['disease', DISEASE_EFF_MIN], ['overlay', OVERLAY_EFF_MIN]] as const) {
      const crews = ls.reduce((s, x) => s + (x.line[k].crews || 0), 0);
      const tons = ls.reduce((s, x) => s + (x.line[k].tons || 0), 0);
      const eff = crews > 0 ? tons / crews : null;
      if (eff !== null && eff < min) {
        push({
          key: `e4-${p.id}-${k}`, category: 'eff', item: '累计工效偏低预警', level: 'orange',
          name: p.name, region: p.region, dept: p.dept,
          value: `累计${JOB_LABEL[k]}工效 ${r2(eff)} 吨/班组 < ${min}`,
          message: `（${p.name}）累计（${JOB_LABEL[k]}）工效偏低预警`,
          target: '项目部 / 区域 / 公司', timing: '每日刷新',
        });
      }
    }

    /* 二.1 工期进度预警（红橙）：理论完成率 − 实际完成率 */
    if (p.startDate && p.endDate) {
      const s = new Date(p.startDate).getTime();
      const e = new Date(p.endDate).getTime();
      const total = (e - s) / 86400000;
      if (total > 0) {
        const theory = Math.min(Math.max((Date.now() - s) / 86400000, 0) / total, 1);
        const dev = theory - doneRate;
        if (dev >= 0.2) {
          push({
            key: `s1r-${p.id}`, category: 'schedule', item: '工期进度预警', level: 'red',
            name: p.name, region: p.region, dept: p.dept,
            value: `进度偏差 ${pct(dev)}（理论 ${pct(theory)} − 实际 ${pct(doneRate)}）`,
            message: `（${p.name}）项目工期进度滞后，与计划相差 ${pct(dev)}，红色预警`,
            target: '项目部 / 区域 / 公司', timing: '每日刷新',
          });
        } else if (dev > 0) {
          push({
            key: `s1o-${p.id}`, category: 'schedule', item: '工期进度预警', level: 'orange',
            name: p.name, region: p.region, dept: p.dept,
            value: `进度偏差 ${pct(dev)}（理论 ${pct(theory)} − 实际 ${pct(doneRate)}）`,
            message: `（${p.name}）项目工期进度滞后，与计划相差 ${pct(dev)}，橙色预警`,
            target: '项目部 / 区域 / 公司', timing: '每日刷新',
          });
        }
      }
    }

    /* 异常9：昨日应填报未填报（在建项目昨日无填报记录） */
    const inBuild = p.startDate <= yesterday && yesterday <= p.endDate;
    const filledYesterday = reports.some(r => r.date === yesterday && r.lines.some(l => l.projectId === p.id));
    if (inBuild && !filledYesterday) {
      push({
        key: `a9-${p.id}`, category: 'data', item: '当日有施工未填报', level: 'red',
        name: p.name, region: p.region, dept: p.dept,
        value: `昨日（${yesterday}）无填报记录`,
        message: `（${p.name}）昨日（${fmtCn(yesterday)}）有施工未填报，请及时补录`,
        target: '对应项目部', timing: '每日数据刷新',
      });
    }
  }

  /* 异常8：后续一周施工计划填报提醒（每周四，定时提醒，无条件） */
  const nextWeekText = (() => {
    const w = weeks[weeks.length - 1];
    if (!w) return '';
    const s = new Date(new Date(`${w.end}T00:00:00`).getTime() + 86400000);
    const e = new Date(s.getTime() + 6 * 86400000);
    return weekTextRange(ymd(s), ymd(e));
  })();
  push({
    key: 'a8-global', category: 'remind', item: '后续一周施工计划填报提醒', level: 'yellow',
    name: '—', region: '—', dept: '全部项目部',
    value: '每周四 16:00 定时提醒',
    message: nextWeekText ? `请填报后续一周（${nextWeekText}）施工计划` : '请填报后续一周施工计划',
    target: '各项目部填报人', timing: '每周四',
  });

  /* 排序：等级 red > orange > yellow，同级按区域+项目名 */
  const lvOrder: Record<Level, number> = { red: 0, orange: 1, yellow: 2 };
  alerts.sort((a, b) => lvOrder[a.level] - lvOrder[b.level]
    || a.region.localeCompare(b.region, 'zh')
    || a.name.localeCompare(b.name, 'zh'));

  /* 预警推送时间：每日刷新类 = 当日 07:00；每周四类 = 最近一个周四 16:00 */
  const pad = (n: number) => String(n).padStart(2, '0');
  const dailyPush = `${today} 07:00`;
  const weeklyPush = (() => {
    const d = new Date();
    const dow = d.getDay();                        // 4 = 周四
    const diff = dow >= 4 ? dow - 4 : dow + 3;     // 距最近周四的天数
    const t = new Date(d);
    t.setDate(d.getDate() - diff);
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} 16:00`;
  })();
  for (const a of alerts) a.pushTime = a.timing.includes('周四') ? weeklyPush : dailyPush;

  return alerts;
}

/* ==================== 页面 ==================== */

/* 已处理预警：localStorage 持久化（预警 key 稳定，跨刷新保留） */
const DONE_KEY = 'md_campaign_alerts_done_v1';
const getDone = (): Set<string> => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch { return new Set<string>(); }
};
const saveDone = (s: Set<string>) => localStorage.setItem(DONE_KEY, JSON.stringify([...s]));

export default function CampaignAlerts() {
  const alerts = useMemo(() => buildAlerts(), []);
  const [cat, setCat] = useState<Category | ''>('');
  const [regionSel, setRegionSel] = useState('');
  const [deptSel, setDeptSel] = useState('');
  const [kw, setKw] = useState('');
  const [done, setDone] = useState<Set<string>>(() => getDone());

  const toggleDone = (key: string) => setDone(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    saveDone(next);
    return next;
  });

  const regionOpts = useMemo(
    () => [...new Set(alerts.map(a => a.region).filter(r => r && r !== '—'))].sort((a, b) => a.localeCompare(b, 'zh')),
    [alerts]);
  const deptOpts = useMemo(
    () => [...new Set(alerts
      .filter(a => (!regionSel || a.region === regionSel))
      .map(a => a.dept).filter(d => d && d !== '全部项目部'))].sort((a, b) => a.localeCompare(b, 'zh')),
    [alerts, regionSel]);

  const filtered = useMemo(() => alerts.filter(a =>
    (!cat || a.category === cat)
    && (!regionSel || a.region === regionSel || a.region === '—')
    && (!deptSel || a.dept === deptSel || a.dept === '全部项目部')
    && (!kw.trim() || a.message.toLowerCase().includes(kw.trim().toLowerCase()))),
    [alerts, cat, regionSel, deptSel, kw]);

  /* 已处理的预警沉至列表底部，未处理保持等级排序 */
  const list = useMemo(() => [
    ...filtered.filter(a => !done.has(a.key)),
    ...filtered.filter(a => done.has(a.key)),
  ], [filtered, done]);

  const cnt = (l: Level) => alerts.filter(a => a.level === l).length;
  const cntCat = (c: Category) => alerts.filter(a => a.category === c).length;
  const doneCnt = alerts.filter(a => done.has(a.key)).length;

  const kpiCards = [
    { label: '红色预警', value: cnt('red'), tone: 'rose' as const },
    { label: '橙色预警', value: cnt('orange'), tone: 'orange' as const },
    { label: '黄色预警', value: cnt('yellow'), tone: 'amber' as const },
    { label: '已处理', value: doneCnt, tone: 'slate' as const },
  ];

  const tabs: { key: Category | ''; label: string; n: number }[] = [
    { key: '', label: '全部', n: alerts.length },
    { key: 'data', label: '数据异常', n: cntCat('data') },
    { key: 'schedule', label: '工期预警', n: cntCat('schedule') },
    { key: 'eff', label: '工效预警', n: cntCat('eff') },
    { key: 'remind', label: '填报提醒', n: cntCat('remind') },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 页头 */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">预警中心</h1>
      </div>

      {/* KPI 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {kpiCards.map(c => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className={`text-2xl font-bold mt-0.5 ${
              c.tone === 'rose' ? 'text-rose-600' : c.tone === 'orange' ? 'text-orange-600'
              : c.tone === 'amber' ? 'text-amber-600' : 'text-slate-500'}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tab + 筛选 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {tabs.map(t => (
          <button key={t.label} onClick={() => setCat(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              cat === t.key ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-orange-50'}`}>
            {t.label} <span className={`text-xs ml-0.5 ${cat === t.key ? 'text-white/80' : 'text-slate-400'}`}>({t.n})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input value={kw} onChange={e => setKw(e.target.value)} placeholder="预警内容关键字"
            className="px-2.5 py-1.5 rounded-md border border-slate-300 text-sm bg-white w-40" />
          <select value={regionSel} onChange={e => { setRegionSel(e.target.value); setDeptSel(''); }}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 text-sm bg-white">
            <option value="">全部区域</option>
            {regionOpts.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={deptSel} onChange={e => setDeptSel(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 text-sm bg-white">
            <option value="">全部项目部</option>
            {deptOpts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(cat || regionSel || deptSel || kw) && (
            <button onClick={() => { setCat(''); setRegionSel(''); setDeptSel(''); setKw(''); }}
              className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-sm hover:bg-sky-100">重置</button>
          )}
        </div>
      </div>

      {/* 预警清单 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>等级</th>
                <th className={M.th}>预警大类</th>
                <th className={M.th}>预警项</th>
                <th className={M.th}>区域</th>
                <th className={M.th}>项目部</th>
                <th className={M.th}>预警内容</th>
                <th className={M.th}>当前值</th>
                <th className={M.th}>预警推送时间</th>
                <th className={M.th}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(a => (
                <tr key={a.key} className={`hover:bg-orange-50/40 transition ${
                  a.level === 'red' && !done.has(a.key) ? 'bg-rose-50/40' : ''} ${done.has(a.key) ? 'opacity-50' : ''}`}>
                  <td className={M.td}><TypePill text={LEVEL_TONE[a.level].label} tone={LEVEL_TONE[a.level].tone} /></td>
                  <td className={`${M.td} text-slate-500 whitespace-nowrap`}>{CATEGORY_LABEL[a.category]}</td>
                  <td className={`${M.td} font-medium text-slate-800 whitespace-nowrap`}>{a.item}</td>
                  <td className={`${M.td} whitespace-nowrap`}>
                    {a.region !== '—' && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[11px]">{a.region}</span>}
                    {a.region === '—' && <span className="text-slate-400">—</span>}
                  </td>
                  <td className={`${M.td} whitespace-nowrap`}>{a.dept}</td>
                  <td className={`${M.td} text-xs text-slate-600 min-w-[260px]`}>{a.message}</td>
                  <td className={`${M.td} font-mono text-xs text-slate-600 min-w-[160px]`}>{a.value}</td>
                  <td className={`${M.td} text-xs text-slate-500 whitespace-nowrap font-mono`}>{a.pushTime}</td>
                  <td className={`${M.td} whitespace-nowrap`}>
                    {done.has(a.key) ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[11px]">已处理</span>
                        <button onClick={() => toggleDone(a.key)} className="text-[11px] text-sky-600 hover:underline">撤销</button>
                      </span>
                    ) : (
                      <button onClick={() => toggleDone(a.key)}
                        className="px-2 py-1 rounded text-[12px] border border-orange-300 text-orange-700 hover:bg-orange-50 transition">已处理</button>
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">当前筛选条件下无预警</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        共 {list.length} 条预警 · 说明：「当日有施工未填报」按在建项目昨日无填报记录简化判定；「当日施工天数&gt;1」按新版规则表已取消（改为填报端限制最大 1）；「三、公司提示」类规则原表未梳理，暂未实现。
      </p>
    </div>
  );
}
