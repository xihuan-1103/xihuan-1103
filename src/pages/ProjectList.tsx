import React, { useState } from 'react';
import { Search, RotateCcw, Plus, ChevronDown, ChevronUp, Edit, Trash2, Eye } from 'lucide-react';
import { MOCK_PROJECTS } from '@/data';
import { Project, ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  '草稿': 'bg-gray-100 text-gray-600 border-gray-200',
  '立项审批': 'bg-blue-100 text-blue-600 border-blue-200',
  '立项驳回': 'bg-orange-100 text-orange-600 border-orange-200',
  '已立项': 'bg-yellow-100 text-yellow-600 border-yellow-200',
  '在建': 'bg-cyan-100 text-cyan-600 border-cyan-200',
  '验收中': 'bg-purple-100 text-purple-600 border-purple-200',
  '完工归档': 'bg-green-100 text-green-600 border-green-200',
  '终止': 'bg-red-100 text-red-600 border-red-200',
};

export default function ProjectList({ projects, onDelete }: { projects: Project[], onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchForm, setSearchForm] = useState({
    name: '',
    code: '',
    type: '',
    dept: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const filteredProjects = projects.filter(p => {
    const matchName = !searchForm.name || p.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || p.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchType = !searchForm.type || p.type === searchForm.type;
    const matchStatus = !searchForm.status || p.status === searchForm.status;
    return matchName && matchCode && matchType && matchStatus;
  });

  const handleReset = () => {
    setSearchForm({
      name: '',
      code: '',
      type: '',
      dept: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Search Section matching CICO enterprise card style */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">项目名称:</label>
            <input 
              type="text" 
              placeholder="请输入项目名称" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.name}
              onChange={e => setSearchForm({...searchForm, name: e.target.value})}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">项目编号:</label>
            <input 
              type="text" 
              placeholder="请输入项目编号" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.code}
              onChange={e => setSearchForm({...searchForm, code: e.target.value})}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">项目类型:</label>
            <select 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.type}
              onChange={e => setSearchForm({...searchForm, type: e.target.value})}
            >
              <option value="">请选择项目类型</option>
              <option value="日常养护">日常养护</option>
              <option value="专项养护">专项养护</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">项目状态:</label>
            <select 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.status}
              onChange={e => setSearchForm({...searchForm, status: e.target.value})}
            >
              <option value="">请选择状态</option>
              {Object.keys(STATUS_COLORS).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {showMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">实施项目部:</label>
              <select 
                className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]"
                value={searchForm.dept}
                onChange={e => setSearchForm({...searchForm, dept: e.target.value})}
              >
                <option value="">请选择项目部</option>
                <option value="项目部一">项目部一</option>
                <option value="项目部二">项目部二</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">开工日期:</label>
              <input 
                type="date" 
                className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]" 
                value={searchForm.startDate}
                onChange={e => setSearchForm({...searchForm, startDate: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">完工日期:</label>
              <input 
                type="date" 
                className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]" 
                value={searchForm.endDate}
                onChange={e => setSearchForm({...searchForm, endDate: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="text-[#165DFF] text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            {showMore ? '收起更多筛选项' : '展开更多筛选项'} {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <div className="flex items-center gap-2.5">
            <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer">
              <Search size={14} /> 查询
            </button>
            <button 
              onClick={handleReset}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={14} /> 重置
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <button 
            onClick={() => navigate('/project/setup')}
            className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer"
          >
            <Plus size={14} /> 项目立项申请
          </button>
          <div className="text-xs text-slate-500 font-medium">
            当前项目共 <strong className="text-slate-800 font-mono">{filteredProjects.length}</strong> 个
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[200px]">项目名称</th>
                <th className="px-3.5 py-3 font-mono">项目编号</th>
                <th className="px-3.5 py-3">中标资质</th>
                <th className="px-3.5 py-3 text-center">是否签合同</th>
                <th className="px-3.5 py-3">项目类型</th>
                <th className="px-3.5 py-3">实施项目部</th>
                <th className="px-3.5 py-3">核算组织</th>
                <th className="px-3.5 py-3 font-mono">工期时间跨度</th>
                <th className="px-3.5 py-3 text-center">项目状态</th>
                <th className="px-4 py-3 sticky right-0 bg-[#FAFBFD] text-center shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredProjects.map((project, index) => (
                <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{index + 1}</td>
                  <td 
                    onClick={() => navigate(`/project/setup?id=${project.id}&mode=view`)}
                    className="px-4 py-3 font-bold text-slate-800 group-hover:text-[#165DFF] cursor-pointer transition-colors"
                  >
                    {project.name}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-slate-600 font-medium">{project.code}</td>
                  <td className="px-3.5 py-3 text-slate-600">沪杭甬养护资质</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      project.contractSigned ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500"
                    )}>
                      {project.contractSigned ? '已签' : '待签'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{project.type}</td>
                  <td className="px-3.5 py-3 text-slate-600">{project.dept}</td>
                  <td className="px-3.5 py-3 text-slate-600">{project.org}</td>
                  <td className="px-3.5 py-3 font-mono text-slate-500">{project.startDate} ~ {project.endDate}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded text-[11px] font-bold border",
                      STATUS_COLORS[project.status]
                    )}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-[#f3f7ff] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)] text-center">
                    <div className="flex items-center justify-center gap-2 text-[#165DFF] font-bold text-xs">
                      <button 
                        onClick={() => navigate(`/project/setup?id=${project.id}&mode=view`)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye size={14} /> 查看
                      </button>
                      {(project.status === '草稿' || project.status === '立项驳回') && (
                        <>
                          <button 
                            onClick={() => navigate(`/project/setup?id=${project.id}`)}
                            className="hover:underline flex items-center gap-0.5"
                          >
                            <Edit size={14} /> 编辑
                          </button>
                          <button 
                            onClick={() => setDeleteId(project.id)}
                            className="text-red-500 hover:underline flex items-center gap-0.5"
                          >
                            <Trash2 size={14} /> 删除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>总共 {filteredProjects.length} 条</span>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-100 rounded border border-gray-200 disabled:opacity-50">上一页</button>
            <span className="px-2 py-1 bg-blue-600 text-white rounded">1</span>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">2</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">3</button>
            <button className="p-1 hover:bg-gray-100 rounded border border-gray-200">下一页</button>
            <select className="border border-gray-300 rounded px-1 py-1 ml-2">
              <option>10条/页</option>
              <option>20条/页</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
            <h3 className="text-lg font-bold mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除该项目吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  onDelete(deleteId);
                  setDeleteId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
