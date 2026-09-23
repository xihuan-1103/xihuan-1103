/**
 * 材料系统 - 数据存储（localStorage）
 * 提供所有基础数据 & 业务单据的 CRUD 与联动逻辑（库存变动、自动生成单据）
 */

import type {
  Material, Warehouse, IssueOrder, TransferOrder,
  StockInOrder, StockOutOrder, StockBalance, ValuationOrder, DocLineItem,
  StockInType, StockOutType, TransferOrderStatus, IssueOrderStatus,
} from './types';
import type { Project, Contract } from '@/types';
import type { SysOrg } from '../system/types';

// ==================== 工具与本地存储 ====================

// 材料数据 schema 版本。当默认基础数据有新增/调整时升级此数字 → 自动重置对应 localStorage
const DATA_SCHEMA_VERSION = 2;
const VERSION_KEY = 'cico-material-schema-version';

function getCurrentVersion(): number {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    return v ? Number(v) : 0;
  } catch { return 0; }
}
function setCurrentVersion(v: number): void {
  try { localStorage.setItem(VERSION_KEY, String(v)); } catch { /* ignore */ }
}

function readArray<T>(key: string, defaults: T[]): T[] {
  // 如果 schema 升级过 → 无条件用默认值重写（让仓库/材料/库存重新 seed 到新的完整数据集）
  const needReset = getCurrentVersion() < DATA_SCHEMA_VERSION;
  try {
    const raw = localStorage.getItem(key);
    if (raw && !needReset) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}
// 所有 CRUD 读取后统一更新一次版本号（避免重复重置）
function ensureVersioned() {
  if (getCurrentVersion() < DATA_SCHEMA_VERSION) {
    setCurrentVersion(DATA_SCHEMA_VERSION);
  }
}

function writeArray<T>(key: string, data: T[]): void {
  ensureVersioned();
  localStorage.setItem(key, JSON.stringify(data));
}
export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
export function nowStr(): string {
  return new Date().toISOString();
}

// 单据编号生成器
const COUNTER_KEY = 'cico-material-counters';
function getCounters(): Record<string, number> {
  try {
    const r = localStorage.getItem(COUNTER_KEY);
    if (r) return JSON.parse(r);
  } catch { /* ignore */ }
  return {};
}
function setCounters(c: Record<string, number>): void {
  localStorage.setItem(COUNTER_KEY, JSON.stringify(c));
}
export function nextDocCode(prefix: string): string {
  const counters = getCounters();
  const dateKey = todayStr().replace(/-/g, '');
  const key = `${prefix}-${dateKey}`;
  const n = (counters[key] || 0) + 1;
  counters[key] = n;
  setCounters(counters);
  return `${prefix}${dateKey}${String(n).padStart(3, '0')}`;
}

// 数字处理
function n(v: number | undefined | null, d = 0): number {
  const x = Number(v);
  if (!Number.isFinite(x)) return d;
  return x;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// 重新计算单据行金额（不含税单价*数量 → 金额、税额、合计）
export function recalcLine(line: DocLineItem, taxRate = 0.13): DocLineItem {
  const qty = n(line.quantity);
  const price = n(line.unitPrice);
  const amount = round2(qty * price);
  const tax = round2(amount * taxRate);
  return { ...line, amount, taxAmount: tax, totalAmount: round2(amount + tax), unitPrice: price };
}

export function recalcDocTotals<T extends { lines: DocLineItem[]; totalAmount?: number }>(doc: T, taxRate = 0.13): T {
  const lines = doc.lines.map(l => recalcLine(l, taxRate));
  const totalAmount = lines.reduce((s, l) => s + n(l.totalAmount), 0);
  return { ...doc, lines, totalAmount: round2(totalAmount) };
}

// ==================== Local Storage Keys ====================
const K = {
  materials: 'cico-mat-master',
  warehouses: 'cico-mat-warehouses',
  issues: 'cico-mat-issues',
  transfers: 'cico-mat-transfers',
  stockIn: 'cico-mat-stockin',
  stockOut: 'cico-mat-stockout',
  balances: 'cico-mat-balances',
  valuations: 'cico-mat-valuations',
};

// ==================== 基础数据初始化 ====================

const DEFAULT_MATERIALS: Material[] = [
  // 沥青材料
  { id: 'mat-1', code: 'LQ-001', name: 'SBS改性沥青(I-C)', category: '沥青材料', spec: 'I-C 型', unit: '吨', price: 5200, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-2', code: 'LQ-002', name: '70号A级道路沥青', category: '沥青材料', spec: '70号A', unit: '吨', price: 4500, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-11', code: 'LQ-003', name: '乳化沥青(PCR)', category: '沥青材料', spec: 'PCR 喷洒型', unit: '吨', price: 3800, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 水泥材料
  { id: 'mat-3', code: 'SN-001', name: '普通硅酸盐水泥', category: '水泥材料', spec: 'P.O 42.5', unit: '吨', price: 420, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-12', code: 'SN-002', name: '早强硅酸盐水泥', category: '水泥材料', spec: 'P.O 52.5R', unit: '吨', price: 560, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 砂石料
  { id: 'mat-4', code: 'SS-001', name: '玄武岩碎石', category: '砂石料', spec: '10-15mm', unit: '吨', price: 88, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-5', code: 'SS-002', name: '天然河砂', category: '砂石料', spec: '中砂', unit: '立方米', price: 95, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-13', code: 'SS-003', name: '石灰岩碎石', category: '砂石料', spec: '5-10mm', unit: '吨', price: 76, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-14', code: 'SS-004', name: '机制砂', category: '砂石料', spec: '细砂', unit: '立方米', price: 82, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 钢材
  { id: 'mat-6', code: 'GC-001', name: '热轧带肋钢筋', category: '钢材', spec: 'HRB400 φ16', unit: '吨', price: 3950, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-7', code: 'GC-002', name: '热轧光圆钢筋', category: '钢材', spec: 'HPB300 φ10', unit: '吨', price: 3800, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-15', code: 'GC-003', name: '精轧螺纹钢', category: '钢材', spec: 'PSB930 φ32', unit: '吨', price: 6800, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-16', code: 'GC-004', name: '镀锌钢板', category: '钢材', spec: 'Q235B δ=3mm', unit: '吨', price: 5200, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 劳保用品
  { id: 'mat-8', code: 'LB-001', name: '反光背心', category: '劳保用品', spec: '标准款', unit: '件', price: 32, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-9', code: 'LB-002', name: '安全帽', category: '劳保用品', spec: 'ABS 透气', unit: '顶', price: 45, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-17', code: 'LB-003', name: '绝缘手套', category: '劳保用品', spec: '12KV', unit: '双', price: 58, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-18', code: 'LB-004', name: '防砸安全鞋', category: '劳保用品', spec: '钢头防刺', unit: '双', price: 165, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 五金工具
  { id: 'mat-10', code: 'WJ-001', name: '六角螺栓', category: '五金工具', spec: 'M16x50 8.8级', unit: '百个', price: 68, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-19', code: 'WJ-002', name: '钢丝绳卡头', category: '五金工具', spec: 'φ15', unit: '个', price: 18, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-20', code: 'WJ-003', name: '钢丝刷', category: '五金工具', spec: '8寸除锈', unit: '把', price: 12, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 交通设施
  { id: 'mat-21', code: 'JT-001', name: '波形梁护栏板', category: '交通设施', spec: 'Gr-A-4E 4320mm', unit: '块', price: 420, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-22', code: 'JT-002', name: '护栏立柱', category: '交通设施', spec: 'φ140x4.5x2100', unit: '根', price: 168, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-23', code: 'JT-003', name: '反光路锥', category: '交通设施', spec: '70cm 橡胶', unit: '个', price: 45, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  // 标线材料
  { id: 'mat-24', code: 'BX-001', name: '热熔型标线涂料', category: '标线材料', spec: '白色 普通型', unit: '吨', price: 4200, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'mat-25', code: 'BX-002', name: '路面标线玻璃微珠', category: '标线材料', spec: '1号 反光', unit: '吨', price: 3600, taxRate: 0.13, createdAt: nowStr(), updatedAt: nowStr() },
];

const DEFAULT_WAREHOUSES: Warehouse[] = [
  // 项目部1（org-proj-1）
  { id: 'wh-1', name: '中心材料库', orgId: 'org-proj-1', address: '项目部1主场区A栋', keeper: '张建国', enabled: true },
  { id: 'wh-2', name: '沥青混合料搅拌站', orgId: 'org-proj-1', address: '项目部1南侧K20+600处', keeper: '李明杰', enabled: true },
  { id: 'wh-3', name: '钢材/五金库区', orgId: 'org-proj-1', address: '项目部1主场区B栋', keeper: '王海峰', enabled: true },
  // 项目部2（org-proj-2）
  { id: 'wh-4', name: '项目部2主库', orgId: 'org-proj-2', address: 'G60沪昆项目部主场区1号库', keeper: '赵文斌', enabled: true },
  { id: 'wh-5', name: '砂石料露天堆场', orgId: 'org-proj-2', address: 'K260+300右侧料场', keeper: '钱建忠', enabled: true },
  { id: 'wh-6', name: '交通设施/劳保专用库', orgId: 'org-proj-2', address: '项目部2主场区2号库', keeper: '孙国栋', enabled: true },
];

// 初始示例库存
function seedBalances(): StockBalance[] {
  return [
    // wh-1 项目部1中心库：沥青、水泥、钢材、劳保
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[0], 50, 5200),    // SBS改性沥青
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[1], 30, 4500),    // 70号沥青
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[2], 200, 420),    // PO42.5水泥
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[5], 10, 3950),    // HRB400 φ16
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[6], 8, 3800),     // HPB300 φ10
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[7], 200, 32),     // 反光背心
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[8], 150, 45),     // 安全帽
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[9], 5, 5200),     // 镀锌钢板
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[17], 120, 165),   // 防砸安全鞋
    balanceRow('org-proj-1', 'wh-1', DEFAULT_MATERIALS[10], 80, 3800),   // 乳化沥青
    // wh-2 沥青搅拌站
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[3], 500, 88),     // 玄武岩碎石 10-15
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[4], 80, 95),      // 天然河砂中砂
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[12], 300, 76),    // 石灰岩碎石 5-10
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[13], 120, 82),    // 机制砂
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[0], 120, 5200),   // SBS改性沥青（搅拌站储备）
    balanceRow('org-proj-1', 'wh-2', DEFAULT_MATERIALS[22], 10, 4200),   // 热熔标线涂料
    // wh-3 钢材/五金库
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[5], 25, 3950),    // HRB400 φ16
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[6], 18, 3800),    // HPB300 φ10
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[14], 6, 6800),    // 精轧螺纹
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[15], 12, 5200),   // 镀锌钢板
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[9], 60, 68),      // 六角螺栓
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[18], 200, 18),    // 钢丝绳卡头
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[19], 150, 12),    // 钢丝刷
    balanceRow('org-proj-1', 'wh-3', DEFAULT_MATERIALS[16], 80, 58),     // 绝缘手套
    // wh-4 项目部2主库
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[2], 150, 420),    // PO42.5水泥
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[11], 40, 560),    // P.O 52.5R早强水泥
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[0], 80, 5200),    // SBS沥青
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[5], 20, 3950),    // HRB400 φ16
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[7], 150, 32),     // 反光背心
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[8], 80, 45),      // 安全帽
    balanceRow('org-proj-2', 'wh-4', DEFAULT_MATERIALS[23], 5, 3600),    // 标线玻璃微珠
    // wh-5 砂石料堆场
    balanceRow('org-proj-2', 'wh-5', DEFAULT_MATERIALS[3], 800, 88),     // 玄武岩碎石
    balanceRow('org-proj-2', 'wh-5', DEFAULT_MATERIALS[12], 600, 76),    // 石灰岩碎石
    balanceRow('org-proj-2', 'wh-5', DEFAULT_MATERIALS[4], 250, 95),     // 天然河砂
    balanceRow('org-proj-2', 'wh-5', DEFAULT_MATERIALS[13], 180, 82),    // 机制砂
    // wh-6 交通设施/劳保专用库
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[20], 600, 420),   // 波形梁护栏板
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[21], 800, 168),   // 护栏立柱
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[9], 300, 45),     // 反光路锥
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[7], 300, 32),     // 反光背心
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[8], 200, 45),     // 安全帽
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[17], 100, 165),   // 防砸安全鞋
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[16], 150, 58),    // 绝缘手套
    balanceRow('org-proj-2', 'wh-6', DEFAULT_MATERIALS[9], 80, 68),      // 六角螺栓（少量）
  ];
}
function balanceRow(orgId: string, whId: string, m: Material, qty: number, cost: number): StockBalance {
  const wh = DEFAULT_WAREHOUSES.find(w => w.id === whId);
  const orgNameMap: Record<string, string> = {
    'org-proj-1': '项目部1',
    'org-proj-2': '项目部2',
  };
  return {
    id: `${orgId}|${whId}|${m.id}`,
    orgId,
    orgName: orgNameMap[orgId] || orgId,
    warehouseId: whId,
    warehouseName: wh?.name || whId,
    materialId: m.id,
    materialCode: m.code,
    materialName: m.name,
    spec: m.spec,
    unit: m.unit,
    qty,
    avgCost: cost,
    amount: round2(qty * cost),
    lastMoveDate: todayStr(),
  };
}

