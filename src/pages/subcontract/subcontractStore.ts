// 分包合同模块 - 数据存储层（localStorage）

import type { SubContract, SubContractItem, InventoryLink } from './types';
import type { ContractInventory } from '@/components/ContractInventoryMaintenance';

const STORAGE_KEY_SUB = 'md_subcontract_list';
const STORAGE_KEY_LINKS = 'md_inventory_links';

/** 分包清单存储前缀（与收入合同的 CONTRACT_INVENTORIES_ 区分，结构完全一致） */
export const SUB_INVENTORY_PREFIX = 'SUB_CONTRACT_INVENTORIES_';

const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowStr = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// ==================== 分包合同 ====================

function seedSubContracts(): SubContract[] {
  return [
    {
      id: 'sc1',
      name: '路面病害处治劳务分包合同',
      code: 'FB-HT-2025-001',
      amount: 860000,
      type: '劳务分包',
      source: '系统同步',
      partyA: '顺畅养护公司',
      partyB: '宏图路桥劳务有限公司',
      status: '待确认',
      agency: '浙江交工_顺畅养护公司_湖州项目部_工程科',
      projectName: '国道G318改扩建工程',
      transferCount: 0,
      isLocked: false,
      createTime: '2026-08-20 10:12',
      performanceStartDate: '2026-05-01',
      performanceEndDate: '2026-12-31',
    },
    {
      id: 'sc2',
      name: '桥梁支座更换专业分包合同',
      code: 'FB-HT-2025-002',
      amount: 1250000,
      type: '专业分包',
      source: '系统同步',
      partyA: '顺畅养护公司',
      partyB: '中南桥梁工程股份有限公司',
      status: '待确认',
      agency: '浙江交工_顺畅养护公司_杭州项目部',
      projectName: '市政道路养护工程',
      transferCount: 0,
      isLocked: false,
      createTime: '2026-08-21 14:35',
      performanceStartDate: '2026-06-01',
      performanceEndDate: '2027-05-31',
    },
    {
      id: 'sc3',
      name: '绿化养护分包合同',
      code: 'FB-HT-2025-003',
      amount: 420000,
      type: '专业分包',
      source: '系统同步',
      partyA: '顺畅养护公司',
      partyB: '绿洲园林建设有限公司',
      status: '已确认',
      agency: '浙江交工_顺畅养护公司_杭州项目部',
      projectName: '市政道路养护工程',
      transferCount: 0,
      isLocked: false,
      createTime: '2026-07-15 09:00',
      confirmTime: '2026-07-16 11:20',
      performanceStartDate: '2026-07-01',
      performanceEndDate: '2027-06-30',
    },
    {
      id: 'sc4',
      name: '机械设备租赁分包合同',
      code: 'FB-HT-2025-004',
      amount: 680000,
      type: '设备租赁分包',
      source: '系统同步',
      partyA: '顺畅养护公司',
      partyB: '力拓机械租赁有限公司',
      status: '已确认',
      agency: '浙江交工_顺畅养护公司_湖州项目部_工程科',
      projectName: '国道G318改扩建工程',
      transferCount: 0,
      isLocked: false,
      createTime: '2026-06-28 16:40',
      confirmTime: '2026-06-30 09:15',
      performanceStartDate: '2026-05-10',
      performanceEndDate: '2026-11-20',
    },
    {
      id: 'sc5',
      name: '交通安全设施工程专业分包合同',
      code: 'FB-HT-2025-005',
      amount: 950000,
      type: '专业分包',
      source: '系统同步',
      partyA: '顺畅养护公司',
      partyB: '安泰交通设施工程有限公司',
      status: '已确认',
      agency: '浙江交工_顺畅养护公司_宁波项目部',
      projectName: '基建配套工程',
      transferCount: 0,
      isLocked: false,
      createTime: '2026-05-12 11:05',
      confirmTime: '2026-05-13 10:00',
      performanceStartDate: '2026-05-15',
      performanceEndDate: '2027-02-28',
    },
  ];
}

