import React, { useState } from 'react';
import { Search, RotateCcw, Eye, CheckCircle, Undo2, Share2, X, Clock } from 'lucide-react';
import { MOCK_CONTRACTS, MOCK_CONTRACT_OPERATIONS } from '@/data';
import { Contract, ContractOperation } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  contracts: Contract[];
  onUpdateContracts: (contracts: Contract[]) => void;
}

export default function ContractConfirmationPool({ contracts, onUpdateContracts }: Props) {
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    name: '',
    code: '',
    source: [] as string[],
  });
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [transferOrg, setTransferOrg] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const filteredContracts = contracts.filter(c => {
    const matchName = !searchForm.name || c.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || c.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchSource = searchForm.source.length === 0 || searchForm.source.includes(c.source);
    return matchName && matchCode && matchSource && c.status === '待确认';
  });

  const handleReset = () => {
    setSearchForm({ name: '', code: '', source: [] });
  };

  const handleReturn = (id: string) => {
    onUpdateContracts(contracts.map(c => c.id === id ? { ...c, status: '已退回', returnReason } : c));
    setShowReturnModal(null);
    setReturnReason('');
  };

  const handleTransfer = (id: string) => {
    onUpdateContracts(contracts.map(c => {
      if (c.id === id) {
        const newCount = c.transferCount + 1;
        return { 
          ...c, 
          status: '已转派', 
          transferCount: newCount, 
          isLocked: newCount >= 2,
          targetOrg: transferOrg,
          transferReason
        };
      }
      return c;
    }));
    setShowTransferModal(null);
    setTransferOrg('');
    setTransferReason('');
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Search Section matching unified enterprise card style */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同名称:</label>
            <input 
              type="text" 
              placeholder="请输入合同名称" 
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
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同来源:</label>
            <select 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.source[0] || ''}
              onChange={e => {
                const val = e.target.value;
                setSearchForm({ ...searchForm, source: val ? [val] : [] });
              }}
            >
              <option value="">全部来源</option>
              <option value="系统同步">系统同步</option>
              <option value="协同合同">协同合同</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer">
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

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-2">
            <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer">
              同步合同数据
            </button>
          </div>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="text-[#165DFF] font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
          >
            查看合同操作记录
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[200px]">合同名称</th>
                <th className="px-3.5 py-3 font-mono">合同编号</th>
                <th className="px-4 py-3 text-right font-mono">价税合同金额/元</th>
                <th className="px-3.5 py-3 text-center">财务推送状态</th>
                <th className="px-3.5 py-3">经办机构</th>
                <th className="px-3.5 py-3">合同类型</th>
                <th className="px-3.5 py-3 text-center">合同来源</th>
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
                  <td className="px-3.5 py-3 text-center">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                      {contract.financialStatus}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{contract.agency}</td>
                  <td className="px-3.5 py-3 text-slate-600">{contract.type}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center border",
                      contract.source === '系统同步' ? "bg-blue-50 text-[#165DFF] border-blue-200" : "bg-purple-50 text-purple-600 border-purple-200"
                    )}>
                      {contract.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-[#f3f7ff] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)] text-center">
                    <div className="flex items-center justify-center gap-2 text-[#165DFF] font-bold text-xs">
                      <button 
                        onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=view`)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye size={13} /> 查看
                      </button>
                      <button 
                        onClick={() => navigate(`/contract/detail?id=${contract.id}&mode=confirm`)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer text-emerald-600"
                      >
                        <CheckCircle size={13} /> 确认
                      </button>
                      <button 
                        onClick={() => setShowReturnModal(contract.id)}
                        className="text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Undo2 size={13} /> 退回
                      </button>
                      <button 
                        disabled={contract.isLocked}
                        onClick={() => setShowTransferModal(contract.id)}
                        className={cn(
                          "flex items-center gap-0.5 transition-colors",
                          contract.isLocked ? "text-gray-300 cursor-not-allowed" : "text-rose-600 hover:underline cursor-pointer"
                        )}
                        title={contract.isLocked ? "已达最大转派次数" : ""}
                      >
                        <Share2 size={13} /> 转派
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">暂无待确认合同</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-gray-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                <h3 className="font-bold text-slate-800 text-sm">合同数据退回</h3>
              </div>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                是否将该合同退回至合同管理系统？退回后后续本组织不再同步该合同数据。
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700 border border-amber-200">
                注意：退回只代表数据退回，不影响原合同管理系统数据，如需重新同步，请在本模块退回记录中“取消退回”
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">退回原因:</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-slate-700 h-24 focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20"
                  placeholder="请输入退回原因"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2.5 bg-slate-50">
              <button onClick={() => setShowReturnModal(null)} className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium cursor-pointer">取消</button>
              <button 
                onClick={() => handleReturn(showReturnModal)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow-3xs cursor-pointer"
              >
                确认退回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-gray-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#165DFF] rounded-full"></span>
                <h3 className="font-bold text-slate-800 text-sm">合同转派</h3>
              </div>
              <button onClick={() => setShowTransferModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700"><span className="text-rose-500">*</span> 选择转派组织:</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:border-[#165DFF]"
                  value={transferOrg}
                  onChange={e => setTransferOrg(e.target.value)}
                >
                  <option value="">请选择组织</option>
                  <option value="项目部二">项目部二</option>
                  <option value="项目部三">项目部三</option>
                </select>
                <div className="text-[11px] text-slate-400">当前已转派次数: {contracts.find(c => c.id === showTransferModal)?.transferCount}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700"><span className="text-rose-500">*</span> 转派原因:</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-slate-700 h-24 focus:outline-none focus:border-[#165DFF]"
                  placeholder="请输入转派原因"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-[#165DFF] border border-blue-200">
                注意：转派后后续该合同更新数据将同步至转派组织，本组织不再接收数据。如需转回请联系管理员。
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2.5 bg-slate-50">
              <button onClick={() => setShowTransferModal(null)} className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium cursor-pointer">取消</button>
              <button 
                disabled={!transferOrg || !transferReason}
                onClick={() => handleTransfer(showTransferModal)}
                className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-5 py-1.5 rounded text-xs font-bold shadow-3xs cursor-pointer disabled:opacity-50"
              >
                确认转派
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-end z-50">
          <div className="bg-white w-[520px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#165DFF] rounded-full"></span>
                <h3 className="font-bold text-slate-800 text-sm">合同操作记录</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
              {MOCK_CONTRACT_OPERATIONS.map(op => (
                <div key={op.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2.5 shadow-2xs hover:border-[#165DFF]/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono text-slate-400">{op.time}</div>
                      <div className="font-bold text-xs text-slate-800">{op.contractName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{op.contractCode}</div>
                    </div>
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{op.operator}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-bold border",
                      op.type === '退回' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                      op.type === '转派' ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-blue-50 text-[#165DFF] border-blue-200"
                    )}>
                      {op.type}
                    </span>
                    {op.targetOrg && (
                      <span className="text-xs text-slate-600">转派至: {op.targetOrg}</span>
                    )}
                  </div>
                  {op.reason && (
                    <div className="bg-slate-50 border border-slate-150 p-2 rounded text-xs text-slate-600 italic">
                      原因: {op.reason}
                    </div>
                  )}
                  {op.type === '退回' && (
                    <button className="text-[#165DFF] text-xs hover:underline font-bold pt-0.5 cursor-pointer">
                      取消退回
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
