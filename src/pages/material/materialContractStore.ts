/**
 * 材料合同 + 材料对账 - 数据存储层
 * 材料合同数据来源于材料管理系统（同步）
 * 对账单：按合同+期间汇总采购入库 → 与供应商结算对账
 */

import type { Contract } from '@/types';
import type { StockInOrder } from './types';
import { getStockInOrders, genId, nowStr } from './materialStore';

// ==================== 材料合同 ====================

/** 材料合同状态 */
export type MaterialContractStatus = 'active' | 'completed' | 'terminated';

/** 材料合同明细行（合同内约定的材料及单价） */
export interface MaterialContractLine {
  id: string;
  materialCode: string;
  materialName: string;
  spec?: string;
  unit: string;
  price: number;            // 含税合同单价
  quantity: number;         // 约定数量
  amount: number;            // 合价
}

/** 材料合同（来源：材料管理系统同步） */
export interface MaterialContract {
  id: string;
  code: string;                  // 合同编号（CLHT-2025-xxx）
  name: string;                  // 合同名称
  buyer: string;                 // 甲方（购买方）
  supplier: string;              // 乙方（供应商）
  amount: number;                // 价税合计金额
  signDate: string;              // 签订日期
  startDate: string;             // 履约开始
  endDate: string;               // 履约结束
  status: MaterialContractStatus;
  projectName?: string;          // 关联项目
  lines: MaterialContractLine[]; // 合同材料明细
  syncedAt: string;              // 同步时间
}

const STORAGE_KEY_MC = 'md_material_contract_list';

const STATUS_LABEL: Record<MaterialContractStatus, string> = {
  active: '执行中',
  completed: '已完成',
  terminated: '已终止',
};
export const materialContractStatusLabel = (s: MaterialContractStatus) => STATUS_LABEL[s];

