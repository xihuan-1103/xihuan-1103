// 设备管理模块 - 数据存储层

import type {
  Equipment, ShiftRecord, MaintenanceRecord,
  EquipmentOwnership, ShiftRecordStatus, MaintenanceType,
  EquipmentUsageSummary, EquipmentCode, EquipmentMovement, MovementDirection,
  VehicleDailyRecord,
} from './types';

const STORAGE_KEY_EQUIPMENT = 'md_equipment_list';
const STORAGE_KEY_SHIFT = 'md_shift_list';
const STORAGE_KEY_MAINTENANCE = 'md_maintenance_list';
const STORAGE_KEY_EQUIPMENT_CODE = 'md_equipment_code_list';
const STORAGE_KEY_MOVEMENT = 'md_equipment_movement_list';
const STORAGE_KEY_VEHICLE_DAILY = 'md_vehicle_daily_list';

export const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const nowStr = () => new Date().toISOString();

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const DEFAULT_EQUIPMENTS: Equipment[] = [
  {
    id: 'eq-001', code: 'EQ-001', name: '液压挖掘机', model: 'SY215C-10',
    category: '挖掘机', ownership: 'owned', manufacturer: '三一重工',
    purchaseDate: '2023-03-15', originalValue: 780000, residualValue: 150000,
    depreciatedYears: 8, unitPrice: 1200, operator: '张三',
    orgId: 'org-project-1', orgName: '项目经理部', location: '项目A施工现场',
    status: 'working', remark: '主力设备', createdAt: nowStr(), updatedAt: nowStr(),
  },
  {
    id: 'eq-002', code: 'EQ-002', name: '振动压路机', model: 'XS223J',
    category: '压路机', ownership: 'leased', manufacturer: '徐工集团',
    purchaseDate: '2022-08-01', originalValue: 0, residualValue: 0,
    depreciatedYears: 0, unitPrice: 800, operator: '李四',
    orgId: 'org-project-2', orgName: '养护项目部', location: '国道G104养护段',
    status: 'working', remark: '租赁设备，月租制', createdAt: nowStr(), updatedAt: nowStr(),
  },
  {
    id: 'eq-003', code: 'EQ-003', name: '轮式装载机', model: 'LW500FN',
    category: '装载机', ownership: 'owned', manufacturer: '徐工集团',
    purchaseDate: '2021-11-20', originalValue: 350000, residualValue: 50000,
    depreciatedYears: 6, unitPrice: 600, operator: '王五',
    orgId: 'org-project-1', orgName: '项目经理部', location: '项目A料场',
    status: 'idle', remark: '备用', createdAt: nowStr(), updatedAt: nowStr(),
  },
  {
    id: 'eq-004', code: 'EQ-004', name: '自卸汽车', model: 'TL875',
    category: '运输车辆', ownership: 'leased', manufacturer: '同力重工',
    purchaseDate: '2023-01-10', originalValue: 0, residualValue: 0,
    depreciatedYears: 0, unitPrice: 500, operator: '赵六',
    orgId: 'org-project-3', orgName: '基建项目部', location: '项目C工地',
    status: 'working', remark: '短租', createdAt: nowStr(), updatedAt: nowStr(),
  },
  {
    id: 'eq-005', code: 'EQ-005', name: '沥青摊铺机', model: 'S1800-2',
    category: '摊铺机', ownership: 'owned', manufacturer: '徐工集团',
    purchaseDate: '2020-06-08', originalValue: 1200000, residualValue: 200000,
    depreciatedYears: 10, unitPrice: 1800, operator: '孙七',
    orgId: 'org-project-2', orgName: '养护项目部', location: '沥青搅拌站',
    status: 'maintenance', remark: '年度大修', createdAt: nowStr(), updatedAt: nowStr(),
  },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==================== 设备台账 ====================

export function getEquipments(): Equipment[] {
  return load<Equipment[]>(STORAGE_KEY_EQUIPMENT, DEFAULT_EQUIPMENTS);
}

export function getEquipmentById(id: string): Equipment | undefined {
  return getEquipments().find(e => e.id === id);
}

export function upsertEquipment(eq: Equipment): Equipment {
  const list = getEquipments();
  const idx = list.findIndex(e => e.id === eq.id);
  const now = nowStr();
  if (idx >= 0) {
    list[idx] = { ...eq, updatedAt: now };
  } else {
    list.push({ ...eq, createdAt: now, updatedAt: now });
  }
  save(STORAGE_KEY_EQUIPMENT, list);
  return eq;
}

export function deleteEquipment(id: string): void {
  const list = getEquipments().filter(e => e.id !== id);
  save(STORAGE_KEY_EQUIPMENT, list);
}

// ==================== 台班记录 ====================

function seedShiftData(): ShiftRecord[] {
  const equipments = DEFAULT_EQUIPMENTS;
  const projects = [
    { id: 'proj-1', name: '项目A - 国道改扩建' },
    { id: 'proj-2', name: '项目B - 市政养护' },
    { id: 'proj-3', name: '项目C - 基建工程' },
  ];
  const teams = [
    { id: 'team-1', name: '机械一班' },
    { id: 'team-2', name: '机械二班' },
    { id: 'team-3', name: '运输班' },
  ];
  const records: ShiftRecord[] = [];
  const today = new Date();
  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    for (const eq of equipments) {
      if (Math.random() > 0.4) continue;
      const shifts = pick([1, 1, 1, 2]);
      const project = pick(projects);
      const team = pick(teams);
      const shiftType = pick<ShiftRecord['shift']>(['morning', 'afternoon', 'night', 'full']);
      const fuel = eq.category === '挖掘机' || eq.category === '摊铺机' ? 25 + Math.floor(Math.random() * 30) : 15 + Math.floor(Math.random() * 20);
      const fuelAmount = Math.round(fuel * 7.5);
      records.push({
        id: genId('sr'),
        code: `SR-${dateStr.replace(/-/g, '')}-${records.length + 1}`,
        shiftDate: dateStr,
        shift: shiftType,
        equipmentId: eq.id,
        equipmentCode: eq.code,
        equipmentName: eq.name,
        projectId: project.id,
        projectName: project.name,
        teamId: team.id,
        teamName: team.name,
        ownership: eq.ownership,
        shifts,
        unitPrice: eq.unitPrice,
        totalAmount: Math.round(shifts * eq.unitPrice),
        fuelConsumption: fuel,
        fuelAmount,
        operator: eq.operator,
        recorder: '系统自动',
        status: i > 5 ? 'submitted' : 'draft',
        createdAt: nowStr(),
        updatedAt: nowStr(),
      });
    }
  }
  return records;
}

