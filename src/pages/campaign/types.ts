/**
 * 百日攻坚模块 - 类型定义
 */

/** 工程类型：路面专项 / 路基桥隧 */
export type WorkType = 'pavement' | 'subgrade';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  pavement: '路面专项',
  subgrade: '路基桥隧',
};

/** 倒排周（上周五 ~ 本周四为一周，周起始日所在月为归属月） */
export interface WeekSlot {
  key: string;    // 周起始日 'YYYY-MM-DD'
  start: string;  // 周五
  end: string;    // 下周四
  label: string;  // 如 9/11-9/17
  month: number;  // 归属月（周起始日月份）
  seq: number;    // 基准日之后第几周
}

/** 百日攻坚 - 项目部项目信息（基础信息配置维护） */
export interface CampaignProject {
  id: string;
  /* ===== 项目基础信息 ===== */
  name: string;            // 项目名称
  shortName: string;       // 项目简称
  roadSection: string;     // 路段名称
  workType: WorkType;      // 工程类型（路面专项 / 路基桥隧）
  region: string;          // 区域（组织维度，不在配置表单维护：按填报账号所属组织自动带出，演示由预置数据提供）
  dept: string;            // 项目部（组织维度，不在配置表单维护，同上）
  groupSide: string;       // 集团内外（如：浙高运）
  amount: number;          // 项目金额（万元）
  contractName: string;    // 合同名称
  startDate: string;       // 工期起始时间
  endDate: string;         // 工期结束时间
  reporter: string;        // 填报人员姓名（不在配置表单维护：按填报账号自动带出，演示由预置数据提供）
  reporterPhone: string;   // 填报人员联系号码（不在配置表单维护，同上）

  /* ===== 项目施工信息 ===== */
  baseDate: string;        // 基准日（固定 9.10）
  baseDoneValue: number;   // 基准日已完成产值（万元）/ 基准日工程量
  pavementTotalQty: number;   // 路面专项总工程量
  pavementRemainQty: number;  // 路面专项剩余工程量
  diseaseTotalDays: number;   // 总计划工作日-病害
  diseaseRemainDays: number; // 剩余工作日-病害
  overlayTotalDays: number;   // 总计划工作日-罩面
  overlayRemainDays: number; // 剩余工作日-罩面

  /* ===== 周倒排计划（weekKey → 本周计划量），随时间往后持续新增 ===== */
  weeklyPlans: Record<string, number>;

  createdAt: string;
  updatedAt: string;
}

/* ==================== 每日产值填报 ==================== */

/** 单个工作类型的当日投入（病害量纲 m2；罩面/超薄量纲 km） */
export interface WorkInput {
  days: number;   // 施工天数
  crews: number;  // 投入班组数
  qty: number;    // 工程量（病害: m2，罩面/超薄: km）
  tons: number;   // 吨
}

export const emptyWorkInput = (): WorkInput => ({ days: 0, crews: 0, qty: 0, tons: 0 });

/** 每日填报 - 项目行（一张填报单内可含多个项目） */
export interface DailyReportLine {
  projectId: string;
  disease: WorkInput;      // 病害
  overlay: WorkInput;      // 罩面
  ultraThin: WorkInput;    // 超薄
  hotRecycleM2: number;    // 热再生 m2
  dayValue: number;        // 本日完成产值（万元）
}

/** 每日填报单（一个项目部某日一张，可含多个项目） */
export interface DailyReport {
  id: string;
  date: string;            // 填报日期
  region: string;          // 区域（根据填报项目部所属区域展示）
  dept: string;            // 项目部（根据填报项目部展示）
  reporter: string;        // 填报人（填报账号信息）
  reporterPhone: string;
  filledAt: string;        // 填报时间（提交后自动生成）
  lines: DailyReportLine[];
}

/* ==================== 项目部晾晒 ==================== */

/** 晾晒行累计数据（截至晾晒日）：各工种累计 + 热再生累计 + 累计完成产值
 *  复用 WorkInput 结构：days=累计施工天数、crews=累计投入班组数、qty=累计工程量(m2/km)、tons=累计吨 */
export interface RankAgg {
  disease: WorkInput;      // 病害累计
  overlay: WorkInput;      // 罩面累计
  ultraThin: WorkInput;    // 超薄累计
  hotRecycleM2: number;   // 热再生累计 m2
  value: number;          // 累计完成产值（万元）
}

export const zeroRankAgg = (): RankAgg => ({
  disease: emptyWorkInput(), overlay: emptyWorkInput(), ultraThin: emptyWorkInput(),
  hotRecycleM2: 0, value: 0,
});