// ==================== CRUD：基础数据 ====================

export function getMaterials(): Material[] {
  return readArray(K.materials, DEFAULT_MATERIALS);
}
export function saveMaterials(list: Material[]): void { writeArray(K.materials, list); }
export function getMaterialById(id: string): Material | undefined {
  return getMaterials().find(m => m.id === id);
}
export function getMaterialByCode(code: string): Material | undefined {
  return getMaterials().find(m => m.code === code);
}

export function getWarehouses(): Warehouse[] {
  return readArray(K.warehouses, DEFAULT_WAREHOUSES);
}
export function saveWarehouses(list: Warehouse[]): void { writeArray(K.warehouses, list); }
export function getWarehousesByOrg(orgId: string): Warehouse[] {
  return getWarehouses().filter(w => w.orgId === orgId && w.enabled);
}

// ==================== 库存 ====================

export function getBalances(): StockBalance[] {
  return readArray(K.balances, seedBalances());
}
export function saveBalances(list: StockBalance[]): void { writeArray(K.balances, list); }

/** 库存查询：按条件过滤 */
export function queryBalances(filter: { orgId?: string; warehouseId?: string; materialName?: string } = {}): StockBalance[] {
  let list = getBalances();
  if (filter.orgId) list = list.filter(b => b.orgId === filter.orgId);
  if (filter.warehouseId) list = list.filter(b => b.warehouseId === filter.warehouseId);
  if (filter.materialName) {
    const kw = filter.materialName.trim().toLowerCase();
    list = list.filter(b =>
      b.materialName.toLowerCase().includes(kw) || b.materialCode.toLowerCase().includes(kw)
    );
  }
  return list;
}

