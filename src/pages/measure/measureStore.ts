/**
 * 计量应收模块 - 数据存储层（localStorage，v2 重构）
 *
 * 业务口径（方案 v1.1 表5-1 + 计量单创建流程）：
 *  - 已施工量   = 施工日志报工 + 手动计入产值 + 临时转入
 *  - 未上报计量量 = 已施工量 − 已上报计量量
 *  - 未批复计量量 = 已上报计量量 − 已批复计量量
 *  - 计量资格   = 正式清单 ∧ 合同内（数据池主列表仅展示可计量子目）
 *  - 章节层级   = 子目号前缀数字向下取整到百位（101-1-a → 100 章，1002-1 → 1000 章）
 *  - 计量单创建 = 选合同 → 选时间段完成的子目 → 调整（改数量/新增子目）→ 预览（章节汇总+子目明细）→ 手填扣款 → 确认
 */

import type {
  MeasureContract, MeasurePoolItem, MeasureTransferLog, CoopPushLog,
  MeasureStatement, MeasureStatementLine, MeasureStatementStatus,
  MeasureOrder, MeasureOrderLine, ReceivableOrder, PaymentRecord, StatementDeductions,
  ReceivableDepositLine, ReceivableInvoiceLine, ReceivableInvoiceInfo,
  ReceivablePlanLine, ReceivableAttachment,
} from './types';
import { fmtMoney } from './_shared';

// v5：v3 引入主/协同合同，v4 扩充种子，v5 新增已批复计量单种子（创建应收单向导演示数据），升级避免旧 localStorage 冲突
const KEY_CONTRACTS = 'md_measure5_contracts';
const KEY_POOL = 'md_measure5_pool';
const KEY_TRANSFERS = 'md_measure5_transfers';
const KEY_COOP_PUSHES = 'md_measure5_coop_pushes';
const KEY_STATEMENTS = 'md_measure5_statements';
const KEY_ORDERS = 'md_measure5_orders';
const KEY_RECEIVABLES = 'md_measure5_receivables';
const KEY_PAYMENTS = 'md_measure5_payments';

export function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
export function nowStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function load<T>(key: string, seed: () => T): T {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* 重新播种 */ }
  }
  const v = seed();
  localStorage.setItem(key, JSON.stringify(v));
  return v;
}
function save<T>(key: string, v: T) {
  localStorage.setItem(key, JSON.stringify(v));
}

// ==================== 章节推导（合同清单层级结构） ====================

/** 子目号 → 章节号：前缀数字向下取整到百位（101-1-a→'100'，202-1→'200'，1002-1→'1000'，1103-2→'1100'） */
export function chapterOf(code: string): string {
  const m = /^(\d+)/.exec(code.trim());
  if (!m) return '';
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 100) return '';
  return String(Math.floor(n / 100) * 100);
}

/** 章节名称（公路养护工程标准清单章节） */
export const CHAPTER_NAMES: Record<string, string> = {
  '100': '总则',
  '200': '路基',
  '300': '路面',
  '400': '桥梁与涵洞',
  '500': '隧道',
  '600': '交通安全设施',
  '700': '绿化及环境保护设施',
  '800': '房建工程',
  '900': '机电工程',
  '1000': '小修保养年度总承包',
  '1100': '计日工计价表',
};
export const chapterName = (ch: string) => CHAPTER_NAMES[ch] || '其他章节';

// ==================== 计量口径计算（表5-1 + 协同合同扩展） ====================

/** 本组织完成量 = 报工 + 手动 + 临时转入 */
export const ownQty = (p: MeasurePoolItem) =>
  (p.logQty || 0) + (p.manualQty || 0) + (p.transferInQty || 0);
/** 协同单位完成量（主合同子目，由协同合同推送累计） */
export const coopBuiltQty = (p: MeasurePoolItem) => p.coopQty || 0;
/** 已施工量 = 本组织完成 + 协同单位完成 */
export const builtQty = (p: MeasurePoolItem) => ownQty(p) + coopBuiltQty(p);
/** 未上报计量量 = 已施工量 − 已上报计量量 */
export const unreportedQty = (p: MeasurePoolItem) => builtQty(p) - (p.reportedQty || 0);
/** 未批复计量量 = 已上报计量量 − 已批复计量量 */
export const unapprovedQty = (p: MeasurePoolItem) => (p.reportedQty || 0) - (p.approvedQty || 0);
/** 计量资格：正式 ∧ 合同内（缺一不可） */
export const canMeasure = (p: MeasurePoolItem) => p.listType === 'formal' && p.contractAttr === 'in';
/** 协同子目可推送量 = 本组织完成量 − 已推送到主合同的量（协同合同不直接生成计量单） */
export const unpushedQty = (p: MeasurePoolItem) => ownQty(p) - (p.pushedQty || 0);
/** 本组织未上报量（计量行来源构成拆分：历史申报优先消耗本组织量） */
export const ownUnreportedQty = (p: MeasurePoolItem) =>
  Math.max(0, Math.min(ownQty(p) - (p.reportedQty || 0), unreportedQty(p)));
/** 协同单位未上报量 = 未上报计量量 − 本组织未上报量 */
export const coopUnreportedQty = (p: MeasurePoolItem) =>
  Math.max(0, unreportedQty(p) - ownUnreportedQty(p));

/** 时间段内完成量（向导选量：选择某个时间段完成的清单子目） */
export function periodBuiltQty(p: MeasurePoolItem, from?: string, to?: string): number {
  if (!p.completionBatches || p.completionBatches.length === 0) return 0;
  return p.completionBatches
    .filter(b => (!from || b.date >= from) && (!to || b.date <= to))
    .reduce((s, b) => s + b.qty, 0);
}

/** 到上期末累计完成（数量/金额）：从该合同已批复计量单中，截止日期早于本次起始日的行累计 */
export function prevCumulative(contractId: string, poolItemId: string, beforeDate?: string): { qty: number; amount: number } {
  let qty = 0, amount = 0;
  for (const st of getStatements()) {
    if (st.contractId !== contractId || st.status !== 'approved') continue;
    if (beforeDate && st.periodEnd && st.periodEnd >= beforeDate) continue;
    for (const l of st.lines) {
      if (l.poolItemId === poolItemId) {
        qty += l.qty;
        amount += l.amount;
      }
    }
  }
  return { qty: Math.round(qty * 100) / 100, amount: Math.round(amount * 100) / 100 };
}

// ==================== 计量单汇总计算（图一） ====================

export interface ChapterAgg {
  chapter: string;
  name: string;
  contractAmount: number;    // 合同价 = Σ contractQty × price
  changeTotal: number;       // 变更总金额
  changedAmount: number;     // 变更后金额
  prevCumAmount: number;     // 到上期末完成金额
  curAmount: number;         // 本期完成金额
  curChange: number;         // 本期完成其中变更
  toEndAmount: number;       // 到本期末完成金额
}

/** 按章节聚合计量单行（图一章节汇总） */
export function aggregateByChapter(lines: MeasureStatementLine[]): ChapterAgg[] {
  const map = new Map<string, ChapterAgg>();
  for (const l of lines) {
    const ch = l.chapter || chapterOf(l.code) || '';
    if (!map.has(ch)) {
      map.set(ch, {
        chapter: ch, name: chapterName(ch),
        contractAmount: 0, changeTotal: 0, changedAmount: 0,
        prevCumAmount: 0, curAmount: 0, curChange: 0, toEndAmount: 0,
      });
    }
    const g = map.get(ch)!;
    g.contractAmount += Math.round(((l.contractQty ?? 0) * l.price) * 100) / 100;
    g.changeTotal += l.changeAmount || 0;
    g.prevCumAmount += l.prevCumAmount;
    g.curAmount += l.amount;
  }
  const list = [...map.values()].sort((a, b) => a.chapter.localeCompare(b.chapter));
  for (const g of list) {
    g.changedAmount = Math.round((g.contractAmount + g.changeTotal) * 100) / 100;
    g.toEndAmount = Math.round((g.prevCumAmount + g.curAmount) * 100) / 100;
  }
  return list;
}

/** 扣款净额（负数为扣减，正数为增加） */
export function deductionsNet(d?: StatementDeductions): number {
  if (!d) return 0;
  const r2 = (n: number | undefined) => Math.round((n || 0) * 100) / 100;
  return r2(
    (d.priceAdjustment || 0) + (d.assessmentReward || 0)
    + (d.mobilizationAdvance || 0) + (d.materialAdvance || 0)
    - (d.claim || 0) - (d.penalty || 0) - (d.assessmentDeduction || 0)
    - (d.lateInterest || 0) - (d.mobilizationAdvanceBack || 0) - (d.materialAdvanceBack || 0)
    - (d.retention || 0)
  );
}

/** 实际支付金额 = 本期完成合计 + 扣款净额（图一最末行） */
export function netPayableOf(st: Pick<MeasureStatement, 'totalAmount' | 'deductions'>): number {
  return Math.round((st.totalAmount + deductionsNet(st.deductions)) * 100) / 100;
}

// ==================== 种子数据 ====================

