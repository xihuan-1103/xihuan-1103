import React, { useState } from 'react';
import { Search, RotateCcw, Eye, FileText, Download, ListChecks } from 'lucide-react';
import { MOCK_CONTRACTS } from '@/data';
import { Contract, Project } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  contracts: Contract[];
  projects: Project[];
}

export default function ContractLedger({ contracts, projects }: Props) {
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    name: '',
    code: '',
    type: '',
  });

  const confirmedContracts = contracts.filter(c => c.status === '已确认');

  const filteredContracts = confirmedContracts.filter(c => {
    const matchName = !searchForm.name || c.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || c.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchType = !searchForm.type || c.type === searchForm.type;
    return matchName && matchCode && matchType;
  });

  return (
    <div className="space-y-4 font-sans text-slate-800">
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同名称:</label>
            <input 
              type="text" 
              placeholder="请输入关键词" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.name}
              onChange={e => setSearchForm({ ...searchForm, name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同编号:</label>
            <input 
              type="text" 
              placeholder="请输入合同编号" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.code}
              onChange={e => setSearchForm({ ...searchForm, code: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同类型:</label>
            <select 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.type}
              onChange={e => setSearchForm({ ...searchForm, type: e.target.value })}
            >
              <option value="">全部类型</option>
              <option value="结算类合同">结算类合同</option>
              <option value="养护合同">养护合同</option>
              <option value="施工（总）承包">施工（总）承包</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer">
            <Search size={14} /> 查询
          </button>
          <button 
            onClick={() => setSearchForm({ name: '', code: '', type: '' })}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#165DFF] rounded-full"></div>
            <h3 className="font-bold text-sm text-slate-800">收入合同台账</h3>
          </div>
          <button className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <Download size={14} /> 导出
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[200px]">合同名称</th>
                <th className="px-3.5 py-3 font-mono">合同编号</th>
                <th className="px-4 py-3 text-right font-mono">合同金额/元</th>
                <th className="px-3.5 py-3">已关联项目</th>
                <th className="px-3.5 py-3 text-center">合同来源</th>
                <th className="px-3.5 py-3">甲方</th>
                <th className="px-3.5 py-3">乙方</th>
                <th className="px-3.5 py-3">合同类型</th>
                <th className="px-3.5 py-3 text-center font-mono">确认时间</th>
                <th className="px-4 py-3 sticky right-0 bg-[#FAFBFD] text-center shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredContracts.map((contract, index) => (
                <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{index + 1}</td>
                  <td 
                    onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=view`)}
                    className="px-4 py-3 font-bold text-slate-800 group-hover:text-[#165DFF] cursor-pointer transition-colors"
                  >
                    {contract.name}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-slate-600 font-medium">{contract.code}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">¥{contract.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3.5 py-3 text-slate-600">
                    {projects
                      .filter(p => p.contractId === contract.id)
                      .map(p => p.name)
                      .join('、') || <span className="text-slate-350 italic">未关联</span>}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center border",
                      contract.source === '系统同步' ? "bg-blue-50 text-[#165DFF] border-blue-200" : "bg-purple-50 text-purple-600 border-purple-200"
                    )}>
                      {contract.source}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{contract.partyA}</td>
                  <td className="px-3.5 py-3 text-slate-600">{contract.partyB}</td>
                  <td className="px-3.5 py-3 text-slate-600">{contract.type}</td>
                  <td className="px-3.5 py-3 text-center font-mono text-slate-500">2024-03-25</td>
                  <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-[#f3f7ff] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)] text-center">
                    <div className="flex items-center justify-center gap-2.5 text-[#165DFF] font-bold text-xs">
                      <button 
                        onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=view`)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye size={13} /> 查看
                      </button>
                      {contract.source === '系统同步' && (
                        <button 
                          onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=edit`)}
                          className="hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <FileText size={13} /> 修改补充
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=view&tab=maintenance`)}
                        className="hover:underline flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        title="维护合同下的多份工程或日常养护清单"
                      >
                        <ListChecks size={13} /> 维护清单
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
