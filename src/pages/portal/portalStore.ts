/**
 * 门户管理中心 - 数据存储（localStorage 模拟后端）
 */

import type {
  PortalFramework,
  ComponentType,
  PortalComponent,
  PortalTemplate,
  OrgNode,
  DeptTypeDef,
} from './types';
import { getOrgs, getDeptOrgs, getOrgsByDeptType, getCurrentUser } from '../system/systemStore';
import type { SysOrg, SysUser } from '../system/types';

// localStorage keys
const KEYS = {
  framework: 'cico-portal-frameworks',
  compType: 'cico-portal-comp-types',
  component: 'cico-portal-components',
  template: 'cico-portal-templates',
  userPortal: 'cico-portal-user-config',
};

// 科室类型预定义
export const DEPT_TYPES: DeptTypeDef[] = [
  { code: 'eng', name: '工程科' },
  { code: 'safety', name: '安环科' },
  { code: 'finance', name: '财务科' },
  { code: 'general', name: '综合办' },
];

// 组织架构数据 - 从系统管理动态读取（系统管理中维护的组织）
export function getOrgTree(): OrgNode[] {
  return getOrgs().map(o => ({
    id: o.id,
    name: o.name,
    level: o.level,
    parentId: o.parentId,
    deptType: o.deptType,
    path: o.path,
  }));
}
// 向后兼容：保留 MOCK_ORG_TREE 导出（从系统组织动态生成）
export const MOCK_ORG_TREE: OrgNode[] = getOrgs().map(o => ({
  id: o.id,
  name: o.name,
  level: o.level,
  parentId: o.parentId,
  deptType: o.deptType,
  path: o.path,
}));

// 获取所有科室节点（带 deptType）
export function getPortalDeptOrgs(): OrgNode[] {
  return getDeptOrgs().map(o => ({
    id: o.id,
    name: o.name,
    level: o.level,
    parentId: o.parentId,
    deptType: o.deptType,
    path: o.path,
  }));
}

// 获取指定部门类型的组织节点
export function getPortalOrgsByDeptType(deptTypeCode: string): OrgNode[] {
  return getOrgsByDeptType(deptTypeCode).map(o => ({
    id: o.id,
    name: o.name,
    level: o.level,
    parentId: o.parentId,
    deptType: o.deptType,
    path: o.path,
  }));
}

// 获取当前登录用户
export function getPortalCurrentUser(): SysUser {
  return getCurrentUser();
}

// === 用户门户配置 ===
// 存储每个用户自定义的门户布局（基于模板+组件选择）
export interface UserPortalLayout {
  userId: string;
  templateId: string;          // 用户选择的模板
  frameworkId: string;         // 使用的框架
  // 用户在框架槽位中配置的组件 ID 列表
  // slotId -> widgetId[]
  slotAssignments: Record<string, string[]>;
  updatedAt: string;
}

export function getUserPortalLayout(userId: string): UserPortalLayout | null {
  try {
    const raw = localStorage.getItem(KEYS.userPortal);
    if (raw) {
      const all: UserPortalLayout[] = JSON.parse(raw);
      return all.find(u => u.userId === userId) || null;
    }
  } catch { /* ignore */ }
  return null;
}

