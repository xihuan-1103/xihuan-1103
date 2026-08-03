import React, { useState } from 'react';
import { Search, RotateCcw, Plus, Edit, Trash2, Eye, RefreshCw, X } from 'lucide-react';
import { MOCK_TEAMS } from '@/data';
import { cn } from '@/lib/utils';

export default function TeamManagement() {
  const [activeTeamId, setActiveTeamId] = useState(MOCK_TEAMS[0].id);
  const [activeTab, setActiveTab] = useState('personnel');
  const [showTypeModal, setShowTypeModal] = useState(false);

  const activeTeam = MOCK_TEAMS.find(t => t.id === activeTeamId) || MOCK_TEAMS[0];

  const TABS = [
    { id: 'personnel', label: '人员信息' },
    { id: 'project', label: '关联项目' },
    { id: 'contract', label: '关联合同' },
  ];

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar: Team List */}
      <div className="w-64 bg-white rounded shadow-sm border border-gray-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-100 flex flex-col gap-2">
          <h3 className="font-bold text-sm">班组维护</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="请输入班组名称搜索" 
              className="w-full border border-gray-300 rounded px-8 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-2 top-2 text-gray-400" size={14} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {MOCK_TEAMS.map(team => (
            <button
              key={team.id}
              onClick={() => setActiveTeamId(team.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                activeTeamId === team.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {team.name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2">
          <button className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1">
            维护班组信息
          </button>
          <button className="flex-1 bg-blue-500 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1">
            <RefreshCw size={12} /> 数据同步
          </button>
        </div>
      </div>

      {/* Right Content: Team Details */}
      <div className="flex-1 bg-white rounded shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Team Header Info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-bold">基本信息</h2>
            <div className="flex gap-2">
              <button className="text-blue-600 text-sm hover:underline">编辑</button>
              <button className="text-red-500 text-sm hover:underline">删除</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-y-4 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">班组名称:</span>
              <span className="font-medium">{activeTeam.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">排序:</span>
              <span className="font-medium">1</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">班组长姓名:</span>
              <span className="font-medium">{activeTeam.leader}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">班组长电话:</span>
              <span className="font-medium">{activeTeam.phone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">班组类型:</span>
              <button 
                onClick={() => setShowTypeModal(true)}
                className="text-blue-600 hover:underline"
              >
                {activeTeam.type || '请选择'}
              </button>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-24 text-right">状态:</span>
              <span className="text-green-600 font-medium">{activeTeam.status}</span>
            </div>
            <div className="col-span-3 flex gap-2">
              <span className="text-gray-500 w-24 text-right shrink-0">备注:</span>
              <span className="text-gray-600">{activeTeam.remark || '这里是班组的描述11111'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personnel' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1">维护人员信息</button>
                  <button className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1">数据同步</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 border-b">序号</th>
                      <th className="px-4 py-2 border-b">人员姓名</th>
                      <th className="px-4 py-2 border-b">工种</th>
                      <th className="px-4 py-2 border-b">身份证</th>
                      <th className="px-4 py-2 border-b">年龄</th>
                      <th className="px-4 py-2 border-b">性别</th>
                      <th className="px-4 py-2 border-b">在岗状态</th>
                      <th className="px-4 py-2 border-b">进场时间</th>
                      <th className="px-4 py-2 border-b">退场时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTeam.members.map((member, index) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b">{index + 1}</td>
                        <td className="px-4 py-2 border-b">{member.name}</td>
                        <td className="px-4 py-2 border-b">{member.role}</td>
                        <td className="px-4 py-2 border-b">{member.idCard}</td>
                        <td className="px-4 py-2 border-b">{member.age}</td>
                        <td className="px-4 py-2 border-b">{member.gender}</td>
                        <td className="px-4 py-2 border-b">
                          <span className="text-green-600">{member.status}</span>
                        </td>
                        <td className="px-4 py-2 border-b">{member.joinDate}</td>
                        <td className="px-4 py-2 border-b">{member.leaveDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'project' && (
             <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 border-b">序号</th>
                      <th className="px-4 py-2 border-b">项目名称</th>
                      <th className="px-4 py-2 border-b">项目编号</th>
                      <th className="px-4 py-2 border-b">项目简称</th>
                      <th className="px-4 py-2 border-b">实施项目部</th>
                      <th className="px-4 py-2 border-b">项目类型</th>
                      <th className="px-4 py-2 border-b">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">1</td>
                      <td className="px-4 py-2 border-b">永蓝边坡应急</td>
                      <td className="px-4 py-2 border-b">RCYH-001</td>
                      <td className="px-4 py-2 border-b">永蓝边坡</td>
                      <td className="px-4 py-2 border-b">项目部一</td>
                      <td className="px-4 py-2 border-b">高速日常养护</td>
                      <td className="px-4 py-2 border-b">在建</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          )}
          {activeTab === 'contract' && (
             <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 border-b">序号</th>
                      <th className="px-4 py-2 border-b">合同名称</th>
                      <th className="px-4 py-2 border-b">合同编号</th>
                      <th className="px-4 py-2 border-b">合同类型</th>
                      <th className="px-4 py-2 border-b">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">1</td>
                      <td className="px-4 py-2 border-b">永蓝边坡应急合同</td>
                      <td className="px-4 py-2 border-b">YH01-01</td>
                      <td className="px-4 py-2 border-b">简易</td>
                      <td className="px-4 py-2 border-b">在建</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          )}
        </div>
      </div>

      {/* Team Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold">班组类型</h3>
              <button onClick={() => setShowTypeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-600"><span className="text-red-500">*</span> 班组类型</label>
                <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                  <option>自有</option>
                  <option>分包</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowTypeModal(false)} className="px-6 py-1.5 border rounded text-sm">取消</button>
              <button onClick={() => setShowTypeModal(false)} className="px-6 py-1.5 bg-blue-600 text-white rounded text-sm">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