/** 计量模块引用的收入合同（主合同 × 3 + 协同合同 × 1，体现 1 项目部 : N 合同）
 *  主合同 = 当前单位（顺畅养护公司）为合同签订的主要单位；协同合同 = 当前单位为合同协同单位 */
function seedContracts(): MeasureContract[] {
  return [
    {
      id: 'mc-hz01', code: 'JT-YH-2025-012', name: '杭州北段高速公路日常养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 14063208, projectName: '杭州北项目部', startDate: '2025-01-01', endDate: '2027-12-31',
      role: 'main', coopOrgName: '路畅交通工程有限公司',
    },
    {
      id: 'mc-hz02', code: 'JT-YH-2025-013', name: '杭州北段桥梁专项维修养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 3280000, projectName: '杭州北项目部', startDate: '2025-06-01', endDate: '2026-12-31',
      role: 'main',
    },
    {
      id: 'mc-hz03', code: 'DF-YH-2026-004', name: '湖州地方道路综合养护合同',
      ownerType: 'other', ownerName: '湖州市公路管理局', partyB: '顺畅养护公司',
      amount: 1860000, projectName: '湖州项目部', startDate: '2026-01-01', endDate: '2026-12-31',
      role: 'main',
    },
    {
      // 协同合同：当前单位（顺畅养护公司）为合同协同单位，主要单位为主合同 mc-hz01 签订单位；
      // 协同合同只做查看确认 + 推送到主合同，不直接生成计量单
      id: 'mc-xz01', code: 'XT-YH-2026-021', name: '杭州北段日常养护合同（路基工程协同施工）',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 1280000, projectName: '杭州北项目部', startDate: '2026-03-01', endDate: '2027-12-31',
      role: 'coop', mainContractId: 'mc-hz01', mainOrgName: '顺畅养护公司',
    },
    {
      // 主合同：宁波东段（当前单位为主要单位，宏远路桥为协同施工单位）
      id: 'mc-nb01', code: 'JT-YH-2026-031', name: '宁波东段高速公路日常养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 9860000, projectName: '宁波项目部', startDate: '2026-01-01', endDate: '2028-12-31',
      role: 'main', coopOrgName: '宏远路桥工程有限公司',
    },
    {
      // 主合同：温州段桥梁专项（当前单位为主要单位，瓯江交建为协同施工单位）
      id: 'mc-wz01', code: 'JT-YH-2026-035', name: '温州段高速公路桥梁专项维修养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 4520000, projectName: '温州项目部', startDate: '2026-02-01', endDate: '2027-06-30',
      role: 'main', coopOrgName: '瓯江交通建设有限公司',
    },
    {
      // 协同合同：当前单位为宁波东段主合同 mc-nb01 的协同施工单位（路基·交安协同）
      id: 'mc-xz02', code: 'XT-YH-2026-033', name: '宁波东段日常养护合同（路基·交安协同施工）',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 960000, projectName: '宁波项目部', startDate: '2026-04-01', endDate: '2028-06-30',
      role: 'coop', mainContractId: 'mc-nb01', mainOrgName: '顺畅养护公司',
    },
    {
      // 协同合同：当前单位为温州段桥梁主合同 mc-wz01 的协同施工单位（下部结构协同）
      id: 'mc-xz03', code: 'XT-YH-2026-038', name: '温州段桥梁专项维修合同（下部结构协同施工）',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 750000, projectName: '温州项目部', startDate: '2026-05-01', endDate: '2027-03-31',
      role: 'coop', mainContractId: 'mc-wz01', mainOrgName: '顺畅养护公司',
    },
  ];
}

/** 批次快捷构造 */
const B = (date: string, qty: number, source: 'log' | 'manual' | 'transfer' = 'log'): { date: string; qty: number; source: 'log' | 'manual' | 'transfer' } =>
  ({ date, qty, source });

/**
 * 数据池种子：合同清单按章节层级（100总则/200路基/300路面/600交安/700绿化/1000小修保养…）
 * 主列表仅展示 正式·合同内（可计量）子目；临时/合同外子目保留在池中供「转入正式」。
 */