/** 按材料 ID 列表查各仓库的当前可用库存（含org+仓库名），用于领料单选材料时显示 */
export function getStockBalancesByMaterialIds(materialIds?: string[], orgId?: string): StockBalance[] {
  const list = getBalances().filter(b => b.qty > 0);
  const r1 = materialIds?.length ? list.filter(b => materialIds.includes(b.materialId)) : list;
  return orgId ? r1.filter(b => b.orgId === orgId) : r1;
}

/** 按 组织+仓库+材料 查库存（不存在则创建一个0的） */
export function getOrCreateBalance(orgId: string, orgName: string, warehouseId: string, warehouseName: string, m: Material): StockBalance {
  const list = getBalances();
  const id = `${orgId}|${warehouseId}|${m.id}`;
  let b = list.find(x => x.id === id);
  if (!b) {
    b = {
      id, orgId, orgName, warehouseId, warehouseName,
      materialId: m.id, materialCode: m.code, materialName: m.name,
      spec: m.spec, unit: m.unit,
      qty: 0, avgCost: 0, amount: 0,
      lastMoveDate: todayStr(),
    };
    list.push(b);
    saveBalances(list);
  }
  return b;
}

/** 入库：加权平均 */
export function stockIn(orgId: string, orgName: string, warehouseId: string, warehouseName: string, line: DocLineItem): void {
  const m = getMaterialById(line.materialId);
  if (!m) return;
  const list = getBalances();
  const b = getOrCreateBalance(orgId, orgName, warehouseId, warehouseName, m);
  const idx = list.findIndex(x => x.id === b.id);
  const prevQty = n(b.qty);
  const prevAmt = n(b.amount);
  const inQty = n(line.quantity);
  const price = n(line.unitPrice);
  const inAmt = round2(inQty * price);
  const newQty = prevQty + inQty;
  const newAmt = prevAmt + inAmt;
  const newAvg = newQty > 0 ? round2(newAmt / newQty) : 0;
  if (idx >= 0) {
    list[idx] = { ...b, qty: newQty, avgCost: newAvg, amount: round2(newAmt), lastMoveDate: todayStr() };
  } else {
    list.push({ ...b, qty: newQty, avgCost: newAvg, amount: round2(newAmt) });
  }
  saveBalances(list);
}

