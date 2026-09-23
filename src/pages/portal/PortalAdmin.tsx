/**
 * 门户管理中心 - 主页面
 * 使用统一的 AdminLayout 左侧菜单布局
 */

import { useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import type { AdminTab } from './types';
import FrameworkManager from './FrameworkManager';
import ComponentTypeManager from './ComponentTypeManager';
import ComponentManager from './ComponentManager';
import TemplateManager from './TemplateManager';

const MENU_ITEMS = [
  { key: 'framework', label: '框架管理', icon: 'M4 4h16v16H4V4zm4 0v16M4 8h16', desc: '定义门户页面槽位布局' },
  { key: 'componentType', label: '组件类型管理', icon: 'M7 7h10v10H7zM3 3h4v4H3zm14 0h4v4h-4zM3 17h4v4H3zm14 0h4v4h-4', desc: '组件分类标签配置' },
  { key: 'component', label: '组件管理', icon: 'M4 6h16M4 12h16M4 18h16', desc: '门户内容单元配置' },
  { key: 'template', label: '模板管理', icon: 'M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2', desc: '组件类型与组织绑定' },
];

export default function PortalAdmin() {
  const handleRefresh = useCallback(() => {
    // 触发子组件重新加载（通过 key 变化）
    window.dispatchEvent(new CustomEvent('portal-admin-refresh'));
  }, []);

  return (
    <AdminLayout
      title="门户管理中心"
      subtitle="千人千面门户配置体系"
      theme="cyan"
      rightInfo={{ label: '配置顺序', value: '框架 → 类型 → 组件 → 模板' }}
      menuItems={MENU_ITEMS}
      defaultActive="framework"
      renderContent={(activeKey) => {
        const tab = activeKey as AdminTab;
        return (
          <>
            {tab === 'framework' && <FrameworkManager onRefresh={handleRefresh} />}
            {tab === 'componentType' && <ComponentTypeManager onRefresh={handleRefresh} />}
            {tab === 'component' && <ComponentManager onRefresh={handleRefresh} />}
            {tab === 'template' && <TemplateManager onRefresh={handleRefresh} />}
          </>
        );
      }}
    />
  );
}