export function getShiftRecords(): ShiftRecord[] {
  const data = load<ShiftRecord[]>(STORAGE_KEY_SHIFT, []);
  if (data.length === 0) {
    const seeded = seedShiftData();
    save(STORAGE_KEY_SHIFT, seeded);
    return seeded;
  }
  return data;
}

export function getShiftRecordsByEquipment(equipmentId: string): ShiftRecord[] {
  return getShiftRecords().filter(r => r.equipmentId === equipmentId)
    .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
}

export function upsertShiftRecord(sr: ShiftRecord): ShiftRecord {
  const list = getShiftRecords();
  const idx = list.findIndex(r => r.id === sr.id);
  const now = nowStr();
  if (idx >= 0) {
    list[idx] = { ...sr, updatedAt: now };
  } else {
    list.push({ ...sr, createdAt: now, updatedAt: now });
  }
  save(STORAGE_KEY_SHIFT, list);
  return sr;
}

export function deleteShiftRecord(id: string): void {
  const list = getShiftRecords().filter(r => r.id !== id);
  save(STORAGE_KEY_SHIFT, list);
}

export function auditShiftRecord(id: string): void {
  const list = getShiftRecords();
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) {
    list[idx].status = 'audited';
    save(STORAGE_KEY_SHIFT, list);
  }
}

// ==================== 维保记录 ====================