function seedPool(): MeasurePoolItem[] {
  const t = '2026-09-01 09:00';
  const base = { createdAt: t, updatedAt: t };
  // —— 合同1：杭州北段日常养护（交投）
  const c1 = { contractId: 'mc-hz01', contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同', projectName: '杭州北项目部' };
  // —— 合同2：杭州北段桥梁专项（交投）
  const c2 = { contractId: 'mc-hz02', contractCode: 'JT-YH-2025-013', contractName: '杭州北段桥梁专项维修养护合同', projectName: '杭州北项目部' };
  // —— 合同3：湖州地方道路（其他业主）
  const c3 = { contractId: 'mc-hz03', contractCode: 'DF-YH-2026-004', contractName: '湖州地方道路综合养护合同', projectName: '湖州项目部' };
  // —— 协同合同4：杭州北段日常养护（路基协同施工，当前单位为协同单位）
  const c4 = { contractId: 'mc-xz01', contractCode: 'XT-YH-2026-021', contractName: '杭州北段日常养护合同（路基工程协同施工）', projectName: '杭州北项目部' };
  // —— 合同5：宁波东段日常养护（主合同，宏远路桥协同）
  const c5 = { contractId: 'mc-nb01', contractCode: 'JT-YH-2026-031', contractName: '宁波东段高速公路日常养护合同', projectName: '宁波项目部' };
  // —— 合同6：温州段桥梁专项（主合同，瓯江交建协同）
  const c6 = { contractId: 'mc-wz01', contractCode: 'JT-YH-2026-035', contractName: '温州段高速公路桥梁专项维修养护合同', projectName: '温州项目部' };
  // —— 协同合同7：宁波东段日常养护（路基·交安协同施工，当前单位为协同单位）
  const c7 = { contractId: 'mc-xz02', contractCode: 'XT-YH-2026-033', contractName: '宁波东段日常养护合同（路基·交安协同施工）', projectName: '宁波项目部' };
  // —— 协同合同8：温州段桥梁专项（下部结构协同施工，当前单位为协同单位）
  const c8 = { contractId: 'mc-xz03', contractCode: 'XT-YH-2026-038', contractName: '温州段桥梁专项维修合同（下部结构协同施工）', projectName: '温州项目部' };

  return [
    // ===== 合同1 · 100 章 总则 =====
    {
      id: 'pool-101-1-a', ...c1, code: '101-1-a', name: '按合同条款规定提供建筑工程一切险', unit: '年·总额', price: 41156,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3, logQty: 2, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-20', 1), B('2026-08-15', 1)],
      transferredQty: 0, reportedQty: 1, approvedQty: 1, subcontractQty: 0,
      ...base,
    },
    {
      id: 'pool-101-1-b', ...c1, code: '101-1-b', name: '按合同条款规定提供第三方责任险', unit: '年·总额', price: 5000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3, logQty: 1, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-20', 1)],
      transferredQty: 0, reportedQty: 1, approvedQty: 1, subcontractQty: 0,
      ...base,
    },
    {
      id: 'pool-102-1', ...c1, code: '102-1', name: '档案资料编制费', unit: '年·总额', price: 10000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3, logQty: 1, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-08-22', 1)],
      transferredQty: 0, reportedQty: 1, approvedQty: 0, subcontractQty: 0,
      remark: '第2期已提交待批复', ...base,
    },
    {
      id: 'pool-102-2', ...c1, code: '102-2', name: '交通管理费', unit: '年·总额', price: 166044,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3, logQty: 1.5, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-05', 0.5), B('2026-09-03', 1)],
      transferredQty: 0, reportedQty: 0.5, approvedQty: 0, subcontractQty: 0,
      remark: '2026-09 批次 1 年·总额 待下期计量', ...base,
    },
    {
      id: 'pool-102-3', ...c1, code: '102-3', name: '安全生产费', unit: '年·总额', price: 268991,
      listType: 'formal', contractAttr: 'in', isSafeFee: true,
      totalQty: 3, logQty: 2, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-30', 1), B('2026-08-31', 1)],
      transferredQty: 0, reportedQty: 1.5, approvedQty: 0.75, subcontractQty: 0,
      ...base,
    },
    {
      id: 'pool-102-4', ...c1, code: '102-4', name: '日常养护管理信息化服务费', unit: '年·总额', price: 50000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3, logQty: 1, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-09-08', 1)],
      transferredQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    // ===== 合同1 · 200 章 路基 =====
    {
      id: 'pool-202-1', ...c1, code: '202-1', name: '路基排水沟清理修复', unit: 'm³', price: 120,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3200, logQty: 2100, manualQty: 180, transferInQty: 0, coopQty: 400,
      completionBatches: [B('2026-06-11', 600), B('2026-07-18', 800), B('2026-08-25', 880)],
      transferredQty: 0, reportedQty: 1400, approvedQty: 1400, subcontractQty: 1200,
      remark: '协同单位（协同合同 XT-YH-2026-021）已完成 400 m³，与本组织完成量合并参与计量', ...base,
    },
    {
      id: 'pool-203-1', ...c1, code: '203-1', name: '边坡溜塌处理', unit: 'm³', price: 60,
      listType: 'formal', contractAttr: 'in',
      totalQty: 480, logQty: 260, manualQty: 20, transferInQty: 0,
      completionBatches: [B('2026-07-22', 120), B('2026-09-02', 160)],
      transferredQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 100,
      ...base,
    },
    // ===== 合同1 · 300 章 路面 =====
    {
      id: 'pool-302-1', ...c1, code: '302-1', name: '路面灌缝', unit: 'm', price: 15,
      listType: 'formal', contractAttr: 'in',
      totalQty: 20000, logQty: 12000, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-15', 4000), B('2026-07-10', 5000), B('2026-08-20', 3000)],
      transferredQty: 0, reportedQty: 12000, approvedQty: 8000, subcontractQty: 0,
      remark: '第1期已批 8000m，第2期已提交 4000m 待批复', ...base,
    },
    {
      id: 'pool-303-1', ...c1, code: '303-1', name: '沥青路面坑槽修补', unit: 'm²', price: 86.5,
      listType: 'formal', contractAttr: 'in',
      totalQty: 5000, logQty: 2000, manualQty: 500, transferInQty: 300,
      completionBatches: [B('2026-06-18', 1200), B('2026-07-15', 800), B('2026-08-22', 800)],
      transferredQty: 0, reportedQty: 2500, approvedQty: 2200, subcontractQty: 2600,
      remark: '表5-1示例子目：未上报 300 m² 为下期可申报余量', ...base,
    },
    // ===== 合同1 · 600 章 交通安全设施 =====
    {
      id: 'pool-602-1', ...c1, code: '602-1', name: '波形护栏维修', unit: 'm', price: 210,
      listType: 'formal', contractAttr: 'in',
      totalQty: 1800, logQty: 950, manualQty: 0, transferInQty: 0, coopQty: 120,
      completionBatches: [B('2026-07-08', 450), B('2026-09-05', 500)],
      transferredQty: 0, reportedQty: 450, approvedQty: 450, subcontractQty: 400,
      remark: '其中 120 m 为协同单位完成（经协同合同推送）', ...base,
    },
    {
      id: 'pool-603-1', ...c1, code: '603-1', name: '标志标线维护', unit: '项', price: 3800,
      listType: 'formal', contractAttr: 'in',
      totalQty: 40, logQty: 18, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-08-12', 8), B('2026-09-10', 10)],
      transferredQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    // ===== 合同1 · 700 章 绿化及环境保护设施 =====
    {
      id: 'pool-701-1', ...c1, code: '701-1', name: '中央分隔带绿化修剪', unit: 'km', price: 12000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 120, logQty: 65, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-28', 20), B('2026-08-14', 25), B('2026-09-11', 20)],
      transferredQty: 0, reportedQty: 45, approvedQty: 45, subcontractQty: 30,
      ...base,
    },
    // ===== 合同1 · 1000 章 小修保养年度总承包 =====
    {
      id: 'pool-1001-1', ...c1, code: '1001-1', name: '小修保养年度总承包', unit: '月', price: 700000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 36, logQty: 9, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-30', 1), B('2026-07-31', 1), B('2026-08-31', 1)],
      transferredQty: 0, reportedQty: 3, approvedQty: 3, subcontractQty: 3,
      ...base,
    },
    // ===== 合同1 · 临时/合同外（不在数据池主列表展示，仅供「转入正式」） =====
    {
      id: 'pool-602-x', ...c1, code: '602-x', name: '紧急抢修波形护栏(合同外)', unit: 'm', price: 230,
      listType: 'formal', contractAttr: 'out',
      totalQty: 800, logQty: 600, manualQty: 100, transferInQty: 0,
      completionBatches: [B('2026-08-05', 700)],
      transferredQty: 200, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '合同外施工量，经转入正式后方可计量', ...base,
    },
    {
      id: 'pool-tmp-001', ...c1, code: 'TMP-001', name: '临时路面维修(应急)', unit: 'm²', price: 78,
      listType: 'temp', contractAttr: 'out',
      totalQty: undefined, logQty: 500, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-30', 500)],
      transferredQty: 400, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '临时清单：施工量经转入正式参与计量', ...base,
    },
    // ===== 合同2 · 400 章 桥梁与涵洞 =====
    {
      id: 'pool-401-1', ...c2, code: '401-1', name: '桥梁伸缩缝更换', unit: 'm', price: 2350,
      listType: 'formal', contractAttr: 'in',
      totalQty: 620, logQty: 380, manualQty: 20, transferInQty: 0,
      completionBatches: [B('2026-06-10', 200), B('2026-08-08', 200)],
      transferredQty: 0, reportedQty: 350, approvedQty: 350, subcontractQty: 300,
      ...base,
    },
    {
      id: 'pool-402-1', ...c2, code: '402-1', name: '桥面铺装维修', unit: 'm²', price: 320,
      listType: 'formal', contractAttr: 'in',
      totalQty: 2400, logQty: 1200, manualQty: 100, transferInQty: 0,
      completionBatches: [B('2026-07-12', 700), B('2026-09-06', 600)],
      transferredQty: 0, reportedQty: 1100, approvedQty: 900, subcontractQty: 800,
      ...base,
    },
    // ===== 合同3 · 300 章 路面（湖州） =====
    {
      id: 'pool-301-1', ...c3, code: '301-1', name: '县道路面大中修', unit: 'km', price: 286000,
      listType: 'formal', contractAttr: 'in',
      totalQty: 6.5, logQty: 4.2, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-02', 2.2), B('2026-09-09', 2)],
      transferredQty: 0, reportedQty: 4, approvedQty: 3.5, subcontractQty: 3,
      ...base,
    },
    // ===== 协同合同4 · 路基协同施工（当前单位为协同单位；只做查看确认 + 推送到主合同 mc-hz01，不直接生成计量单） =====
    {
      id: 'pool-xz-202-1', ...c4, code: '202-1', name: '路基排水沟清理修复（协同施工）', unit: 'm³', price: 120,
      listType: 'formal', contractAttr: 'in',
      totalQty: 1200, logQty: 700, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-25', 300), B('2026-08-10', 400)],
      transferredQty: 0, pushedQty: 400, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '协同合同子目：已完工未推送量确认后推送主合同参与计量', ...base,
    },
    {
      id: 'pool-xz-203-1', ...c4, code: '203-1', name: '边坡溜塌处理（协同施工）', unit: 'm³', price: 60,
      listType: 'formal', contractAttr: 'in',
      totalQty: 400, logQty: 220, manualQty: 30, transferInQty: 0,
      completionBatches: [B('2026-07-15', 150), B('2026-09-01', 100)],
      transferredQty: 0, pushedQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    {
      id: 'pool-xz-602-1', ...c4, code: '602-1', name: '波形护栏维修（协同施工）', unit: 'm', price: 210,
      listType: 'formal', contractAttr: 'in',
      totalQty: 600, logQty: 320, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-08-20', 320)],
      transferredQty: 0, pushedQty: 120, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    // ===== 主合同5 · 宁波东段日常养护（200 路基 / 300 路面 / 600 交安 / 700 绿化） =====
    {
      id: 'pool-nb-202-1', ...c5, code: '202-1', name: '路基边沟浆砌修复', unit: 'm³', price: 110,
      listType: 'formal', contractAttr: 'in',
      totalQty: 2000, logQty: 900, manualQty: 0, transferInQty: 0, coopQty: 260,
      completionBatches: [B('2026-06-14', 400), B('2026-07-30', 280), B('2026-09-10', 220)],
      transferredQty: 0, reportedQty: 500, approvedQty: 500, subcontractQty: 400,
      remark: '其中 260 m³ 为协同单位（宏远路桥，协同合同 XT-YH-2026-033）完成', ...base,
    },
    {
      id: 'pool-nb-303-1', ...c5, code: '303-1', name: '沥青路面坑槽修补', unit: 'm²', price: 92,
      listType: 'formal', contractAttr: 'in',
      totalQty: 3600, logQty: 1500, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-06', 900), B('2026-08-18', 600)],
      transferredQty: 0, reportedQty: 1000, approvedQty: 1000, subcontractQty: 800,
      ...base,
    },
    {
      id: 'pool-nb-602-1', ...c5, code: '602-1', name: '波形护栏更换', unit: 'm', price: 195,
      listType: 'formal', contractAttr: 'in',
      totalQty: 900, logQty: 300, manualQty: 0, transferInQty: 0, coopQty: 90,
      completionBatches: [B('2026-07-28', 180), B('2026-09-08', 120)],
      transferredQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '其中 90 m 为协同单位完成（经协同合同推送），下期与自施工量合并计量', ...base,
    },
    {
      id: 'pool-nb-701-1', ...c5, code: '701-1', name: '中分带绿化修剪养护', unit: 'km', price: 10500,
      listType: 'formal', contractAttr: 'in',
      totalQty: 60, logQty: 25, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-30', 10), B('2026-08-31', 15)],
      transferredQty: 0, reportedQty: 10, approvedQty: 10, subcontractQty: 8,
      ...base,
    },
    // ===== 主合同6 · 温州段桥梁专项（400 桥梁与涵洞） =====
    {
      id: 'pool-wz-401-1', ...c6, code: '401-1', name: '桥梁伸缩缝更换', unit: 'm', price: 2480,
      listType: 'formal', contractAttr: 'in',
      totalQty: 500, logQty: 200, manualQty: 0, transferInQty: 0, coopQty: 60,
      completionBatches: [B('2026-06-25', 90), B('2026-08-12', 110)],
      transferredQty: 0, reportedQty: 150, approvedQty: 150, subcontractQty: 100,
      remark: '其中 60 m 为协同单位（瓯江交建，协同合同 XT-YH-2026-038）完成', ...base,
    },
    {
      id: 'pool-wz-403-1', ...c6, code: '403-1', name: '桥梁裂缝注浆处理', unit: 'm', price: 85,
      listType: 'formal', contractAttr: 'in',
      totalQty: 2600, logQty: 1200, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-16', 700), B('2026-09-03', 500)],
      transferredQty: 0, reportedQty: 800, approvedQty: 800, subcontractQty: 600,
      ...base,
    },
    // ===== 协同合同7 · 宁波东段（路基·交安协同施工，只做查看确认 + 推送到主合同 mc-nb01） =====
    {
      id: 'pool-xz2-202-1', ...c7, code: '202-1', name: '路基边沟浆砌修复（协同施工）', unit: 'm³', price: 110,
      listType: 'formal', contractAttr: 'in',
      totalQty: 800, logQty: 500, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-06-20', 220), B('2026-08-15', 280)],
      transferredQty: 0, pushedQty: 260, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '已推送 260 m³ 至主合同 JT-YH-2026-031·202-1，剩余未推送量确认后可继续推送', ...base,
    },
    {
      id: 'pool-xz2-203-1', ...c7, code: '203-1', name: '边坡溜塌处理（协同施工）', unit: 'm³', price: 75,
      listType: 'formal', contractAttr: 'in',
      totalQty: 500, logQty: 240, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-25', 140), B('2026-09-14', 100)],
      transferredQty: 0, pushedQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '已完工 240 m³ 尚未推送，确认后推送主合同参与计量', ...base,
    },
    {
      id: 'pool-xz2-602-1', ...c7, code: '602-1', name: '波形护栏更换（协同施工）', unit: 'm', price: 195,
      listType: 'formal', contractAttr: 'in',
      totalQty: 400, logQty: 160, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-08-08', 160)],
      transferredQty: 0, pushedQty: 90, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    // ===== 协同合同8 · 温州段桥梁（下部结构协同施工，只做查看确认 + 推送到主合同 mc-wz01） =====
    {
      id: 'pool-xz3-401-1', ...c8, code: '401-1', name: '桥梁伸缩缝更换（协同施工）', unit: 'm', price: 2480,
      listType: 'formal', contractAttr: 'in',
      totalQty: 200, logQty: 100, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-08', 40), B('2026-09-02', 60)],
      transferredQty: 0, pushedQty: 60, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      ...base,
    },
    {
      id: 'pool-xz3-405-1', ...c8, code: '405-1', name: '桥墩加固（协同施工）', unit: 'm³', price: 310,
      listType: 'formal', contractAttr: 'in',
      totalQty: 300, logQty: 130, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-08-05', 60), B('2026-09-20', 70)],
      transferredQty: 0, pushedQty: 0, reportedQty: 0, approvedQty: 0, subcontractQty: 0,
      remark: '已完工 130 m³ 尚未推送，确认后推送主合同参与计量', ...base,
    },
  ];
}

function seedTransfers(): MeasureTransferLog[] {
  return [
    {
      id: 'tr1', fromItemId: 'pool-tmp-001', fromCode: 'TMP-001', fromName: '临时路面维修(应急)',
      toItemId: 'pool-303-1', toCode: '303-1', toName: '沥青路面坑槽修补',
      qty: 300, operator: '陈技术', createdAt: '2026-08-20 15:30',
    },
  ];
}

/** 协同推送种子：协同合同 XT-YH-2026-021 / XT-YH-2026-033 / XT-YH-2026-038 已推送到各自关联主合同 */
function seedCoopPushes(): CoopPushLog[] {
  return [
    {
      id: 'cp1',
      fromContractId: 'mc-xz01', fromContractCode: 'XT-YH-2026-021',
      fromItemId: 'pool-xz-202-1', fromCode: '202-1', fromName: '路基排水沟清理修复（协同施工）',
      toContractId: 'mc-hz01', toContractCode: 'JT-YH-2025-012',
      toItemId: 'pool-202-1', toCode: '202-1', toName: '路基排水沟清理修复',
      qty: 400, operator: '陈技术', createdAt: '2026-09-05 10:20',
    },
    {
      id: 'cp2',
      fromContractId: 'mc-xz01', fromContractCode: 'XT-YH-2026-021',
      fromItemId: 'pool-xz-602-1', fromCode: '602-1', fromName: '波形护栏维修（协同施工）',
      toContractId: 'mc-hz01', toContractCode: 'JT-YH-2025-012',
      toItemId: 'pool-602-1', toCode: '602-1', toName: '波形护栏维修',
      qty: 120, operator: '陈技术', createdAt: '2026-09-12 14:05',
    },
    {
      id: 'cp3',
      fromContractId: 'mc-xz02', fromContractCode: 'XT-YH-2026-033',
      fromItemId: 'pool-xz2-202-1', fromCode: '202-1', fromName: '路基边沟浆砌修复（协同施工）',
      toContractId: 'mc-nb01', toContractCode: 'JT-YH-2026-031',
      toItemId: 'pool-nb-202-1', toCode: '202-1', toName: '路基边沟浆砌修复',
      qty: 260, operator: '陈技术', createdAt: '2026-09-18 09:40',
    },
    {
      id: 'cp4',
      fromContractId: 'mc-xz02', fromContractCode: 'XT-YH-2026-033',
      fromItemId: 'pool-xz2-602-1', fromCode: '602-1', fromName: '波形护栏更换（协同施工）',
      toContractId: 'mc-nb01', toContractCode: 'JT-YH-2026-031',
      toItemId: 'pool-nb-602-1', toCode: '602-1', toName: '波形护栏更换',
      qty: 90, operator: '陈技术', createdAt: '2026-09-20 16:25',
    },
    {
      id: 'cp5',
      fromContractId: 'mc-xz03', fromContractCode: 'XT-YH-2026-038',
      fromItemId: 'pool-xz3-401-1', fromCode: '401-1', fromName: '桥梁伸缩缝更换（协同施工）',
      toContractId: 'mc-wz01', toContractCode: 'JT-YH-2026-035',
      toItemId: 'pool-wz-401-1', toCode: '401-1', toName: '桥梁伸缩缝更换',
      qty: 60, operator: '陈技术', createdAt: '2026-09-25 11:15',
    },
  ];
}

/** 计量单种子：第1期已批复 + 第2期已提交（交投）+ 湖州待自闭环（其他业主） */
function seedStatements(): MeasureStatement[] {
  return [
    {
      id: 'ms-1', code: 'JL-202607-001', period: '2026-07', periodNo: 1,
      periodStart: '2026-07-01', periodEnd: '2026-07-31',
      contractId: 'mc-hz01', contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同',
      projectName: '杭州北项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      lines: [
        {
          id: 'msl-1', poolItemId: 'pool-302-1', chapter: '300', code: '302-1', name: '路面灌缝',
          unit: 'm', price: 15, contractQty: 20000, changeAmount: 0,
          qty: 8000, amount: 120000, prevCumQty: 0, prevCumAmount: 0,
        },
        {
          id: 'msl-2', poolItemId: 'pool-101-1-a', chapter: '100', code: '101-1-a', name: '按合同条款规定提供建筑工程一切险',
          unit: '年·总额', price: 41156, contractQty: 3, changeAmount: 0,
          qty: 1, amount: 41156, prevCumQty: 0, prevCumAmount: 0,
        },
        {
          id: 'msl-3', poolItemId: 'pool-101-1-b', chapter: '100', code: '101-1-b', name: '按合同条款规定提供第三方责任险',
          unit: '年·总额', price: 5000, contractQty: 3, changeAmount: 0,
          qty: 1, amount: 5000, prevCumQty: 0, prevCumAmount: 0,
        },
      ],
      totalAmount: 166156, safeFeeAmount: 0,
      deductions: { priceAdjustment: 0, claim: 0, penalty: 0, assessmentDeduction: 0, assessmentReward: 0, lateInterest: 0 },
      status: 'approved', approvedAmount: 166156, deduction: 0,
      approveOpinion: '同意本期计量',
      submittedAt: '2026-08-02 09:10', pushedAt: '2026-08-02 09:30', approvedAt: '2026-08-08 16:20',
      handler: '陈技术', createdAt: '2026-08-01 16:40', updatedAt: '2026-08-08 16:20',
    },
    {
      id: 'ms-2', code: 'JL-202608-001', period: '2026-08', periodNo: 2,
      periodStart: '2026-08-01', periodEnd: '2026-08-31',
      contractId: 'mc-hz01', contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同',
      projectName: '杭州北项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      lines: [
        {
          id: 'msl-4', poolItemId: 'pool-302-1', chapter: '300', code: '302-1', name: '路面灌缝',
          unit: 'm', price: 15, contractQty: 20000, changeAmount: 0,
          qty: 4000, amount: 60000, prevCumQty: 8000, prevCumAmount: 120000,
        },
        {
          id: 'msl-5', poolItemId: 'pool-102-1', chapter: '100', code: '102-1', name: '档案资料编制费',
          unit: '年·总额', price: 10000, contractQty: 3, changeAmount: 0,
          qty: 1, amount: 10000, prevCumQty: 0, prevCumAmount: 0,
        },
        {
          id: 'msl-6', poolItemId: 'pool-102-2', chapter: '100', code: '102-2', name: '交通管理费',
          unit: '年·总额', price: 166044, contractQty: 3, changeAmount: 0,
          qty: 0.5, amount: 83022, prevCumQty: 0, prevCumAmount: 0,
        },
      ],
      totalAmount: 153022, safeFeeAmount: 0,
      deductions: { priceAdjustment: 0, claim: 0, penalty: 0, assessmentDeduction: 3158, assessmentReward: 0, lateInterest: 0 },
      status: 'submitted',
      submittedAt: '2026-09-02 10:00',
      handler: '陈技术', createdAt: '2026-09-01 14:20', updatedAt: '2026-09-02 10:00',
    },
    {
      id: 'ms-3', code: 'JL-202609-001', period: '2026-09', periodNo: 3,
      periodStart: '2026-09-01', periodEnd: '2026-09-30',
      contractId: 'mc-hz03', contractCode: 'DF-YH-2026-004', contractName: '湖州地方道路综合养护合同',
      projectName: '湖州项目部', ownerType: 'other', ownerName: '湖州市公路管理局',
      lines: [
        {
          id: 'msl-7', poolItemId: 'pool-301-1', chapter: '300', code: '301-1', name: '县道路面大中修',
          unit: 'km', price: 286000, contractQty: 6.5, changeAmount: 0,
          qty: 0.5, amount: 143000, prevCumQty: 3.5, prevCumAmount: 1001000,
        },
      ],
      totalAmount: 143000, safeFeeAmount: 0,
      deductions: { priceAdjustment: 0, claim: 0, penalty: 0, assessmentDeduction: 0, assessmentReward: 0, lateInterest: 0 },
      status: 'submitted', submittedAt: '2026-09-10 11:30',
      handler: '周工', createdAt: '2026-09-10 09:00', updatedAt: '2026-09-10 11:30',
    },
  ];
}

/** 计量凭证种子：由已批复计量单 ms-1 生成 */
function seedOrders(): MeasureOrder[] {
  return [
    {
      id: 'mo-1', code: 'JLD-202607-001', statementId: 'ms-1', statementCode: 'JL-202607-001',
      period: '2026-07', periodNo: 1, periodEnd: '2026-07-31',
      contractId: 'mc-hz01', contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同',
      projectName: '杭州北项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      lines: [
        {
          id: 'mol-1', chapter: '300', code: '302-1', name: '路面灌缝', unit: 'm', price: 15, contractQty: 20000,
          declaredQty: 8000, approvedQty: 8000, declaredAmount: 120000, approvedAmount: 120000,
          prevCumQty: 0, prevCumAmount: 0,
        },
        {
          id: 'mol-2', chapter: '100', code: '101-1-a', name: '按合同条款规定提供建筑工程一切险', unit: '年·总额', price: 41156, contractQty: 3,
          declaredQty: 1, approvedQty: 1, declaredAmount: 41156, approvedAmount: 41156,
          prevCumQty: 0, prevCumAmount: 0,
        },
        {
          id: 'mol-3', chapter: '100', code: '101-1-b', name: '按合同条款规定提供第三方责任险', unit: '年·总额', price: 5000, contractQty: 3,
          declaredQty: 1, approvedQty: 1, declaredAmount: 5000, approvedAmount: 5000,
          prevCumQty: 0, prevCumAmount: 0,
        },
      ],
      declaredAmount: 166156, approvedAmount: 166156, deduction: 0,
      status: 'effective', archived: false, approveTime: '2026-08-08 16:20', createdAt: '2026-08-08 16:21',
    },
    {
      // 宁波东段第 2 期（已批复、未创建应收单 → 可在「创建应收单」向导中选中）
      id: 'mo-nb-1', code: 'JLD-202609-001', statementId: '', statementCode: 'JL-202609-001',
      period: '2026-09', periodNo: 2, periodEnd: '2026-09-30',
      contractId: 'mc-nb01', contractCode: 'JT-YH-2026-031', contractName: '宁波东段高速公路日常养护合同',
      projectName: '宁波项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      lines: [
        {
          id: 'mol-nb-1', chapter: '300', code: '303-1', name: '沥青路面坑槽修补', unit: 'm²', price: 92, contractQty: 3600,
          declaredQty: 600, approvedQty: 600, declaredAmount: 55200, approvedAmount: 55200,
          prevCumQty: 400, prevCumAmount: 36800,
        },
        {
          id: 'mol-nb-2', chapter: '200', code: '202-1', name: '路基边沟浆砌修复', unit: 'm³', price: 110, contractQty: 2000,
          declaredQty: 500, approvedQty: 450, declaredAmount: 55000, approvedAmount: 49500,
          prevCumQty: 0, prevCumAmount: 0,
        },
      ],
      declaredAmount: 110200, approvedAmount: 104700, deduction: 5500,
      status: 'effective', archived: false, approveTime: '2026-09-26 10:30', createdAt: '2026-09-26 10:31',
    },
    {
      // 温州段桥梁第 1 期（已批复、未创建应收单）
      id: 'mo-wz-1', code: 'JLD-202609-002', statementId: '', statementCode: 'JL-202609-002',
      period: '2026-09', periodNo: 1, periodEnd: '2026-09-30',
      contractId: 'mc-wz01', contractCode: 'JT-YH-2026-035', contractName: '温州段高速公路桥梁专项维修养护合同',
      projectName: '温州项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      lines: [
        {
          id: 'mol-wz-1', chapter: '400', code: '401-1', name: '桥梁伸缩缝更换', unit: 'm', price: 2480, contractQty: 500,
          declaredQty: 150, approvedQty: 150, declaredAmount: 372000, approvedAmount: 372000,
          prevCumQty: 0, prevCumAmount: 0,
        },
      ],
      declaredAmount: 372000, approvedAmount: 372000, deduction: 0,
      status: 'effective', archived: false, approveTime: '2026-09-28 14:10', createdAt: '2026-09-28 14:11',
    },
  ];
}

/** 应收单种子：由计量凭证 mo-1 生成（已推送） */
function seedReceivables(): ReceivableOrder[] {
  return [
    {
      id: 'ro-1', code: 'YSD-202608-001', measureOrderId: 'mo-1', measureOrderCode: 'JLD-202607-001',
      period: '2026-07',
      contractId: 'mc-hz01', contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同',
      projectName: '杭州北项目部', ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司',
      amount: 166156, status: 'pushed',
      pushedAt: '2026-08-09 10:15',
      remark: '经交工计量系统应收单功能填报后推送交投财务共享',
      createdAt: '2026-08-09 10:00',
    },
  ];
}

function seedPayments(): PaymentRecord[] {
  return [
    {
      id: 'pay-1', code: 'HK-202609-001', receivableId: 'ro-1', receivableCode: 'YSD-202608-001',
      contractCode: 'JT-YH-2025-012', contractName: '杭州北段高速公路日常养护合同',
      projectName: '杭州北项目部', ownerName: '浙江交投高速公路运营管理有限公司',
      amount: 100000, payDate: '2026-09-13', method: '电汇',
      remark: '首期回款（部分）', createdAt: '2026-09-13 15:00',
    },
  ];
}

// ==================== 读取函数 ====================

export const getMeasureContracts = () => load<MeasureContract[]>(KEY_CONTRACTS, seedContracts);
export const getPool = () => load<MeasurePoolItem[]>(KEY_POOL, seedPool);
export const getTransfers = () => load<MeasureTransferLog[]>(KEY_TRANSFERS, seedTransfers);
export const getCoopPushes = () => load<CoopPushLog[]>(KEY_COOP_PUSHES, seedCoopPushes);
export const getStatements = () => load<MeasureStatement[]>(KEY_STATEMENTS, seedStatements);
export const getOrders = () => load<MeasureOrder[]>(KEY_ORDERS, seedOrders);
export const getReceivables = () => load<ReceivableOrder[]>(KEY_RECEIVABLES, seedReceivables);
export const getPayments = () => load<PaymentRecord[]>(KEY_PAYMENTS, seedPayments);

// ==================== 数据池操作 ====================

const savePool = (v: MeasurePoolItem[]) => save(KEY_POOL, v);
const saveTransfers = (v: MeasureTransferLog[]) => save(KEY_TRANSFERS, v);
const saveCoopPushes = (v: CoopPushLog[]) => save(KEY_COOP_PUSHES, v);

/** 协同合同子目 → 主合同子目 推送（协同合同不直接生成计量单，推送后计入主合同「协同单位完成量」）
 *  源：协同合同（role=coop）子目；目标：源合同关联主合同下 正式·合同内 子目 */
export function pushCoopToMain(fromId: string, toId: string, qty: number, operator: string): string | null {
  if (qty <= 0) return '推送数量必须大于 0';
  const contracts = getMeasureContracts();
  const list = getPool();
  const from = list.find(p => p.id === fromId);
  const to = list.find(p => p.id === toId);
  if (!from || !to) return '未找到对应子目';
  const fromContract = contracts.find(c => c.id === from.contractId);
  if (fromContract?.role !== 'coop') return '仅协同合同子目可推送到主合同';
  const toContract = contracts.find(c => c.id === to.contractId);
  if (toContract?.role !== 'main') return '目标子目必须属于主合同';
  if (fromContract.mainContractId && to.contractId !== fromContract.mainContractId) {
    const main = contracts.find(c => c.id === fromContract.mainContractId);
    return `目标子目须属于该协同合同关联的主合同（${main?.code || fromContract.mainContractId}）`;
  }
  if (!canMeasure(to)) return '目标子目必须是正式·合同内清单';
  const available = unpushedQty(from);
  if (qty > available) return `推送量超出源子目可推送量（${available} ${from.unit}）`;

  const now = nowStr();
  list[list.indexOf(from)] = { ...from, pushedQty: (from.pushedQty || 0) + qty, updatedAt: now };
  list[list.indexOf(to)] = { ...to, coopQty: (to.coopQty || 0) + qty, updatedAt: now };
  savePool(list);

  saveCoopPushes([{
    id: genId('cp'),
    fromContractId: from.contractId, fromContractCode: from.contractCode,
    fromItemId: from.id, fromCode: from.code, fromName: from.name,
    toContractId: to.contractId, toContractCode: to.contractCode,
    toItemId: to.id, toCode: to.code, toName: to.name,
    qty, operator, createdAt: now,
  }, ...getCoopPushes()]);
  return null; // 无错误
}

/** 协同合同「全部推送」结果 */
export interface CoopPushAllResult {
  pushedCount: number;                        // 成功推送的子目数
  totalQty: number;                           // 推送总量
  totalValue: number;                         // 推送总价值（按源子目单价）
  skipped: { code: string; name: string; reason: string }[];  // 跳过明细
}

/** 协同合同「全部推送」（合同行一键操作）：将该协同合同下所有有未推送量的可计量子目，
 *  按同子目号匹配推送到关联主合同下 正式·合同内 子目；匹配不到同子目号目标的子目跳过（不自动选择其他子目）。
 *  返回 null 表示无可推送子目 / 合同不合法。 */
export function pushAllCoopToMain(contractId: string, operator: string): CoopPushAllResult | null {
  const contracts = getMeasureContracts();
  const contract = contracts.find(c => c.id === contractId);
  if (!contract || contract.role !== 'coop' || !contract.mainContractId) return null;
  const list = getPool();
  const mainItems = list.filter(p => p.contractId === contract.mainContractId && canMeasure(p));
  const sources = list.filter(p => p.contractId === contractId && canMeasure(p) && unpushedQty(p) > 0);
  if (sources.length === 0) return null;

  const result: CoopPushAllResult = { pushedCount: 0, totalQty: 0, totalValue: 0, skipped: [] };
  for (const src of sources) {
    const target = mainItems.find(t => t.code === src.code);
    if (!target) {
      result.skipped.push({ code: src.code, name: src.name, reason: '关联主合同下无同子目号的正式·合同内子目' });
      continue;
    }
    const qty = unpushedQty(src); // 推送前快照（推送后源子目未推送量归零）
    const err = pushCoopToMain(src.id, target.id, qty, operator);
    if (err) { result.skipped.push({ code: src.code, name: src.name, reason: err }); continue; }
    result.pushedCount += 1;
    result.totalQty += qty;
    result.totalValue += qty * src.price;
  }
  return result;
}

export function upsertPoolItem(item: MeasurePoolItem) {
  const list = getPool();
  const idx = list.findIndex(p => p.id === item.id);
  const next = { ...item, updatedAt: nowStr() };
  if (idx >= 0) list[idx] = next; else list.push({ ...next, createdAt: nowStr() });
  savePool(list);
}

export function deletePoolItem(id: string) {
  savePool(getPool().filter(p => p.id !== id));
}

/** 临时/合同外 → 正式·合同内 转移（方案 5.1）
 *  源子目 transferredQty += qty；目标子目 transferInQty += qty */
export function transferToFormal(fromId: string, toId: string, qty: number, operator: string): string | null {
  if (qty <= 0) return '转入数量必须大于 0';
  const list = getPool();
  const from = list.find(p => p.id === fromId);
  const to = list.find(p => p.id === toId);
  if (!from || !to) return '未找到对应子目';
  if (from.listType === 'formal' && from.contractAttr === 'in') return '源子目已是正式·合同内清单，无需转入';
  if (!(to.listType === 'formal' && to.contractAttr === 'in')) return '目标子目必须是正式·合同内清单';
  const fromAvailable = builtQty(from) - from.transferredQty;
  if (qty > fromAvailable) return `转入量超出源子目可转施工量（${fromAvailable} ${from.unit}）`;

  const now = nowStr();
  const toBatches = [...(to.completionBatches || []), { date: todayStr(), qty, source: 'transfer' as const }];
  list[list.indexOf(from)] = { ...from, transferredQty: from.transferredQty + qty, updatedAt: now };
  list[list.indexOf(to)] = { ...to, transferInQty: to.transferInQty + qty, completionBatches: toBatches, updatedAt: now };
  savePool(list);

  const logs = getTransfers();
  logs.unshift({
    id: genId('tr'), fromItemId: from.id, fromCode: from.code, fromName: from.name,
    toItemId: to.id, toCode: to.code, toName: to.name, qty, operator, createdAt: now,
  });
  saveTransfers(logs);
  return null; // 无错误
}

// ==================== 计量单操作 ====================

const saveStatements = (v: MeasureStatement[]) => save(KEY_STATEMENTS, v);

export function upsertStatement(st: MeasureStatement) {
  const list = getStatements();
  const idx = list.findIndex(s => s.id === st.id);
  const next = { ...st, updatedAt: nowStr() };
  if (idx >= 0) list[idx] = next; else list.unshift({ ...next, createdAt: nowStr() });
  saveStatements(list);
}

export function deleteStatement(id: string) {
  saveStatements(getStatements().filter(s => s.id !== id));
}

export function nextPeriodNo(contractId: string, period: string): number {
  return getStatements().filter(s => s.contractId === contractId && s.period === period).length + 1;
}

export function nextStatementCode(period: string): string {
  const no = getStatements().filter(s => s.period === period).length + 1;
  return `JL-${period.replace('-', '')}-${String(no).padStart(3, '0')}`;
}

/** 计算行金额 */
export const lineAmount = (l: MeasureStatementLine) =>
  Math.round((l.qty || 0) * (l.price || 0) * 100) / 100;

/** 计量单汇总：本期完成合计 + 其中安全生产费 */
export function summarizeLines(lines: MeasureStatementLine[]): { totalAmount: number; safeFeeAmount: number } {
  const totalAmount = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const safeFeeAmount = Math.round(lines.filter(l => l.isSafeFee).reduce((s, l) => s + l.amount, 0) * 100) / 100;
  return { totalAmount, safeFeeAmount };
}

/** 提交计量单：draft/rejected → submitted，同时回写数据池已上报计量量 */
export function submitStatement(id: string): string | null {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return '未找到计量单';
  if (st.status !== 'draft' && st.status !== 'rejected') return '当前状态不可提交';
  if (st.lines.length === 0) return '计量单无明细，请先选量';

  const pool = getPool();
  for (const l of st.lines) {
    if (l.manual || !l.poolItemId) continue;   // 手动新增行不校验数据池
    const p = pool.find(x => x.id === l.poolItemId);
    if (!p) return `子目 ${l.code} 已不在数据池中`;
    if (!canMeasure(p)) return `子目 ${l.code} 不是正式·合同内清单，不可计量`;
    const avail = unreportedQty(p);
    if (l.qty > avail) return `子目 ${l.code} 申报量 ${l.qty} 超出未上报计量量 ${avail}`;
  }
  // 回写数据池：已上报计量量 += 本期申报量
  for (const l of st.lines) {
    if (l.manual || !l.poolItemId) continue;
    const p = pool.find(x => x.id === l.poolItemId);
    if (p) pool[pool.indexOf(p)] = { ...p, reportedQty: Math.round((p.reportedQty + l.qty) * 100) / 100, updatedAt: nowStr() };
  }
  savePool(pool);

  list[list.indexOf(st)] = {
    ...st, status: 'submitted', submittedAt: nowStr(),
    rejectReason: undefined, updatedAt: nowStr(),
  };
  saveStatements(list);
  return null;
}

/** 驳回后修改（rejected → draft，先释放已占用的上报量） */
export function reopenStatement(id: string) {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st || st.status !== 'rejected') return;
  releaseReported(st);
  const fresh = getStatements();
  const cur = fresh.find(s => s.id === id);
  if (cur) fresh[fresh.indexOf(cur)] = { ...cur, status: 'draft', updatedAt: nowStr() };
  saveStatements(fresh);
}

