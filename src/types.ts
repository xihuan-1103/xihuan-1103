export type ProjectStatus = '草稿' | '立项审批' | '立项驳回' | '已立项' | '在建' | '验收中' | '完工归档' | '终止';

export interface MainLine {
  id: string;
  code: string;
  name: string;
  abbr: string;
  startStake: string;
  endStake: string;
  direction: '上行' | '下行';
  length: number;
  remark?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  idCard: string;
  age: number;
  gender: '男' | '女';
  status: '在岗' | '离岗';
  joinDate: string;
  leaveDate?: string;
  phone: string;
  collaborator?: string;
}

export interface Team {
  id: string;
  name: string;
  leader: string;
  phone: string;
  type: string;
  status: '在场' | '离场';
  remark?: string;
  members: TeamMember[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  abbr: string;
  type: string;
  status: ProjectStatus;
  dept: string;
  org: string;
  startDate: string;
  endDate: string;
  creator: string;
  createDate: string;
  contractSigned: boolean;
  manager?: string;
  clientUnit?: string;
  clientManager?: string;
  workArea?: string;
  projectAbbr?: string;
  projectCode?: string;
  undertakeMethod?: string;
  qualification?: string;
  nature?: string;
  completionType?: string;
  maintenanceArea?: string;
  maintenanceScope?: string;
  property?: string[];
  summary?: string;
  mainLines: string[]; // IDs
  teams: string[]; // IDs
  contractId?: string;
}

export interface HistoryVersion {
  id: string;
  projectId: string;
  operator: string;
  operation: string;
  time: string;
  details?: string;
}

export type ContractSource = '系统同步' | '协同合同';
export type ContractStatus = '待确认' | '已确认' | '已退回' | '已转派';

export interface Contract {
  id: string;
  name: string;
  code: string;
  amount: number;
  financialStatus: string;
  agency: string;
  type: string;
  source: ContractSource;
  partyA: string;
  partyB: string;
  status: ContractStatus;
  transferCount: number;
  isLocked: boolean;
  createTime: string;
  confirmTime?: string;
  returnReason?: string;
  transferReason?: string;
  targetOrg?: string;
  performanceStartDate?: string;
  performanceEndDate?: string;
}

export interface ContractOperation {
  id: string;
  contractId: string;
  contractName: string;
  contractCode: string;
  type: '退回' | '转派' | '确认合同' | '取消退回';
  operator: string;
  time: string;
  reason?: string;
  targetOrg?: string;
}

export type ChangeStatus = '草稿' | '审批中' | '审批驳回' | '已变更';

export interface ProjectChange {
  id: string;
  changeNo?: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  initiator: string;
  initiationTime?: string;
  status: ChangeStatus;
  reason: string;
  changeContents: string[]; // ['基本信息', '项目信息', '路段信息', '班组信息', '合同信息']
  beforeData: Partial<Project>;
  afterData: Partial<Project>;
}