/** 出库：按现有平均成本 */
export function stockOut(orgId: string, warehouseId: string, line: DocLineItem): number {
  // 返回实际出库成本 (unit) 用于写单
  const list = getBalances();
  const idx = list.findIndex(x => x.orgId === orgId && x.warehouseId === warehouseId && x.materialId === line.materialId);
  if (idx < 0) return 0;
  const b = list[idx];
  const outQty = n(line.quantity);
  const newQty = n(b.qty) - outQty;
  const costUnit = b.avgCost;
  const outAmt = round2(outQty * costUnit);
  const newAmt = n(b.amount) - outAmt;
  list[idx] = {
    ...b,
    qty: Math.max(0, newQty),
    amount: Math.max(0, round2(newAmt)),
    avgCost: newQty > 0 ? round2(Math.max(0, newAmt) / newQty) : 0,
    lastMoveDate: todayStr(),
  };
  saveBalances(list);
  return costUnit;
}

// ==================== 入库单 ====================

const DEFAULT_STOCKIN: StockInOrder[] = [];
export function getStockInOrders(): StockInOrder[] {
  return readArray(K.stockIn, DEFAULT_STOCKIN);
}
export function saveStockInOrders(list: StockInOrder[]): void { writeArray(K.stockIn, list); }
export function getStockInByType(type: StockInType): StockInOrder[] {
  return getStockInOrders().filter(o => o.type === type).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** 创建/更新入库单（保存时不影响库存；只有状态=audited 影响库存） */
export function upsertStockIn(doc: StockInOrder): StockInOrder {
  const calc = recalcDocTotals({ ...doc, updatedAt: nowStr() });
  const list = getStockInOrders();
  const idx = list.findIndex(x => x.id === calc.id);
  if (idx >= 0) list[idx] = calc;
  else list.unshift(calc);
  saveStockInOrders(list);
  return calc;
}

/** 审核入库单：写入库存 */
export function auditStockIn(id: string): StockInOrder | undefined {
  const list = getStockInOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  const doc = list[idx];
  if (doc.status === 'audited') return doc;
  const wh = getWarehouses().find(w => w.id === doc.warehouseId);
  doc.lines.forEach(line => stockIn(doc.orgId, doc.orgName, doc.warehouseId || 'default', wh?.name || '默认仓库', line));
  const updated: StockInOrder = { ...doc, status: 'audited', updatedAt: nowStr() };
  list[idx] = updated;
  saveStockInOrders(list);
  return updated;
}

// ==================== 出库单 ====================

const DEFAULT_STOCKOUT: StockOutOrder[] = [];
export function getStockOutOrders(): StockOutOrder[] {
  return readArray(K.stockOut, DEFAULT_STOCKOUT);
}
export function saveStockOutOrders(list: StockOutOrder[]): void { writeArray(K.stockOut, list); }
export function getStockOutByType(type: StockOutType): StockOutOrder[] {
  return getStockOutOrders().filter(o => o.type === type).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function upsertStockOut(doc: StockOutOrder): StockOutOrder {
  const calc = recalcDocTotals({ ...doc, updatedAt: nowStr() });
  const list = getStockOutOrders();
  const idx = list.findIndex(x => x.id === calc.id);
  if (idx >= 0) list[idx] = calc;
  else list.unshift(calc);
  saveStockOutOrders(list);
  return calc;
}

/** 审核出库单：扣减库存 */
export function auditStockOut(id: string): StockOutOrder | undefined {
  const list = getStockOutOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  const doc = list[idx];
  if (doc.status === 'audited') return doc;
  const newLines: DocLineItem[] = doc.lines.map(line => {
    const costUnit = stockOut(doc.orgId, doc.warehouseId || 'default', line);
    if (costUnit > 0 && (!line.unitPrice || line.unitPrice === 0)) {
      return recalcLine({ ...line, unitPrice: costUnit });
    }
    return line;
  });
  const updated: StockOutOrder = {
    ...recalcDocTotals({ ...doc, lines: newLines }),
    status: 'audited',
    updatedAt: nowStr(),
  };
  list[idx] = updated;
  saveStockOutOrders(list);
  return updated;
}

// ==================== 领料单（含与退料/出库联动）====================

const DEFAULT_ISSUES: IssueOrder[] = [];
export function getIssueOrders(): IssueOrder[] {
  return readArray(K.issues, DEFAULT_ISSUES);
}
export function saveIssueOrders(list: IssueOrder[]): void { writeArray(K.issues, list); }

export function upsertIssueOrder(doc: IssueOrder): IssueOrder {
  const lines = doc.lines.map(l => ({
    ...l,
    issuedQty: n(l.issuedQty),
    returnedQty: n(l.returnedQty),
    quotaQty: n(l.quotaQty, n(l.quantity)),
  }));
  const updated: IssueOrder = { ...doc, lines, updatedAt: nowStr() };
  const list = getIssueOrders();
  const idx = list.findIndex(x => x.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  saveIssueOrders(list);
  return updated;
}

/** 基于领料单生成领料出库单（支持部分出库：按传入 partialLines 数量发料）并更新 issuedQty */
export function issueToStockOutWithPartial(
  issueId: string,
  orgId: string,
  orgName: string,
  warehouseId: string,
  partialLines: { materialId: string; quantity: number; unitPrice?: number; remark?: string }[],
  handler?: string,
): StockOutOrder | undefined {
  const list = getIssueOrders();
  const idx = list.findIndex(x => x.id === issueId);
  if (idx < 0) return undefined;
  const issue = list[idx];

  // 构造出库明细行（从领料单详情 + 传入 partialLines 合成）
  const toIssue: DocLineItem[] = [];
  for (const pl of partialLines) {
    const qty = Number(pl.quantity || 0);
    if (qty <= 0) continue;
    const base = issue.lines.find(l => l.materialId === pl.materialId);
    const remain = base ? Math.max(0, n(base.quotaQty) - n(base.issuedQty) + n(base.returnedQty)) : 0;
    if (qty > remain) continue; // 超量跳过
    toIssue.push(recalcLine({
      id: genId('li'),
      materialId: pl.materialId,
      materialCode: base?.materialCode || '',
      materialName: base?.materialName || '',
      spec: base?.spec || '',
      unit: base?.unit || '',
      quantity: qty,
      unitPrice: pl.unitPrice ?? base?.unitPrice ?? 0,
      remark: pl.remark,
      sourceLineId: base?.id,
    }));
  }
  if (toIssue.length === 0) return undefined;
  const out: StockOutOrder = {
    id: genId('so'),
    code: nextDocCode('CK-LL-'),
    type: 'issue',
    orgId, orgName,
    warehouseId,
    projectId: issue.projectId,
    projectName: issue.projectName,
    issueOrderId: issue.id,
    issueOrderCode: issue.code,
    teamId: issue.teamId,
    teamName: issue.teamName,
    handler,
    docDate: todayStr(),
    status: 'draft',
    remark: `基于领料单 ${issue.code} 部分发放自动生成（${toIssue.length}项）`,
    lines: toIssue,
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: true,
    sourceModule: 'issue',
  };
  const savedOut = upsertStockOut(out);
  // 更新领料单：issuedQty += 实际发量
  const issueLines = issue.lines.map(l => {
    const picked = partialLines.find(x => x.materialId === l.materialId);
    if (!picked) return l;
    const remain = Math.max(0, n(l.quotaQty) - n(l.issuedQty) + n(l.returnedQty));
    const addQty = Math.max(0, Math.min(remain, n(picked.quantity)));
    return { ...l, issuedQty: n(l.issuedQty) + addQty };
  });
  // 状态：只要还有剩余可领 → issuing；已发满 → completed
  const stillRemain = issueLines.some(l =>
    Math.max(0, n(l.quotaQty) - n(l.issuedQty) + n(l.returnedQty)) > 0
  );
  let status: IssueOrderStatus = issue.status;
  if (issue.status === 'draft') status = stillRemain ? 'issuing' : 'completed';
  else if (issue.status === 'submitted') status = stillRemain ? 'issuing' : 'completed';
  else if (issue.status === 'completed') {
    // 若原来是 completed（发满后又退料导致有剩余），再发仍然可能回 completed
    status = stillRemain ? 'issuing' : 'completed';
  } else if (issue.status === 'issuing') {
    status = stillRemain ? 'issuing' : 'completed';
  }
  list[idx] = { ...issue, lines: issueLines, status, updatedAt: nowStr() };
  saveIssueOrders(list);
  return savedOut;
}

/** 基于领料单生成领料出库单（按定额全量剩余）并更新 issuedQty — 兼容保留旧接口 */
export function issueToStockOut(issueId: string, orgId: string, orgName: string, warehouseId: string, handler?: string): StockOutOrder | undefined {
  const issue = getIssueOrders().find(i => i.id === issueId);
  if (!issue) return undefined;
  const pl = issue.lines
    .map(l => ({
      materialId: l.materialId,
      quantity: Math.max(0, n(l.quotaQty) - n(l.issuedQty) + n(l.returnedQty)),
      unitPrice: l.unitPrice || 0,
    }))
    .filter(x => x.quantity > 0);
  if (pl.length === 0) return undefined;
  return issueToStockOutWithPartial(issueId, orgId, orgName, warehouseId, pl, handler);
}

/** 在领料单上"直接退料" → 自动生成退料入库单 + 更新 returnedQty */
export function issueReturnToStockIn(
  issueId: string,
  orgId: string,
  orgName: string,
  warehouseId: string,
  returnLines: { materialId: string; quantity: number; remark?: string }[],
  handler?: string,
): StockInOrder | undefined {
  const list = getIssueOrders();
  const idx = list.findIndex(x => x.id === issueId);
  if (idx < 0) return undefined;
  const issue = list[idx];
  const lines: DocLineItem[] = returnLines.map(r => {
    const base = issue.lines.find(l => l.materialId === r.materialId);
    if (!base) return null as unknown as DocLineItem;
    return recalcLine({
      id: genId('li'),
      materialId: base.materialId,
      materialCode: base.materialCode,
      materialName: base.materialName,
      spec: base.spec,
      unit: base.unit,
      quantity: n(r.quantity),
      unitPrice: base.unitPrice || 0,
      remark: r.remark,
      sourceLineId: base.id,
    });
  }).filter(Boolean);
  if (!lines.length) return undefined;
  const si: StockInOrder = {
    id: genId('si'),
    code: nextDocCode('RK-TL-'),
    type: 'return',
    orgId, orgName,
    warehouseId,
    projectId: issue.projectId,
    projectName: issue.projectName,
    issueOrderId: issue.id,
    issueOrderCode: issue.code,
    handler,
    docDate: todayStr(),
    status: 'draft',
    remark: `领料单 ${issue.code} 退料入库(模块自动生成)`,
    lines,
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: true,
    sourceModule: 'issue',
  };
  const saved = upsertStockIn(si);
  // 更新领料单 returnedQty
  const issueLines = issue.lines.map(l => {
    const r = returnLines.find(x => x.materialId === l.materialId);
    if (r) return { ...l, returnedQty: n(l.returnedQty) + n(r.quantity) };
    return l;
  });
  list[idx] = { ...issue, lines: issueLines, updatedAt: nowStr() };
  saveIssueOrders(list);
  return saved;
}

/** 领料单退料入库模块：主动选择领料单发起退料 */
export function manualReturnFromIssue(
  issueOrderId: string,
  orgId: string, orgName: string, warehouseId: string,
  lines: DocLineItem[],
  handler?: string,
): StockInOrder {
  const issue = getIssueOrders().find(i => i.id === issueOrderId);
  const doc: StockInOrder = {
    id: genId('si'),
    code: nextDocCode('RK-TL-'),
    type: 'return',
    orgId, orgName,
    warehouseId,
    projectId: issue?.projectId,
    projectName: issue?.projectName,
    issueOrderId: issue?.id,
    issueOrderCode: issue?.code,
    handler,
    docDate: todayStr(),
    status: 'draft',
    remark: '退料入库（主动发起）',
    lines: lines.map(l => recalcLine({ ...l, id: genId('li') })),
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: false,
    sourceModule: 'stock',
  };
  return upsertStockIn(doc);
}

// ==================== 调拨单 ===============

const DEFAULT_TRANSFERS: TransferOrder[] = [];
export function getTransferOrders(): TransferOrder[] {
  return readArray(K.transfers, DEFAULT_TRANSFERS);
}
export function saveTransferOrders(list: TransferOrder[]): void { writeArray(K.transfers, list); }

export function upsertTransfer(doc: TransferOrder): TransferOrder {
  const calc = recalcDocTotals({ ...doc, updatedAt: nowStr() });
  const list = getTransferOrders();
  const idx = list.findIndex(x => x.id === calc.id);
  if (idx >= 0) list[idx] = calc;
  else list.unshift(calc);
  saveTransferOrders(list);
  return calc;
}

/** 流程：1 调出方提交 → 待调入方确认 */
export function transferSubmit(id: string, by?: string): TransferOrder | undefined {
  return updateTransferStatus(id, 'submitted', { submitBy: by, submitAt: nowStr() });
}
/** 流程：2 调入方确认 */
export function transferConfirm(id: string, by?: string): TransferOrder | undefined {
  return updateTransferStatus(id, 'confirmed', { confirmBy: by, confirmAt: nowStr() });
}
/** 流程：2' 调入方驳回 */
export function transferReject(id: string, reason: string, by?: string): TransferOrder | undefined {
  return updateTransferStatus(id, 'rejected', { rejectBy: by, rejectAt: nowStr(), rejectReason: reason });
}
/** 流程：3 调出方执行出库 → 生成调拨出库单（扣减调出方库存） */
export function transferDoOut(id: string, warehouseId: string, by?: string): StockOutOrder | undefined {
  const list = getTransferOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  const t = list[idx];
  if (t.status !== 'confirmed' && t.status !== 'submitted') return undefined;
  const out: StockOutOrder = {
    id: genId('so'),
    code: nextDocCode('CK-DB-'),
    type: 'transfer',
    orgId: t.fromOrgId,
    orgName: t.fromOrgName,
    warehouseId,
    transferOrderId: t.id,
    transferOrderCode: t.code,
    toOrgId: t.toOrgId,
    toOrgName: t.toOrgName,
    handler: by,
    docDate: todayStr(),
    status: 'draft',
    remark: `调拨单 ${t.code} 自动生成（调出）`,
    lines: t.lines.map(l => ({ ...l, id: genId('li') })),
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: true,
    sourceModule: 'transfer',
  };
  const saved = upsertStockOut(out);
  const updated: TransferOrder = { ...t, status: 'out_done', outOrderId: saved.id, outBy: by, outAt: nowStr(), updatedAt: nowStr() };
  list[idx] = updated;
  saveTransferOrders(list);
  return saved;
}
/** 流程：4 调入方执行入库 → 生成调拨入库单（入调入方库存） */
export function transferDoIn(id: string, warehouseId: string, by?: string): StockInOrder | undefined {
  const list = getTransferOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  const t = list[idx];
  if (t.status !== 'out_done') return undefined;
  const sin: StockInOrder = {
    id: genId('si'),
    code: nextDocCode('RK-DB-'),
    type: 'transfer',
    orgId: t.toOrgId,
    orgName: t.toOrgName,
    warehouseId,
    transferOrderId: t.id,
    transferOrderCode: t.code,
    transferOutId: t.outOrderId,
    fromOrgId: t.fromOrgId,
    fromOrgName: t.fromOrgName,
    handler: by,
    docDate: todayStr(),
    status: 'draft',
    remark: `调拨单 ${t.code} 自动生成（调入）`,
    lines: t.lines.map(l => ({ ...l, id: genId('li') })),
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: true,
    sourceModule: 'transfer',
  };
  const saved = upsertStockIn(sin);
  const updated: TransferOrder = { ...t, status: 'completed', inOrderId: saved.id, inBy: by, inAt: nowStr(), updatedAt: nowStr() };
  list[idx] = updated;
  saveTransferOrders(list);
  return saved;
}
/** 流程：4' 调入方在"调拨入库"模块，主动选择调拨单入库（和 4 等价，也可在该模块调用） */
export function manualTransferIn(
  transferOrderId: string,
  orgId: string, orgName: string,
  warehouseId: string,
  lines: DocLineItem[],
  handler?: string,
): StockInOrder {
  const t = getTransferOrders().find(x => x.id === transferOrderId);
  const doc: StockInOrder = {
    id: genId('si'),
    code: nextDocCode('RK-DB-'),
    type: 'transfer',
    orgId, orgName,
    warehouseId,
    transferOrderId: t?.id,
    transferOrderCode: t?.code,
    fromOrgId: t?.fromOrgId,
    fromOrgName: t?.fromOrgName,
    handler,
    docDate: todayStr(),
    status: 'draft',
    remark: '调拨入库（主动发起）',
    lines: lines.map(l => recalcLine({ ...l, id: genId('li') })),
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: false,
    sourceModule: 'stock',
  };
  return upsertStockIn(doc);
}
function updateTransferStatus(id: string, status: TransferOrderStatus, patch: Partial<TransferOrder>): TransferOrder | undefined {
  const list = getTransferOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], status, ...patch, updatedAt: nowStr() };
  saveTransferOrders(list);
  return list[idx];
}

// ==================== 库存转移（价拨）====================

const DEFAULT_VALUATIONS: ValuationOrder[] = [];
export function getValuationOrders(): ValuationOrder[] {
  return readArray(K.valuations, DEFAULT_VALUATIONS);
}
export function saveValuationOrders(list: ValuationOrder[]): void { writeArray(K.valuations, list); }
export function upsertValuation(doc: ValuationOrder): ValuationOrder {
  const calc = recalcDocTotals({ ...doc, updatedAt: nowStr() });
  const list = getValuationOrders();
  const idx = list.findIndex(x => x.id === calc.id);
  if (idx >= 0) list[idx] = calc;
  else list.unshift(calc);
  saveValuationOrders(list);
  return calc;
}

/** 提交价拨单：生成出库单（+内部转移时的入库单），并更新库存 */
export function submitValuation(id: string, handler?: string): ValuationOrder | undefined {
  const list = getValuationOrders();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return undefined;
  const v = list[idx];
  if (v.status !== 'draft') return v;

  // 1. 出库单（外部/内部都要先出）
  const out: StockOutOrder = {
    id: genId('so'),
    code: nextDocCode('CK-JB-'),
    type: 'valuation',
    orgId: v.orgId,
    orgName: v.orgName,
    warehouseId: v.fromWarehouseId,
    valuationMode: v.mode,
    handler,
    docDate: todayStr(),
    status: 'draft',
    remark: v.mode === 'external' ? `外部价拨单 ${v.code}` : `内部转移单 ${v.code}（出库）`,
    lines: v.lines.map(l => ({ ...l, id: genId('li') })),
    createdAt: nowStr(),
    updatedAt: nowStr(),
    autoGenerated: true,
    sourceModule: 'valuation',
  };
  const savedOut = upsertStockOut(out);

  // 2. 内部转移：生成入库单（按自定义/成本价）
  let savedIn: StockInOrder | undefined;
  if (v.mode === 'internal' && v.toWarehouseId) {
    const sin: StockInOrder = {
      id: genId('si'),
      code: nextDocCode('RK-NB-'),
      type: 'other',
      orgId: v.orgId,
      orgName: v.orgName,
      warehouseId: v.toWarehouseId,
      handler,
      docDate: todayStr(),
      status: 'draft',
      remark: `内部转移单 ${v.code}（入库）`,
      lines: v.lines.map(l => ({ ...l, id: genId('li') })),
      createdAt: nowStr(),
      updatedAt: nowStr(),
      autoGenerated: true,
      sourceModule: 'valuation',
    };
    savedIn = upsertStockIn(sin);
  }

  const updated: ValuationOrder = {
    ...v,
    status: 'done',
    outOrderId: savedOut.id,
    inOrderId: savedIn?.id,
    updatedAt: nowStr(),
  };
  list[idx] = updated;
  saveValuationOrders(list);
  return updated;
}

// ==================== 辅助：项目/合同/组织下拉（从顶层数据取）====================
// 调用方需要通过 props 传入 projects/contracts，这里仅根据 store 拿组织
export function getOrgsForDropdown(): SysOrg[] {
  // 导入系统 store 懒加载避免循环依赖
  // 这里通过直接 getItem 拿数据以保持零依赖（fallback 默认值）
  try {
    const raw = localStorage.getItem('cico-sys-orgs');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    { id: 'org-proj-1', name: '项目部1', level: 'project', path: '养护集团/区域A/项目部1', createdAt: nowStr(), updatedAt: nowStr() },
    { id: 'org-proj-2', name: '项目部2', level: 'project', path: '养护集团/区域A/项目部2', createdAt: nowStr(), updatedAt: nowStr() },
  ];
}

/** 解析 csv / 简单表格为入库明细行（材料编码匹配） */
export function parseImportedRows(rows: { code?: string; name?: string; quantity?: number; unitPrice?: number; remark?: string }[]): { ok: boolean; lines: DocLineItem[]; errors: string[] } {
  const errors: string[] = [];
  const lines: DocLineItem[] = [];
  rows.forEach((r, i) => {
    const code = (r.code || '').toString().trim();
    const name = (r.name || '').toString().trim();
    const mat = code ? getMaterialByCode(code) : getMaterials().find(m => m.name === name);
    if (!mat) {
      errors.push(`第${i + 1}行：材料编码"${code}"或名称"${name}"未匹配到系统材料编码体系`);
      return;
    }
    const qty = Number(r.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`第${i + 1}行：数量无效`);
      return;
    }
    lines.push(recalcLine({
      id: genId('li'),
      materialId: mat.id,
      materialCode: mat.code,
      materialName: mat.name,
      spec: mat.spec,
      unit: mat.unit,
      quantity: qty,
      unitPrice: Number.isFinite(Number(r.unitPrice)) ? Number(r.unitPrice) : mat.price || 0,
      remark: r.remark,
    }));
  });
  return { ok: errors.length === 0, lines, errors };
}