/** 删除计量单（仅 draft），释放已占用上报量 */
export function deleteStatementSafe(id: string): boolean {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return false;
  if (st.status !== 'draft') return false;
  releaseReported(st);
  saveStatements(getStatements().filter(s => s.id !== id));
  return true;
}

/** 释放计量单占用数据池的上报量（删除/驳回重开时） */
function releaseReported(st: MeasureStatement) {
  const pool = getPool();
  for (const l of st.lines) {
    if (l.manual || !l.poolItemId) continue;
    const p = pool.find(x => x.id === l.poolItemId);
    if (p) pool[pool.indexOf(p)] = { ...p, reportedQty: Math.max(0, Math.round((p.reportedQty - l.qty) * 100) / 100), updatedAt: nowStr() };
  }
  savePool(pool);
}

// ==================== 批复操作（系统内自行维护计量批复） ====================

/** 维护计量批复（submitted/approving → approved / rejected，全部业主统一自维护，不再推送交投）
 *  行级批复数量默认 = 计量数量，可逐行调整；维护最终批复金额，可上传批复附件 */
export function maintainApprove(id: string, result: {
  approved: boolean;
  lineQtys?: Record<string, number>;    // 行 id → 批复数量（缺省 = 该行计量数量）
  approvedAmount?: number;              // 最终批复金额（缺省 = 行批复合计 + 扣款净额）
  opinion?: string; rejectReason?: string;
  attachments?: string[];
}): string | null {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return '未找到计量单';
  if (st.status !== 'submitted' && st.status !== 'approving') return '当前状态不可批复';

  if (!result.approved) {
    // 驳回：释放上报量，回到已驳回状态可重新编辑申报
    const fresh = getStatements();
    const cur = fresh.find(s => s.id === id)!;
    fresh[fresh.indexOf(cur)] = {
      ...cur, status: 'rejected', rejectReason: result.rejectReason || '业主驳回', updatedAt: nowStr(),
    };
    saveStatements(fresh);
    releaseReported(cur);
    return null;
  }

  // 行级批复数量（默认 = 计量数量）
  const newLines: MeasureStatementLine[] = st.lines.map(l => ({
    ...l,
    approvedQty: result.lineQtys && result.lineQtys[l.id] !== undefined
      ? Math.max(0, Math.round(result.lineQtys[l.id] * 100) / 100)
      : l.qty,
  }));
  const lineTotal = newLines.reduce((s, l) => s + (l.approvedQty || 0) * l.price, 0);   // 行批复合计
  const defaultAmount = Math.round((lineTotal + deductionsNet(st.deductions)) * 100) / 100;
  return applyApproval(st, {
    lines: newLines,
    approvedAmount: result.approvedAmount ?? defaultAmount,
    opinion: result.opinion,
    attachments: result.attachments,
  });
}

