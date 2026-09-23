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
  deptType?: SysDeptTypeCode; // 部门类型（仅科室节点有）
  path: string;            // 完整路径，如 "养护集团/区域A/项目部1/工程科"
  createdAt: string;
  updatedAt: string;
}

// 部门类型定义
export interface SysDeptTypeDef {
  code: string;
  name: string;
}

// 人员
export interface SysUser {
  id: string;
  name: string;
  username: string;        // 登录账号
  orgId: string;           // 所属组织（科室节点）ID
  position: string;       // 职位
  phone?: string;
  email?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

// 管理中心 Tab
export type SysAdminTab = 'organization' | 'personnel';
