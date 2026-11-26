/**
 * 系统管理 - 类型定义
 * 组织管理、人员管理的数据模型
 */

// 组织层级
export type SysOrgLevel = 'group' | 'region' | 'project';

// 部门类型编码
export type SysDeptTypeCode = 'eng' | 'safety' | 'finance' | 'general' | string;

// 组织节点
export interface SysOrg {
  id: string;
  name: string;
  level: SysOrgLevel;
  parentId?: string;       // 上级组织 ID（根组织无 parentId）
  deptType?: SysDeptTypeCode; // 部门类型（可选，旧字段）
  path: string;            // 完整路径，如 "交科养护集团/杭州区域中心/杭州项目部"
  code?: string;           // 部门编码，如 YHORG6
  isContract?: boolean;    // 是否签约组织
  isAccounting?: boolean;  // 是否核算机构
  sort?: number;           // 排序
  createdAt: string;
  updatedAt: string;
}

// 部门类型定义
export interface SysDeptTypeDef {
  code: string;
  name: string;
}

// 教育经历（全日制/在职）
export interface EduRecord {
  degree?: string;  // 学历
  school?: string;  // 毕业院校及专业
  date?: string;    // 毕业时间
}

// 人员
export interface SysUser {
  id: string;
  name: string;
  username: string;        // 登录账号
  orgId: string;           // 所属组织 ID
  position: string;        // 岗位
  phone?: string;
  email?: string;
  status: 'active' | 'disabled';
  region?: string;             // 区域
  unit?: string;               // 所在单位
  contractOwner?: string;      // 合同归属
  gender?: string;             // 性别
  age?: number;                // 年龄
  workYears?: number;          // 工龄
  ethnicity?: string;          // 民族
  nativePlace?: string;        // 籍贯
  politicalStatus?: string;    // 政治面貌
  title?: string;              // 职称
  qualificationLevel?: string; // 职业/执业资格等级
  fullTimeEdu1?: EduRecord;    // 全日制教育1
  fullTimeEdu2?: EduRecord;    // 全日制教育2
  inServiceEdu?: EduRecord;    // 在职（全日制）教育
  certEng?: string;            // 持证（工程、试验类）
  certOther?: string;          // 持证（其他）
  createdAt: string;
  updatedAt: string;
}

// 管理中心 Tab
export type SysAdminTab = 'organization' | 'personnel';