/** 通用批复落地：更新计量单（行批复数量/附件/最终批复金额）+ 数据池批复量 + 生成计量凭证 */
function applyApproval(st: MeasureStatement, input: {
  lines: MeasureStatementLine[]; approvedAmount: number; opinion?: string; attachments?: string[];
}): string | null {
  const { approvedAmount } = input;
  if (approvedAmount < 0) return '批复金额不能为负数';
  const net = netPayableOf(st);
  if (approvedAmount > net) return `批复金额超出实际支付金额（${net.toLocaleString()}元）`;
  for (const l of input.lines) {
    if ((l.approvedQty || 0) > l.qty) {
      return `子目 ${l.code} 批复数量（${l.approvedQty}）不能超过计量数量（${l.qty}）`;
    }
  }

  const list = getStatements();
  const idx = list.findIndex(s => s.id === st.id);   // 按 id 定位（getStatements 每次 parse 为新对象，不能 indexOf 引用比较）
  if (idx < 0) return '未找到计量单';
  const now = nowStr();
  const deduction = Math.round((net - approvedAmount) * 100) / 100;

  // 数据池：已批复计量量按行级批复数量累计
  const pool = getPool();
  for (const l of input.lines) {
    if (l.manual || !l.poolItemId) continue;
    const p = pool.find(x => x.id === l.poolItemId);
    if (p) {
      pool[pool.indexOf(p)] = {
        ...p, approvedQty: Math.round((p.approvedQty + (l.approvedQty || 0)) * 100) / 100, updatedAt: now,
      };
    }
  }
  savePool(pool);

  list[idx] = {
    ...st, lines: input.lines, status: 'approved', approvedAmount, deduction,
    approveOpinion: input.opinion, attachments: input.attachments || st.attachments,
    approvedAt: now, updatedAt: now,
  };
  saveStatements(list);

  // 生成计量凭证（一个合同一张，与计量单一一对应）
  genOrderFromStatement(list[idx]);
  return null;
}

