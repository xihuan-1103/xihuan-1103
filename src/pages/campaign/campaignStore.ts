/**
 * 百日攻坚模块 - localStorage store（项目部项目信息 + 周倒排引擎）
 *  - 带版本号 key，首次加载播种种子数据
 *  - 基准日固定为当年 9 月 10 日
 *  - 周倒排：上周五～本周四为一周，从基准日次日开始往后排；
 *    周列自动随时间往后生成（今天之后至少 4 周），也可手动「往后新增一周」
 */

import type { CampaignProject, CampaignCrew, DailyReport, RankAgg, WeekSlot, WorkInput } from './types';
import { zeroRankAgg } from './types';

const KEY = 'md_campaign_projects_v7';
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
      totalDiseaseQty: 120000, totalOverlayQty: 38, totalUltraThinQty: 12, totalHotRecycleQty: 85000,
      baseDoneDiseaseQty: 42000, baseDoneOverlayQty: 14, baseDoneUltraThinQty: 4, baseDoneHotRecycleQty: 30000,
      totalUltraThinDays: 6, totalHotRecycleDays: 10, remainUltraThinDays: 2, remainHotRecycleDays: 4,
      baseCrewDaysDisease: 150, baseCrewDaysOverlay: 45, baseCrewDaysUltraThin: 6, baseCrewDaysHotRecycle: 10,
      baseMaterialDisease: 42000, baseMaterialOverlay: 14, baseMaterialUltraThin: 4, baseMaterialHotRecycle: 30000,
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
      groupSide: '沪杭甬',
      amount: 9600,
      contractName: '甬台温高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '王海东',
      reporterPhone: '692301',
      baseDate: bd,
      baseDoneValue: 249.4,
      pavementTotalQty: 307.23,
      totalDiseaseQty: 36000, totalOverlayQty: 7, totalUltraThinQty: 3, totalHotRecycleQty: 12000,
      baseDoneDiseaseQty: 36000, baseDoneOverlayQty: 7, baseDoneUltraThinQty: 3, baseDoneHotRecycleQty: 12000,
      totalUltraThinDays: 3, totalHotRecycleDays: 4, remainUltraThinDays: 0, remainHotRecycleDays: 0,
      baseCrewDaysDisease: 40, baseCrewDaysOverlay: 0, baseCrewDaysUltraThin: 3, baseCrewDaysHotRecycle: 4,
      baseMaterialDisease: 36000, baseMaterialOverlay: 7, baseMaterialUltraThin: 3, baseMaterialHotRecycle: 12000,
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
      totalDiseaseQty: 0, totalOverlayQty: 0, totalUltraThinQty: 0, totalHotRecycleQty: 0,
      baseDoneDiseaseQty: 0, baseDoneOverlayQty: 0, baseDoneUltraThinQty: 0, baseDoneHotRecycleQty: 0,
      totalUltraThinDays: 0, totalHotRecycleDays: 0, remainUltraThinDays: 0, remainHotRecycleDays: 0,
      baseCrewDaysDisease: 0, baseCrewDaysOverlay: 0, baseCrewDaysUltraThin: 0, baseCrewDaysHotRecycle: 0,
      baseMaterialDisease: 0, baseMaterialOverlay: 0, baseMaterialUltraThin: 0, baseMaterialHotRecycle: 0,
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
      totalDiseaseQty: 95000, totalOverlayQty: 24, totalUltraThinQty: 9, totalHotRecycleQty: 60000,
      baseDoneDiseaseQty: 38000, baseDoneOverlayQty: 9, baseDoneUltraThinQty: 3, baseDoneHotRecycleQty: 21000,
      totalUltraThinDays: 4, totalHotRecycleDays: 6, remainUltraThinDays: 1, remainHotRecycleDays: 2,
      baseCrewDaysDisease: 95, baseCrewDaysOverlay: 30, baseCrewDaysUltraThin: 4, baseCrewDaysHotRecycle: 6,
      baseMaterialDisease: 38000, baseMaterialOverlay: 9, baseMaterialUltraThin: 3, baseMaterialHotRecycle: 21000,
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
      totalDiseaseQty: 88000, totalOverlayQty: 18, totalUltraThinQty: 7, totalHotRecycleQty: 52000,
      baseDoneDiseaseQty: 26000, baseDoneOverlayQty: 6, baseDoneUltraThinQty: 2, baseDoneHotRecycleQty: 15000,
      totalUltraThinDays: 4, totalHotRecycleDays: 5, remainUltraThinDays: 2, remainHotRecycleDays: 2,
      baseCrewDaysDisease: 80, baseCrewDaysOverlay: 25, baseCrewDaysUltraThin: 4, baseCrewDaysHotRecycle: 5,
      baseMaterialDisease: 26000, baseMaterialOverlay: 6, baseMaterialUltraThin: 2, baseMaterialHotRecycle: 15000,
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
      totalDiseaseQty: 140000, totalOverlayQty: 30, totalUltraThinQty: 11, totalHotRecycleQty: 78000,
      baseDoneDiseaseQty: 52000, baseDoneOverlayQty: 12, baseDoneUltraThinQty: 4, baseDoneHotRecycleQty: 28000,
      totalUltraThinDays: 5, totalHotRecycleDays: 8, remainUltraThinDays: 2, remainHotRecycleDays: 3,
      baseCrewDaysDisease: 110, baseCrewDaysOverlay: 38, baseCrewDaysUltraThin: 5, baseCrewDaysHotRecycle: 8,
      baseMaterialDisease: 52000, baseMaterialOverlay: 12, baseMaterialUltraThin: 4, baseMaterialHotRecycle: 28000,
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
      groupSide: '安徽交控',
      amount: 9800,
      contractName: '金丽温高速2026年路面专项养护工程施工合同',
      startDate: `${y}-09-10`,
      endDate: `${y}-12-31`,
      reporter: '林少华',
      reporterPhone: '696887',
      baseDate: bd,
      baseDoneValue: 960,
      pavementTotalQty: 1750,
      totalDiseaseQty: 105000, totalOverlayQty: 22, totalUltraThinQty: 8, totalHotRecycleQty: 66000,
      baseDoneDiseaseQty: 31000, baseDoneOverlayQty: 8, baseDoneUltraThinQty: 3, baseDoneHotRecycleQty: 18000,
      totalUltraThinDays: 4, totalHotRecycleDays: 6, remainUltraThinDays: 2, remainHotRecycleDays: 2,
      baseCrewDaysDisease: 85, baseCrewDaysOverlay: 28, baseCrewDaysUltraThin: 4, baseCrewDaysHotRecycle: 6,
      baseMaterialDisease: 31000, baseMaterialOverlay: 8, baseMaterialUltraThin: 3, baseMaterialHotRecycle: 18000,
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

