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

// 自动创建的默认组织架构（参照集团组织原型：交科养护集团 → 总部/各区域中心/事业部/省外/特种路面）
const T = '2026-08-14T10:00:00Z';
const org = (
  id: string, name: string, level: SysOrg['level'], code: string, sort: number,
  parentId?: string, extra?: Partial<SysOrg>,
): SysOrg => ({
  id, name, level, code, sort,
  parentId,
  path: '',
  createdAt: T, updatedAt: T,
  ...extra,
});

// 先构造列表，再统一计算 path
const DEFAULT_ORG_LIST: SysOrg[] = [
  org('org-jt', '交科养护集团', 'group', 'YHORG6', 99),
  org('org-zb', '总部', 'region', 'YHORG35', 0, 'org-jt'),
  org('org-hz', '杭州区域中心', 'region', 'YHORG36', 1, 'org-jt'),
  org('org-hz-1', '区域中心', 'project', 'YHORG3601', 1, 'org-hz'),
  org('org-hz-2', '杭州项目部', 'project', 'YHORG3602', 2, 'org-hz'),
  org('org-hz-3', '机场项目部', 'project', 'YHORG3603', 3, 'org-hz'),
  org('org-hz-4', '临平项目部', 'project', 'YHORG3604', 4, 'org-hz'),
  org('org-hz-5', '临江项目部', 'project', 'YHORG3605', 5, 'org-hz'),
  org('org-huzhou', '湖州区域中心', 'region', 'YHORG45', 2, 'org-jt'),
  org('org-jx', '嘉兴区域中心', 'region', 'YHORG46', 3, 'org-jt'),
  org('org-sx', '绍兴区域中心', 'region', 'YHORG7', 4, 'org-jt'),
  org('org-yz', '甬舟区域中心', 'region', 'YHORG33', 5, 'org-jt'),
  org('org-tz', '台州区域中心', 'region', 'YHORG48', 6, 'org-jt'),
  org('org-ls', '丽水区域中心', 'region', 'YHORG44', 7, 'org-jt'),
  org('org-jh', '金华区域中心', 'region', 'YHORG47', 8, 'org-jt'),
  org('org-wz', '温州区域中心', 'region', 'YHORG49', 9, 'org-jt'),
  org('org-tzb', '特种事业部', 'region', 'YHORG50', 10, 'org-jt'),
  org('org-sw', '省外', 'region', 'YHORG52', 12, 'org-jt'),
  org('org-tlm', '特种路面', 'region', 'YHORG51', 15, 'org-jt'),
];
const DEFAULT_ORGS: SysOrg[] = DEFAULT_ORG_LIST.map(o => {
  const parent = DEFAULT_ORG_LIST.find(p => p.id === o.parentId);
  return { ...o, path: parent ? `${parent.path}/${o.name}` : o.name };
});

// 默认人员
const DEFAULT_USERS: SysUser[] = [
  { id: 'user-admin', name: '系统管理员', username: 'admin', orgId: 'org-zb', position: '系统管理员', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-zhangsan', name: '张三', username: 'zhangsan', orgId: 'org-hz-2', position: '项目经理', phone: '13800138001', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-lisi', name: '李四', username: 'lisi', orgId: 'org-hz-3', position: '项目负责人', phone: '13800138002', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'user-wangwu', name: '王五', username: 'wangwu', orgId: 'org-hz-1', position: '工程师', phone: '13800138003', status: 'active', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
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
// 读取组织；若本地存量为旧版数据（无 code 字段）则自动迁移为新默认架构
export function getOrgs(): SysOrg[] {
  try {
    const raw = localStorage.getItem(KEYS.org);
    if (raw) {
      const parsed = JSON.parse(raw) as SysOrg[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code !== undefined) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  localStorage.setItem(KEYS.org, JSON.stringify(DEFAULT_ORGS));
  return DEFAULT_ORGS;
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
// 读取人员；若本地存量的组织归属全部失效（旧架构迁移后），重置为默认人员
export function getUsers(): SysUser[] {
  try {
    const raw = localStorage.getItem(KEYS.user);
    if (raw) {
      const parsed = JSON.parse(raw) as SysUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validIds = new Set(DEFAULT_ORGS.map(o => o.id));
        if (parsed.some(u => validIds.has(u.orgId))) return parsed;
      }
    }
  } catch { /* ignore */ }
  localStorage.setItem(KEYS.user, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}
export function saveUsers(list: SysUser[]): void {
  writeArray(KEYS.user, list);
}

// 获取当前登录用户（模拟，默认返回张三）
export function getCurrentUser(): SysUser {
  const users = getUsers();
  return users.find(u => u.username === 'zhangsan') || users[0];
}