function seedMaterialContracts(): MaterialContract[] {
  return [
    {
      id: 'mc1',
      code: 'CLHT-2025-001',
      name: '道路沥青材料年度采购合同',
      buyer: '顺畅养护公司',
      supplier: '中石化道路材料有限公司',
      amount: 3260000,
      signDate: '2025-11-20',
      startDate: '2025-12-01',
      endDate: '2026-11-30',
      status: 'active',
      projectName: '国道G318改扩建工程',
      lines: [
        { id: 'mcl-1', materialCode: 'MAT-001', materialName: 'SBS改性沥青(I-D)', spec: 'I-D', unit: '吨', price: 5300, quantity: 400, amount: 2120000 },
        { id: 'mcl-2', materialCode: 'MAT-002', materialName: '70号A级道路石油沥青', spec: 'A级', unit: '吨', price: 4500, quantity: 200, amount: 900000 },
        { id: 'mcl-3', materialCode: 'MAT-010', materialName: '乳化沥青(PC-3)', spec: 'PC-3', unit: '吨', price: 3800, quantity: 63.2, amount: 240160 },
      ],
      syncedAt: '2026-08-25 09:12',
    },
    {
      id: 'mc2',
      code: 'CLHT-2025-002',
      name: '水泥及砂石料集中采购合同',
      buyer: '顺畅养护公司',
      supplier: '南方建材集团股份有限公司',
      amount: 1480000,
      signDate: '2025-12-15',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
      projectName: '市政道路养护工程',
      lines: [
        { id: 'mcl-4', materialCode: 'MAT-003', materialName: 'PO42.5散装水泥', spec: 'P.O 42.5', unit: '吨', price: 440, quantity: 1800, amount: 792000 },
        { id: 'mcl-5', materialCode: 'MAT-004', materialName: '玄武岩碎石(10-15mm)', spec: '10-15mm', unit: '吨', price: 92, quantity: 4200, amount: 386400 },
        { id: 'mcl-6', materialCode: 'MAT-005', materialName: '天然河砂(中砂)', spec: '中砂', unit: '吨', price: 98, quantity: 3100, amount: 303800 },
      ],
      syncedAt: '2026-08-25 09:12',
    },
    {
      id: 'mc3',
      code: 'CLHT-2026-003',
      name: '交通安全设施材料采购合同',
      buyer: '顺畅养护公司',
      supplier: '安泰交通设施工程有限公司',
      amount: 967000,
      signDate: '2026-02-10',
      startDate: '2026-03-01',
      endDate: '2026-09-30',
      status: 'active',
      projectName: '基建配套工程',
      lines: [
        { id: 'mcl-7', materialCode: 'MAT-020', materialName: '波形梁护栏板(Gr-B级)', spec: '4320×310×3', unit: '块', price: 428, quantity: 1500, amount: 642000 },
        { id: 'mcl-8', materialCode: 'MAT-021', materialName: '护栏立柱(Φ140×4.5)', spec: 'Φ140×4.5', unit: '根', price: 172, quantity: 1890, amount: 325080 },
      ],
      syncedAt: '2026-08-25 09:12',
    },
    {
      id: 'mc4',
      code: 'CLHT-2025-004',
      name: '劳保及安全防护用品采购合同',
      buyer: '顺畅养护公司',
      supplier: '华东劳保用品有限公司',
      amount: 185000,
      signDate: '2025-09-05',
      startDate: '2025-09-15',
      endDate: '2026-09-14',
      status: 'active',
      lines: [
        { id: 'mcl-9', materialCode: 'MAT-007', materialName: '反光背心(高可视)', spec: 'GB20653', unit: '件', price: 34, quantity: 3000, amount: 102000 },
        { id: 'mcl-10', materialCode: 'MAT-008', materialName: '安全帽(ABS V型)', spec: 'GB2811', unit: '顶', price: 48, quantity: 1500, amount: 72000 },
        { id: 'mcl-11', materialCode: 'MAT-017', materialName: '防砸安全鞋(劳保)', spec: '国标', unit: '双', price: 168, quantity: 66, amount: 11088 },
      ],
      syncedAt: '2026-08-26 14:03',
    },
    {
      id: 'mc5',
      code: 'CLHT-2024-005',
      name: '钢材框架采购协议(2024年度)',
      buyer: '顺畅养护公司',
      supplier: '浙江物产金属集团有限公司',
      amount: 2650000,
      signDate: '2024-03-18',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      status: 'completed',
      projectName: '国道G318改扩建工程',
      lines: [
        { id: 'mcl-12', materialCode: 'MAT-005', materialName: 'HRB400螺纹钢(Φ16)', spec: 'Φ16', unit: '吨', price: 3980, quantity: 420, amount: 1671600 },
        { id: 'mcl-13', materialCode: 'MAT-006', materialName: 'HPB300圆钢(Φ10)', spec: 'Φ10', unit: '吨', price: 3820, quantity: 256, amount: 977920 },
      ],
      syncedAt: '2026-08-25 09:12',
    },
  ];
}