/* ==================== 班组读写（基础信息配置维护） ==================== */

const CREWS_KEY = 'md_campaign_crews_v1';

// 种子班组（首次访问时写入）；dept = 所属项目部（班组资源测算汇总用）
const CREWS_SEED: CampaignCrew[] = (() => {
  const t = '2026-09-10T08:00:00Z';
  return [
    { id: 'crew-disease-1', name: '病害处治一班', type: '自营', dept: '杭州南', createdAt: t, updatedAt: t },
    { id: 'crew-disease-2', name: '病害处治二班', type: '外协', dept: '杭州南', createdAt: t, updatedAt: t },
    { id: 'crew-overlay-1', name: '罩面施工一班', type: '自营', dept: '丽水西', createdAt: t, updatedAt: t },
    { id: 'crew-bridge-1', name: '桥隧加固一班', type: '外协', dept: '宁波', createdAt: t, updatedAt: t },
  ];
})();

// 旧档案迁移：无 dept 字段的班组按名称补默认归属
const CREW_DEPT_DEFAULTS: Record<string, string> = {
  '病害处治一班': '杭州南',
  '病害处治二班': '杭州南',
  '罩面施工一班': '丽水西',
  '桥隧加固一班': '宁波',
};

export function getCrews(): CampaignCrew[] {
  try {
    const raw = localStorage.getItem(CREWS_KEY);
    if (raw) {
      const list = JSON.parse(raw) as CampaignCrew[];
      if (list.some(c => !c.dept)) {
        const fixed = list.map(c => ({ ...c, dept: c.dept || CREW_DEPT_DEFAULTS[c.name] || '未分配' }));
        localStorage.setItem(CREWS_KEY, JSON.stringify(fixed));
        return fixed;
      }
      return list;
    }
  } catch { /* 解析失败时重建种子数据 */ }
  localStorage.setItem(CREWS_KEY, JSON.stringify(CREWS_SEED));
  return CREWS_SEED;
}

