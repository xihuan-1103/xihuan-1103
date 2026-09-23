// 设备管理模块类型定义

/** 设备所有权 */
export type EquipmentOwnership = 'owned' | 'leased';

/** 设备状态 */
export type EquipmentStatus = 'idle' | 'working' | 'maintenance' | 'scrapped';

// =============== 设备编码体系 ===============

/** 设备编码（分类型 + 具体设备，类似材料编码体系） */
export interface EquipmentCode {
  id: string;
  code: string;              // 设备编码（体系内唯一，如 EQ-WJJ-001）
  name: string;              // 设备名称（具体设备，如：履带式液压挖掘机）
  category: string;          // 一级分类（土方机械/压实机械/路面机械等）
  subCategory?: string;      // 二级分类（可选，如：挖掘机）
  unit: string;              // 计量单位（台/辆/套）
  brand?: string;            // 常用品牌参考
  spec?: string;             // 规格说明
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// =============== 设备进出场 ===============

/** 进场/退场方向 */
export type MovementDirection = 'in' | 'out';

/** 进出场单状态 */
export type MovementStatus = 'draft' | 'submitted' | 'confirmed';

/** 设备进出场单 */
export interface EquipmentMovement {
  id: string;
  code: string;                  // 单据编号（进场 JC-/退场 TC-）
  direction: MovementDirection;  // 进场 / 退场
  ownership: EquipmentOwnership; // 自有 / 租赁
  equipmentId?: string;          // 关联设备台账（退场/自有进场时可能已有）
  equipmentCode: string;         // 设备编码
  equipmentName: string;         // 设备名称
  model: string;                 // 规格型号
  category: string;              // 设备类别
  // 进场信息
  inDate?: string;               // 进场日期
  source?: string;               // 进场来源（调拨/新购/租赁合同号/其他项目）
  supplierOrOwner?: string;      // 租赁供应商 / 产权单位
  projectId?: string;            // 关联项目
  projectName?: string;
  orgId: string;                 // 归属组织
  orgName: string;
  location?: string;             // 存放位置
  // 租赁信息（租赁设备）
  leaseStartDate?: string;       // 租期开始
  leaseEndDate?: string;         // 租期结束
  leaseUnit?: 'day' | 'month';   // 计费方式（台班/月租）
  leasePrice?: number;           // 租金（元/台班 或 元/月）
  // 退场信息
  outDate?: string;              // 退场日期
  outReason?: string;            // 退场原因
  destination?: string;          // 去向（调往项目/归还供应商/报废等）
  settlementAmount?: number;     // 租赁结算金额（租赁设备）
  handler: string;               // 经办人
  status: MovementStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

/** 设备台账 */
export interface Equipment {
  id: string;
  code: string;              // 设备编号
  name: string;              // 设备名称
  model: string;             // 规格型号
  category: string;          // 设备类别（挖掘机、压路机等）
  ownership: EquipmentOwnership;
  manufacturer: string;      // 制造厂商
  purchaseDate?: string;     // 购置日期
  originalValue?: number;    // 原值
  residualValue?: number;    // 残值
  depreciatedYears?: number; // 折旧年限
  unitPrice: number;         // 综合台班单价（元/台班）
  insuranceFee?: number;     // 保险费（元/年）
  operator?: string;         // 设备机手
  orgId: string;             // 归属组织
  orgName: string;
  location?: string;         // 当前所在位置
  status: EquipmentStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

/** 台班记录状态 */
export type ShiftRecordStatus = 'draft' | 'submitted' | 'audited';

/** 台班记录 */
export interface ShiftRecord {
  id: string;
  code: string;              // 记录编号
  shiftDate: string;         // 日期
  shift: 'morning' | 'afternoon' | 'night' | 'full'; // 班次
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  projectId?: string;
  projectName?: string;
  teamId?: string;
  teamName?: string;
  ownership: EquipmentOwnership;
  shifts: number;            // 完成台班数
  unitPrice: number;         // 台班单价（取自设备台账，可修改）
  totalAmount: number;       // 总金额
  fuelConsumption?: number; // 耗油量（升）
  fuelAmount?: number;       // 油费（元）
  operator?: string;         // 实际操作员
  recorder: string;          // 记录人
  status: ShiftRecordStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

/** 维保类型 */
export type MaintenanceType = 'regular' | 'breakdown' | 'scheduled';

/** 维保记录 */
export interface MaintenanceRecord {
  id: string;
  code: string;              // 维保编号
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  type: MaintenanceType;
  date: string;
  content: string;           // 维保内容
  parts?: string;            // 更换配件
  laborCost?: number;        // 人工费
  partsCost?: number;        // 配件费
  totalCost: number;         // 总费用
  operator?: string;         // 维保人员
  status: 'draft' | 'submitted' | 'audited';
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

/** 设备使用记录（出勤、油耗、维保的汇总视图） */
export interface EquipmentUsageSummary {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  ownership: EquipmentOwnership;
  totalShifts: number;           // 总台班
  totalAmount: number;           // 总金额
  totalFuel: number;             // 总油耗
  totalFuelCost: number;         // 总油费
  totalMaintenanceCost: number;  // 总维保费
  totalCost: number;             // 总成本
  shiftCount: number;            // 台班记录数
  maintenanceCount: number;      // 维保记录数
}

/** 车辆每日消耗记录（按日填报：里程、燃油、维保费用） */
export interface VehicleDailyRecord {
  id: string;
  date: string;                // 日期（YYYY-MM-DD）
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;            // 设备类别（分类型展示用）
  mileage: number;            // 本日行驶里程（km）
  fuelQty: number;             // 本日燃油数量（升）
  fuelAmount: number;          // 本日耗用金额（元）
  maintenanceCost: number;     // 本日维修保养费用（元）
  recorder: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}
