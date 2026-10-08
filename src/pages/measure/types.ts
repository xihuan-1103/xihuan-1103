/**
 * 计量应收模块 - 类型定义（v2 重构）
 * 依据《计量与应收功能专项方案》v1.1 + 计量单创建流程：
 *  - 计量数据池：按合同归类，仅展示可计量（正式·合同内）子目；合同清单按章节层级（100总则/200路基/300路面/...）
 *  - 发起计量（分步向导）：选合同 → 选时间段完成的子目 → 调整（改数量/新增计量子目）
 *    → 计量单预览（图一：章节汇总；图二：章节子目明细）→ 手填扣款项 → 确认创建
 *  - 链路：数据池 → 计量单 → 提交批复（交投推送/其他自闭环）→ 计量凭证 → 应收单 → 回款
 */

// ==================== 合同维度（来源：合同管理模块收入合同） ====================

/** 业主类型：交投（系统打通批复）/ 其他（系统内自闭环） */
export type OwnerType = 'jtou' | 'other';

/** 合同角色：main 主合同（当前单位为合同签订的主要单位）/ coop 协同合同（当前单位为合同协同单位） */
export type ContractRole = 'main' | 'coop';

/** 计量模块引用的收入合同（快照） */
export interface MeasureContract {
  id: string;
  code: string;
  name: string;
  ownerType: OwnerType;
  ownerName: string;      // 业主（甲方）
  partyB: string;         // 乙方（本公司）
  amount: number;
  projectName: string;    // 关联项目部/项目
  startDate: string;
  endDate: string;
  // —— 合同角色（主合同 / 协同合同）
  role: ContractRole;
  mainContractId?: string;   // 协同合同：关联的主合同 id
  mainOrgName?: string;      // 协同合同：主合同签订的主要单位
  coopOrgName?: string;     // 主合同：参与施工的协同单位名称
}

// ==================== 计量数据池 ====================

/** 清单类型：正式 / 临时 */
export type PoolListType = 'formal' | 'temp';
/** 合同属性：合同内 / 合同外 */
export type PoolContractAttr = 'in' | 'out';

/** 完成批次（某日期完成的量，用于「选择某个时间段完成的清单子目」） */
export interface CompletionBatch {
  date: string;                 // 完成日期 YYYY-MM-DD
  qty: number;
  source: 'log' | 'manual' | 'transfer';  // 施工日志报工 / 手动计入产值 / 临时转入
}

