import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  RotateCcw, 
  Eye, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Calendar, 
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Coins
} from 'lucide-react';
import { Contract, Project } from '@/types';
import { cn } from '@/lib/utils';
import ContractInventoryMaintenance from '@/components/ContractInventoryMaintenance';

interface Props {
  contracts: Contract[];
  projects: Project[];
}

export default function ContractInventoryList({ contracts, projects }: Props) {
  const [searchForm, setSearchForm] = useState({
    name: '',
    code: '',
    abbr: '',
    status: ''
  });

  // State to track contract inventory statuses in localStorage
  const [inventoryStatuses, setInventoryStatuses] = useState<Record<string, '草稿' | '待确认' | '已确认'>>({});
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  
  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContractIdForCreate, setSelectedContractIdForCreate] = useState('');
  const [createSearchQuery, setCreateSearchQuery] = useState('');

  // Quick confirmation state
  const [confirmingContract, setConfirmingContract] = useState<Contract | null>(null);

  // Load / initialize inventory statuses
  useEffect(() => {
    const statuses: Record<string, '草稿' | '待确认' | '已确认'> = {};
    contracts.forEach(c => {
      const key = `CONTRACT_INVENTORY_STATUS_${c.id}`;
      let saved = localStorage.getItem(key) as '草稿' | '待确认' | '已确认' | null;
      if (!saved) {
        // Seed default statuses
        if (c.id === 'c1') {
          saved = '已确认';
        } else if (c.id === 'c2') {
          saved = '待确认';
        } else {
          saved = '草稿';
        }
        localStorage.setItem(key, saved);
      }
      statuses[c.id] = saved;
    });
    setInventoryStatuses(statuses);
  }, [contracts]);

  // Save status change helper
  const handleUpdateStatus = (contractId: string, newStatus: '草稿' | '待确认' | '已确认') => {
    localStorage.setItem(`CONTRACT_INVENTORY_STATUS_${contractId}`, newStatus);
    setInventoryStatuses(prev => ({
      ...prev,
      [contractId]: newStatus
    }));
  };

  // Calculate dynamic "清单总金额" (total inventory amount) for each contract
  const getContractInventoryTotal = (contractId: string) => {
    const key = `CONTRACT_INVENTORIES_${contractId}`;
    const saved = localStorage.getItem(key);
    if (!saved) {
      if (contractId === 'c1') return 302000 + 2257500; // default seed sum
      return 0;
    }
    try {
      const inventories = JSON.parse(saved);
      if (Array.isArray(inventories)) {
        return inventories.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  };

  // Determine if a contract already has any inventories created
  const hasInventoriesCreated = (contractId: string) => {
    const key = `CONTRACT_INVENTORIES_${contractId}`;
    const saved = localStorage.getItem(key);
    if (contractId === 'c1') return true; // c1 has seed data by default
    if (!saved) return false;
    try {
      const inventories = JSON.parse(saved);
      return Array.isArray(inventories) && inventories.length > 0;
    } catch {
      return false;
    }
  };

  // Filtered contracts list
  const filteredContracts = contracts.filter(c => {
    const status = inventoryStatuses[c.id] || '草稿';
    const matchName = !searchForm.name || c.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || c.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchAbbr = !searchForm.abbr || (c.name.toLowerCase().includes(searchForm.abbr.toLowerCase()) || c.partyB.toLowerCase().includes(searchForm.abbr.toLowerCase()));
    const matchStatus = !searchForm.status || status === searchForm.status;
    return matchName && matchCode && matchAbbr && matchStatus;
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setSelectedContractIdForCreate('');
    setCreateSearchQuery('');
  };

  const handleConfirmCreate = () => {
    if (!selectedContractIdForCreate) {
      alert('请选择一个合同！');
      return;
    }
    const contract = contracts.find(c => c.id === selectedContractIdForCreate);
    if (contract) {
      setIsCreateModalOpen(false);
      setActiveContract(contract);
    }
  };

  // Custom styling helper for status badges
  const getStatusBadgeStyle = (status: '草稿' | '待确认' | '已确认') => {
    switch (status) {
      case '已确认':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case '待确认':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case '草稿':
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  // Active view router: if user has clicked view/edit of a contract, show the full maintenance view
  if (activeContract) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <ContractInventoryMaintenance 
          contract={activeContract} 
          onBack={() => {
            setActiveContract(null);
            // Reload statuses and amounts in case they were updated
            const statuses: Record<string, '草稿' | '待确认' | '已确认'> = {};
            contracts.forEach(c => {
              const key = `CONTRACT_INVENTORY_STATUS_${c.id}`;
              const saved = localStorage.getItem(key) as '草稿' | '待确认' | '已确认' | null;
              statuses[c.id] = saved || '草稿';
            });
            setInventoryStatuses(statuses);
          }} 
        />
      </div>
    );
  }

  // Filter available contracts for creation dropdown/list (not yet created OR selectable but styled)
  const availableContractsForCreate = contracts
    .filter(c => {
      if (!createSearchQuery) return true;
      const term = createSearchQuery.toLowerCase();
      return c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term);
    });

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Search Panel matching unified enterprise card style */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-16 text-right">合同名称:</label>
            <input 
              type="text" 
              placeholder="请输入关键词" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.name}
              onChange={e => setSearchForm({ ...searchForm, name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-16 text-right">合同编号:</label>
            <input 
              type="text" 
              placeholder="请输入合同编号" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.code}
              onChange={e => setSearchForm({ ...searchForm, code: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-16 text-right">合同简称:</label>
            <input 
              type="text" 
              placeholder="请输入简称/主体" 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.abbr}
              onChange={e => setSearchForm({ ...searchForm, abbr: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-16 text-right">清单状态:</label>
            <select 
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
              value={searchForm.status}
              onChange={e => setSearchForm({ ...searchForm, status: e.target.value })}
            >
              <option value="">全部状态</option>
              <option value="草稿">草稿</option>
              <option value="待确认">待确认</option>
              <option value="已确认">已确认</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer">
            <Search size={14} /> 查询
          </button>
          <button 
            onClick={() => setSearchForm({ name: '', code: '', abbr: '', status: '' })}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-gray-200 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#165DFF] rounded-full"></div>
            <h3 className="font-bold text-sm text-slate-800">合同清单台账列表</h3>
            <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded ml-1 font-bold">
              共 {filteredContracts.length} 项
            </span>
          </div>

          <button 
            onClick={handleOpenCreateModal}
            className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer"
          >
            <Plus size={14} /> 创建合同清单
          </button>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[180px]">合同名称</th>
                <th className="px-3.5 py-3">合同简称</th>
                <th className="px-3.5 py-3 font-mono">合同编号</th>
                <th className="px-3.5 py-3 text-center font-mono">履约时间跨度</th>
                <th className="px-3.5 py-3 text-center">清单状态</th>
                <th className="px-4 py-3 text-right font-mono">合同总金/元</th>
                <th className="px-4 py-3 text-right font-mono">清单合价/元</th>
                <th className="px-3.5 py-3 text-center font-mono">创建时间</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <AlertCircle size={24} className="mx-auto mb-2 text-slate-300" />
                    没有找到符合条件的合同清单数据
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const status = inventoryStatuses[contract.id] || '草稿';
                  const totalInventoryAmount = getContractInventoryTotal(contract.id);
                  const isExceeded = totalInventoryAmount > contract.amount;
                  const isCreated = hasInventoriesCreated(contract.id);

                  return (
                      <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors group">
                        {/* Index */}
                        <td className="px-3.5 py-3 text-center text-slate-400 font-mono font-medium">
                          {index + 1}
                        </td>

                        {/* Contract Name */}
                        <td className="px-4 py-3 font-bold text-slate-800">
                          <button 
                            onClick={() => setActiveContract(contract)}
                            className="group-hover:text-[#165DFF] text-left transition-colors cursor-pointer hover:underline"
                          >
                            {contract.name}
                          </button>
                        </td>

                        {/* Abbr */}
                        <td className="px-3.5 py-3 text-slate-600 font-medium">
                          {contract.id === 'c1' ? '沪杭甬顺畅' : contract.id === 'c2' ? '日常营销协议' : '人力资源服务'}
                        </td>

                        {/* Code */}
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600 font-medium">
                          {contract.code}
                        </td>

                        {/* Dates */}
                        <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-500">
                          <div>{contract.performanceStartDate || '2025-05-10'} ~ {contract.performanceEndDate || '2025-11-20'}</div>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 text-center select-none">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border",
                            getStatusBadgeStyle(status)
                          )}>
                            {status}
                          </span>
                        </td>

                        {/* Contract Amount */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          ¥{contract.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Total Inventory Amount */}
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {isCreated ? (
                            <div className="space-y-0.5">
                              <span className={cn(
                                "text-xs font-bold",
                                isExceeded ? 'text-rose-600' : 'text-[#165DFF]'
                              )}>
                                ¥{totalInventoryAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              {isExceeded && (
                                <div className="text-[10px] text-rose-500 flex items-center justify-end gap-0.5" title="清单合价超过了合同总金额！">
                                  <AlertCircle size={10} /> 超合同额
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">未录入清单</span>
                          )}
                        </td>

                        {/* Create Time */}
                        <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-400">
                          {contract.createTime || '2024-03-20 10:00'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setActiveContract(contract)}
                              className="text-[#165DFF] hover:underline flex items-center gap-0.5 font-bold cursor-pointer text-xs"
                              title="查看清单明细"
                            >
                              <Eye size={13} />
                              <span>查看</span>
                            </button>

                            <button
                              onClick={() => setActiveContract(contract)}
                              className="text-[#165DFF] hover:underline flex items-center gap-0.5 font-bold cursor-pointer text-xs"
                              title="编辑清单内容"
                            >
                              <FileText size={13} />
                              <span>编辑</span>
                            </button>

                            {status === '待确认' ? (
                              <button
                                onClick={() => setConfirmingContract(contract)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-0.5 shadow-3xs"
                                title="对清单进行审核确认"
                              >
                                <Check size={11} className="stroke-[3]" />
                                <span>确认</span>
                              </button>
                            ) : status === '草稿' ? (
                              <button
                                onClick={() => handleUpdateStatus(contract.id, '待确认')}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-[#165DFF] text-[#165DFF] hover:text-white border border-blue-200 rounded text-[11px] font-bold cursor-pointer transition-all"
                                title="提交至待确认状态"
                              >
                                提交审核
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                                <CheckCircle2 size={12} />
                                已归档
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer info/legend */}
          <div className="p-3.5 bg-slate-50 border-t border-gray-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2 select-none">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">状态流转说明：</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> 草稿 (编辑维护)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 待确认 (送审校验)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 已确认 (归档生效)</span>
            </div>
            <p className="font-medium">
              提示：点击合同名称或操作中的编辑，可进入该合同下多份清单细目的导入和增改。
            </p>
          </div>
        </div>

      {/* ==================================================================== */}
      {/* DIALOG MODAL: CREATE CONTRACT INVENTORY (SELECT CONTRACT) */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-150 bg-slate-50 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-850 flex items-center gap-2">
                <Briefcase className="text-blue-600" size={16} />
                创建合同清单：选择关联收入合同
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-750 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                按照合同清单管理要求，所有清单必须挂接在<b>正式的收入合同</b>之下。请从下方列表中选择一个合同以开始创建其首个工程或日常养护清单：
              </p>

              {/* Search Box in modal */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="搜索合同名称、编码..."
                  value={createSearchQuery}
                  onChange={(e) => setCreateSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white pl-9 pr-3 py-2 text-xs rounded-lg font-semibold transition-all text-slate-700"
                />
              </div>

              {/* Contract List for creation */}
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                {availableContractsForCreate.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    没有找到可选的收入合同
                  </div>
                ) : (
                  availableContractsForCreate.map(c => {
                    const isAlreadyCreated = hasInventoriesCreated(c.id);
                    const isSelected = selectedContractIdForCreate === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          // Allow selection, but we will style it as requested
                          setSelectedContractIdForCreate(c.id);
                        }}
                        className={cn(
                          "p-3 text-xs transition-all cursor-pointer flex items-center justify-between",
                          isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/50",
                          isAlreadyCreated && "bg-slate-50/40 text-slate-400"
                        )}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-medium">
                              {c.code}
                            </span>
                            <span className={cn(isAlreadyCreated && "line-through text-slate-400")}>
                              {c.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            对方签约方: {c.partyB} | 金额: ¥{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Status Marker */}
                        <div className="shrink-0 select-none">
                          {isAlreadyCreated ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded-full">
                              已创建清单
                            </span>
                          ) : isSelected ? (
                            <span className="text-[10px] font-black text-blue-650 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                              已选定
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full hover:border-blue-300 hover:text-blue-600">
                              点击选择
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Warnings & Help */}
              {selectedContractIdForCreate && hasInventoriesCreated(selectedContractIdForCreate) && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-[11px] text-amber-700 leading-relaxed font-medium">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    该合同已经创建过合同清单了。需求说明规定：已创建过合同清单的合同不允许再次新建独立清单，您应直接在列表页点击该合同的<b>“查看”</b>或<b>“编辑”</b>来维护、增改其现有的清单多份工程。
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold rounded-lg transition-all cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedContractIdForCreate || hasInventoriesCreated(selectedContractIdForCreate)}
                onClick={handleConfirmCreate}
                className={cn(
                  "px-5 py-2 text-white font-extrabold rounded-lg transition-all text-xs shadow-xs",
                  (!selectedContractIdForCreate || hasInventoriesCreated(selectedContractIdForCreate))
                    ? "bg-slate-300 cursor-not-allowed text-slate-100 shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                )}
              >
                确认创建
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DIALOG MODAL: CONFIRM/VERIFY INVENTORY (STATUS UPDATE) */}
      {/* ==================================================================== */}
      {confirmingContract && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-150 bg-slate-50 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-850 flex items-center gap-1.5">
                <CheckCircle2 className="text-amber-500" size={16} />
                确认合同清单归档
              </h3>
              <button
                type="button"
                onClick={() => setConfirmingContract(null)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-750 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-250 p-3.5 rounded-xl flex items-start gap-2 text-amber-800 leading-relaxed font-semibold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>
                  您正在对合同<b>【{confirmingContract.name}】</b>的全部工程量清单细目进行“审核确认”操作。
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium text-slate-650">
                <div className="flex justify-between">
                  <span>待确认合同:</span>
                  <span className="font-bold text-slate-800">{confirmingContract.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>合同预算额:</span>
                  <span className="font-mono text-slate-800">¥{confirmingContract.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>清单总合价:</span>
                  <span className="font-mono font-black text-blue-600">¥{getContractInventoryTotal(confirmingContract.id).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>已创建清单数:</span>
                  <span className="font-bold text-slate-800">2 份 (日常、专项)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                确认归档后，清单状态将转为<b>“已确认”</b>。该清单将被正式锁定并可作为工程结算、计量支付及形象进度的实施基准。
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingContract(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold rounded-lg transition-all cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateStatus(confirmingContract.id, '已确认');
                  setConfirmingContract(null);
                  alert('合同清单已成功确认归档并锁定！');
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition-all text-xs cursor-pointer shadow-xs"
              >
                确认并归档
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
