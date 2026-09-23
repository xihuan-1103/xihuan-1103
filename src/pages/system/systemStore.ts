/**
 * 系统管理 - 数据存储（localStorage 模拟后端）
 */

import type { SysOrg, SysUser, SysDeptTypeDef, SysDeptTypeCode } from './types';

const KEYS = {
  org: 'cico-sys-orgs',
  user: 'cico-sys-users',
};

// 预定义部门类型
export const SYS_DEPT_TYPES: SysDeptTypeDef[] = [
  { code: 'eng', name: '工程科' },
  { code: 'safety', name: '安环科' },
  { code: 'finance', name: '财务科' },
  { code: 'general', name: '综合办' },
];

// 获取科室类型名称
export function getDeptTypeName(code: string): string {
  return SYS_DEPT_TYPES.find(d => d.code === code)?.name || code;
}

// 自动创建的默认组织架构
const DEFAULT_ORGS: SysOrg[] = [
  // 集团层级
  { id: 'org-group', name: '养护集团', level: 'group', path: '养护集团', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-group-eng', name: '工程科', level: 'group', parentId: 'org-group', deptType: 'eng', path: '养护集团/工程科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-group-safety', name: '安环科', level: 'group', parentId: 'org-group', deptType: 'safety', path: '养护集团/安环科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-group-finance', name: '财务科', level: 'group', parentId: 'org-group', deptType: 'finance', path: '养护集团/财务科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-group-general', name: '综合办', level: 'group', parentId: 'org-group', deptType: 'general', path: '养护集团/综合办', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },

  // 区域层级
  { id: 'org-region-A', name: '区域A', level: 'region', parentId: 'org-group', path: '养护集团/区域A', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-region-A-eng', name: '工程科', level: 'region', parentId: 'org-region-A', deptType: 'eng', path: '养护集团/区域A/工程科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-region-A-safety', name: '安环科', level: 'region', parentId: 'org-region-A', deptType: 'safety', path: '养护集团/区域A/安环科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-region-A-finance', name: '财务科', level: 'region', parentId: 'org-region-A', deptType: 'finance', path: '养护集团/区域A/财务科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },

  { id: 'org-region-B', name: '区域B', level: 'region', parentId: 'org-group', path: '养护集团/区域B', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-region-B-eng', name: '工程科', level: 'region', parentId: 'org-region-B', deptType: 'eng', path: '养护集团/区域B/工程科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },

  // 项目部层级
  { id: 'org-proj-1', name: '项目部1', level: 'project', parentId: 'org-region-A', path: '养护集团/区域A/项目部1', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-proj-1-eng', name: '工程科', level: 'project', parentId: 'org-proj-1', deptType: 'eng', path: '养护集团/区域A/项目部1/工程科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-proj-1-safety', name: '安环科', level: 'project', parentId: 'org-proj-1', deptType: 'safety', path: '养护集团/区域A/项目部1/安环科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-proj-1-finance', name: '财务科', level: 'project', parentId: 'org-proj-1', deptType: 'finance', path: '养护集团/区域A/项目部1/财务科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },

  { id: 'org-proj-2', name: '项目部2', level: 'project', parentId: 'org-region-A', path: '养护集团/区域A/项目部2', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-proj-2-eng', name: '工程科', level: 'project', parentId: 'org-proj-2', deptType: 'eng', path: '养护集团/区域A/项目部2/工程科', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'org-proj-2-general', name: '综合办', level: 'project', parentId: 'org-proj-2', deptType: 'general', path: '养护集团/区域A/项目部2/综合办', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
];

// 默认人员
const DEFAULT_USERS: SysUser[] = [
  { id: 'user-admin', name: '系统管理员', username: 'admin', orgId: 'org-group-general', position: '系统管理员', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-zhangsan', name: '张三', username: 'zhangsan', orgId: 'org-proj-1-eng', position: '工程科长', phone: '13800138001', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-lisi', name: '李四', username: 'lisi', orgId: 'org-proj-1-safety', position: '安环科长', phone: '13800138002', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-wangwu', name: '王五', username: 'wangwu', orgId: 'org-proj-2-eng', position: '工程师', phone: '13800138003', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
];

function readArray<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function writeArray<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// === 组织 ===
export function getOrgs(): SysOrg[] {
  return readArray(KEYS.org, DEFAULT_ORGS);
}
export function saveOrgs(list: SysOrg[]): void {
  writeArray(KEYS.org, list);
}

// 获取科室节点（带 deptType 的节点）
export function getDeptOrgs(): SysOrg[] {
  return getOrgs().filter(o => !!o.deptType);
}

// 获取指定部门类型的组织节点
export function getOrgsByDeptType(deptTypeCode: string): SysOrg[] {
  return getOrgs().filter(o => o.deptType === deptTypeCode);
}

// 根据 ID 获取组织
export function getOrgById(id: string): SysOrg | undefined {
  return getOrgs().find(o => o.id === id);
}

// 生成组织路径
export function buildOrgPath(org: { parentId?: string; name: string }, allOrgs: SysOrg[]): string {
  if (!org.parentId) return org.name;
  const parent = allOrgs.find(o => o.id === org.parentId);
  if (!parent) return org.name;
  return `${parent.path}/${org.name}`;
}

// === 人员 ===
export function getUsers(): SysUser[] {
  return readArray(KEYS.user, DEFAULT_USERS);
}
export function saveUsers(list: SysUser[]): void {
  writeArray(KEYS.user, list);
}

// 获取当前登录用户（模拟，默认返回张三）
export function getCurrentUser(): SysUser {
  const users = getUsers();
  return users.find(u => u.username === 'zhangsan') || users[0];
}
