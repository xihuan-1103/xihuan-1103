/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
import WorkCenter from './pages/WorkCenter';
import ProjectInventoryList from './pages/ProjectInventoryList';
import ConstructionLogFilling from './pages/ConstructionLogFilling';
import MaintenanceConstructionLog from './pages/MaintenanceConstructionLog';
import OutputValueDailyReport from './pages/OutputValueDailyReport';
import { MOCK_PROJECTS, MOCK_CONTRACTS } from './data';
import { Project, Contract } from './types';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);

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
          <Route path="/workcenter" element={<WorkCenter />} />
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
          <Route path="/progress/construction/log" element={<ConstructionLogFilling />} />
          <Route path="/progress/construction/daily-log" element={<MaintenanceConstructionLog />} />
          <Route path="/progress/value/daily" element={<OutputValueDailyReport />} />
          <Route path="*" element={<div className="p-8 text-center text-gray-500">页面开发中...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}