// ==================== 计量凭证 ====================

const saveOrders = (v: MeasureOrder[]) => save(KEY_ORDERS, v);

function genOrderFromStatement(st: MeasureStatement): MeasureOrder {
  const orders = getOrders();
  const existIdx = orders.findIndex(o => o.statementId === st.id);
  const net = netPayableOf(st);
  const ratio = st.totalAmount > 0 ? net / st.totalAmount : 0;
  const lines: MeasureOrderLine[] = st.lines.map(l => {
    // 批复维护录入的行级批复数量优先；无批复数量时按实际支付比例折算（兼容旧数据）
    const lineApprovedQty = l.approvedQty !== undefined
      ? Math.round(l.approvedQty * 100) / 100
      : Math.round(l.qty * ratio * 100) / 100;
    return {
      id: genId('mol'), chapter: l.chapter, code: l.code, name: l.name, unit: l.unit, price: l.price,
      contractQty: l.contractQty,
      declaredQty: l.qty,
      approvedQty: lineApprovedQty,
      declaredAmount: l.amount,
      approvedAmount: Math.round(lineApprovedQty * l.price * 100) / 100,
      prevCumQty: l.prevCumQty,
      prevCumAmount: l.prevCumAmount,
    };
  });
  const order: MeasureOrder = {
    id: genId('mo'),
    code: `JLD-${st.period.replace('-', '')}-${String(st.periodNo).padStart(3, '0')}`,
    statementId: st.id, statementCode: st.code,
    period: st.period, periodNo: st.periodNo, periodEnd: st.periodEnd,
    contractId: st.contractId, contractCode: st.contractCode, contractName: st.contractName,
    projectName: st.projectName, ownerType: st.ownerType, ownerName: st.ownerName,
    lines,
    declaredAmount: st.totalAmount,
    approvedAmount: st.approvedAmount || 0,
    deduction: st.deduction || 0,
    status: 'effective', archived: false,
    approveTime: st.approvedAt || nowStr(),
    createdAt: nowStr(),
  };
  if (existIdx >= 0) orders[existIdx] = order; else orders.unshift(order);
  saveOrders(orders);
  return order;
}

