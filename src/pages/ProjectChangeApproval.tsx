import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';
import { MOCK_CHANGES, MOCK_MAIN_LINES, MOCK_TEAMS } from '@/data';
import { cn } from '@/lib/utils';

export default function ProjectChangeApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changeId = searchParams.get('id');
  const isViewOnly = searchParams.get('mode') === 'view';
  const change = MOCK_CHANGES.find(c => c.id === changeId) || MOCK_CHANGES[0];

  const [activeTab, setActiveTab] = useState('form');
  const [activeSubTab, setActiveSubTab] = useState('basic');

  const TABS = [
    { id: 'form', label: '变更单' },
    { id: 'flow', label: '变更流程图' },
    { id: 'record', label: '变更流程记录' },
  ];

  const SUB_TABS = [
    { id: 'basic', label: '基本信息', key: '基本信息' },
    { id: 'project', label: '项目信息', key: '项目信息' },
    { id: 'section', label: '路段信息', key: '路段信息' },
    { id: 'team', label: '班组信息', key: '班组信息' },
    { id: 'contract', label: '合同信息', key: '合同信息' },
  ].filter(tab => change.changeContents.includes(tab.key));

  const isFieldChanged = (field: string) => {
    const before = (change.beforeData as any)[field];
    const after = (change.afterData as any)[field];
    // Handle arrays or objects if needed, but for now simple comparison
    if (Array.isArray(before) && Array.isArray(after)) {
      return JSON.stringify(before) !== JSON.stringify(after);
    }
    return before !== after;
  };

  const ComparisonField = ({ label, field, type = 'text' }: { label: string, field: string, type?: 'text' | 'select' | 'radio' | 'textarea' | 'date' }) => {
    const beforeValue = (change.beforeData as any)[field];
    const afterValue = (change.afterData as any)[field];
    const changed = isFieldChanged(field);

    const renderValue = (val: any) => {
      if (val === undefined || val === null || val === '') return '请输入';
      if (typeof val === 'boolean') return val ? '已签订' : '未签订';
      return val;
    };

    return (
      <div className="grid grid-cols-2 gap-8">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-28 text-right shrink-0">{label} :</span>
          <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 bg-gray-50 text-sm text-gray-600 min-h-[32px]">
            {renderValue(beforeValue)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-28 text-right shrink-0">{label} :</span>
          <div className={cn(
            "flex-1 border rounded px-3 py-1.5 text-sm min-h-[32px]",
            changed ? "border-red-200 bg-red-50 text-red-500 font-medium" : "border-gray-200 bg-gray-50 text-gray-600"
          )}>
            {renderValue(afterValue)}
          </div>
        </div>
      </div>
    );
  };

  const renderBasicInfoComparison = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <ComparisonField label="项目编号" field="code" />
        <ComparisonField label="项目名称" field="name" />
        <ComparisonField label="项目简称" field="abbr" />
        <ComparisonField label="项目代号" field="projectCode" />
        <ComparisonField label="承接方式" field="undertakeMethod" />
        <ComparisonField label="中标资质" field="qualification" />
        <ComparisonField label="工程性质" field="nature" />
        <ComparisonField label="交竣工类型" field="completionType" />
        <ComparisonField label="管养区域" field="maintenanceArea" />
        <ComparisonField label="管养范围" field="maintenanceScope" />
        <ComparisonField label="工程属性" field="property" />
        <ComparisonField label="是否签订合同" field="contractSigned" />
        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-28 text-right shrink-0">计划开工/完工日期 :</span>
            <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 bg-gray-50 text-sm text-gray-600">
              {change.beforeData.startDate} - {change.beforeData.endDate}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-28 text-right shrink-0">计划开工/完工日期 :</span>
            <div className={cn(
              "flex-1 border rounded px-3 py-1.5 text-sm",
              (isFieldChanged('startDate') || isFieldChanged('endDate')) ? "border-red-200 bg-red-50 text-red-500 font-medium" : "border-gray-200 bg-gray-50 text-gray-600"
            )}>
              {change.afterData.startDate} - {change.afterData.endDate}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-start gap-2">
            <span className="text-gray-500 w-28 text-right shrink-0 mt-1.5">项目概况 :</span>
            <div className="flex-1 border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm text-gray-600 min-h-[80px]">
              {change.beforeData.summary || '请输入文本'}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-500 w-28 text-right shrink-0 mt-1.5">项目概况 :</span>
            <div className={cn(
              "flex-1 border rounded px-3 py-2 text-sm min-h-[80px]",
              isFieldChanged('summary') ? "border-red-200 bg-red-50 text-red-500 font-medium" : "border-gray-200 bg-gray-50 text-gray-600"
            )}>
              {change.afterData.summary || '请输入文本'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeamComparison = () => {
    const beforeTeams = MOCK_TEAMS.filter(t => change.beforeData.teams?.includes(t.id));
    const afterTeams = MOCK_TEAMS.filter(t => change.afterData.teams?.includes(t.id));
    const isTeamsChanged = isFieldChanged('teams');

    return (
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <table className="w-full text-xs text-left border-collapse border border-gray-200">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-2 py-2 border border-gray-200">班组名称</th>
                <th className="px-2 py-2 border border-gray-200">班组长</th>
                <th className="px-2 py-2 border border-gray-200">带班技术员</th>
                <th className="px-2 py-2 border border-gray-200">属性</th>
              </tr>
            </thead>
            <tbody>
              {beforeTeams.length > 0 ? beforeTeams.map(team => (
                <tr key={team.id}>
                  <td className="px-2 py-2 border border-gray-200">{team.name}</td>
                  <td className="px-2 py-2 border border-gray-200">{team.leader}</td>
                  <td className="px-2 py-2 border border-gray-200">xxx</td>
                  <td className="px-2 py-2 border border-gray-200">{team.type}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-gray-400">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-2">
          <table className={cn(
            "w-full text-xs text-left border-collapse border",
            isTeamsChanged ? "border-red-200" : "border-gray-200"
          )}>
            <thead className={cn("text-gray-500", isTeamsChanged ? "bg-red-50" : "bg-gray-50")}>
              <tr>
                <th className="px-2 py-2 border border-inherit">班组名称</th>
                <th className="px-2 py-2 border border-inherit">班组长</th>
                <th className="px-2 py-2 border border-inherit">带班技术员</th>
                <th className="px-2 py-2 border border-inherit">属性</th>
              </tr>
            </thead>
            <tbody className={cn(isTeamsChanged && "text-red-500 font-medium")}>
              {afterTeams.length > 0 ? afterTeams.map(team => (
                <tr key={team.id}>
                  <td className="px-2 py-2 border border-inherit">{team.name}</td>
                  <td className="px-2 py-2 border border-inherit">{team.leader}</td>
                  <td className="px-2 py-2 border border-inherit">xxx</td>
                  <td className="px-2 py-2 border border-inherit">{team.type}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-gray-400">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProjectInfoComparison = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <ComparisonField label="建设单位" field="client" />
        <ComparisonField label="设计单位" field="designer" />
        <ComparisonField label="监理单位" field="supervisor" />
        <ComparisonField label="施工单位" field="contractor" />
        <ComparisonField label="项目负责人" field="manager" />
        <ComparisonField label="联系电话" field="phone" />
      </div>
    </div>
  );

  const renderContractInfoComparison = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <ComparisonField label="合同编号" field="contractNo" />
        <ComparisonField label="合同名称" field="contractName" />
        <ComparisonField label="合同金额(万元)" field="contractAmount" />
        <ComparisonField label="合同类型" field="contractType" />
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded"></div>
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 w-24 text-right shrink-0"><span className="text-red-500">*</span> 变更项目 :</span>
            <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 bg-gray-50 text-gray-400">
              {change.projectName}
            </div>
            <button className="text-blue-600 shrink-0">选择</button>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-24 text-right shrink-0"><span className="text-red-500">*</span> 变更内容 :</span>
            <div className="flex flex-wrap gap-4 pt-1.5">
              {['基本信息', '项目信息', '路段信息', '班组信息', '合同信息'].map(content => (
                <label key={content} className="flex items-center gap-2 text-sm opacity-70">
                  <input 
                    type="checkbox" 
                    checked={change.changeContents.includes(content)}
                    readOnly
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {content}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-2">
            <span className="text-gray-500 w-24 text-right shrink-0">变更原因 :</span>
            <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 bg-gray-50 text-gray-400 min-h-[32px]">
              {change.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Content */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-4">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "px-6 py-3 text-sm transition-colors relative",
                activeSubTab === tab.id ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"
              )}
            >
              <div className="flex items-center gap-2">
                {activeSubTab === tab.id && <div className="w-1 h-3 bg-blue-600 rounded"></div>}
                {tab.label}
              </div>
              {activeSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
            </button>
          ))}
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-4 px-8">
            <span className="text-sm font-bold text-gray-600">变更前</span>
            <span className="text-sm font-bold text-gray-600">变更后</span>
          </div>
          
          {activeSubTab === 'basic' && renderBasicInfoComparison()}
          {activeSubTab === 'project' && renderProjectInfoComparison()}
          {activeSubTab === 'team' && renderTeamComparison()}
          {activeSubTab === 'contract' && renderContractInfoComparison()}
          {activeSubTab === 'section' && <div className="p-12 text-center text-gray-400">路段信息对比加载中...</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#f0f2f5] w-full max-w-7xl h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="text-base font-bold">项目变更</h2>
          <button onClick={() => navigate('/project/change')} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        
        <div className="bg-white px-4 border-b border-gray-200 shrink-0">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-3 text-sm transition-colors relative",
                  activeTab === tab.id ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"
                )}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'form' && renderComparison()}
          {activeTab === 'flow' && <div className="p-8 text-center text-gray-400">流程图加载中...</div>}
          {activeTab === 'record' && <div className="p-8 text-center text-gray-400">流程记录加载中...</div>}
        </div>

        <div className="bg-white p-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          <button onClick={() => navigate('/project/change')} className="px-6 py-1.5 border rounded text-sm hover:bg-gray-50">取消</button>
          {!isViewOnly && (
            <button className="px-8 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm">
              审批
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
