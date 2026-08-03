import React, { useState } from 'react';
import { Search, RotateCcw, Plus, Edit, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CHANGES } from '@/data';
import { ProjectChange, ChangeStatus } from '@/types';
import { cn } from '@/lib/utils';

export default function ProjectChangeList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    projectName: '',
    startTime: '',
    endTime: '',
    status: [] as ChangeStatus[],
  });

  const getStatusColor = (status: ChangeStatus) => {
    switch (status) {
      case '草稿': return 'bg-gray-100 text-gray-600';
      case '审批中': return 'bg-blue-100 text-blue-600';
      case '审批驳回': return 'bg-red-100 text-red-600';
      case '已变更': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">项目名称</label>
            <input 
              type="text" 
              placeholder="请输入" 
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              value={searchParams.projectName}
              onChange={e => setSearchParams({...searchParams, projectName: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">变更时间</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={searchParams.startTime}
                onChange={e => setSearchParams({...searchParams, startTime: e.target.value})}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={searchParams.endTime}
                onChange={e => setSearchParams({...searchParams, endTime: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">变更状态</label>
            <select 
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              onChange={e => setSearchParams({...searchParams, status: [e.target.value as ChangeStatus]})}
            >
              <option value="">全部</option>
              <option value="草稿">草稿</option>
              <option value="审批中">审批中</option>
              <option value="审批驳回">审批驳回</option>
              <option value="已变更">已变更</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700">
              <Search size={14} /> 查询
            </button>
            <button className="border border-gray-300 px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-50">
              <RotateCcw size={14} /> 重置
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/project/change/detail')}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
        >
          <Plus size={16} /> 发起变更
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-3 border-b">序号</th>
              <th className="px-4 py-3 border-b">变更单号</th>
              <th className="px-4 py-3 border-b">项目名称</th>
              <th className="px-4 py-3 border-b">项目编号</th>
              <th className="px-4 py-3 border-b">发起人</th>
              <th className="px-4 py-3 border-b">发起时间</th>
              <th className="px-4 py-3 border-b">变更状态</th>
              <th className="px-4 py-3 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CHANGES.map((change, index) => (
              <tr key={change.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-b">{index + 1}</td>
                <td className="px-4 py-3 border-b text-blue-600 cursor-pointer hover:underline">
                  {change.status === '草稿' ? '-' : change.changeNo}
                </td>
                <td className="px-4 py-3 border-b">{change.projectName}</td>
                <td className="px-4 py-3 border-b">{change.projectCode}</td>
                <td className="px-4 py-3 border-b">{change.initiator}</td>
                <td className="px-4 py-3 border-b">{change.status === '草稿' ? '-' : change.initiationTime}</td>
                <td className="px-4 py-3 border-b">
                  <span className={cn("px-2 py-0.5 rounded text-xs", getStatusColor(change.status))}>
                    {change.status}
                  </span>
                </td>
                <td className="px-4 py-3 border-b">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => navigate(`/project/change/approve?id=${change.id}&mode=view`)}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Eye size={14} /> 查看
                    </button>
                    {(change.status === '草稿' || change.status === '审批驳回') && (
                      <>
                        <button className="text-blue-600 hover:underline flex items-center gap-1">
                          <Edit size={14} /> 编辑
                        </button>
                        <button className="text-red-500 hover:underline flex items-center gap-1">
                          <Trash2 size={14} /> 删除
                        </button>
                      </>
                    )}
                    {change.status === '审批中' && (
                       <button 
                        onClick={() => navigate(`/project/change/approve?id=${change.id}`)}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                       >
                         审批
                       </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>总共 {MOCK_CHANGES.length} 条</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>上一页</button>
            <button className="px-2 py-1 bg-blue-600 text-white rounded">1</button>
            <button className="px-2 py-1 border rounded hover:bg-gray-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
