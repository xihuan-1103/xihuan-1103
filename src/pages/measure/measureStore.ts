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
  MeasureContract, MeasurePoolItem, MeasureTransferLog,
  MeasureStatement, MeasureStatementLine, MeasureStatementStatus,
  MeasureOrder, MeasureOrderLine, ReceivableOrder, PaymentRecord, StatementDeductions,
} from './types';

// v2：结构重构后使用新 key，避免与旧版 localStorage 数据冲突
const KEY_CONTRACTS = 'md_measure2_contracts';
const KEY_POOL = 'md_measure2_pool';
const KEY_TRANSFERS = 'md_measure2_transfers';
const KEY_STATEMENTS = 'md_measure2_statements';
const KEY_ORDERS = 'md_measure2_orders';
const KEY_RECEIVABLES = 'md_measure2_receivables';
const KEY_PAYMENTS = 'md_measure2_payments';

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

// ==================== 计量口径计算（表5-1） ====================

/** 已施工量 = 报工 + 手动 + 临时转入 */
export const builtQty = (p: MeasurePoolItem) =>
  (p.logQty || 0) + (p.manualQty || 0) + (p.transferInQty || 0);
/** 未上报计量量 = 已施工量 − 已上报计量量 */
export const unreportedQty = (p: MeasurePoolItem) => builtQty(p) - (p.reportedQty || 0);
/** 未批复计量量 = 已上报计量量 − 已批复计量量 */
export const unapprovedQty = (p: MeasurePoolItem) => (p.reportedQty || 0) - (p.approvedQty || 0);
/** 计量资格：正式 ∧ 合同内（缺一不可） */
export const canMeasure = (p: MeasurePoolItem) => p.listType === 'formal' && p.contractAttr === 'in';

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

