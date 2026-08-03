import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { MOCK_PROJECTS, MOCK_CHANGES, MOCK_MAIN_LINES, MOCK_TEAMS } from '@/data';
import { Project, ProjectChange } from '@/types';
import { cn } from '@/lib/utils';

export default function ProjectChangeDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changeId = searchParams.get('id');
  
  const [activeTab, setActiveTab] = useState('form');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [changeContents, setChangeContents] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('basic');

  const selectedProject = MOCK_PROJECTS.find(p => p.id === selectedProjectId);
  const isContractSigned = selectedProject?.contractSigned || false;

  useEffect(() => {
    if (changeId) {
      const change = MOCK_CHANGES.find(c => c.id === changeId);
      if (change) {
        setSelectedProjectId(change.projectId);
        setChangeContents(change.changeContents);
        setReason(change.reason);
      }
    }
  }, [changeId]);

  const TABS = [
    { id: 'form', label: '变更单' },
    { id: 'flow', label: '变更流程图' },
    { id: 'desc', label: '变更流程说明' },
  ];

  const SUB_TABS = [
    { id: 'basic', label: '基本信息', key: '基本信息' },
    { id: 'project', label: '项目信息', key: '项目信息' },
    { id: 'section', label: '路段信息', key: '路段信息' },
    { id: 'team', label: '班组信息', key: '班组信息' },
    { id: 'contract', label: '合同信息', key: '合同信息' },
  ].filter(tab => changeContents.includes(tab.key));

  const handleContentToggle = (content: string) => {
    if (content === '合同信息' && !isContractSigned) return;
    setChangeContents(prev => 
      prev.includes(content) ? prev.filter(c => c !== content) : [...prev, content]
    );
  };

  const renderForm = () => (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded"></div>
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500"><span className="text-red-500">*</span> 变更项目</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
              >
                <option value="">请选择变更项目</option>
                {MOCK_PROJECTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button className="text-blue-600 text-sm hover:underline">选择</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500"><span className="text-red-500">*</span> 变更内容</label>
            <div className="flex flex-wrap gap-4 pt-1.5">
              {['基本信息', '项目信息', '路段信息', '班组信息', '合同信息'].map(content => (
                <label key={content} className={cn(
                  "flex items-center gap-2 text-sm cursor-pointer",
                  content === '合同信息' && !isContractSigned ? "opacity-50 cursor-not-allowed" : ""
                )}>
                  <input 
                    type="checkbox" 
                    checked={changeContents.includes(content)}
                    onChange={() => handleContentToggle(content)}
                    disabled={content === '合同信息' && !isContractSigned}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {content}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-gray-500">变更原因</label>
            <textarea 
              placeholder="请输入变更原因" 
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 focus:outline-none focus:border-blue-500"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Content Section */}
      {changeContents.length > 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            {SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "px-6 py-3 text-sm transition-colors relative",
                  activeSubTab === tab.id ? "text-blue-600 font-medium bg-white" : "text-gray-600 hover:text-blue-600"
                )}
              >
                {tab.label}
                {activeSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeSubTab === 'basic' && (
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500"><span className="text-red-500">*</span> 项目编号</label>
                  <input type="text" defaultValue={selectedProject?.code} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500"><span className="text-red-500">*</span> 项目名称</label>
                  <input type="text" defaultValue={selectedProject?.name} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">项目简称</label>
                  <input type="text" defaultValue={selectedProject?.abbr} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">项目代号</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
              </div>
            )}
            {activeSubTab === 'section' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
                    <Plus size={16} /> 新增
                  </button>
                </div>
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                      <tr>
                        <th className="px-4 py-2 border-b">序号</th>
                        <th className="px-4 py-2 border-b">路线名称</th>
                        <th className="px-4 py-2 border-b">路线简称</th>
                        <th className="px-4 py-2 border-b">起始桩号</th>
                        <th className="px-4 py-2 border-b">结束桩号</th>
                        <th className="px-4 py-2 border-b">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_MAIN_LINES.map((line, index) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2 border-b">{index + 1}</td>
                          <td className="px-4 py-2 border-b">{line.name}</td>
                          <td className="px-4 py-2 border-b">{line.abbr}</td>
                          <td className="px-4 py-2 border-b">{line.startStake}</td>
                          <td className="px-4 py-2 border-b">{line.endStake}</td>
                          <td className="px-4 py-2 border-b">
                            <button className="text-red-500 hover:underline">删除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeSubTab === 'team' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
                    <Plus size={16} /> 新增
                  </button>
                </div>
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                      <tr>
                        <th className="px-4 py-2 border-b">序号</th>
                        <th className="px-4 py-2 border-b">班组名称</th>
                        <th className="px-4 py-2 border-b">班组长</th>
                        <th className="px-4 py-2 border-b">带班技术员</th>
                        <th className="px-4 py-2 border-b">属性</th>
                        <th className="px-4 py-2 border-b">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TEAMS.map((team, index) => (
                        <tr key={team.id}>
                          <td className="px-4 py-2 border-b">{index + 1}</td>
                          <td className="px-4 py-2 border-b">{team.name}</td>
                          <td className="px-4 py-2 border-b">{team.leader}</td>
                          <td className="px-4 py-2 border-b">xxx</td>
                          <td className="px-4 py-2 border-b">{team.type}</td>
                          <td className="px-4 py-2 border-b">
                            <button className="text-red-500 hover:underline">删除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderFlow = () => (
    <div className="bg-white p-12 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-8">
        <div className="w-32 h-12 border-2 border-blue-600 rounded flex items-center justify-center text-sm font-medium bg-blue-50">开始</div>
        <div className="w-0.5 h-8 bg-gray-300"></div>
        <div className="w-48 h-12 border-2 border-blue-600 rounded flex items-center justify-center text-sm font-medium bg-blue-50 relative">
          建立或修改项目
          <div className="absolute -right-32 text-xs text-gray-400">项目创建人</div>
        </div>
        <div className="w-0.5 h-8 bg-gray-300"></div>
        <div className="w-48 h-12 border-2 border-blue-600 rounded flex items-center justify-center text-sm font-medium bg-blue-50 relative">
          提交审核
          <div className="absolute -right-32 text-xs text-gray-400">项目创建人</div>
        </div>
        <div className="w-0.5 h-8 bg-gray-300"></div>
        <div className="flex gap-12">
          <div className="flex flex-col items-center">
            <div className="w-48 h-12 border-2 border-orange-400 rounded flex items-center justify-center text-sm font-medium bg-orange-50 relative">
              经办科室长审核
              <div className="absolute -right-32 text-xs text-gray-400">经办科室长</div>
            </div>
            <div className="w-0.5 h-8 bg-gray-300"></div>
            <div className="w-48 h-12 border-2 border-orange-400 rounded flex items-center justify-center text-sm font-medium bg-orange-50 relative">
              总工/副经理审核
              <div className="absolute -right-32 text-xs text-gray-400">总工/副经理</div>
            </div>
            <div className="w-0.5 h-8 bg-gray-300"></div>
            <div className="w-48 h-12 border-2 border-orange-400 rounded flex items-center justify-center text-sm font-medium bg-orange-50 relative">
              项目经理审核
              <div className="absolute -right-32 text-xs text-gray-400">项目经理</div>
            </div>
          </div>
        </div>
        <div className="w-0.5 h-8 bg-gray-300"></div>
        <div className="w-32 h-12 border-2 border-green-600 rounded flex items-center justify-center text-sm font-medium bg-green-50">完结</div>
      </div>
    </div>
  );

  const renderDesc = () => (
    <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
      <table className="w-full text-sm text-left border-collapse border border-gray-200">
        <thead className="bg-gray-50 text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-3 border border-gray-200">序号</th>
            <th className="px-4 py-3 border border-gray-200">业务活动</th>
            <th className="px-4 py-3 border border-gray-200">业务处理说明</th>
            <th className="px-4 py-3 border border-gray-200">业务角色</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-3 border border-gray-200">010</td>
            <td className="px-4 py-3 border border-gray-200">建立或修改项目</td>
            <td className="px-4 py-3 border border-gray-200">技术员创建或修改项目，填写项目信息</td>
            <td className="px-4 py-3 border border-gray-200">项目创建</td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-200">020</td>
            <td className="px-4 py-3 border border-gray-200">提交审核</td>
            <td className="px-4 py-3 border border-gray-200">填写/修改完毕后提交审核</td>
            <td className="px-4 py-3 border border-gray-200">项目创建</td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-200">030</td>
            <td className="px-4 py-3 border border-gray-200">审核</td>
            <td className="px-4 py-3 border border-gray-200">审核项目信息是否正确。正确-流转下一节点；错误-返回创建人</td>
            <td className="px-4 py-3 border border-gray-200">经办科室长</td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-200">040</td>
            <td className="px-4 py-3 border border-gray-200">审核</td>
            <td className="px-4 py-3 border border-gray-200">审核项目信息是否正确。正确-流转下一节点；错误-返回创建人</td>
            <td className="px-4 py-3 border border-gray-200">总工/副经理</td>
          </tr>
          <tr>
            <td className="px-4 py-3 border border-gray-200">050</td>
            <td className="px-4 py-3 border border-gray-200">审核</td>
            <td className="px-4 py-3 border border-gray-200">审核项目信息是否正确。正确-流转下一节点；错误-返回创建人</td>
            <td className="px-4 py-3 border border-gray-200">项目经理</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white rounded shadow-sm border border-gray-200 shrink-0">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">项目变更</h2>
          <button onClick={() => navigate('/project/change')} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex px-4">
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

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'form' && renderForm()}
        {activeTab === 'flow' && renderFlow()}
        {activeTab === 'desc' && renderDesc()}
      </div>

      <div className="bg-white p-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">
        <button onClick={() => navigate('/project/change')} className="px-6 py-1.5 border rounded text-sm hover:bg-gray-50">取消</button>
        <button className="px-6 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">提交变更</button>
      </div>
    </div>
  );
}
