/**
 * 百日攻坚模块 - localStorage store（项目部项目信息 + 周倒排引擎）
 *  - 带版本号 key，首次加载播种种子数据
 *  - 基准日固定为当年 9 月 10 日
 *  - 周倒排：上周五～本周四为一周，从基准日次日开始往后排；
 *    周列自动随时间往后生成（今天之后至少 4 周），也可手动「往后新增一周」
 */

import type { CampaignProject, DailyReport, RankAgg, WeekSlot, WorkInput } from './types';
import { zeroRankAgg } from './types';

const KEY = 'md_campaign_projects_v4';
const EXTRA_WEEKS_KEY = 'md_campaign_weeks_extra_v1';

export const genId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const nowStr = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

/** 基准日固定为 9.10（当年 9 月 10 日） */
export const baseDateOf = () => `${new Date().getFullYear()}-09-10`;

/* ==================== 日期工具 ==================== */

const DAY = 86400000;
const p2 = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parseD = (s: string) => new Date(`${s}T00:00:00`);
export const todayStr = () => ymd(new Date());

/**
 * 生成倒排周序列（上周五～本周四为一周；周起始日所在月为归属月）
 * 从基准日次日开始对齐到第一个周五，连续生成到 until（含）
 */
export function buildWeeks(baseDate: string, until: string): WeekSlot[] {
  const out: WeekSlot[] = [];
  let cur = new Date(parseD(baseDate).getTime() + DAY); // 基准日次日
  while (cur.getDay() !== 5) cur = new Date(cur.getTime() + DAY); // 对齐周五
  const untilT = parseD(until).getTime();
  let seq = 1;
  while (cur.getTime() <= untilT) {
    const end = new Date(cur.getTime() + 6 * DAY);
    out.push({
      key: ymd(cur),
      start: ymd(cur),
      end: ymd(end),
      label: `${cur.getMonth() + 1}/${cur.getDate()}-${end.getMonth() + 1}/${end.getDate()}`,
      month: cur.getMonth() + 1,
      seq,
    });
    cur = new Date(end.getTime() + DAY);
    seq++;
  }
  return out;
}

/* ==================== 延伸周（手动「往后新增一周」） ==================== */