function seedMaintenanceData(): MaintenanceRecord[] {
  const equipments = DEFAULT_EQUIPMENTS;
  const records: MaintenanceRecord[] = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));
    const dateStr = date.toISOString().slice(0, 10);
    const eq = pick(equipments);
    const type = pick<MaintenanceType>(['regular', 'breakdown', 'scheduled']);
    const labor = 300 + Math.floor(Math.random() * 800);
    const parts = 200 + Math.floor(Math.random() * 2000);
    records.push({
      id: genId('mr'),
      code: `MR-${dateStr.replace(/-/g, '')}-${i + 1}`,
      equipmentId: eq.id,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      type,
      date: dateStr,
      content: type === 'breakdown' ? '突发故障维修' : type === 'scheduled' ? '定期保养' : '日常检查维护',
      parts: type !== 'regular' ? '机油滤芯、柴油滤芯' : '',
      laborCost: labor,
      partsCost: parts,
      totalCost: labor + parts,
      operator: '机修班组',
      status: Math.random() > 0.5 ? 'submitted' : 'audited',
      createdAt: nowStr(),
      updatedAt: nowStr(),
    });
  }
  return records;
}

export function getMaintenanceRecords(): MaintenanceRecord[] {
  const data = load<MaintenanceRecord[]>(STORAGE_KEY_MAINTENANCE, []);
  if (data.length === 0) {
    const seeded = seedMaintenanceData();
    save(STORAGE_KEY_MAINTENANCE, seeded);
    return seeded;
  }
  return data;
}

