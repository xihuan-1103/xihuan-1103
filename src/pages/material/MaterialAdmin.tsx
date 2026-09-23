/**
 * 材料系统管理中心 - 主页面
 * 左侧二级菜单（领料单/调拨单/入库/出库/库存转移/库存查询/基础数据）
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import type { MaterialAdminTab } from './types';
import IssueManager from './IssueManager';
import TransferManager from './TransferManager';
import StockInManager from './StockInManager';
import StockOutManager from './StockOutManager';
import ValuationManager from './ValuationManager';
import StockBalance from './StockBalance';
import MaterialMaster from './MaterialMaster';
import type { Project, Contract, Team } from '@/types';

const MENU_ITEMS = [
  { key: 'issue',     label: '领料单',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', desc: '定项定组限额领料' },
  { key: 'transfer',  label: '调拨单',     icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', desc: '跨组织调拨+双方确认' },
  { key: 'stockIn',   label: '材料入库',   icon: 'M20 12H4m0 0l8-8m-8 8l8 8', desc: '采购/退料/调拨/其他入库' },
  { key: 'stockOut',  label: '材料出库',   icon: 'M4 12h16m0 0l-8-8m8 8l-8 8', desc: '领料/调拨/其他出库' },
  { key: 'valuation', label: '库存转移(价拨)', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v-2', desc: '仓库间内部转移/外部价拨' },
  { key: 'balance',   label: '库存查询',   icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', desc: '实时库存余额' },
  { key: 'master',    label: '基础数据',   icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', desc: '材料编码/仓库' },
];

/** URL ?tab= 支持的合法菜单 key */
const URL_TAB_KEYS = MENU_ITEMS.map(m => m.key);

export interface MaterialAdminProps {
  projects: Project[];
  contracts: Contract[];
  teams: Team[];
}

export default function MaterialAdmin({ projects, contracts, teams }: MaterialAdminProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = useCallback(() => setRefreshKey(k => k + 1), []);
  // URL ?tab= 驱动二级菜单（领料单/调拨单等菜单项通过该参数直达对应页签）
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || '';
  const activeFromUrl = URL_TAB_KEYS.includes(urlTab) ? urlTab : undefined;

  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener('material-admin-refresh', handler);
    return () => window.removeEventListener('material-admin-refresh', handler);
  }, [onRefresh]);

  return (
    <AdminLayout
      title="材料系统管理中心"
      subtitle="入库 / 出库 / 领料 / 调拨 / 库存 一体化"
      theme="cyan"
      rightInfo={{ label: '业务流程', value: '入库→库存→领料/调拨/价拨→出库' }}
      menuItems={MENU_ITEMS}
      defaultActive="issue"
      activeKey={activeFromUrl}
      onActiveChange={(key) => {
        // 菜单切换时同步回 URL，保证刷新/分享后停留在当前页签
        const next = new URLSearchParams(searchParams);
        next.set('tab', key);
        setSearchParams(next, { replace: true });
      }}
      renderContent={(activeKey) => {
        const tab = activeKey as MaterialAdminTab;
        return (
          <>
            {tab === 'issue' && (
              <IssueManager key={`issue-${refreshKey}`} projects={projects} teams={teams} onRefresh={onRefresh} />
            )}
            {tab === 'transfer' && (
              <TransferManager key={`transfer-${refreshKey}`} onRefresh={onRefresh} />
            )}
            {tab === 'stockIn' && (
              <StockInManager key={`stockIn-${refreshKey}`} contracts={contracts} projects={projects} onRefresh={onRefresh} />
            )}
            {tab === 'stockOut' && (
              <StockOutManager key={`stockOut-${refreshKey}`} projects={projects} teams={teams} onRefresh={onRefresh} />
            )}
            {tab === 'valuation' && (
              <ValuationManager key={`valuation-${refreshKey}`} onRefresh={onRefresh} />
            )}
            {tab === 'balance' && (
              <StockBalance key={`balance-${refreshKey}`} />
            )}
            {tab === 'master' && (
              <MaterialMaster key={`master-${refreshKey}`} onRefresh={onRefresh} />
            )}
          </>
        );
      }}
    />
  );
}
