/**
 * 设备管理 → 固定资产管理 → 单车费用核算表（数据层）
 *
 * 按「车辆 × 月份」登记单车运行费用，派生指标：
 *  - 百公里油耗（升/百公里）  = 燃油数 ÷ 本月里程 × 100
 *  - 百公里用车成本（元/百公里）= 费用合计 ÷ 本月里程 × 100
 *  - 累计行驶里程数（公里）    = 该车「≤ 当前月」各月本月里程之和
 *  - 费用合计                  = 油料费 + 过路费 + 修理费 + 保险费 + 其他
 *
 * 持久化 key：md_vehicle_costs_v1
 */

import { genId, nowStr } from './equipmentStore';
import { getVehicles } from './AdminVehicleLedger';

export interface VehicleCostRecord {
  id: string;
  vehicleId: string;      // 关联行政车辆 id
  month: string;          // 归属月份 'YYYY-MM'
  fuelLiters: number;     // 燃油数（公升）
  fuelFee: number;        // 油料费（元）
  tollFee: number;        // 过路费（元）
  repairFee: number;      // 修理费（元）
  insuranceFee: number;   // 保险费（元）
  otherFee: number;       // 其他（元）
  monthMileage: number;   // 本月里程（公里）
  runDays: number;        // 运转情况（天）
  remark: string;         // 备注
  createdAt: string;
  updatedAt: string;
}

const COST_KEY = 'md_vehicle_costs_v1';

export const emptyCost = (vehicleId: string, month: string): VehicleCostRecord => ({
  id: genId('vc'), vehicleId, month,
  fuelLiters: 0, fuelFee: 0, tollFee: 0, repairFee: 0, insuranceFee: 0, otherFee: 0,
  monthMileage: 0, runDays: 0, remark: '', createdAt: nowStr(), updatedAt: nowStr(),
});

const r2 = (n: number) => Math.round(n * 100) / 100;
/** 月份工具：本月 'YYYY-MM' */
export const curMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** 费用合计（不含燃油量的单价换算，直接取各项金额） */
export const costSum = (r: VehicleCostRecord) =>
  r.fuelFee + r.tollFee + r.repairFee + r.insuranceFee + r.otherFee;

/** 百公里油耗（升/百公里），里程为 0 时返回 null */
export const fuelPer100 = (liters: number, mileage: number) =>
  mileage > 0 ? r2((liters / mileage) * 100) : null;

/** 百公里用车成本（元/百公里），里程为 0 时返回 null */
export const costPer100 = (cost: number, mileage: number) =>
  mileage > 0 ? r2((cost / mileage) * 100) : null;

/** 单车截至某月的累计行驶里程（含当月） */
export function cumMileageOf(records: VehicleCostRecord[], vehicleId: string, month: string) {
  return records
    .filter(r => r.vehicleId === vehicleId && r.month <= month)
    .reduce((s, r) => s + r.monthMileage, 0);
}

/* ==================== 种子数据 ==================== */

function seedCosts(): VehicleCostRecord[] {
  const vehicles = getVehicles();
  const y = new Date().getFullYear();
  const months = [`${y}-09`, `${y}-10`, `${y}-11`];
  const out: VehicleCostRecord[] = [];
  vehicles.forEach((v, idx) => {
    months.forEach((m, mi) => {
      const mileage = 1800 + idx * 260 + mi * 120;
      const liters = Math.round(mileage * (8.5 + (idx % 3) * 0.8) / 100);
      const fuelFee = Math.round(liters * 7.85);
      out.push({
        id: `vc_seed_${idx}_${mi}`,
        vehicleId: v.id,
        month: m,
        fuelLiters: liters,
        fuelFee,
        tollFee: Math.round(120 + mileage * 0.12),
        repairFee: idx % 3 === 0 ? 380 + mi * 40 : (idx % 4 === 1 ? 120 : 0),
        insuranceFee: 560 + idx * 45,
        otherFee: 80 + (idx % 2) * 60,
        monthMileage: mileage,
        runDays: 20 + (idx % 5),
        remark: mi === 2 ? '含一次常规保养' : '',
        createdAt: nowStr(),
        updatedAt: nowStr(),
      });
    });
  });
  return out;
}

export function getCosts(): VehicleCostRecord[] {
  try {
    const raw = localStorage.getItem(COST_KEY);
    if (raw) return JSON.parse(raw) as VehicleCostRecord[];
  } catch { /* 解析失败时重建种子数据 */ }
  const data = seedCosts();
  localStorage.setItem(COST_KEY, JSON.stringify(data));
  return data;
}

export function saveCosts(list: VehicleCostRecord[]) {
  localStorage.setItem(COST_KEY, JSON.stringify(list));
}

export function upsertCost(rec: VehicleCostRecord) {
  const list = getCosts();
  const i = list.findIndex(r => r.vehicleId === rec.vehicleId && r.month === rec.month);
  if (i >= 0) list[i] = { ...rec, id: list[i].id };
  else list.push(rec);
  saveCosts(list);
}

export function deleteCost(vehicleId: string, month: string) {
  saveCosts(getCosts().filter(r => !(r.vehicleId === vehicleId && r.month === month)));
}

/** 取某车某月的记录 */
export const costOf = (list: VehicleCostRecord[], vehicleId: string, month: string) =>
  list.find(r => r.vehicleId === vehicleId && r.month === month);

/** 月份区间（含端点），用于自定义时间段过滤 */
export const inMonthRange = (m: string, from: string, to: string) =>
  (!from || m >= from) && (!to || m <= to);