export function getMaintenanceRecordsByEquipment(equipmentId: string): MaintenanceRecord[] {
  return getMaintenanceRecords().filter(r => r.equipmentId === equipmentId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function upsertMaintenanceRecord(mr: MaintenanceRecord): MaintenanceRecord {
  const list = getMaintenanceRecords();
  const idx = list.findIndex(r => r.id === mr.id);
  const now = nowStr();
  if (idx >= 0) {
    list[idx] = { ...mr, updatedAt: now };
  } else {
    list.push({ ...mr, createdAt: now, updatedAt: now });
  }
  save(STORAGE_KEY_MAINTENANCE, list);
  return mr;
}

export function deleteMaintenanceRecord(id: string): void {
  const list = getMaintenanceRecords().filter(r => r.id !== id);
  save(STORAGE_KEY_MAINTENANCE, list);
}

// ==================== 汇总统计 ====================

export function getEquipmentUsageSummary(): EquipmentUsageSummary[] {
  const equipments = getEquipments();
  const shifts = getShiftRecords();
  const maintenances = getMaintenanceRecords();

  return equipments.map(eq => {
    const eqShifts = shifts.filter(s => s.equipmentId === eq.id);
    const eqMaint = maintenances.filter(m => m.equipmentId === eq.id);
    const totalShifts = eqShifts.reduce((s, r) => s + r.shifts, 0);
    const totalAmount = eqShifts.reduce((s, r) => s + r.totalAmount, 0);
    const totalFuel = eqShifts.reduce((s, r) => s + (r.fuelConsumption || 0), 0);
    const totalFuelCost = eqShifts.reduce((s, r) => s + (r.fuelAmount || 0), 0);
    const totalMaintenanceCost = eqMaint.reduce((s, m) => s + m.totalCost, 0);
    return {
      equipmentId: eq.id,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      ownership: eq.ownership,
      totalShifts,
      totalAmount,
      totalFuel,
      totalFuelCost,
      totalMaintenanceCost,
      totalCost: totalAmount + totalFuelCost + totalMaintenanceCost,
      shiftCount: eqShifts.length,
      maintenanceCount: eqMaint.length,
    };
  });
}

// ==================== 设备编码体系 ====================

/** 设备一级分类（施工行业常用分类） */
export const EQUIPMENT_CATEGORIES = [
  '土方机械', '压实机械', '路面机械', '起重机械',
  '运输车辆', '养护机械', '混凝土机械', '检测设备', '其他设备',
];

const DEFAULT_EQUIPMENT_CODES: EquipmentCode[] = [
  { id: 'ec-001', code: 'EQ-TF-001', name: '履带式液压挖掘机', category: '土方机械', subCategory: '挖掘机', unit: '台', brand: '三一/徐工/卡特彼勒', spec: '20-30吨级', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-002', code: 'EQ-TF-002', name: '轮式装载机', category: '土方机械', subCategory: '装载机', unit: '台', brand: '徐工/柳工/临工', spec: '5吨级', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-003', code: 'EQ-TF-003', name: '推土机', category: '土方机械', subCategory: '推土机', unit: '台', brand: '山推/宣工', spec: '160-220马力', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-004', code: 'EQ-YS-001', name: '单钢轮振动压路机', category: '压实机械', subCategory: '压路机', unit: '台', brand: '徐工/柳工/三一', spec: '20-22吨级', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-005', code: 'EQ-YS-002', name: '双钢轮振动压路机', category: '压实机械', subCategory: '压路机', unit: '台', brand: '戴纳派克/悍马', spec: '10-13吨级', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-006', code: 'EQ-LM-001', name: '沥青混凝土摊铺机', category: '路面机械', subCategory: '摊铺机', unit: '台', brand: '徐工/福格勒/ABG', spec: '摊铺宽度9.5m', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-007', code: 'EQ-LM-002', name: '路面铣刨机', category: '路面机械', subCategory: '铣刨机', unit: '台', brand: '维特根', spec: '铣刨宽度2m', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-008', code: 'EQ-YH-001', name: '沥青洒布车', category: '养护机械', subCategory: '洒布车', unit: '台', brand: '高远/美通', spec: '6000L', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-009', code: 'EQ-YH-002', name: '综合养护车', category: '养护机械', subCategory: '养护车', unit: '台', brand: '徐工/中联', spec: '坑槽修补/灌缝', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-010', code: 'EQ-YH-003', name: '清扫车', category: '养护机械', subCategory: '清扫车', unit: '台', brand: '中联/福龙马', spec: '吸扫式', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-011', code: 'EQ-QZ-001', name: '汽车起重机', category: '起重机械', subCategory: '吊车', unit: '台', brand: '徐工/中联/三一', spec: '25-50吨', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-012', code: 'EQ-YS-003', name: '自卸汽车', category: '运输车辆', subCategory: '自卸车', unit: '辆', brand: '同力/中国重汽', spec: '20-30吨', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-013', code: 'EQ-HN-001', name: '混凝土搅拌运输车', category: '混凝土机械', subCategory: '搅拌车', unit: '辆', brand: '三一/中联', spec: '10-12方', createdAt: nowStr(), updatedAt: nowStr() },
  { id: 'ec-014', code: 'EQ-JC-001', name: '平整度检测仪', category: '检测设备', subCategory: '检测仪', unit: '套', brand: '多种', spec: '路面平整度', createdAt: nowStr(), updatedAt: nowStr() },
];

export function getEquipmentCodes(): EquipmentCode[] {
  return load<EquipmentCode[]>(STORAGE_KEY_EQUIPMENT_CODE, DEFAULT_EQUIPMENT_CODES);
}

export function saveEquipmentCodes(list: EquipmentCode[]) {
  save(STORAGE_KEY_EQUIPMENT_CODE, list);
}

export function upsertEquipmentCode(ec: EquipmentCode): EquipmentCode {
  const list = getEquipmentCodes();
  const idx = list.findIndex(x => x.id === ec.id);
  const now = nowStr();
  if (idx >= 0) list[idx] = { ...ec, updatedAt: now };
  else list.push({ ...ec, createdAt: now, updatedAt: now });
  saveEquipmentCodes(list);
  return ec;
}

export function deleteEquipmentCode(id: string) {
  saveEquipmentCodes(getEquipmentCodes().filter(x => x.id !== id));
}

// ==================== 设备进出场 ====================

function seedMovements(): EquipmentMovement[] {
  const movements: EquipmentMovement[] = [];
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today); d.setDate(d.getDate() - (i * 7 + 10));
    const dStr = d.toISOString().slice(0, 10);
    movements.push({
      id: genId('mv'),
      code: `JC-${dStr.replace(/-/g, '')}-${i + 1}`,
      direction: 'in',
      ownership: i % 2 === 0 ? 'owned' : 'leased',
      equipmentCode: DEFAULT_EQUIPMENTS[i]?.code || '',
      equipmentName: DEFAULT_EQUIPMENTS[i]?.name || '',
      model: DEFAULT_EQUIPMENTS[i]?.model || '',
      category: DEFAULT_EQUIPMENTS[i]?.category || '',
      inDate: dStr,
      source: i % 2 === 0 ? '公司内部调拨' : '租赁合同',
      supplierOrOwner: i % 2 === 0 ? '公司设备部' : 'XX机械设备租赁有限公司',
      projectId: 'proj-1',
      projectName: '项目A-国道改扩建',
      orgId: 'org-project-1',
      orgName: '项目经理部',
      location: '施工现场',
      leaseStartDate: i % 2 === 0 ? undefined : dStr,
      leaseEndDate: i % 2 === 0 ? undefined : new Date(today.getTime() + 180 * 86400000).toISOString().slice(0, 10),
      leaseUnit: i % 2 === 0 ? undefined : 'day',
      leasePrice: i % 2 === 0 ? undefined : DEFAULT_EQUIPMENTS[i]?.unitPrice,
      handler: '设备管理员',
      status: 'confirmed',
      createdAt: nowStr(),
      updatedAt: nowStr(),
    });
  }
  // 一条退场示例
  const dOut = new Date(today); dOut.setDate(dOut.getDate() - 5);
  movements.push({
    id: genId('mv'),
    code: `TC-${dOut.toISOString().slice(0, 10).replace(/-/g, '')}-1`,
    direction: 'out',
    ownership: 'leased',
    equipmentCode: DEFAULT_EQUIPMENTS[3]?.code || '',
    equipmentName: DEFAULT_EQUIPMENTS[3]?.name || '',
    model: DEFAULT_EQUIPMENTS[3]?.model || '',
    category: DEFAULT_EQUIPMENTS[3]?.category || '',
    outDate: dOut.toISOString().slice(0, 10),
    outReason: '项目完工',
    destination: '归还租赁公司',
    settlementAmount: 45000,
    orgId: 'org-project-3',
    orgName: '基建项目部',
    handler: '设备管理员',
    status: 'submitted',
    createdAt: nowStr(),
    updatedAt: nowStr(),
  });
  return movements;
}