export function archiveOrder(id: string) {
  saveOrders(getOrders().map(o => o.id === id ? { ...o, status: 'archived', archived: true } : o));
}

// ==================== 应收单（经交工计量系统填报 → 推送交投财务共享） ====================

const saveReceivables = (v: ReceivableOrder[]) => save(KEY_RECEIVABLES, v);

/** 从计量凭证生成应收单（按合同一一对应，方案 6.2） */
export function createReceivableFromOrder(orderId: string): { ok: boolean; msg: string; ro?: ReceivableOrder } {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { ok: false, msg: '未找到计量凭证' };
  const receivables = getReceivables();
  if (receivables.some(r => r.measureOrderId === order.id)) {
    return { ok: false, msg: '该计量凭证已生成应收单，请勿重复生成' };
  }
  const ro: ReceivableOrder = {
    id: genId('ro'),
    code: `YSD-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(receivables.length + 1).padStart(3, '0')}`,
    measureOrderId: order.id, measureOrderCode: order.code,
    period: order.period,
    contractId: order.contractId, contractCode: order.contractCode, contractName: order.contractName,
    projectName: order.projectName, ownerType: order.ownerType, ownerName: order.ownerName,
    amount: order.approvedAmount,
    status: 'draft',
    remark: '经交工计量系统应收单功能填报，推送交投财务共享',
    createdAt: nowStr(),
  };
  receivables.unshift(ro);
  saveReceivables(receivables);
  return { ok: true, msg: `应收单 ${ro.code} 已生成（待推送）`, ro };
}