export function saveCrews(list: CampaignCrew[]) {
  localStorage.setItem(CREWS_KEY, JSON.stringify(list));
}

/** 新增或更新班组（按 id 判断） */
export function upsertCrew(c: CampaignCrew) {
  const list = getCrews();
  const i = list.findIndex(x => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  saveCrews(list);
}

export function deleteCrew(id: string) {
  saveCrews(getCrews().filter(c => c.id !== id));
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

const DAILY_KEY = 'md_campaign_daily_v3';

/** 工效 = 吨 /（施工天数 × 投入班组数）；天或班组为 0 时返回 null（显示 "/"，即未施工） */
export const effOf = (w: WorkInput): number | null =>
  (w.days > 0 && w.crews > 0) ? w.tons / (w.days * w.crews) : null;

const w0 = (): WorkInput => ({ days: 0, crews: 0, qty: 0, tons: 0 });

/** 本周周五（标准周 周五~周四 的起始日） */
const curFriday = () => {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - (now.getDay() + 2) % 7);
  return d;
};
const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 相对本周周五偏移 n 天的日期串 */
const dayOff = (n: number) => {
  const d = new Date(curFriday());
  d.setDate(d.getDate() + n);
  return ymdOf(d);
};

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
    /* ===== 周报演示数据：上一周实际（上周一/二/三 = 本周五 -4/-3/-2） ===== */
    {
      id: 'dr_seed_pw1',
      date: dayOff(-4),
      region: '杭州',
      dept: '杭州南',
      reporter: '朱飞峰',
      reporterPhone: '688454',
      filledAt: `${dayOff(-4)} 08:40`,
      lines: [
        {
          projectId: 'cp_seed_1',
          disease: { days: 1, crews: 1, qty: 124, tons: 32.8 },
          overlay: { days: 1, crews: 1, qty: 0.65, tons: 320 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 38,
        },
        {
          projectId: 'cp_seed_2',
          disease: { days: 1, crews: 1, qty: 80, tons: 21 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 12,
        },
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
      id: 'dr_seed_pw2',
      date: dayOff(-3),
      region: '杭州',
      dept: '杭州北',
      reporter: '陈志明',
      reporterPhone: '681230',
      filledAt: `${dayOff(-3)} 17:10`,
      lines: [
        {
          projectId: 'cp_seed_4',
          disease: { days: 1, crews: 2, qty: 450, tons: 180 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 35,
        },
        {
          projectId: 'cp_seed_1',
          disease: { days: 1, crews: 1, qty: 110, tons: 29 },
          overlay: { days: 1, crews: 1, qty: 0.7, tons: 350 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 41,
        },
      ],
    },
    {
      id: 'dr_seed_pw3',
      date: dayOff(-2),
      region: '宁波',
      dept: '宁波',
      reporter: '黄伟杰',
      reporterPhone: '690334',
      filledAt: `${dayOff(-2)} 17:40`,
      lines: [
        {
          projectId: 'cp_seed_6',
          disease: { days: 1, crews: 2, qty: 300, tons: 88.5 },
          overlay: { days: 1, crews: 1, qty: 0.8, tons: 420 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 52,
        },
        {
          projectId: 'cp_seed_2',
          disease: { days: 1, crews: 1, qty: 95, tons: 25 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 14,
        },
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
    /* ===== 周报演示数据：本周实际（周一/二/三 = 本周五 +3/+4/+5） ===== */
    {
      id: 'dr_seed_cw1',
      date: dayOff(3),
      region: '杭州',
      dept: '杭州南',
      reporter: '朱飞峰',
      reporterPhone: '688454',
      filledAt: `${dayOff(3)} 08:40`,
      lines: [
        {
          projectId: 'cp_seed_1',
          disease: { days: 1, crews: 1, qty: 130, tons: 34 },
          overlay: { days: 1, crews: 1, qty: 0.6, tons: 310 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 40,
        },
        {
          projectId: 'cp_seed_2',
          disease: { days: 1, crews: 1, qty: 85, tons: 22 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 13,
        },
        {
          projectId: 'cp_seed_5',
          disease: { days: 1, crews: 1, qty: 155, tons: 41 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 17,
        },
      ],
    },
    {
      id: 'dr_seed_cw2',
      date: dayOff(4),
      region: '杭州',
      dept: '杭州北',
      reporter: '陈志明',
      reporterPhone: '681230',
      filledAt: `${dayOff(4)} 17:10`,
      lines: [
        {
          projectId: 'cp_seed_4',
          disease: { days: 1, crews: 2, qty: 430, tons: 175 },
          overlay: { days: 1, crews: 1, qty: 0.9, tons: 430 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 48,
        },
        {
          projectId: 'cp_seed_1',
          disease: { days: 1, crews: 1, qty: 120, tons: 31 },
          overlay: { days: 1, crews: 1, qty: 0.75, tons: 360 },
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 43,
        },
        {
          projectId: 'cp_seed_6',
          disease: { days: 1, crews: 2, qty: 290, tons: 86 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 50,
        },
      ],
    },
    {
      id: 'dr_seed_cw3',
      date: dayOff(5),
      region: '温州',
      dept: '温州西',
      reporter: '林少华',
      reporterPhone: '696887',
      filledAt: `${dayOff(5)} 09:20`,
      lines: [
        {
          projectId: 'cp_seed_7',
          disease: { days: 1, crews: 1, qty: 90, tons: 24 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 28,
        },
        {
          projectId: 'cp_seed_5',
          disease: { days: 1, crews: 1, qty: 150, tons: 40 },
          overlay: w0(),
          ultraThin: w0(),
          hotRecycleM2: 0,
          dayValue: 16,
        },
      ],
    },
  ];
};

/* ==================== 路面专项周报 · 周计划（项目×周 持久化） ==================== */

const WEEKLY_PLAN_KEY = 'md_campaign_weekly_plans_v1';

export interface WeekPlanWork { days: number; crews: number; qty: number; tons: number; }
export interface WeekPlan {
  disease: WeekPlanWork;    // 病害（qty: m²）
  overlay: WeekPlanWork;    // 罩面（qty: km）
  ultraThin: WeekPlanWork;   // 超薄（qty: km）
  hotRecycle: WeekPlanWork;  // 就地热再生（qty: m²）
  value: number;             // 产值（万元）
}

const wp0 = (): WeekPlanWork => ({ days: 0, crews: 0, qty: 0, tons: 0 });
const fullPlan = (d: Partial<WeekPlanWork>, o: Partial<WeekPlanWork>, u: Partial<WeekPlanWork>, h: Partial<WeekPlanWork>, v: number): WeekPlan =>
  ({ disease: { ...wp0(), ...d }, overlay: { ...wp0(), ...o }, ultraThin: { ...wp0(), ...u }, hotRecycle: { ...wp0(), ...h }, value: v });

/**
 * 周报计划数据：首次（localStorage 无数据）播种「本周计划」种子（上周预填口径演示）；
 * 下周计划留空 → 页面展示「下一周 Tab 红色 + 未填提示」。
 */
export function ensureWeeklyPlanSeeds(): Record<string, WeekPlan> {
  try {
    const raw = localStorage.getItem(WEEKLY_PLAN_KEY);
    if (raw) return JSON.parse(raw) as Record<string, WeekPlan>;
  } catch { /* fallthrough */ }
  const wk = ymdOf(curFriday());
  const seeds: Record<string, WeekPlan> = {
    [`cp_seed_1__${wk}`]: fullPlan(
      { days: 2, crews: 2, qty: 250, tons: 65 }, { days: 2, crews: 2, qty: 1.3, tons: 650 },
      { days: 0, crews: 0, qty: 0, tons: 0 }, { days: 1, crews: 1, qty: 800, tons: 120 }, 95),
    [`cp_seed_2__${wk}`]: fullPlan(
      { days: 2, crews: 2, qty: 180, tons: 48 }, { days: 0, crews: 0, qty: 0, tons: 0 },
      { days: 0, crews: 0, qty: 0, tons: 0 }, { days: 0, crews: 0, qty: 0, tons: 0 }, 28),
    [`cp_seed_4__${wk}`]: fullPlan(
      { days: 2, crews: 4, qty: 900, tons: 360 }, { days: 1, crews: 1, qty: 0.9, tons: 450 },
      { days: 0, crews: 0, qty: 0, tons: 0 }, { days: 0, crews: 0, qty: 0, tons: 0 }, 110),
    [`cp_seed_5__${wk}`]: fullPlan(
      { days: 2, crews: 2, qty: 320, tons: 85 }, { days: 0, crews: 0, qty: 0, tons: 0 },
      { days: 1, crews: 1, qty: 0.6, tons: 90 }, { days: 0, crews: 0, qty: 0, tons: 0 }, 42),
    [`cp_seed_6__${wk}`]: fullPlan(
      { days: 2, crews: 4, qty: 600, tons: 180 }, { days: 1, crews: 1, qty: 0.8, tons: 400 },
      { days: 0, crews: 0, qty: 0, tons: 0 }, { days: 0, crews: 0, qty: 0, tons: 0 }, 100),
    [`cp_seed_7__${wk}`]: fullPlan(
      { days: 2, crews: 2, qty: 190, tons: 50 }, { days: 1, crews: 1, qty: 1, tons: 150 },
      { days: 0, crews: 0, qty: 0, tons: 0 }, { days: 0, crews: 0, qty: 0, tons: 0 }, 55),
  };
  localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(seeds));
  return seeds;
}

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

/* ==================== 百日攻坚总表 ==================== */

import type { CampaignSummaryRow } from './types';
import { SEED_SUMMARY_ROWS } from './_seedSummary';

const SUMMARY_KEY = 'md_campaign_summary_v1';

export function getSummaryRows(): CampaignSummaryRow[] {
  const raw = localStorage.getItem(SUMMARY_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fallthrough */ }
  }
  // 种子数据：按区域内序号升序 + 末尾合计行
  const rows = SEED_SUMMARY_ROWS.map(r => ({ ...r }));
  rows.sort((a, b) => {
    if (a._isSummary && !b._isSummary) return 1;
    if (!a._isSummary && b._isSummary) return -1;
    return Number(a.seq) - Number(b.seq);
  });
  localStorage.setItem(SUMMARY_KEY, JSON.stringify(rows));
  return rows;
}

export function saveSummaryRows(rows: CampaignSummaryRow[]) {
  localStorage.setItem(SUMMARY_KEY, JSON.stringify(rows));
}

/** 按区域分组：{ 区域名: CampaignSummaryRow[] } */
export function groupSummaryByRegion(rows: CampaignSummaryRow[]): Map<string, CampaignSummaryRow[]> {
  const m = new Map<string, CampaignSummaryRow[]>();
  for (const r of rows) {
    if (r._isSummary) continue;
    if (!m.has(r.region)) m.set(r.region, []);
    m.get(r.region)!.push(r);
  }
  return m;
}

/* ==================== 总表 · 进度类动态计算（按当前日期实时计算，不取种子快照） ==================== */

const DAY_MS = 86400000;

/** 理论完成率 = 当前施工工期（今天-开工）/ 计划工期（完工-开工）；≥1 封顶；无开工/完工时间或工期≤0 → null（显示 "/"） */
export function theoryRateOf(r: CampaignSummaryRow): number | null {
  if (!r.planStart || !r.planEnd) return null;
  const start = new Date(r.planStart).getTime();
  const end = new Date(r.planEnd).getTime();
  const totalDays = (end - start) / DAY_MS;
  if (totalDays <= 0) return null;
  const elapsedDays = (Date.now() - start) / DAY_MS;
  return Math.min(elapsedDays / totalDays, 1);
}

/** 进度偏差 = 完成率 − 理论完成率；完成率≥1 → "已完工"；无法计算 → null */
export function schedDevOf(r: CampaignSummaryRow): number | string | null {
  if (r.doneRate >= 1) return '已完工';
  const t = theoryRateOf(r);
  if (t === null) return null;
  return r.doneRate - t;
}

/**
 * 进度预警（新规则）：
 *  完成率≥1 → 已完工；偏差≥0 → 正常施工；[-0.05,0) → 轻微滞后；[-0.1,-0.05) → 滞后；<-0.1 → 严重滞后
 */
export function schedWarnOf(r: CampaignSummaryRow): string {
  if (r.doneRate >= 1) return '已完工';
  const d = schedDevOf(r);
  if (typeof d !== 'number') return '—';
  if (d >= 0) return '正常施工';
  if (d >= -0.05) return '轻微滞后';
  if (d >= -0.1) return '滞后';
  return '严重滞后';
}

/** 距完工天数 = 完工日期 − 今天（负数=已逾期）；已完工 → "已完成"；无完工日期 → null */
export function daysLeftOf(r: CampaignSummaryRow): number | string | null {
  if (r.doneRate >= 1) return '已完成';
  if (!r.planEnd) return null;
  return Math.ceil((new Date(r.planEnd).getTime() - Date.now()) / DAY_MS);
}

/** 按当前工效还需天数 = 剩余金额 ÷ 开工以来日均产值；未开工 → "待开工"；无产值 → "无施工" */
export function needDaysOf(r: CampaignSummaryRow): number | string | null {
  if (r.doneRate >= 1) return '已完成';
  if (!r.planStart) return null;
  const elapsed = (Date.now() - new Date(r.planStart).getTime()) / DAY_MS;
  if (elapsed <= 0) return '待开工';
  const avgDaily = r.cumDone / elapsed;
  if (avgDaily <= 0) return '无施工';
  return Math.ceil(r.remainAmt / avgDaily);
}

/** 能否按期：还需天数 ≤ 距完工天数 → 按期，否则 不能按期；已完工 → "已完工" */
export function onTimeOf(r: CampaignSummaryRow): string {
  if (r.doneRate >= 1) return '已完工';
  const need = needDaysOf(r);
  const left = daysLeftOf(r);
  if (typeof need !== 'number' || typeof left !== 'number') return '—';
  return need <= left ? '按期' : '不能按期';
}

/** 区域聚合统计（金额/工效/进度，进度计数按动态规则） */
export function regionSummaryOf(rows: CampaignSummaryRow[]): {
  region: string;
  projectCount: number;
  totalAmt: number;
  cumDone: number;
  doneRate: number | null;
  weekValue: number;
  weekDiseaseTon: number;
  weekOverlayTon: number;
  onTimeCount: number;
  lagCount: number;
  doneCount: number;
} {
  const totalAmt = rows.reduce((s, r) => s + (r.totalAmt || 0), 0);
  const cumDone = rows.reduce((s, r) => s + (r.cumDone || 0), 0);
  const weekValue = rows.reduce((s, r) => s + (r.weekValue || 0), 0);
  const weekDiseaseTon = rows.reduce((s, r) => s + (typeof r.weekDiseaseTon === 'number' ? r.weekDiseaseTon : 0), 0);
  const weekOverlayTon = rows.reduce((s, r) => s + (typeof r.weekOverlayTon === 'number' ? r.weekOverlayTon : 0), 0);
  const onTimeCount = rows.filter(r => onTimeOf(r) === '按期').length;
  const lagCount = rows.filter(r => onTimeOf(r) === '不能按期').length;
  const doneCount = rows.filter(r => r.doneRate >= 1).length;
  return {
    region: rows[0]?.region || '合计',
    projectCount: rows.length,
    totalAmt, cumDone,
    doneRate: totalAmt > 0 ? cumDone / totalAmt : null,
    weekValue, weekDiseaseTon, weekOverlayTon,
    onTimeCount, lagCount, doneCount,
  };
}