export function getExtraWeeks(): number {
  const n = Number(localStorage.getItem(EXTRA_WEEKS_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setExtraWeeks(n: number) {
  localStorage.setItem(EXTRA_WEEKS_KEY, String(Math.max(0, n)));
}

/* ==================== 项目 CRUD ==================== */

const seed = (): CampaignProject[] => {
  const bd = baseDateOf();
  const y = new Date().getFullYear();
  return [
    {
      id: 'cp_seed_1',
      name: '杭金衢高速金华段路面专项养护工程',
      shortName: '杭金衢路面专项',
      roadSection: '杭金衢高速 K300+000～K380+000',
      workType: 'pavement',
      region: '杭州',
      dept: '杭州南',
      groupSide: '浙高运',
      amount: 12800,
      contractName: '杭金衢高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '朱飞峰',
      reporterPhone: '688454',
      baseDate: bd,
      baseDoneValue: 2118,
      pavementTotalQty: 2906,
      pavementRemainQty: 500.96,
      diseaseTotalDays: 78,
      diseaseRemainDays: 4,
      overlayTotalDays: 25,
      overlayRemainDays: 3,
      weeklyPlans: { [`${y}-09-11`]: 287.93, [`${y}-09-18`]: 150 },
      createdAt: `${y}-09-10 09:00`,
      updatedAt: `${y}-09-20 10:00`,
    },
    {
      id: 'cp_seed_2',
      name: '甬台温高速台州段路面专项养护工程',
      shortName: '甬台温路面专项',
      roadSection: '甬台温高速 K1580+000～K1650+000',
      workType: 'pavement',
      region: '台州',
      dept: '台州北',
      groupSide: '浙高运',
      amount: 9600,
      contractName: '甬台温高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '王海东',
      reporterPhone: '692301',
      baseDate: bd,
      baseDoneValue: 249.4,
      pavementTotalQty: 307.23,
      pavementRemainQty: 0,
      diseaseTotalDays: 13.5,
      diseaseRemainDays: 0,
      overlayTotalDays: 0,
      overlayRemainDays: 0,
      weeklyPlans: { [`${y}-09-11`]: 57.8 },
      createdAt: `${y}-09-11 14:30`,
      updatedAt: `${y}-09-18 16:00`,
    },
    {
      id: 'cp_seed_3',
      name: 'G25长深高速丽水段路基桥隧养护工程',
      shortName: '长深路基桥隧',
      roadSection: 'G25长深高速 K2460+000～K2540+000',
      workType: 'subgrade',
      region: '丽水',
      dept: '丽水西',
      groupSide: '浙高运',
      amount: 7300,
      contractName: 'G25长深高速丽水段路基桥隧养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-20`,
      reporter: '李国强',
      reporterPhone: '687120',
      baseDate: bd,
      baseDoneValue: 860,
      pavementTotalQty: 0,
      pavementRemainQty: 0,
      diseaseTotalDays: 100,
      diseaseRemainDays: 78,
      overlayTotalDays: 0,
      overlayRemainDays: 0,
      weeklyPlans: { [`${y}-09-11`]: 60, [`${y}-09-18`]: 45 },
      createdAt: `${y}-09-12 10:00`,
      updatedAt: `${y}-09-19 11:00`,
    },
    /* ===== 以下为项目部晾晒临时演示数据（切换区域中心/集团层级展示用，可删除） ===== */
    {
      id: 'cp_seed_4',
      name: '杭宁高速杭州段路面专项养护工程',
      shortName: '杭宁路面专项',
      roadSection: '杭宁高速 K0+000～K60+000',
      workType: 'pavement',
      region: '杭州',
      dept: '杭州北',
      groupSide: '浙高运',
      amount: 8600,
      contractName: '杭宁高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '陈志明',
      reporterPhone: '681230',
      baseDate: bd,
      baseDoneValue: 1200,
      pavementTotalQty: 1850,
      pavementRemainQty: 650,
      diseaseTotalDays: 60,
      diseaseRemainDays: 32,
      overlayTotalDays: 20,
      overlayRemainDays: 12,
      weeklyPlans: { [`${y}-09-11`]: 180, [`${y}-09-18`]: 150 },
      createdAt: `${y}-09-10 10:30`,
      updatedAt: `${y}-09-21 15:00`,
    },
    {
      id: 'cp_seed_5',
      name: '丽龙高速丽水段路面专项养护工程',
      shortName: '丽龙路面专项',
      roadSection: '丽龙高速 K10+000～K75+000',
      workType: 'pavement',
      region: '丽水',
      dept: '丽水东',
      groupSide: '浙高运',
      amount: 6900,
      contractName: '丽龙高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-25`,
      reporter: '周建平',
      reporterPhone: '685512',
      baseDate: bd,
      baseDoneValue: 730,
      pavementTotalQty: 1420,
      pavementRemainQty: 690,
      diseaseTotalDays: 55,
      diseaseRemainDays: 28,
      overlayTotalDays: 18,
      overlayRemainDays: 10,
      weeklyPlans: { [`${y}-09-11`]: 120 },
      createdAt: `${y}-09-11 09:20`,
      updatedAt: `${y}-09-21 16:40`,
    },
    {
      id: 'cp_seed_6',
      name: '甬金高速宁波段路面专项养护工程',
      shortName: '甬金路面专项',
      roadSection: '甬金高速 K0+000～K85+000',
      workType: 'pavement',
      region: '宁波',
      dept: '宁波',
      groupSide: '浙高运',
      amount: 11200,
      contractName: '甬金高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '黄伟杰',
      reporterPhone: '690334',
      baseDate: bd,
      baseDoneValue: 1580,
      pavementTotalQty: 2380,
      pavementRemainQty: 800,
      diseaseTotalDays: 70,
      diseaseRemainDays: 36,
      overlayTotalDays: 24,
      overlayRemainDays: 15,
      weeklyPlans: { [`${y}-09-11`]: 210, [`${y}-09-18`]: 170 },
      createdAt: `${y}-09-10 14:10`,
      updatedAt: `${y}-09-22 10:30`,
    },
    {
      id: 'cp_seed_7',
      name: '金丽温高速温州段路面专项养护工程',
      shortName: '金丽温路面专项',
      roadSection: '金丽温高速 K120+000～K195+000',
      workType: 'pavement',
      region: '温州',
      dept: '温州西',
      groupSide: '浙高运',
      amount: 9800,
      contractName: '金丽温高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '林少华',
      reporterPhone: '696887',
      baseDate: bd,
      baseDoneValue: 960,
      pavementTotalQty: 1750,
      pavementRemainQty: 790,
      diseaseTotalDays: 58,
      diseaseRemainDays: 30,
      overlayTotalDays: 16,
      overlayRemainDays: 9,
      weeklyPlans: { [`${y}-09-11`]: 165 },
      createdAt: `${y}-09-11 11:00`,
      updatedAt: `${y}-09-22 14:00`,
    },
  ];
};

export function getProjects(): CampaignProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CampaignProject[];
  } catch { /* 解析失败时重建种子数据 */ }
  const data = seed();
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function saveProjects(list: CampaignProject[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** 新增或更新项目（按 id 判断，新项目插入到列表头部） */
export function upsertProject(p: CampaignProject) {
  const list = getProjects();
  const i = list.findIndex(x => x.id === p.id);
  if (i >= 0) {
    list[i] = p;
  } else {
    list.unshift(p);
  }
  saveProjects(list);
}

export function deleteProject(id: string) {
  saveProjects(getProjects().filter(p => p.id !== id));
}

/* ==================== 周计划读写 ==================== */

/** 设置某项目某周计划量（qty<=0 时删除该周记录） */
export function setWeekPlan(p: CampaignProject, weekKey: string, qty: number) {
  const weeklyPlans = { ...(p.weeklyPlans || {}) };
  if (qty > 0) {
    weeklyPlans[weekKey] = qty;
  } else {
    delete weeklyPlans[weekKey];
  }
  upsertProject({ ...p, weeklyPlans, updatedAt: nowStr() });
}

/** 读取某项目某周计划量 */
export const planOf = (p: CampaignProject, weekKey: string) => p.weeklyPlans?.[weekKey] || 0;

/* ==================== 每日产值填报 ==================== */

const DAILY_KEY = 'md_campaign_daily_v2';

/** 工效 = 吨 /（施工天数 × 投入班组数）；天或班组为 0 时返回 null（显示 "/"，即未施工） */
export const effOf = (w: WorkInput): number | null =>
  (w.days > 0 && w.crews > 0) ? w.tons / (w.days * w.crews) : null;

const w0 = (): WorkInput => ({ days: 0, crews: 0, qty: 0, tons: 0 });

const seedDaily = (): DailyReport[] => {
  const y = new Date().getFullYear();
  return [
    {
      id: 'dr_seed_1',
      date: `${y}-09-23`,
      region: '杭州',
      dept: '杭州南',
      reporter: '朱飞峰',
      reporterPhone: '688454',
      filledAt: `${y}-09-23 08:40`,
      lines: [
        {
          projectId: 'cp_seed_1',
          disease: { days: 1, crews: 1, qty: 124, tons: 32.81 },
          overlay: { days: 1, crews: 1, qty: 0.656, tons: 643.62 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 45.4,
        },
        {
          projectId: 'cp_seed_2',
          disease: { days: 1, crews: 1, qty: 80, tons: 21.2 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 12.5,
        },
      ],
    },
    {
      id: 'dr_seed_2',
      date: `${y}-09-22`,
      region: '杭州',
      dept: '杭州南',
      reporter: '朱飞峰',
      reporterPhone: '688454',
      filledAt: `${y}-09-22 11:03`,
      lines: [
        { projectId: 'cp_seed_1', disease: { days: 12, crews: 0, qty: 0, tons: 0 }, overlay: w0(), ultraThin: w0(), hotRecycleM2: 0, dayValue: 0 },
        { projectId: 'cp_seed_2', disease: { days: 2, crews: 2, qty: 500, tons: 200 }, overlay: w0(), ultraThin: w0(), hotRecycleM2: 0, dayValue: 0 },
      ],
    },
    {
      id: 'dr_seed_3',
      date: `${y}-09-20`,
      region: '杭州',
      dept: '杭州南',
      reporter: '朱飞峰',
      reporterPhone: '688454',
      filledAt: `${y}-09-20 17:20`,
      lines: [
        {
          projectId: 'cp_seed_2',
          disease: { days: 2, crews: 2, qty: 500, tons: 200 },
          overlay: { days: 1, crews: 1, qty: 1, tons: 50 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 80,
        },
      ],
    },
    {
      id: 'dr_seed_4',
      date: `${y}-09-20`,
      region: '丽水',
      dept: '丽水西',
      reporter: '李国强',
      reporterPhone: '687120',
      filledAt: `${y}-09-20 18:05`,
      lines: [
        {
          projectId: 'cp_seed_3',
          disease: { days: 1, crews: 2, qty: 360, tons: 96.5 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 120,
          dayValue: 28,
        },
      ],
    },
    /* ===== 临时演示项目部填报数据（项目部晾晒展示用，可删除） ===== */
    {
      id: 'dr_seed_5',
      date: `${y}-09-22`,
      region: '杭州',
      dept: '杭州北',
      reporter: '陈志明',
      reporterPhone: '681230',
      filledAt: `${y}-09-22 17:10`,
      lines: [
        {
          projectId: 'cp_seed_4',
          disease: { days: 2, crews: 2, qty: 450, tons: 180 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 35,
        },
      ],
    },
    {
      id: 'dr_seed_6',
      date: `${y}-09-23`,
      region: '丽水',
      dept: '丽水东',
      reporter: '周建平',
      reporterPhone: '685512',
      filledAt: `${y}-09-23 08:55`,
      lines: [
        {
          projectId: 'cp_seed_5',
          disease: { days: 1, crews: 1, qty: 160, tons: 42.3 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 18.6,
        },
      ],
    },
    {
      id: 'dr_seed_7',
      date: `${y}-09-22`,
      region: '宁波',
      dept: '宁波',
      reporter: '黄伟杰',
      reporterPhone: '690334',
      filledAt: `${y}-09-22 17:40`,
      lines: [
        {
          projectId: 'cp_seed_6',
          disease: { days: 1, crews: 2, qty: 300, tons: 88.5 },
          overlay: { days: 1, crews: 1, qty: 0.8, tons: 420 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 52,
        },
      ],
    },
    {
      id: 'dr_seed_8',
      date: `${y}-09-23`,
      region: '温州',
      dept: '温州西',
      reporter: '林少华',
      reporterPhone: '696887',
      filledAt: `${y}-09-23 09:20`,
      lines: [
        {
          projectId: 'cp_seed_7',
          disease: { days: 1, crews: 1, qty: 95, tons: 26.4 },
          overlay: w0(),
          ultraThin: { days: 1, crews: 1, qty: 1.2, tons: 180 },
          hotRecycleM2: 0,
          dayValue: 30,
        },
      ],
    },
  ];
};

export function getDailyReports(): DailyReport[] {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) return JSON.parse(raw) as DailyReport[];
  } catch { /* 解析失败时重建种子数据 */ }
  const data = seedDaily();
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
  return data;
}

export function saveDailyReports(list: DailyReport[]) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(list));
}

/** 新增或更新填报单（按 id 判断，新单插入到列表头部） */
export function upsertDailyReport(r: DailyReport) {
  const list = getDailyReports();
  const i = list.findIndex(x => x.id === r.id);
  if (i >= 0) {
    list[i] = r;
  } else {
    list.unshift(r);
  }
  saveDailyReports(list);
}

export function deleteDailyReport(id: string) {
  saveDailyReports(getDailyReports().filter(r => r.id !== id));
}

/** 项目累计产值：截至 uptoDate（含）全部日报中该项目本日完成产值之和 */
export function cumValueOf(projectId: string, uptoDate: string): number {
  return getDailyReports()
    .filter(r => r.date <= uptoDate)
    .reduce((s, r) => s + r.lines
      .filter(l => l.projectId === projectId)
      .reduce((x, l) => x + (l.dayValue || 0), 0), 0);
}

/* ==================== 项目部晾晒累计聚合 ==================== */

/**
 * 汇总一组项目截至 uptoDate 的填报累计（晾晒口径）：
 * 病害/罩面/超薄（累计施工天数、累计投入班组数、累计工程量、累计吨）
 * + 热再生累计 m2 + 累计完成产值（万元）；组织维度由调用方从项目数据取。
 */
export function aggProjects(ids: Iterable<string>, uptoDate: string): RankAgg {
  const set = ids instanceof Set ? ids : new Set(ids);
  const acc = zeroRankAgg();
  for (const r of getDailyReports()) {
    if (r.date > uptoDate) continue;
    for (const l of r.lines) {
      if (!set.has(l.projectId)) continue;
      (['disease', 'overlay', 'ultraThin'] as const).forEach(k => {
        acc[k].days += l[k].days || 0;
        acc[k].crews += l[k].crews || 0;
        acc[k].qty += l[k].qty || 0;
        acc[k].tons += l[k].tons || 0;
      });
      acc.hotRecycleM2 += l.hotRecycleM2 || 0;
      acc.value += l.dayValue || 0;
    }
  }
  return acc;
}