export function getMaterialContracts(): MaterialContract[] {
  const raw = localStorage.getItem(STORAGE_KEY_MC);
  if (!raw) {
    const seeded = seedMaterialContracts();
    localStorage.setItem(STORAGE_KEY_MC, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveMaterialContracts(list: MaterialContract[]) {
  localStorage.setItem(STORAGE_KEY_MC, JSON.stringify(list));
}

/** 从材料管理系统同步一条新材料合同（模拟） */
export function syncMaterialContract(): MaterialContract {
  const list = getMaterialContracts();
  const n = list.length + 1;
  const pool = [
    { name: '热熔标线涂料采购合同', supplier: '路彩交通材料有限公司', amount: 428000, project: '市政道路养护工程' },
    { name: '桥梁伸缩缝材料采购合同', supplier: '路桥构件制品有限公司', amount: 765000, project: '基建配套工程' },
    { name: '路基填筑砂砾料采购合同', supplier: '宏发矿业有限公司', amount: 532000, project: '国道G318改扩建工程' },
  ];
  const p = pool[Math.floor(Math.random() * pool.length)];
  const mc: MaterialContract = {
    id: genId('mc'),
    code: `CLHT-2026-${String(n).padStart(3, '0')}`,
    name: p.name,
    buyer: '顺畅养护公司',
    supplier: p.supplier,
    amount: p.amount,
    signDate: '2026-08-20',
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    status: 'active',
    projectName: p.project,
    lines: [],
    syncedAt: nowStr(),
  };
  saveMaterialContracts([mc, ...list]);
  return mc;
}

/** 材料合同 → 合同模块 Contract 形态（供采购入库选择材料合同使用） */
export function toContractLike(mc: MaterialContract): Contract {
  return {
    id: mc.id,
    name: mc.name,
    code: mc.code,
    amount: mc.amount,
    financialStatus: '材料系统已同步',
    agency: '材料管理系统',
    type: '材料采购合同',
    source: '系统同步',
    partyA: mc.buyer,
    partyB: mc.supplier,
    status: '已确认',
    transferCount: 0,
    isLocked: false,
    createTime: mc.syncedAt,
    confirmTime: mc.syncedAt,
    performanceStartDate: mc.startDate,
    performanceEndDate: mc.endDate,
  };
}

/** 合同执行情况：根据采购入库单（引用该合同）统计 */
export function getContractExecution(contractId: string): {
  orders: StockInOrder[]; orderCount: number; totalAmount: number;
} {
  const orders = getStockInOrders().filter(
    o => o.type === 'purchase' && o.contractId === contractId && o.status !== 'voided' && o.status !== 'draft');
  const totalAmount = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  return { orders, orderCount: orders.length, totalAmount };
}

// ==================== 材料对账 ====================

/** 对账单状态 */
export type ReconStatus = 'pending' | 'confirmed';

/** 对账明细行（某期间某合同下的入库/结算明细快照） */
export interface ReconLine {
  id: string;
  stockInCode: string;         // 关联入库单号
  docDate: string;             // 入库日期
  materialCode: string;
  materialName: string;
  spec?: string;
  unit: string;
  quantity: number;
  amount: number;              // 价税合计
}

/** 材料对账单 */
export interface ReconStatement {
  id: string;
  code: string;                // 对账单号 DZ-yyyymm-xxx
  period: string;              // 对账期间（YYYY-MM）
  contractId: string;
  contractCode: string;
  contractName: string;
  supplier: string;
  lines: ReconLine[];          // 对账明细（入库快照）
  inAmount: number;            // 本期入库金额（我方账面）
  settleAmount: number;         // 本期结算金额（供应商账面）
  status: ReconStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  remark?: string;
  createdAt: string;
}

const STORAGE_KEY_RECON = 'md_material_recon_list';

export function getReconStatements(): ReconStatement[] {
  const raw = localStorage.getItem(STORAGE_KEY_RECON);
  if (!raw) {
    const seeded = seedReconStatements();
    localStorage.setItem(STORAGE_KEY_RECON, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveReconStatements(list: ReconStatement[]) {
  localStorage.setItem(STORAGE_KEY_RECON, JSON.stringify(list));
}

function seedReconStatements(): ReconStatement[] {
  return [
    {
      id: 'rz1',
      code: 'DZ-202607-001',
      period: '2026-07',
      contractId: 'mc1', contractCode: 'CLHT-2025-001', contractName: '道路沥青材料年度采购合同',
      supplier: '中石化道路材料有限公司',
      lines: [
        { id: 'rl-1', stockInCode: 'RK-202607-0012', docDate: '2026-07-05', materialCode: 'MAT-001', materialName: 'SBS改性沥青(I-D)', spec: 'I-D', unit: '吨', quantity: 60, amount: 318000 },
        { id: 'rl-2', stockInCode: 'RK-202607-0031', docDate: '2026-07-18', materialCode: 'MAT-001', materialName: 'SBS改性沥青(I-D)', spec: 'I-D', unit: '吨', quantity: 45, amount: 238500 },
        { id: 'rl-3', stockInCode: 'RK-202607-0055', docDate: '2026-07-26', materialCode: 'MAT-010', materialName: '乳化沥青(PC-3)', spec: 'PC-3', unit: '吨', quantity: 20, amount: 76000 },
      ],
      inAmount: 632500, settleAmount: 632500,
      status: 'confirmed', confirmedBy: '王会计', confirmedAt: '2026-08-03 10:20',
      remark: '双方账目一致', createdAt: '2026-08-01 09:00',
    },
    {
      id: 'rz2',
      code: 'DZ-202608-001',
      period: '2026-08',
      contractId: 'mc2', contractCode: 'CLHT-2025-002', contractName: '水泥及砂石料集中采购合同',
      supplier: '南方建材集团股份有限公司',
      lines: [
        { id: 'rl-4', stockInCode: 'RK-202608-0006', docDate: '2026-08-04', materialCode: 'MAT-003', materialName: 'PO42.5散装水泥', spec: 'P.O 42.5', unit: '吨', quantity: 300, amount: 132000 },
        { id: 'rl-5', stockInCode: 'RK-202608-0018', docDate: '2026-08-12', materialCode: 'MAT-004', materialName: '玄武岩碎石(10-15mm)', spec: '10-15mm', unit: '吨', quantity: 800, amount: 73600 },
        { id: 'rl-6', stockInCode: 'RK-202608-0027', docDate: '2026-08-20', materialCode: 'MAT-005', materialName: '天然河砂(中砂)', spec: '中砂', unit: '吨', quantity: 500, amount: 49000 },
      ],
      inAmount: 254600, settleAmount: 254600,
      status: 'pending',
      remark: '待供应商对账确认', createdAt: '2026-08-24 16:40',
    },
  ];
}

/** 生成对账单：按合同+期间汇总采购入库单（自动快照明细） */
export function buildReconStatement(
  contract: MaterialContract, period: string,
): ReconStatement | null {
  const orders = getStockInOrders().filter(o =>
    o.type === 'purchase' &&
    o.contractId === contract.id &&
    o.docDate.startsWith(period) &&
    o.status !== 'voided' && o.status !== 'draft');
  if (orders.length === 0) return null;

  const lines: ReconLine[] = [];
  for (const o of orders) {
    for (const l of o.lines) {
      lines.push({
        id: genId('rl'),
        stockInCode: o.code,
        docDate: o.docDate,
        materialCode: l.materialCode,
        materialName: l.materialName,
        spec: l.spec,
        unit: l.unit,
        quantity: l.quantity,
        amount: l.totalAmount || l.amount || 0,
      });
    }
  }
  const inAmount = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

  // 已存在同期间同合同的对账单则跳过
  const existing = getReconStatements().find(
    r => r.contractId === contract.id && r.period === period);
  if (existing) return null;

  const seq = getReconStatements().filter(r => r.period === period).length + 1;
  return {
    id: genId('rz'),
    code: `DZ-${period.replace('-', '')}-${String(seq).padStart(3, '0')}`,
    period,
    contractId: contract.id,
    contractCode: contract.code,
    contractName: contract.name,
    supplier: contract.supplier,
    lines,
    inAmount,
    settleAmount: inAmount,
    status: 'pending',
    remark: '',
    createdAt: nowStr(),
  };
}

export function addReconStatement(st: ReconStatement) {
  saveReconStatements([st, ...getReconStatements()]);
}

export function confirmReconStatement(id: string, settleAmount?: number, remark?: string) {
  saveReconStatements(getReconStatements().map(r =>
    r.id === id ? {
      ...r,
      settleAmount: settleAmount !== undefined ? settleAmount : r.settleAmount,
      remark: remark !== undefined ? remark : r.remark,
      status: 'confirmed' as const,
      confirmedBy: '当前用户',
      confirmedAt: nowStr(),
    } : r));
}

export function deleteReconStatement(id: string) {
  saveReconStatements(getReconStatements().filter(r => r.id !== id));
}
