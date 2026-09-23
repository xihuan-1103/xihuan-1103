/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import ProjectList from './pages/ProjectList';
import ProjectSetup from './pages/ProjectSetup';
import MainLineSettings from './pages/MainLineSettings';
import TeamManagement from './pages/TeamManagement';
import ProjectChangeList from './pages/ProjectChangeList';
import ProjectChangeDetail from './pages/ProjectChangeDetail';
import ProjectChangeApproval from './pages/ProjectChangeApproval';
import ContractList from './pages/ContractList';
import ContractConfirmationPool from './pages/ContractConfirmationPool';
import ContractLedger from './pages/ContractLedger';
import ContractConfirmationDetail from './pages/ContractConfirmationDetail';
import ContractInventoryList from './pages/ContractInventoryList';
import Workbench from './pages/Workbench';
import PortalAdmin from './pages/portal/PortalAdmin';
import SystemAdmin from './pages/system/SystemAdmin';
import ProjectInventoryList from './pages/ProjectInventoryList';
import ConstructionLogFilling from './pages/ConstructionLogFilling';
import MaintenanceConstructionLog from './pages/MaintenanceConstructionLog';
import OutputValueDailyReport from './pages/OutputValueDailyReport';
import { MOCK_PROJECTS, MOCK_CONTRACTS, MOCK_TEAMS } from './data';
import { Project, Contract, Team } from './types';
import MaterialAdmin from './pages/material/MaterialAdmin';
import IssueManager from './pages/material/IssueManager';
import TransferManager from './pages/material/TransferManager';
import StockInManager from './pages/material/StockInManager';
import StockOutManager from './pages/material/StockOutManager';
import ValuationManager from './pages/material/ValuationManager';
import StockBalance from './pages/material/StockBalance';
import MaterialMaster from './pages/material/MaterialMaster';
import MaterialContractManager from './pages/material/MaterialContractManager';
import MaterialReconciliation from './pages/material/MaterialReconciliation';
import { getMaterialContracts, toContractLike } from './pages/material/materialContractStore';
import EquipmentMovementManager from './pages/equipment/EquipmentMovementManager';
import LedgerManager from './pages/equipment/LedgerManager';
import EquipmentUsage from './pages/equipment/EquipmentUsage';
import EquipmentCost from './pages/equipment/EquipmentCost';
import EquipmentCodeManager from './pages/equipment/EquipmentCodeManager';
import VehicleDailyConsumption from './pages/equipment/VehicleDailyConsumption';
import VehicleYearlyConsumption from './pages/equipment/VehicleYearlyConsumption';
import SubContractConfirmation from './pages/subcontract/SubContractConfirmation';
import SubContractPool from './pages/subcontract/SubContractPool';
import SubContractInventory from './pages/subcontract/SubContractInventory';
import InventoryLinking from './pages/subcontract/InventoryLinking';
import MeasurePool from './pages/measure/MeasurePool';
import MeasureStatementManager from './pages/measure/MeasureStatementManager';
import MeasureApproval from './pages/measure/MeasureApproval';
import MeasureOrderManager from './pages/measure/MeasureOrderManager';
import ReceivableManager from './pages/measure/ReceivableManager';
import PaymentTracking from './pages/measure/PaymentTracking';
import CampaignConfig from './pages/campaign/CampaignConfig';
import CampaignPlan from './pages/campaign/CampaignPlan';
import CampaignDaily from './pages/campaign/CampaignDaily';
import CampaignRank from './pages/campaign/CampaignRank';
import CampaignWeekly from './pages/campaign/CampaignWeekly';
import CampaignSummary from './pages/campaign/CampaignSummary';
import CampaignDashboard from './pages/campaign/CampaignDashboard';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [teams] = useState<Team[]>(MOCK_TEAMS);
  // 采购入库「材料合同」来源可选：收入合同 + 材料管理系统同步的材料合同
  const stockInContracts: Contract[] = useMemo(
    () => [...contracts, ...getMaterialContracts().map(toContractLike)],
    [contracts]);

  const handleSaveProject = (project: Project) => {
    setProjects(prev => {
      const index = prev.findIndex(p => p.id === project.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = project;
        return next;
      }
      return [project, ...prev];
    });
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveContract = (contract: Contract) => {
    setContracts(prev => {
      const index = prev.findIndex(c => c.id === contract.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = contract;
        return next;
      }
      return [contract, ...prev];
    });
  };

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/workbench" replace />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/portal-admin" element={<PortalAdmin />} />
          <Route path="/system-admin" element={<SystemAdmin />} />
          <Route path="/project/list" element={<ProjectList projects={projects} onDelete={handleDeleteProject} />} />
          <Route path="/project/setup" element={<ProjectSetup onSave={handleSaveProject} projects={projects} contracts={contracts} />} />
          <Route path="/project/inventory/list" element={<ProjectInventoryList projects={projects} contracts={contracts} />} />
          <Route path="/project/change" element={<ProjectChangeList />} />
          <Route path="/project/change/detail" element={<ProjectChangeDetail />} />
          <Route path="/project/change/approve" element={<ProjectChangeApproval />} />
          <Route path="/settings/main-line" element={<MainLineSettings />} />
          <Route path="/teams/list" element={<TeamManagement />} />
          <Route path="/contract/list" element={<ContractList />} />
          <Route path="/contract/income/confirmation" element={<ContractConfirmationPool contracts={contracts} onUpdateContracts={setContracts} />} />
          <Route path="/contract/income/ledger" element={<ContractLedger contracts={contracts} projects={projects} />} />
          <Route path="/contract/income/inventory" element={<ContractInventoryList contracts={contracts} projects={projects} />} />
          <Route path="/contract/detail" element={<ContractConfirmationDetail contracts={contracts} projects={projects} onSave={handleSaveContract} />} />
          {/* 合同管理 - 分包合同 */}
          <Route path="/contract/subcontract/confirmation" element={<SubContractConfirmation />} />
          <Route path="/contract/subcontract/pool" element={<SubContractPool />} />
          <Route path="/contract/subcontract/inventory" element={<SubContractInventory />} />
          <Route path="/contract/subcontract/linking" element={<InventoryLinking contracts={contracts.filter(c => c.status === '已确认')} />} />
          <Route path="/progress/construction/log" element={<ConstructionLogFilling />} />
          <Route path="/progress/construction/daily-log" element={<MaintenanceConstructionLog />} />
          <Route path="/progress/value/daily" element={<OutputValueDailyReport />} />
          <Route path="/material-admin" element={<MaterialAdmin projects={projects} contracts={contracts} teams={teams} />} />
          <Route path="/material/issue" element={<IssueManager projects={projects} teams={teams} />} />
          <Route path="/material/transfer" element={<TransferManager />} />
          {/* 入库管理 - 四类入库各自独立路由 */}
          <Route path="/material/stockin/purchase" element={<StockInManager contracts={stockInContracts} projects={projects} fixedType="purchase" />} />
          <Route path="/material/stockin/return" element={<StockInManager contracts={stockInContracts} projects={projects} fixedType="return" />} />
          <Route path="/material/stockin/transfer" element={<StockInManager contracts={stockInContracts} projects={projects} fixedType="transfer" />} />
          <Route path="/material/stockin/other" element={<StockInManager contracts={stockInContracts} projects={projects} fixedType="other" />} />
          {/* 出库管理 - 四类出库各自独立路由 */}
          <Route path="/material/stockout/return" element={<StockOutManager projects={projects} teams={teams} fixedType="return" />} />
          <Route path="/material/stockout/issue" element={<StockOutManager projects={projects} teams={teams} fixedType="issue" />} />
          <Route path="/material/stockout/transfer" element={<StockOutManager projects={projects} teams={teams} fixedType="transfer" />} />
          <Route path="/material/stockout/other" element={<StockOutManager projects={projects} teams={teams} fixedType="other" />} />
          <Route path="/material/valuation" element={<ValuationManager />} />
          <Route path="/material/balance" element={<StockBalance />} />
          <Route path="/material/master" element={<MaterialMaster />} />
          {/* 材料管理 - 材料合同 / 对账 */}
          <Route path="/material/contract" element={<MaterialContractManager />} />
          <Route path="/material/recon" element={<MaterialReconciliation />} />
          {/* 设备管理 - 设备进出场（四类单据各自独立路由） */}
          <Route path="/equipment/movement/own-in" element={<EquipmentMovementManager direction="in" fixedOwnership="owned" />} />
          <Route path="/equipment/movement/lease-in" element={<EquipmentMovementManager direction="in" fixedOwnership="leased" />} />
          <Route path="/equipment/movement/own-out" element={<EquipmentMovementManager direction="out" fixedOwnership="owned" />} />
          <Route path="/equipment/movement/lease-out" element={<EquipmentMovementManager direction="out" fixedOwnership="leased" />} />
          <Route path="/equipment/ledger" element={<LedgerManager />} />
          {/* 设备管理 - 设备使用明细 */}
          <Route path="/equipment/usage/shift" element={<EquipmentUsage />} />
          <Route path="/equipment/usage/cost" element={<EquipmentCost />} />
          <Route path="/equipment/usage/vehicle-daily" element={<VehicleDailyConsumption />} />
          <Route path="/equipment/usage/vehicle-yearly" element={<VehicleYearlyConsumption />} />
          {/* 设备管理 - 设备类型管理 */}
          <Route path="/equipment/code" element={<EquipmentCodeManager />} />
          {/* 计量应收 - 计量业务 */}
          <Route path="/measure/pool" element={<MeasurePool />} />
          <Route path="/measure/statement" element={<MeasureStatementManager />} />
          <Route path="/measure/approval" element={<MeasureApproval />} />
          <Route path="/measure/order" element={<MeasureOrderManager />} />
          {/* 计量应收 - 应收管理 */}
          <Route path="/measure/receivable" element={<ReceivableManager />} />
          <Route path="/measure/payment" element={<PaymentTracking />} />
          {/* 百日攻坚 */}
          <Route path="/campaign/config" element={<CampaignConfig />} />
          <Route path="/campaign/plan" element={<CampaignPlan />} />
          <Route path="/campaign/daily" element={<CampaignDaily />} />
          <Route path="/campaign/rank" element={<CampaignRank />} />
          <Route path="/campaign/weekly" element={<CampaignWeekly />} />
          <Route path="/campaign/summary" element={<CampaignSummary />} />
          <Route path="/campaign/dashboard" element={<CampaignDashboard />} />
          <Route path="*" element={<div className="p-8 text-center text-gray-500">页面开发中...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}
