/**
 * 门户管理中心 - 类型定义
 * 千人千面门户配置体系的数据模型
 */

// 组织层级
export type OrgLevel = 'group' | 'region' | 'project';

// 框架状态
export type FrameworkStatus = 'draft' | 'enabled' | 'disabled';

// 组件状态
export type ComponentStatus = 'dev' | 'online' | 'offline';

// 模板状态
export type TemplateStatus = 'draft' | 'enabled' | 'disabled';

// 科室类型
export type DeptTypeCode = 'eng' | 'safety' | 'finance' | 'general' | string;

// 槽位定义
export interface Slot {
  id: string;
  name: string;
  colSpan: number;   // 列跨度 1-4
  rowSpan: number;   // 行跨度 1-2
  isFixed: boolean;  // 固定槽位仅放置固定组件
}

// 门户框架
export interface PortalFramework {
  id: string;
  name: string;
  level: OrgLevel;
  columns: number;   // 画布列数 2-4
  rowHeight: number; // 行高 px 60-200
  slots: Slot[];
  status: FrameworkStatus;
  createdAt: string;
  updatedAt: string;
}

// 组件类型
export interface ComponentType {
  id: string;
  name: string;
  code: string;      // 程序识别用编码，系统内唯一
  description?: string;
  createdAt: string;
}

// 组件
export interface PortalComponent {
  id: string;
  name: string;
  typeId: string;           // 归属组件类型
  contentUrl: string;       // 组件内容/URL
  isUniversal: boolean;     // 通用/非通用
  targetUsers?: string[];   // 非通用组件的可见用户
  targetOrgs?: string[];    // 非通用组件的可见组织
  isFixed: boolean;         // 固定/非固定
  sortWeight: number;       // 排序权重 0-999
  status: ComponentStatus;  // 开发中/上架/下架
  createdAt: string;
  updatedAt: string;
}

// 模板绑定模式
export interface TemplateBinding {
  // 指定组织节点（精确到科室）
  specifiedOrgs: string[];
  // 按科室类型批量匹配
  byDeptTypes: string[];
}

// 模板
export interface PortalTemplate {
  id: string;
  name: string;
  typeIds: string[];        // 关联组件类型（多选）
  binding: TemplateBinding; // 组织绑定
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

// 用户门户配置（门户渲染与用户自定义）
export interface UserPortalConfig {
  userId: string;
  level: OrgLevel;
  addedComponents: {
    componentId: string;
    slotId: string;
    addedAt: string;
  }[];
}

// 组织节点（用于模拟组织架构树）
export interface OrgNode {
  id: string;
  name: string;
  level: OrgLevel;
  parentId?: string;
  deptType?: DeptTypeCode;
  path: string; // 如 "集团/区域A/项目部1/工程科"
}

// 科室类型定义
export interface DeptTypeDef {
  code: string;
  name: string;
}

// 管理中心 Tab 类型
export type AdminTab = 'framework' | 'componentType' | 'component' | 'template';