/** 「创建应收单」向导表单提交 */
export interface ReceivableFormInput {
  orderIds: string[];               // 选中的已批复且未创建应收单的计量单（同合同）
  docDate: string;                  // 单据日期 *
  bizDate: string;                  // 业务日期 *
  regCode: string;                  // 在册单据编号 *
  dept: string;                     // 部门 *
  bizContent: string;              // 业务内容 *
  agingStart?: string;              // 账龄起算日
  invoiceReceived: boolean;         // 是否收票 *
  payee?: string;                   // 收款人
  curChange: number;                // 本期变更
  curMaterialAdj: number;           // 本期材料调差
  curPenalty: number;               // 本期罚款
  curAdvanceDeduct: number;         // 本期应扣预付款
  curPayableDeduct: number;         // 本期应扣待付扣回
  curOtherAdvanceDeduct: number;    // 本期其他预付款扣回
  curInvoiceAmount: number;         // 本期开票金额 *
  deposits: Omit<ReceivableDepositLine, 'id'>[];          // 保证金明细
  invoices: Omit<ReceivableInvoiceLine, 'id'>[];           // 开票明细
  invoiceInfo: ReceivableInvoiceInfo;                       // 发票其他信息
  plans: Omit<ReceivablePlanLine, 'id'>[];                 // 收款计划
  attachments: Omit<ReceivableAttachment, 'id'>[];         // 附件
  remark?: string;
}

/** 创建应收单（「创建应收单」向导提交）：
 *  校验计量单已批复（effective）且未创建应收单；金额口径按工程结算应收单自动汇总 */
export function createReceivableWithForm(input: ReceivableFormInput): { ok: boolean; msg: string; ro?: ReceivableOrder } {
  if (input.orderIds.length === 0) return { ok: false, msg: '请选择计量单' };
  if (!input.docDate || !input.bizDate) return { ok: false, msg: '请填写单据日期与业务日期' };
  if (!input.regCode.trim()) return { ok: false, msg: '请填写在册单据编号' };
  if (!input.dept.trim()) return { ok: false, msg: '请填写部门' };
  if (!input.bizContent.trim()) return { ok: false, msg: '请填写业务内容' };
  if (!(input.curInvoiceAmount > 0)) return { ok: false, msg: '本期开票金额必须大于 0' };

  const orders = getOrders();
  const receivables = getReceivables();
  const chosen: MeasureOrder[] = [];
  for (const oid of input.orderIds) {
    const o = orders.find(x => x.id === oid);
    if (!o) return { ok: false, msg: `计量凭证 ${oid} 不存在` };
    if (o.status !== 'effective') return { ok: false, msg: `计量单 ${o.code} 未批复，不可创建应收单` };
    if (receivables.some(r => (r.measureOrderIds || [r.measureOrderId]).includes(o.id))) {
      return { ok: false, msg: `计量单 ${o.code} 已创建应收单，请勿重复创建` };
    }
    chosen.push(o);
  }
  const cid = chosen[0].contractId;
  if (chosen.some(o => o.contractId !== cid)) return { ok: false, msg: '所选计量单须属于同一合同' };

  const contract = getMeasureContracts().find(c => c.id === cid)!;
  // 上期末累计 = 该合同其他已批复计量单（不含本次所选）批复金额合计
  const prevCum = orders
    .filter(o => o.contractId === cid && o.status === 'effective' && !input.orderIds.includes(o.id))
    .reduce((s, o) => s + o.approvedAmount, 0);
  const curMeasure = chosen.reduce((s, o) => s + o.approvedAmount, 0);
  const deposit = input.deposits.reduce((s, d) => s + (d.amount || 0), 0); // 负数扣留
  const collectible = curMeasure + (input.curChange || 0) + (input.curMaterialAdj || 0)
    - (input.curPenalty || 0) - (input.curAdvanceDeduct || 0) - (input.curPayableDeduct || 0)
    - (input.curOtherAdvanceDeduct || 0) + deposit;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ym = `${now.getFullYear()}${pad(now.getMonth() + 1)}`;
  const dt = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const ro: ReceivableOrder = {
    id: genId('ro'),
    code: `YSD-${ym}-${String(receivables.length + 1).padStart(3, '0')}`,
    measureOrderId: chosen[0].id,
    measureOrderCode: chosen.length === 1 ? chosen[0].code : `${chosen[0].code} 等${chosen.length}张`,
    period: chosen.length === 1 ? chosen[0].period : `${chosen[chosen.length - 1].period}（${chosen.length}期合并）`,
    contractId: cid, contractCode: contract.code, contractName: contract.name,
    projectName: contract.projectName, ownerType: contract.ownerType, ownerName: contract.ownerName,
    amount: Math.round(collectible * 100) / 100,
    status: 'draft',
    remark: input.remark || '经交工计量系统应收单功能填报，推送交投财务共享',
    createdAt: nowStr(),
    // 工程结算应收单填报字段
    docDate: input.docDate, bizDate: input.bizDate,
    sysCode: `JLGL-YSDN-${dt}${pad(now.getHours())}${pad(now.getMinutes())}001`,
    regCode: input.regCode.trim(), dept: input.dept.trim(),
    settleOrg: `顺畅养护公司${contract.projectName}`,
    invoiceApplyOrg: `顺畅养护公司${contract.projectName}`,
    accountOrg: `顺畅养护公司${contract.projectName}`,
    collectOrg: `顺畅养护公司${contract.projectName}`,
    bizContent: input.bizContent.trim(),
    agingStart: input.agingStart || undefined,
    invoiceReceived: input.invoiceReceived,
    payee: input.payee || undefined,
    currency: 'CNY',
    measureOrderIds: input.orderIds,
    curMeasureAmount: curMeasure,
    prevCumMeasureAmount: prevCum,
    endCumMeasureAmount: prevCum + curMeasure,
    curChange: input.curChange || 0,
    curMaterialAdj: input.curMaterialAdj || 0,
    curPenalty: input.curPenalty || 0,
    curAdvanceDeduct: input.curAdvanceDeduct || 0,
    curPayableDeduct: input.curPayableDeduct || 0,
    curOtherAdvanceDeduct: input.curOtherAdvanceDeduct || 0,
    curDeposit: deposit,
    curInvoiceAmount: input.curInvoiceAmount,
    curCollectible: Math.round(collectible * 100) / 100,
    settleBatch: chosen.map(o => o.periodNo).sort((a, b) => a - b).join('、'),
    deposits: input.deposits.map(d => ({ ...d, id: genId('dep') })),
    invoices: input.invoices.map(v => ({ ...v, id: genId('inv') })),
    invoiceInfo: input.invoiceInfo,
    plans: input.plans.map(p => ({ ...p, id: genId('pl') })),
    attachments: input.attachments.map(a => ({ ...a, id: genId('att') })),
  };
  receivables.unshift(ro);
  saveReceivables(receivables);
  return { ok: true, msg: `应收单 ${ro.code} 已创建（待推送），本期可收金额 ${fmtMoney(collectible)}`, ro };
}

/** 推送应收单：交工计量系统填报 → 交投财务共享（draft → pushed） */
export function pushReceivable(id: string): string | null {
  const list = getReceivables();
  const ro = list.find(r => r.id === id);
  if (!ro) return '未找到应收单';
  if (ro.status !== 'draft') return '当前状态不可推送';
  list[list.indexOf(ro)] = { ...ro, status: 'pushed', pushedAt: nowStr() };
  saveReceivables(list);
  return null;
}

/** 交投财务共享确认（pushed → confirmed） */
export function confirmReceivable(id: string): string | null {
  const list = getReceivables();
  const ro = list.find(r => r.id === id);
  if (!ro) return '未找到应收单';
  if (ro.status !== 'pushed') return '须先推送后才可确认';
  list[list.indexOf(ro)] = { ...ro, status: 'confirmed', confirmedAt: nowStr() };
  saveReceivables(list);
  return null;
}

// ==================== 回款登记 ====================

const savePayments = (v: PaymentRecord[]) => save(KEY_PAYMENTS, v);

export function addPayment(rec: Omit<PaymentRecord, 'id' | 'code' | 'createdAt'>): { ok: boolean; msg: string } {
  const ro = getReceivables().find(r => r.id === rec.receivableId);
  if (!ro) return { ok: false, msg: '未找到对应应收单' };
  if (ro.status !== 'confirmed') return { ok: false, msg: '仅财务共享已确认的应收单可登记回款' };

  const paid = paidAmountOf(rec.receivableId);
  if (rec.amount <= 0) return { ok: false, msg: '回款金额必须大于 0' };
  if (paid + rec.amount > ro.amount + 0.01) {
    return { ok: false, msg: `累计回款将超出应收金额（已回 ${paid.toLocaleString()}元 / 应收 ${ro.amount.toLocaleString()}元）` };
  }
  const payments = getPayments();
  payments.unshift({
    ...rec,
    id: genId('pay'),
    code: `HK-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(payments.length + 1).padStart(3, '0')}`,
    createdAt: nowStr(),
  });
  savePayments(payments);
  return { ok: true, msg: '回款登记成功' };
}

/** 某应收单的累计回款 */
export function paidAmountOf(receivableId: string): number {
  return getPayments().filter(p => p.receivableId === receivableId)
    .reduce((s, p) => s + (p.amount || 0), 0);
}