/** 计量数据池子目（按合同汇总的可计量工程量总库） */
export interface MeasurePoolItem {
  id: string;
  contractId: string;
  contractCode: string;
  contractName: string;
  projectName: string;
  code: string;                    // 子目号（如 302-1-a，前缀数字即章节）
  name: string;                    // 子目名称
  unit: string;
  price: number;                    // 综合单价（元）
  // —— 基础信息
  listType: PoolListType;           // 清单类型：正式/临时
  contractAttr: PoolContractAttr;   // 合同属性：合同内/合同外
  isSafeFee?: boolean;             // 安全生产费子目（并入数据池计量）
  // —— 总量与施工
  totalQty?: number;                // 子目总量（合同数量）
  // 已施工量构成：已施工量 = 本组织完成 + 协同单位完成
  // 本组织完成 = logQty + manualQty + transferInQty
  logQty: number;                   // 施工日志报工
  manualQty: number;                // 手动计入产值
  transferInQty: number;            // 临时转入（临时/合同外清单经转入正式计入）
  coopQty?: number;                 // 协同单位完成量（主合同子目，由协同合同推送累计）
  pushedQty?: number;               // 已推送到主合同的量（协同合同子目）
  // —— 完成批次（按日期，向导按时间段筛选）
  completionBatches?: CompletionBatch[];
  // —— 清单转移（临时/合同外子目）
  transferredQty: number;           // 已转入正式量（转出到正式清单）
  // —— 计量管理（仅正式·合同内有意义）
  reportedQty: number;              // 已上报计量量
  approvedQty: number;              // 已批复计量量
  // —— 分包
  subcontractQty: number;           // 分包结算量
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

/** 清单转移记录（临时/合同外 → 正式·合同内） */
export interface MeasureTransferLog {
  id: string;
  fromItemId: string;
  fromCode: string;
  fromName: string;
  toItemId: string;
  toCode: string;
  toName: string;
  qty: number;
  operator: string;
  createdAt: string;
}

/** 协同推送记录（协同合同子目 → 主合同子目，协同合同不直接生成计量单） */
export interface CoopPushLog {
  id: string;
  fromContractId: string;
  fromContractCode: string;
  fromItemId: string;
  fromCode: string;
  fromName: string;
  toContractId: string;
  toContractCode: string;
  toItemId: string;
  toCode: string;
  toName: string;
  qty: number;
  operator: string;
  createdAt: string;
}

// ==================== 计量单（原计量台账） ====================

/** 计量单状态流转：
 *  draft 草稿（向导确认创建）
 *  → submitted 已提交（待批复）
 *  → approving 批复中（交投已推送，等待回传）
 *  → approved 已批复 / rejected 已驳回（可修改重新提交）
 */
export type MeasureStatementStatus = 'draft' | 'submitted' | 'approving' | 'approved' | 'rejected';

/** 扣款/调整项（计量单手填，图一下方） */
export interface StatementDeductions {
  priceAdjustment?: number;         // 价格调整（加）
  claim?: number;                  // 索赔金额（扣）
  penalty?: number;                // 违约罚款（扣）
  assessmentDeduction?: number;    // 考核扣款（扣）
  assessmentReward?: number;       // 考核奖励（加）
  lateInterest?: number;           // 迟付款利息（扣）
  mobilizationAdvance?: number;    // 动员预付款（加）
  mobilizationAdvanceBack?: number; // 扣回动员预付款（扣）
  materialAdvance?: number;         // 材料设备垫付款（加）
  materialAdvanceBack?: number;     // 扣回材料设备垫付款（扣）
  retention?: number;              // 保留金（扣）
}

/** 计量单行（本期计量明细，图二） */
export interface MeasureStatementLine {
  id: string;
  poolItemId: string;         // 关联数据池子目；手动新增行可为 ''
  chapter: string;            // 章节号（'100'/'200'/...，由子目号推导）
  code: string;               // 项目编号
  name: string;              // 项目名称
  unit: string;
  price: number;              // 合同单价
  contractQty?: number;      // 合同数量
  changeAmount?: number;     // 变更金额（手填）
  qty: number;               // 本期完成数量
  amount: number;            // 本期完成金额 = qty × price
  ownQty?: number;           // 其中：本组织完成数量（快照，主合同计量时区分来源）
  coopQty?: number;          // 其中：协同单位完成数量（快照，来自协同合同推送量）
  prevCumQty: number;        // 到上期末完成数量（快照）
  prevCumAmount: number;     // 到上期末完成金额（快照）
  isSafeFee?: boolean;
  manual?: boolean;           // 手动新增的计量子目（非数据池选入）
}

/** 计量单（按合同 + 期间形成本期计量） */
export interface MeasureStatement {
  id: string;
  code: string;                  // JL-202608-001
  period: string;                // 计量期间 YYYY-MM
  periodNo: number;              // 第 N 期
  periodStart?: string;          // 计量时间段起（YYYY-MM-DD）
  periodEnd?: string;            // 计量时间段止（截止日期）
  contractId: string;
  contractCode: string;
  contractName: string;
  projectName: string;
  ownerType: OwnerType;
  ownerName: string;
  lines: MeasureStatementLine[];
  totalAmount: number;           // 本期完成金额合计（图一「合计」）
  safeFeeAmount: number;         // 其中：安全生产费
  deductions?: StatementDeductions;   // 扣款/调整手填项
  status: MeasureStatementStatus;
  // 批复结果
  approvedAmount?: number;       // 批复金额（实际支付）
  deduction?: number;            // 扣款金额（申报-批复）
  rejectReason?: string;
  approveOpinion?: string;
  // 提交/推送/批复时间
  submittedAt?: string;
  pushedAt?: string;             // 推送交投时间
  approvedAt?: string;
  handler: string;               // 经办技术员
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 计量凭证（批复后生成） ====================

/** 计量凭证行（批复后） */
export interface MeasureOrderLine {
  id: string;
  chapter: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  contractQty?: number;
  declaredQty: number;     // 申报量（本期）
  approvedQty: number;     // 批复量（本期）
  declaredAmount: number;  // 申报金额
  approvedAmount: number;  // 批复金额
  prevCumQty: number;      // 到上期末完成量（快照）
  prevCumAmount: number;   // 到上期末完成金额（快照）
}

/** 计量凭证：批复后自动生成（一个合同一张，与计量单一一对应） */
export interface MeasureOrder {
  id: string;
  code: string;                    // JLD-202608-001
  statementId: string;
  statementCode: string;
  period: string;
  periodNo: number;
  periodEnd?: string;
  contractId: string;
  contractCode: string;
  contractName: string;
  projectName: string;
  ownerType: OwnerType;
  ownerName: string;
  lines: MeasureOrderLine[];
  declaredAmount: number;          // 申报金额
  approvedAmount: number;          // 批复金额
  deduction: number;               // 扣款
  status: 'effective' | 'archived'; // 生效 / 已归档
  archived: boolean;
  approveTime: string;
  createdAt: string;
}

// ==================== 应收单（经交工计量系统填报推送） ====================

/** 应收单状态：draft 待填报 → pushed 已推送（交工计量系统→交投财务共享）→ confirmed 财务共享已确认 */
export type ReceivableStatus = 'draft' | 'pushed' | 'confirmed';

/** 应收单（按合同一一对应：一个合同的计量单对应一张应收单） */
export interface ReceivableOrder {
  id: string;
  code: string;                    // YSD-202608-001
  measureOrderId: string;
  measureOrderCode: string;
  period: string;
  contractId: string;
  contractCode: string;
  contractName: string;
  projectName: string;
  ownerType: OwnerType;
  ownerName: string;
  amount: number;                  // 应收金额（= 本期可收金额，含税）
  status: ReceivableStatus;
  pushedAt?: string;               // 推送交工计量系统时间
  confirmedAt?: string;             // 交投财务共享确认时间
  remark?: string;
  createdAt: string;