export function getSubContracts(): SubContract[] {
  const raw = localStorage.getItem(STORAGE_KEY_SUB);
  if (!raw) {
    const seeded = seedSubContracts();
    localStorage.setItem(STORAGE_KEY_SUB, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSubContracts(list: SubContract[]) {
  localStorage.setItem(STORAGE_KEY_SUB, JSON.stringify(list));
}

/** 同步新分包合同（模拟从其他系统同步一条待确认数据） */
export function syncSubContract(): SubContract {
  const list = getSubContracts();
  const n = list.length + 1;
  const pool = [
    { name: '隧道机电设备维护分包合同', type: '专业分包', partyB: '华隧机电工程有限公司', project: '基建配套工程', amount: 780000 },
    { name: '路基土石方工程专业分包合同', type: '专业分包', partyB: '远大土石方工程有限公司', project: '国道G318改扩建工程', amount: 1560000 },
    { name: '清扫保洁劳务分包合同', type: '劳务分包', partyB: '洁城环卫服务公司', project: '市政道路养护工程', amount: 350000 },
  ];
  const p = pool[Math.floor(Math.random() * pool.length)];
  const sc: SubContract = {
    id: genId('sc'),
    name: p.name,
    code: `FB-HT-2025-${String(n).padStart(3, '0')}`,
    amount: p.amount,
    type: p.type,
    source: '系统同步',
    partyA: '顺畅养护公司',
    partyB: p.partyB,
    status: '待确认',
    agency: '浙江交工_顺畅养护公司_湖州项目部_工程科',
    projectName: p.project,
    transferCount: 0,
    isLocked: false,
    createTime: nowStr(),
    performanceStartDate: '2026-09-01',
    performanceEndDate: '2027-08-31',
  };
  saveSubContracts([sc, ...list]);
  return sc;
}

/** 确认分包合同 */
export function confirmSubContract(id: string) {
  saveSubContracts(getSubContracts().map(s =>
    s.id === id ? { ...s, status: '已确认' as const, confirmTime: nowStr() } : s));
}

/** 退回分包合同 */
export function returnSubContract(id: string, reason: string) {
  saveSubContracts(getSubContracts().map(s =>
    s.id === id ? { ...s, status: '已退回' as const, returnReason: reason } : s));
}

// ==================== 分包清单（结构与收入合同清单完全一致） ====================

/** 分包场景的模拟上传样表（创建清单时可选） */
export const SUB_SAMPLE_FILES = [
  {
    fileName: '绿化养护分包年度实施清单.xlsx',
    fileSize: '28.6 KB',
    specialty: '日常' as const,
    items: [
      { id: 'sfi-1', code: 'FB-A1-001', name: '中央分隔带绿化修剪整形', unit: 'km', price: 2800, quantity: 45, amount: 126000, status: 'confirmed' as const },
      { id: 'sfi-2', code: 'FB-A1-002', name: '路侧草坪定期修剪养护', unit: 'm²', price: 3.5, quantity: 60000, amount: 210000, status: 'confirmed' as const },
      { id: 'sfi-3', code: 'FB-A2-001', name: '乔木枯枝修剪及清运', unit: '株', price: 85, quantity: 900, amount: 76500, status: 'confirmed' as const },
      { id: 'sfi-4', code: 'FB-A2-002', name: '绿化垃圾集中清运处置', unit: '车', price: 380, quantity: 60, amount: 22800, status: 'confirmed' as const },
    ]
  },
  {
    fileName: '机械设备租赁分包台班清单.xlsx',
    fileSize: '31.4 KB',
    specialty: '专项' as const,
    items: [
      { id: 'sfi-5', code: 'FB-B1-001', name: '挖掘机租赁(含机手，按台班)', unit: '台班', price: 1800, quantity: 200, amount: 360000, status: 'confirmed' as const },
      { id: 'sfi-6', code: 'FB-B1-002', name: '压路机租赁(含机手，按台班)', unit: '台班', price: 1200, quantity: 150, amount: 180000, status: 'confirmed' as const },
      { id: 'sfi-7', code: 'FB-B2-001', name: '沥青摊铺机租赁(含机组)', unit: '台班', price: 7000, quantity: 20, amount: 140000, status: 'confirmed' as const },
      { id: 'sfi-8', code: 'FB-B2-002', name: '汽车吊租赁(25t，含司机)', unit: '台班', price: 3200, quantity: 35, amount: 112000, status: 'confirmed' as const },
    ]
  },
  {
    fileName: '交通安全设施专项分包工程量清单.xlsx',
    fileSize: '36.9 KB',
    specialty: '专项' as const,
    items: [
      { id: 'sfi-9', code: 'FB-C1-001', name: '波形梁护栏更换安装', unit: 'm', price: 320, quantity: 1500, amount: 480000, status: 'confirmed' as const },
      { id: 'sfi-10', code: 'FB-C1-002', name: '交通标志牌制安(单柱式)', unit: '块', price: 1650, quantity: 180, amount: 297000, status: 'confirmed' as const },
      { id: 'sfi-11', code: 'FB-C2-001', name: '路面标线重划(热熔型)', unit: 'm²', price: 38, quantity: 4800, amount: 182400, status: 'confirmed' as const },
      { id: 'sfi-12', code: 'FB-C2-002', name: '轮廓标及百米桩补设', unit: '个', price: 46, quantity: 850, amount: 39100, status: 'confirmed' as const },
    ]
  }
];

/** 分包合同的初始播种清单（结构同收入合同清单：年份/专业分组 + 细目） */
export function seedSubInventories(sub: SubContract): ContractInventory[] {
  const seeds: Record<string, ContractInventory[]> = {
    sc3: [{
      id: 'seed-subinv-1-sc3',
      name: '绿化养护分包合同 第一期绿化养护清单',
      year: '2026', specialty: '日常',
      uploadedFileName: SUB_SAMPLE_FILES[0].fileName,
      fileSize: SUB_SAMPLE_FILES[0].fileSize,
      uploadedAt: '2026-08-10 09:30',
      itemCount: 3, totalAmount: 412500,
      items: [
        { id: 'si-sc3-1', code: 'FB-A1-001', name: '中央分隔带绿化修剪整形', unit: 'km', price: 2800, quantity: 45, amount: 126000, status: 'confirmed' },
        { id: 'si-sc3-2', code: 'FB-A1-002', name: '路侧草坪定期修剪养护', unit: 'm²', price: 3.5, quantity: 60000, amount: 210000, status: 'confirmed' },
        { id: 'si-sc3-3', code: 'FB-A2-001', name: '乔木枯枝修剪及清运', unit: '株', price: 85, quantity: 900, amount: 76500, status: 'confirmed' },
      ],
      changeLogs: [],
    }],
    sc4: [{
      id: 'seed-subinv-1-sc4',
      name: '机械设备租赁分包合同 第一期台班结算清单',
      year: '2026', specialty: '专项',
      uploadedFileName: SUB_SAMPLE_FILES[1].fileName,
      fileSize: SUB_SAMPLE_FILES[1].fileSize,
      uploadedAt: '2026-08-12 15:20',
      itemCount: 3, totalAmount: 680000,
      items: [
        { id: 'si-sc4-1', code: 'FB-B1-001', name: '挖掘机租赁(含机手，按台班)', unit: '台班', price: 1800, quantity: 200, amount: 360000, status: 'confirmed' },
        { id: 'si-sc4-2', code: 'FB-B1-002', name: '压路机租赁(含机手，按台班)', unit: '台班', price: 1200, quantity: 150, amount: 180000, status: 'confirmed' },
        { id: 'si-sc4-3', code: 'FB-B2-001', name: '沥青摊铺机租赁(含机组)', unit: '台班', price: 7000, quantity: 20, amount: 140000, status: 'confirmed' },
      ],
      changeLogs: [],
    }],
    sc5: [{
      id: 'seed-subinv-1-sc5',
      name: '交通安全设施专项分包合同 第一期工程量清单',
      year: '2026', specialty: '专项',
      uploadedFileName: SUB_SAMPLE_FILES[2].fileName,
      fileSize: SUB_SAMPLE_FILES[2].fileSize,
      uploadedAt: '2026-07-20 11:45',
      itemCount: 3, totalAmount: 959400,
      items: [
        { id: 'si-sc5-1', code: 'FB-C1-001', name: '波形梁护栏更换安装', unit: 'm', price: 320, quantity: 1500, amount: 480000, status: 'confirmed' },
        { id: 'si-sc5-2', code: 'FB-C1-002', name: '交通标志牌制安(单柱式)', unit: '块', price: 1650, quantity: 180, amount: 297000, status: 'confirmed' },
        { id: 'si-sc5-3', code: 'FB-C2-001', name: '路面标线重划(热熔型)', unit: 'm²', price: 38, quantity: 4800, amount: 182400, status: 'confirmed' },
      ],
      changeLogs: [],
    }],
  };
  return seeds[sub.id] || [];
}

/** 读取某分包合同下的全部清单（结构同收入合同），无数据时播种 */
export function getSubInventories(sub: SubContract): ContractInventory[] {
  const key = `${SUB_INVENTORY_PREFIX}${sub.id}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  const seeded = seedSubInventories(sub);
  if (seeded.length > 0) localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

/** 展平某分包合同全部清单细目（清单挂接用） */
export function getSubItems(subId: string): SubContractItem[] {
  const subs = getSubContracts().filter(s => s.id === subId);
  if (subs.length === 0) return [];
  return getSubInventories(subs[0]).flatMap(inv =>
    inv.items.map(it => ({
      id: it.id, code: it.code, name: it.name, unit: it.unit,
      price: it.price, quantity: it.quantity, amount: it.amount,
      remarks: it.remarks,
    })));
}

/** 分包清单状态（草稿/待确认/已确认），按分包合同存储 */
const subStatusKey = (subId: string) => `SUB_INVENTORY_STATUS_${subId}`;

export function getSubInventoryStatus(subId: string): '草稿' | '待确认' | '已确认' {
  const defaults: Record<string, '草稿' | '待确认' | '已确认'> = { sc3: '已确认', sc4: '待确认', sc5: '已确认' };
  const raw = localStorage.getItem(subStatusKey(subId));
  if (raw === '草稿' || raw === '待确认' || raw === '已确认') return raw;
  return defaults[subId] || '草稿';
}

export function setSubInventoryStatus(subId: string, status: '草稿' | '待确认' | '已确认') {
  localStorage.setItem(subStatusKey(subId), status);
}

// ==================== 清单挂接关系 ====================

export function getLinks(): InventoryLink[] {
  const raw = localStorage.getItem(STORAGE_KEY_LINKS);
  if (!raw) {
    // 播种几条挂接关系：c1(收入) ↔ sc3 / sc4（体现多对多）
    const seeded: InventoryLink[] = [
      {
        id: 'lk1',
        incomeContractId: 'c1', incomeContractName: '这里是合同的名称',
        incomeItemId: 'inc-c1-1',
        subContractId: 'sc3', subContractName: '绿化养护分包合同',
        subItemId: 'si-sc3-1', quantity: 20, createdAt: '2026-08-01 10:00',
      },
      {
        id: 'lk2',
        incomeContractId: 'c2', incomeContractName: '年度营销推广协议',
        incomeItemId: 'inc-c2-2',
        subContractId: 'sc3', subContractName: '绿化养护分包合同',
        subItemId: 'si-sc3-2', quantity: 15000, createdAt: '2026-08-02 14:30',
      },
      {
        id: 'lk3',
        incomeContractId: 'c1', incomeContractName: '这里是合同的名称',
        incomeItemId: 'inc-c1-5',
        subContractId: 'sc4', subContractName: '机械设备租赁分包合同',
        subItemId: 'si-sc4-1', quantity: 60, createdAt: '2026-08-03 09:20',
      },
    ];
    localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLinks(links: InventoryLink[]) {
  localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links));
}

/** 批量建立挂接（勾选的收入细目 × 分包细目，笛卡尔积，跳过已存在的对） */
export function addLinks(
  income: { contractId: string; contractName: string; itemIds: string[] },
  sub: { subContractId: string; subContractName: string; items: { itemId: string; quantity: number }[] },
): { created: InventoryLink[]; skipped: number } {
  const links = getLinks();
  const created: InventoryLink[] = [];
  let skipped = 0;
  const now = nowStr();
  for (const itemId of income.itemIds) {
    for (const si of sub.items) {
      const exists = links.find(l =>
        l.incomeContractId === income.contractId && l.incomeItemId === itemId &&
        l.subContractId === sub.subContractId && l.subItemId === si.itemId);
      if (exists) { skipped++; continue; }
      const link: InventoryLink = {
        id: genId('lk'),
        incomeContractId: income.contractId,
        incomeContractName: income.contractName,
        incomeItemId: itemId,
        subContractId: sub.subContractId,
        subContractName: sub.subContractName,
        subItemId: si.itemId,
        quantity: si.quantity,
        createdAt: now,
      };
      links.push(link);
      created.push(link);
    }
  }
  if (created.length > 0) saveLinks(links);
  return { created, skipped };
}

export function deleteLink(id: string) {
  saveLinks(getLinks().filter(l => l.id !== id));
}

export function updateLinkQuantity(id: string, quantity: number) {
  saveLinks(getLinks().map(l => l.id === id ? { ...l, quantity } : l));
}
