/**
 * 百日攻坚模块 - 类型定义
 */

/** 工程类型：路面专项 / 路基桥隧 */
export type WorkType = 'pavement' | 'subgrade';

/** 项目状态：已完工 / 进行中 / 未开工 */
export type ProjectStatus = 'finished' | 'ongoing' | 'notstarted';
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  finished: '已完工',
  ongoing: '进行中',
  notstarted: '未开工',
};

/** 施工班组（基础信息配置维护：名称 + 类型） */
export interface CampaignCrew {
  id: string;
  name: string;
  type: '自营' | '外协';
  dept?: string;           // 所属项目部（班组资源测算按项目部/区域汇总现有班组数）
  createdAt: string;
  updatedAt: string;
}

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
  projectStatus?: ProjectStatus; // 项目状态（已完工 / 进行中 / 未开工），基础信息配置统计用
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
  /* 分类型总工程量（路面专项）：病害 m² / 罩面 km / 超薄 km / 热再生 m² */
  totalDiseaseQty?: number;
  totalOverlayQty?: number;
  totalUltraThinQty?: number;
  totalHotRecycleQty?: number;
  /* 基准日（9.10）已完成工程量（分类型，单位同总工程量） */
  baseDoneDiseaseQty?: number;
  baseDoneOverlayQty?: number;
  baseDoneUltraThinQty?: number;
  baseDoneHotRecycleQty?: number;
  /* 总计划/剩余工作日（超薄、热再生；病害/罩面沿用 diseaseTotalDays / overlayTotalDays 等） */
  totalUltraThinDays?: number;
  totalHotRecycleDays?: number;
  remainUltraThinDays?: number;
  remainHotRecycleDays?: number;
  /* 截止基准日累计工作日（单位：天）。取数关系：总计划工作日 − 截止基准日累计工作日 = 截止基准日剩余工作日 */
  baseCumDaysDisease?: number;
  baseCumDaysOverlay?: number;
  baseCumDaysUltraThin?: number;
  baseCumDaysHotRecycle?: number;
  /* 截止基准日累计班组日（单位：天） */
  baseCrewDaysDisease?: number;
  baseCrewDaysOverlay?: number;
  baseCrewDaysUltraThin?: number;
  baseCrewDaysHotRecycle?: number;
  /* 截止基准日累计用料（单位同各分类工程量：病害 m² / 罩面 km / 超薄 km / 热再生 m²） */
  baseMaterialDisease?: number;
  baseMaterialOverlay?: number;
  baseMaterialUltraThin?: number;
  baseMaterialHotRecycle?: number;
  diseaseTotalDays: number;   // 总计划工作日-病害
  diseaseRemainDays: number; // 剩余工作日-病害（派生：总计划 − 截止基准日累计工作日）
  overlayTotalDays: number;   // 总计划工作日-罩面
  overlayRemainDays: number; // 剩余工作日-罩面（派生：总计划 − 截止基准日累计工作日）

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

/* ==================== 百日攻坚总表 ==================== */

/**
 * 百日攻坚总表 - 行数据（映射 Excel "百日攻坚总表" sheet 29 列）
 * 数据来源：Excel 台账导入 / 或从 CampaignProject + DailyReport 动态聚合
 *
 * 列分组：
 *   A-E  基本信息：序号 / 区域 / 项目部 / 路段项目 / 集团内外
 *   F-L  金额进度：总金额 / 剩余金额 / 累计完成 / 完成率 / 工期完成百分比 / 进度偏差 / 本周完成产值
 *   M-Q  工效预警：本周病害吨 / 本周罩面吨 / 病害日均工效 / 罩面日均工效 / 工效预警
 *   R-AC 时间节点：预计开工 / 预计完工 / 截止9月30日计划率·实际率·偏差 / 截止10月31日计划率·实际率·偏差
 *                  / 进度预警 / 距完工天数 / 按当前工效还需天数 / 能否按期
 */
export interface CampaignSummaryRow {
  /** 序号（1-based，合计行=0或字符串"合计"） */
  seq: number | string;
  /** 区域（杭州/湖州/嘉兴/绍兴/金衢/台州/丽水/温州/甬舟/省外/特种路面） */
  region: string;
  /** 项目部名称 */
  dept: string;
  /** 路段/项目名称 */
  road: string;
  /** 集团内外（浙高运/沪杭甬/集团外） */
  groupSide: string;
  /** 总金额（万元） */
  totalAmt: number;
  /** 剩余金额（万元） */
  remainAmt: number;
  /** 累计完成（万元） */
  cumDone: number;
  /** 完成率（0-1） */
  doneRate: number;
  /** 工期完成百分比（0-1） */
  schedRate: number;
  /** 进度偏差（数字=偏差率；"已完工"=已完成；字符串=其他文字说明） */
  scheduleDev: number | string;
  /** 本周完成产值（万元） */
  weekValue: number;
  /** 本周病害吨 */
  weekDiseaseTon: number;
  /** 本周罩面吨 */
  weekOverlayTon: number;
  /** 本周病害日均工效（吨/天）；"无施工"=无数据 */
  weekDiseaseEff: number | string;
  /** 本周罩面日均工效（吨/天）；"无施工"=无数据 */
  weekOverlayEff: number | string;
  /** 工效预警（无施工/正常/病害工效偏低/罩面工效偏低/病害、罩面工效偏低） */
  warn: string;
  /** 预计开工日期 YYYY-MM-DD */
  planStart: string;
  /** 预计完工日期 YYYY-MM-DD */
  planEnd: string;
  /** 截止9月30日计划率（0-1） */
  plan9Rate: number;
  /** 截止9月30日实际率（0-1） */
  actual9Rate: number;
  /** 9月偏差（实际-计划，0.xx 或 -0.xx） */
  dev9: number;
  /** 截止10月31日计划率（0-1） */
  plan10Rate: number;
  /** 截止10月31日实际率（0-1） */
  actual10Rate: number;
  /** 10月偏差 */
  dev10: number;
  /** 进度预警（已完成/绿色-正常/黄色-轻微滞后/红色-严重滞后） */
  schedWarn: string;
  /** 距完工天数（已完工=0或"已完成"） */
  daysLeft: number | string;
  /** 按当前工效还需天数；"无施工"/"待开工" 等字符串 */
  needDaysByPace: number | string;
  /** 能否按期（按期/不能按期/已完工） */
  onTime: string;
  /** 合计行标记 */
  _isSummary?: boolean;
}