export function saveUserPortalLayout(layout: UserPortalLayout): void {
  try {
    const raw = localStorage.getItem(KEYS.userPortal);
    const all: UserPortalLayout[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(u => u.userId === layout.userId);
    if (idx >= 0) all[idx] = layout;
    else all.push(layout);
    localStorage.setItem(KEYS.userPortal, JSON.stringify(all));
  } catch { /* ignore */ }
}

// 计算当前用户可用的模板（根据用户所属组织匹配）
export function getAvailableTemplatesForUser(user: SysUser): PortalTemplate[] {
  const templates = getTemplates().filter(t => t.status === 'enabled');
  const org = getOrgs().find(o => o.id === user.orgId);
  if (!org) return [];
  return templates.filter(t => {
    // 指定组织节点匹配
    const matchedBySpecified = t.binding.specifiedOrgs.includes(user.orgId);
    // 按科室类型匹配
    const matchedByDeptType = org.deptType && t.binding.byDeptTypes.includes(org.deptType);
    return matchedBySpecified || matchedByDeptType;
  });
}

// 默认框架数据
const DEFAULT_FRAMEWORKS: PortalFramework[] = [
  {
    id: 'fw-proj-default',
    name: '项目部默认框架',
    level: 'project',
    columns: 3,
    rowHeight: 120,
    status: 'enabled',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
    slots: [
      { id: 'slot-1', name: '待办事项', colSpan: 2, rowSpan: 1, isFixed: true },
      { id: 'slot-2', name: '系统公告', colSpan: 1, rowSpan: 1, isFixed: true },
      { id: 'slot-3', name: '空槽位1', colSpan: 1, rowSpan: 1, isFixed: false },
      { id: 'slot-4', name: '空槽位2', colSpan: 1, rowSpan: 1, isFixed: false },
      { id: 'slot-5', name: '空槽位3', colSpan: 1, rowSpan: 1, isFixed: false },
    ],
  },
  {
    id: 'fw-group-default',
    name: '集团默认框架',
    level: 'group',
    columns: 4,
    rowHeight: 140,
    status: 'enabled',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
    slots: [
      { id: 'gslot-1', name: '待办事项', colSpan: 2, rowSpan: 1, isFixed: true },
      { id: 'gslot-2', name: '系统公告', colSpan: 2, rowSpan: 1, isFixed: true },
      { id: 'gslot-3', name: '空槽位1', colSpan: 1, rowSpan: 1, isFixed: false },
      { id: 'gslot-4', name: '空槽位2', colSpan: 1, rowSpan: 1, isFixed: false },
      { id: 'gslot-5', name: '空槽位3', colSpan: 1, rowSpan: 1, isFixed: false },
      { id: 'gslot-6', name: '空槽位4', colSpan: 1, rowSpan: 1, isFixed: false },
    ],
  },
];

// 默认组件类型
const DEFAULT_COMP_TYPES: ComponentType[] = [
  { id: 'ct-eng', name: '工程科', code: 'eng', description: '工程科相关组件', createdAt: '2026-08-14T10:00:00Z' },
  { id: 'ct-safety', name: '安环科', code: 'safety', description: '安环科相关组件', createdAt: '2026-08-14T10:00:00Z' },
  { id: 'ct-finance', name: '财务科', code: 'finance', description: '财务科相关组件', createdAt: '2026-08-14T10:00:00Z' },
  { id: 'ct-general', name: '综合办', code: 'general', description: '综合办相关组件', createdAt: '2026-08-14T10:00:00Z' },
];

// 默认组件（与工作台 WIDGET_TITLES 一一对应，组件类型随机分配）
const DEFAULT_COMPONENTS: PortalComponent[] = [
  { id: 'comp-branding', name: '组织信息', typeId: 'ct-general', contentUrl: 'widget:branding', isUniversal: true, isFixed: true, sortWeight: 230, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-levelWidget', name: '层级专属面板', typeId: 'ct-eng', contentUrl: 'widget:levelWidget', isUniversal: true, isFixed: true, sortWeight: 220, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-shortcuts', name: '常用应用', typeId: 'ct-general', contentUrl: 'widget:shortcuts', isUniversal: true, isFixed: true, sortWeight: 210, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-processControl', name: '项目过程管控', typeId: 'ct-eng', contentUrl: 'widget:processControl', isUniversal: true, isFixed: true, sortWeight: 200, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-todos', name: '待办事项', typeId: 'ct-general', contentUrl: 'widget:todos', isUniversal: true, isFixed: true, sortWeight: 190, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-news', name: '公告栏', typeId: 'ct-general', contentUrl: 'widget:news', isUniversal: true, isFixed: true, sortWeight: 180, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-weather', name: '智能天气环境订阅', typeId: 'ct-safety', contentUrl: 'widget:weather', isUniversal: true, isFixed: false, sortWeight: 170, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-measurement', name: '年度计量执行', typeId: 'ct-eng', contentUrl: 'widget:measurement', isUniversal: true, isFixed: false, sortWeight: 160, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-cost', name: '年度工料机及其他成本', typeId: 'ct-finance', contentUrl: 'widget:cost', isUniversal: true, isFixed: false, sortWeight: 150, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-collection', name: '收款进度', typeId: 'ct-finance', contentUrl: 'widget:collection', isUniversal: true, isFixed: false, sortWeight: 140, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-projectShare', name: '项目产值占比', typeId: 'ct-eng', contentUrl: 'widget:projectShare', isUniversal: true, isFixed: false, sortWeight: 130, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-marketNewContract', name: '市场经营-新签合同额', typeId: 'ct-eng', contentUrl: 'widget:marketNewContract', isUniversal: true, isFixed: false, sortWeight: 120, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-marketProjectContract', name: '市场经营-在建项目合同额', typeId: 'ct-eng', contentUrl: 'widget:marketProjectContract', isUniversal: true, isFixed: false, sortWeight: 110, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-jointVenture', name: '合资公司情况', typeId: 'ct-finance', contentUrl: 'widget:jointVenture', isUniversal: true, isFixed: false, sortWeight: 100, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-businessKPI', name: '经营内参指标', typeId: 'ct-finance', contentUrl: 'widget:businessKPI', isUniversal: true, isFixed: false, sortWeight: 90, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-projectDistribution', name: '项目分布', typeId: 'ct-eng', contentUrl: 'widget:projectDistribution', isUniversal: true, isFixed: false, sortWeight: 80, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-dashboardMeasurement', name: '运营情况-计量支付', typeId: 'ct-eng', contentUrl: 'widget:dashboardMeasurement', isUniversal: true, isFixed: false, sortWeight: 70, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-dashboardProgress', name: '运营情况-施工进度', typeId: 'ct-eng', contentUrl: 'widget:dashboardProgress', isUniversal: true, isFixed: false, sortWeight: 60, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-dashboardCollection', name: '运营情况-收款进度', typeId: 'ct-finance', contentUrl: 'widget:dashboardCollection', isUniversal: true, isFixed: false, sortWeight: 50, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-drone', name: '无人机巡检', typeId: 'ct-safety', contentUrl: 'widget:drone', isUniversal: true, isFixed: false, sortWeight: 40, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-aiNews', name: 'AI新闻资讯', typeId: 'ct-eng', contentUrl: 'widget:aiNews', isUniversal: true, isFixed: false, sortWeight: 30, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-dataBroadcast', name: '系统数据播报', typeId: 'ct-finance', contentUrl: 'widget:dataBroadcast', isUniversal: true, isFixed: false, sortWeight: 20, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
  { id: 'comp-feishuDocs', name: '每日资讯推送', typeId: 'ct-eng', contentUrl: 'widget:feishuDocs', isUniversal: true, isFixed: false, sortWeight: 10, status: 'online', createdAt: '2026-08-14T10:00:00Z', updatedAt: '2026-08-14T10:00:00Z' },
];

// 默认模板
const DEFAULT_TEMPLATES: PortalTemplate[] = [
  {
    id: 'tpl-eng-default',
    name: '工程科默认模板',
    typeIds: ['ct-eng', 'ct-general'],
    binding: {
      specifiedOrgs: [],
      byDeptTypes: ['eng'],
    },
    status: 'enabled',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
  },
  {
    id: 'tpl-safety-default',
    name: '安环科默认模板',
    typeIds: ['ct-safety', 'ct-general'],
    binding: {
      specifiedOrgs: ['org-proj-1-safety'],
      byDeptTypes: [],
    },
    status: 'enabled',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
  },
];

// 通用读写函数
function readArray<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  // 首次初始化写入默认值
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function writeArray<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// 生成唯一 ID
export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// === Framework ===
export function getFrameworks(): PortalFramework[] {
  return readArray(KEYS.framework, DEFAULT_FRAMEWORKS);
}
export function saveFrameworks(list: PortalFramework[]): void {
  writeArray(KEYS.framework, list);
}

// === Component Type ===
export function getCompTypes(): ComponentType[] {
  return readArray(KEYS.compType, DEFAULT_COMP_TYPES);
}
export function saveCompTypes(list: ComponentType[]): void {
  writeArray(KEYS.compType, list);
}

// === Component ===
export function getComponents(): PortalComponent[] {
  const stored = readArray(KEYS.component, DEFAULT_COMPONENTS);
  // 合并缺失的默认组件（保留用户已对现有组件做的修改）
  const existingIds = new Set(stored.map(c => c.id));
  const missing = DEFAULT_COMPONENTS.filter(c => !existingIds.has(c.id));
  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    writeArray(KEYS.component, merged);
    return merged;
  }
  return stored;
}
export function saveComponents(list: PortalComponent[]): void {
  writeArray(KEYS.component, list);
}

// === Template ===
export function getTemplates(): PortalTemplate[] {
  return readArray(KEYS.template, DEFAULT_TEMPLATES);
}
export function saveTemplates(list: PortalTemplate[]): void {
  writeArray(KEYS.template, list);
}