  // ===== 工程结算应收单填报字段（「创建应收单」向导，按交工计量系统单据样式） =====
  docDate?: string;                 // 单据日期 *
  bizDate?: string;                  // 业务日期 *
  sysCode?: string;                  // 系统单据编号（JLGL-YSDN-… 自动生成） *
  regCode?: string;                  // 在册单据编号（YS-…） *
  dept?: string;                     // 部门 *
  settleOrg?: string;                // 结算组织 *
  invoiceApplyOrg?: string;          // 申请开票组织 *
  accountOrg?: string;               // 入账组织 *
  collectOrg?: string;               // 收款组织 *
  bizContent?: string;               // 业务内容（工程款） *
  agingStart?: string;               // 账龄起算日
  invoiceReceived?: boolean;         // 是否收票 *
  payee?: string;                    // 收款人
  currency?: string;                 // 结算币别（CNY） *

  measureOrderIds?: string[];        // 关联计量单（支持多张已批复计量单合并）
  curMeasureAmount?: number;         // 本期计量金额（= 所选计量单批复金额合计） *
  prevCumMeasureAmount?: number;     // 上期末累计计量金额
  endCumMeasureAmount?: number;      // 到本期末累计计量金额
  curChange?: number;                // 本期变更
  curMaterialAdj?: number;           // 本期材料调差
  curPenalty?: number;               // 本期罚款
  curAdvanceDeduct?: number;         // 本期应扣预付款
  curPayableDeduct?: number;         // 本期应扣待付扣回
  curOtherAdvanceDeduct?: number;    // 本期其他预付款扣回
  curDeposit?: number;               // 本期保证金（负数扣留，= 保证金明细合计）
  curInvoiceAmount?: number;         // 本期开票金额 *
  curCollectible?: number;           // 本期可收金额 *（= 计量 + 变更 + 调差 − 扣减 + 保证金）
  settleBatch?: string;               // 结算批次（所选计量单期数） *

  deposits?: ReceivableDepositLine[];     // 保证金明细
  invoices?: ReceivableInvoiceLine[];     // 开票明细
  invoiceInfo?: ReceivableInvoiceInfo;    // 发票其他信息
  plans?: ReceivablePlanLine[];           // 收款计划
  attachments?: ReceivableAttachment[];   // 附件
}

/** 应收单保证金明细行 */
export interface ReceivableDepositLine {
  id: string;
  type: string;            // 保证金类型：履约保证金 / 质量保证金 / 农民工工资保证金 / 联合体方工程款…
  amount: number;          // 保证金金额（负数为扣留）
  invoiceNow: boolean;     // 是否立即开票
  remark?: string;
}

/** 应收单开票明细行（价税分离：税额 = 开票金额 − 不含税金额） */
export interface ReceivableInvoiceLine {
  id: string;
  name: string;            // 开票名称（工程款）
  taxCategory: string;     // 税收分类（工程服务）
  amount: number;          // 本期开票金额
  taxRate: number;         // 开票税率（如 0.09）
  taxAmount: number;       // 开票税额
  exclTaxAmount: number;   // 不含税金额
  invoicedAmount?: number;  // 已开票金额
}

/** 应收单发票其他信息 */
export interface ReceivableInvoiceInfo {
  projectName?: string;      // 工程发票名称
  invoiceType?: string;     // 发票类型（数电票(增值税专用发票)）
  email?: string;           // 电子发票发票邮箱
  phone?: string;           // 电子发票收票电话
  goods?: string;           // 货种（工程款）
  remark?: string;          // 发票备注信息
}

/** 应收单收款计划行 */
export interface ReceivablePlanLine {
  id: string;
  planDate: string;         // 约定收款日期
  condition: string;        // 约定收款条件（民工工资专款 / 计量批复后30天 / 质保期满…）
  amount: number;           // 应收金额
  incomeItem: string;       // 收入项目（工程结算收入）
  depositType?: string;     // 保证金类型
  settledAmount?: number;   // 已结算金额
  settleMethod?: string;    // 结算方式（电汇 / 承兑 / 支票…）
}

/** 应收单附件 */
export interface ReceivableAttachment {
  id: string;
  fileName: string;
}

// ==================== 回款跟踪 ====================

/** 回款记录（对应收单登记回款，形成计量—回款对比台账） */
export interface PaymentRecord {
  id: string;
  code: string;                    // HK-202609-001
  receivableId: string;
  receivableCode: string;
  contractCode: string;
  contractName: string;
  projectName: string;
  ownerName: string;
  amount: number;                  // 本次回款金额
  payDate: string;
  method: string;                  // 电汇/承兑/支票
  remark?: string;
  createdAt: string;
}
