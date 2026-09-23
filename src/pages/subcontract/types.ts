// 分包合同模块类型定义

import type { Contract } from '@/types';
import type { ContractInventory } from '@/components/ContractInventoryMaintenance';

/** 分包合同状态 */
export type SubContractStatus = '待确认' | '已确认' | '已退回';

/** 分包合同（从其他系统同步） */
export interface SubContract {
  id: string;
  name: string;
  code: string;              // 分包合同编号
  amount: number;            // 价税合计金额（元）
  type: string;              // 分包类型（劳务分包/专业分包/设备租赁分包等）
  source: string;            // 合同来源（系统同步）
  partyA: string;            // 发包方（我方）
  partyB: string;            // 分包商
  status: SubContractStatus;
  agency: string;            // 经办机构
  projectName: string;       // 关联项目名称
  transferCount: number;
  isLocked: boolean;
  createTime: string;
  confirmTime?: string;
  returnReason?: string;
  performanceStartDate?: string;
  performanceEndDate?: string;
}

/** 分包清单细目 */
export interface SubContractItem {
  id: string;
  code: string;              // 清单编号
  name: string;              // 项目名称
  unit: string;              // 单位
  price: number;             // 综合单价
  quantity: number;          // 数量
  amount: number;            // 合价 = 数量 × 单价
  remarks?: string;
}

/** 清单挂接关系（收入合同清单细目 ↔ 分包清单细目，多对多） */
export interface InventoryLink {
  id: string;
  incomeContractId: string;   // 收入合同 id
  incomeContractName: string;
  incomeItemId: string;       // 收入合同清单细目 id
  subContractId: string;      // 分包合同 id
  subContractName: string;
  subItemId: string;          // 分包清单细目 id
  quantity: number;           // 挂接数量
  createdAt: string;
}

/** 收入合同清单细目展平视图（挂接用） */
export interface IncomeItemFlat {
  contractId: string;
  contractName: string;
  inventoryId: string;
  inventoryName: string;
  itemId: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  amount: number;
}

/** 读取收入合同清单并展平（无清单时按同一规则播种，保证挂接页可用） */
export function flattenIncomeItems(contract: Contract): IncomeItemFlat[] {
  const key = `CONTRACT_INVENTORIES_${contract.id}`;
  let saved = localStorage.getItem(key);
  if (!saved) {
    // 与 ContractInventoryMaintenance 相同的默认播种（精简为一份日常清单）
    const seed: ContractInventory[] = [
      {
        id: `seed-inv-1-${contract.id}`,
        name: `${contract.name} 第一期日常保养清单`,
        year: '2025',
        specialty: '日常',
        uploadedFileName: '2025年杭州路段日常保洁维护大纲清单.xlsx',
        fileSize: '34.2 KB',
        uploadedAt: '2026-06-12 11:24',
        itemCount: 5,
        totalAmount: 302000,
        items: [
          { id: `inc-${contract.id}-1`, code: 'A1-001', name: '人工清扫分隔带垃圾及沙尘', unit: 'km', price: 120, quantity: 450, amount: 54000 },
          { id: `inc-${contract.id}-2`, code: 'A1-002', name: '波形护栏立柱日常洗刷清洁', unit: '柱', price: 4.5, quantity: 12000, amount: 54000 },
          { id: `inc-${contract.id}-3`, code: 'A2-005', name: '边沟垃圾打捞及流泥深挖除淤', unit: 'm³', price: 75, quantity: 800, amount: 60000 },
          { id: `inc-${contract.id}-4`, code: 'A3-010', name: '中央分带防眩板日常更换校准', unit: '块', price: 95, quantity: 400, amount: 38000 },
          { id: `inc-${contract.id}-5`, code: 'A4-012', name: '日常病害应急保障抢修及坑洞填补', unit: 't', price: 1200, quantity: 80, amount: 96000 },
        ],
      },
    ];
    localStorage.setItem(key, JSON.stringify(seed));
    saved = JSON.stringify(seed);
  }
  try {
    const inventories: ContractInventory[] = JSON.parse(saved);
    return inventories.flatMap(inv =>
      inv.items.map(it => ({
        contractId: contract.id,
        contractName: contract.name,
        inventoryId: inv.id,
        inventoryName: inv.name,
        itemId: it.id,
        code: it.code,
        name: it.name,
        unit: it.unit,
        price: it.price,
        quantity: it.quantity,
        amount: it.amount,
      }))
    );
  } catch {
    return [];
  }
}