export function getMovements(): EquipmentMovement[] {
  const data = load<EquipmentMovement[]>(STORAGE_KEY_MOVEMENT, []);
  if (data.length === 0) {
    const seeded = seedMovements();
    save(STORAGE_KEY_MOVEMENT, seeded);
    return seeded;
  }
  return data;
}

export function getMovementsByFilter(direction?: MovementDirection, ownership?: EquipmentOwnership): EquipmentMovement[] {
  let r = getMovements();
  if (direction) r = r.filter(m => m.direction === direction);
  if (ownership) r = r.filter(m => m.ownership === ownership);
  return r.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function upsertMovement(mv: EquipmentMovement): EquipmentMovement {
  const list = getMovements();
  const idx = list.findIndex(x => x.id === mv.id);
  const now = nowStr();
  if (idx >= 0) list[idx] = { ...mv, updatedAt: now };
  else list.push({ ...mv, createdAt: now, updatedAt: now });
  save(STORAGE_KEY_MOVEMENT, list);
  return mv;
}

export function deleteMovement(id: string) {
  save(STORAGE_KEY_MOVEMENT, getMovements().filter(x => x.id !== id));
}

/** 进场确认后自动生成/更新设备台账 */
export function confirmMovementIn(mv: EquipmentMovement): Equipment | undefined {
  const list = getEquipments();
  let eq = mv.equipmentId ? list.find(e => e.id === mv.equipmentId) : undefined;
  if (eq) {
    // 已存在台账，更新位置和状态
    eq = { ...eq, location: mv.location || eq.location, status: 'idle', updatedAt: nowStr() };
    upsertEquipment(eq);
  } else {
    // 新建设备台账
    eq = {
      id: genId('eq'), code: mv.equipmentCode, name: mv.equipmentName,
      model: mv.model, category: mv.category, ownership: mv.ownership,
      manufacturer: '', unitPrice: mv.leasePrice || 0, orgId: mv.orgId,
      orgName: mv.orgName, location: mv.location, status: 'idle',
      remark: mv.direction === 'in' ? `进场单 ${mv.code}` : '', createdAt: nowStr(), updatedAt: nowStr(),
    };
    upsertEquipment(eq);
  }
  // 更新单据状态
  upsertMovement({ ...mv, status: 'confirmed' });
  return eq;
}

/** 退场确认后更新设备台账状态 */
export function confirmMovementOut(mv: EquipmentMovement): void {
  if (mv.equipmentId) {
    const list = getEquipments();
    const idx = list.findIndex(e => e.id === mv.equipmentId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: mv.outReason === '报废' ? 'scrapped' : 'idle', location: mv.destination || '', updatedAt: nowStr() };
      save(STORAGE_KEY_EQUIPMENT, list);
    }
  }
  upsertMovement({ ...mv, status: 'confirmed' });
}