/** 计量模块引用的收入合同（交投 × 2 + 其他业主 × 1，体现 1 项目部 : N 合同） */
function seedContracts(): MeasureContract[] {
  return [
    {
      id: 'mc-hz01', code: 'JT-YH-2025-012', name: '杭州北段高速公路日常养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 14063208, projectName: '杭州北项目部', startDate: '2025-01-01', endDate: '2027-12-31',
    },
    {
      id: 'mc-hz02', code: 'JT-YH-2025-013', name: '杭州北段桥梁专项维修养护合同',
      ownerType: 'jtou', ownerName: '浙江交投高速公路运营管理有限公司', partyB: '顺畅养护公司',
      amount: 3280000, projectName: '杭州北项目部', startDate: '2025-06-01', endDate: '2026-12-31',
    },
    {
      id: 'mc-hz03', code: 'DF-YH-2026-004', name: '湖州地方道路综合养护合同',
      ownerType: 'other', ownerName: '湖州市公路管理局', partyB: '顺畅养护公司',
      amount: 1860000, projectName: '湖州项目部', startDate: '2026-01-01', endDate: '2026-12-31',
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
      totalQty: 3200, logQty: 2100, manualQty: 180, transferInQty: 0,
      completionBatches: [B('2026-06-11', 600), B('2026-07-18', 800), B('2026-08-25', 880)],
      transferredQty: 0, reportedQty: 1400, approvedQty: 1400, subcontractQty: 1200,
      ...base,
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
      totalQty: 1800, logQty: 950, manualQty: 0, transferInQty: 0,
      completionBatches: [B('2026-07-08', 450), B('2026-09-05', 500)],
      transferredQty: 0, reportedQty: 450, approvedQty: 450, subcontractQty: 400,
      ...base,
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
export const getStatements = () => load<MeasureStatement[]>(KEY_STATEMENTS, seedStatements);
export const getOrders = () => load<MeasureOrder[]>(KEY_ORDERS, seedOrders);
export const getReceivables = () => load<ReceivableOrder[]>(KEY_RECEIVABLES, seedReceivables);
export const getPayments = () => load<PaymentRecord[]>(KEY_PAYMENTS, seedPayments);

// ==================== 数据池操作 ====================

const savePool = (v: MeasurePoolItem[]) => save(KEY_POOL, v);
const saveTransfers = (v: MeasureTransferLog[]) => save(KEY_TRANSFERS, v);

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

// ==================== 批复操作（两条路径） ====================

/** 交投路径：推送批复（submitted → approving） */
export function pushToOwner(id: string): string | null {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return '未找到计量单';
  if (st.ownerType !== 'jtou') return '仅交投业主走系统推送批复';
  if (st.status !== 'submitted') return '当前状态不可推送';
  list[list.indexOf(st)] = { ...st, status: 'approving', pushedAt: nowStr(), updatedAt: nowStr() };
  saveStatements(list);
  return null;
}

/** 交投路径：批复回传（approving → approved），自动对比识别扣款、生成计量凭证 */
export function jtouApprove(id: string, result: { approvedAmount: number; opinion?: string }): string | null {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return '未找到计量单';
  if (st.status !== 'approving') return '当前状态未处于批复中';
  const err = applyApproval(st, result.approvedAmount, result.opinion);
  if (err) return err;
  return null;
}

/** 其他业主路径：系统内自闭环批复（submitted → approved/rejected） */
export function selfApprove(id: string, result: {
  approved: boolean; approvedAmount?: number; opinion?: string; rejectReason?: string;
}): string | null {
  const list = getStatements();
  const st = list.find(s => s.id === id);
  if (!st) return '未找到计量单';
  if (st.ownerType !== 'other') return '交投业主请走推送批复';
  if (st.status !== 'submitted') return '当前状态不可批复';

  if (!result.approved) {
    // 驳回：释放上报量，回 draft 链路
    const fresh = getStatements();
    const cur = fresh.find(s => s.id === id)!;
    fresh[fresh.indexOf(cur)] = {
      ...cur, status: 'rejected', rejectReason: result.rejectReason || '业主驳回', updatedAt: nowStr(),
    };
    saveStatements(fresh);
    releaseReported(cur);
    return null;
  }
  const err = applyApproval(st, result.approvedAmount ?? netPayableOf(st), result.opinion);
  if (err) return err;
  return null;
}

/** 通用批复落地：更新计量单 + 数据池批复量 + 生成计量凭证 */
function applyApproval(st: MeasureStatement, approvedAmount: number, opinion?: string): string | null {
  if (approvedAmount < 0) return '批复金额不能为负数';
  const net = netPayableOf(st);
  if (approvedAmount > net) return `批复金额超出实际支付金额（¥${net.toLocaleString()})`;

  const list = getStatements();
  const idx = list.indexOf(st);
  const now = nowStr();
  const deduction = Math.round((net - approvedAmount) * 100) / 100;

  // 数据池：已批复计量量按批复比例分摊
  const pool = getPool();
  const ratio = st.totalAmount > 0 ? approvedAmount / st.totalAmount : 0;
  for (const l of st.lines) {
    if (l.manual || !l.poolItemId) continue;
    const p = pool.find(x => x.id === l.poolItemId);
    if (p) {
      const approvedLineQty = Math.round(l.qty * ratio * 100) / 100;
      pool[pool.indexOf(p)] = { ...p, approvedQty: Math.round((p.approvedQty + approvedLineQty) * 100) / 100, updatedAt: now };
    }
  }
  savePool(pool);

  list[idx] = {
    ...st, status: 'approved', approvedAmount, deduction,
    approveOpinion: opinion, approvedAt: now, updatedAt: now,
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
  const lines: MeasureOrderLine[] = st.lines.map(l => ({
    id: genId('mol'), chapter: l.chapter, code: l.code, name: l.name, unit: l.unit, price: l.price,
    contractQty: l.contractQty,
    declaredQty: l.qty,
    approvedQty: Math.round(l.qty * ratio * 100) / 100,
    declaredAmount: l.amount,
    approvedAmount: Math.round(l.amount * ratio * 100) / 100,
    prevCumQty: l.prevCumQty,
    prevCumAmount: l.prevCumAmount,
  }));
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
    return { ok: false, msg: `累计回款将超出应收金额（已回 ¥${paid.toLocaleString()} / 应收 ¥${ro.amount.toLocaleString()}）` };
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
