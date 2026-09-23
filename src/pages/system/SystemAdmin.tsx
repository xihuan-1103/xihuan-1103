/**
 * 系统管理 - 主页面
 * 使用统一的 AdminLayout 左侧菜单布局
 */

import { useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import type { SysAdminTab } from './types';
import OrganizationManager from './OrganizationManager';
import PersonnelManager from './PersonnelManager';

const MENU_ITEMS = [
  { key: 'organization', label: '组织管理', icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4', desc: '组织架构与部门管理' },
  { key: 'personnel', label: '人员管理', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 10-8 0 4 4 0 008 0z', desc: '人员账号与权限' },
];

export default function SystemAdmin() {
  const handleRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent('system-admin-refresh'));
  }, []);

  return (
    <AdminLayout
      title="系统管理"
      subtitle="组织架构与人员管理"
      theme="slate"
      rightInfo={{ label: '数据来源', value: '组织 → 模板 → 门户' }}
      menuItems={MENU_ITEMS}
      defaultActive="organization"
      renderContent={(activeKey) => {
        const tab = activeKey as SysAdminTab;
        return (
          <>
            {tab === 'organization' && <OrganizationManager onRefresh={handleRefresh} />}
            {tab === 'personnel' && <PersonnelManager onRefresh={handleRefresh} />}
          </>
        );
      }}
    />
  );
}