// ==================== 车辆每日消耗 ====================

function seedVehicleDaily(): VehicleDailyRecord[] {
  const records: VehicleDailyRecord[] = [];
  const today = new Date();
  for (let i = 0; i < 25; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    for (const eq of DEFAULT_EQUIPMENTS) {
      if (Math.random() > 0.55) continue;
      const mileage = 40 + Math.floor(Math.random() * 160);
      const fuelQty = Math.round(mileage * (0.28 + Math.random() * 0.12));
      const fuelAmount = Math.round(fuelQty * 7.5);
      const maint = Math.random() > 0.88 ? 200 + Math.floor(Math.random() * 1500) : 0;
      records.push({
        id: genId('vd'),
        date: dateStr,
        equipmentId: eq.id,
        equipmentCode: eq.code,
        equipmentName: eq.name,
        category: eq.category,
        mileage,
        fuelQty,
        fuelAmount,
        maintenanceCost: maint,
        recorder: '系统自动',
        createdAt: nowStr(),
        updatedAt: nowStr(),
      });
    }
  }
  return records;
}

export function getVehicleDailyRecords(): VehicleDailyRecord[] {
  const data = load<VehicleDailyRecord[]>(STORAGE_KEY_VEHICLE_DAILY, []);
  if (data.length === 0) {
    const seeded = seedVehicleDaily();
    save(STORAGE_KEY_VEHICLE_DAILY, seeded);
    return seeded;
  }
  return data;
}

export function upsertVehicleDailyRecord(vr: VehicleDailyRecord): VehicleDailyRecord {
  const list = getVehicleDailyRecords();
  const idx = list.findIndex(r => r.id === vr.id);
  const now = nowStr();
  if (idx >= 0) list[idx] = { ...vr, updatedAt: now };
  else list.push({ ...vr, createdAt: now, updatedAt: now });
  save(STORAGE_KEY_VEHICLE_DAILY, list);
  return vr;
}

export function deleteVehicleDailyRecord(id: string): void {
  save(STORAGE_KEY_VEHICLE_DAILY, getVehicleDailyRecords().filter(r => r.id !== id));
}

// ==================== 状态映射 ====================

export const EQUIPMENT_STATUS_MAP: Record<string, string> = {
  idle: '闲置', working: '使用中', maintenance: '维保中', scrapped: '已报废',
};

export const MOVEMENT_STATUS_MAP: Record<string, string> = {
  draft: '草稿', submitted: '已提交', confirmed: '已确认',
};

export const EQUIPMENT_OWNERSHIP_MAP: Record<EquipmentOwnership, string> = {
  owned: '自有', leased: '租赁',
};

export const SHIFT_STATUS_MAP: Record<ShiftRecordStatus, string> = {
  draft: '草稿', submitted: '已提交', audited: '已审核',
};

export const SHIFT_TYPE_MAP: Record<ShiftRecord['shift'], string> = {
  morning: '早班', afternoon: '中班', night: '夜班', full: '全天',
};

export const MAINTENANCE_TYPE_MAP: Record<MaintenanceType, string> = {
  regular: '日常维保', breakdown: '故障维修', scheduled: '定期保养',
};

export const nextDocCode = (prefix: string) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const list = getEquipments();
  const nums = list
    .map(x => parseInt((x.code || '').replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${ymd}${String(next).padStart(4, '0')}`;
};