/** 材料行 → 采购入库选择合同后回填甲乙双方 + 合同信息 */
export function patchStockInWithContract(
  doc: StockInOrder,
  contract: Contract | undefined,
  source: 'contract' | 'retail',
): StockInOrder {
  if (source === 'contract' && contract) {
    return {
      ...doc,
      purchaseSource: 'contract',
      contractId: contract.id,
      contractCode: contract.code,
      contractName: contract.name,
      buyer: contract.partyA,
      supplier: contract.partyB,
    };
  }
  return { ...doc, purchaseSource: 'retail', contractId: undefined, contractCode: undefined, contractName: undefined };
}

/** 定项入库：关联项目 */
export function patchStockInWithProject(doc: StockInOrder, project: Project | undefined): StockInOrder {
  return {
    ...doc,
    projectId: project?.id,
    projectName: project?.name,
  };
}

export function statusLabel<T extends string>(s: T | undefined, map: Record<string, string>): string {
  if (!s) return '-';
  return map[s] || s;
}

export const STOCK_IN_STATUS_MAP: Record<string, string> = {
  draft: '草稿', submitted: '已提交', audited: '已审核', voided: '作废',
};
export const STOCK_OUT_STATUS_MAP = STOCK_IN_STATUS_MAP;
export const ISSUE_STATUS_MAP: Record<IssueOrderStatus, string> = {
  draft: '草稿', submitted: '已提交', issuing: '发料中', completed: '已完成', closed: '已关闭', voided: '作废',
};
export const TRANSFER_STATUS_MAP: Record<TransferOrderStatus, string> = {
  draft: '草稿', submitted: '待调入确认', confirmed: '已确认', out_done: '调出已完成', completed: '全部完成', rejected: '已驳回', voided: '作废',
};
export const STOCK_IN_TYPE_MAP: Record<StockInType, string> = {
  purchase: '采购入库', return: '退料入库', transfer: '调拨入库', other: '其他入库',
};
export const STOCK_OUT_TYPE_MAP: Record<StockOutType, string> = {
  issue: '领料出库', transfer: '调拨出库', other: '其他出库', valuation: '价拨出库', return: '退货出库',
};
