/**
 * 分包合同确认
 * 逻辑与收入合同确认池相同：从其他系统同步分包合同 → 待确认 → 确认 / 退回
 * 确认后进入分包合同池
 */

import React, { useState } from 'react';
import { Search, RotateCcw, Eye, CheckCircle, Undo2, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubContract } from './types';
import { getSubContracts, confirmSubContract, returnSubContract, syncSubContract } from './subcontractStore';

interface Props { key?: string | number; }

export default function SubContractConfirmation({}: Props) {
  const [list, setList] = useState<SubContract[]>(() => getSubContracts());
  const refresh = () => setList(getSubContracts());
  const [searchForm, setSearchForm] = useState({ name: '', code: '', type: '' });
  const [showReturnModal, setShowReturnModal] = useState<SubContract | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [viewContract, setViewContract] = useState<SubContract | null>(null);

  const filtered = list.filter(c => {
    const matchName = !searchForm.name || c.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || c.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchType = !searchForm.type || c.type === searchForm.type;
    return matchName && matchCode && matchType && c.status === '待确认';
  });

  const handleSync = () => {
    const sc = syncSubContract();
    refresh();
    alert(`已从分包合同管理系统同步 1 条新合同：\n\n【${sc.code}】${sc.name}\n金额 ¥${sc.amount.toLocaleString()}`);
  };

  const handleConfirm = (id: string) => {
    if (!confirm('确认该分包合同？确认后进入分包合同池。')) return;
    confirmSubContract(id);
    refresh();
  };

  const handleReturn = () => {
    if (!showReturnModal) return;
    returnSubContract(showReturnModal.id, returnReason);
    setShowReturnModal(null);
    setReturnReason('');
    refresh();
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* 搜索区 */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同名称:</label>
            <input type="text" placeholder="请输入分包合同名称" value={searchForm.name}
              onChange={e => setSearchForm({ ...searchForm, name: e.target.value })}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同编号:</label>
            <input type="text" placeholder="请输入合同编号" value={searchForm.code}
              onChange={e => setSearchForm({ ...searchForm, code: e.target.value })}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">分包类型:</label>
            <select value={searchForm.type} onChange={e => setSearchForm({ ...searchForm, type: e.target.value })}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] transition-all">
              <option value="">全部分包类型</option>
              <option value="劳务分包">劳务分包</option>
              <option value="专业分包">专业分包</option>
              <option value="设备租赁分包">设备租赁分包</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer">
            <Search size={14} /> 查询
          </button>
          <button onClick={() => setSearchForm({ name: '', code: '', type: '' })}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#165DFF] rounded-full" />
            <h3 className="font-bold text-sm text-slate-800">分包合同待确认列表</h3>
            <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded ml-1 font-bold">
              共 {filtered.length} 项
            </span>
          </div>
          <button onClick={handleSync}
            className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer">
            <RefreshCw size={14} /> 同步分包合同数据
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
                <th className="px-3.5 py-3">分包商</th>
                <th className="px-3.5 py-3">分包类型</th>
                <th className="px-3.5 py-3">经办机构</th>
                <th className="px-3.5 py-3 text-center">合同来源</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filtered.map((c, i) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                  <td onClick={() => setViewContract(c)}
                    className="px-4 py-3 font-bold text-slate-800 group-hover:text-[#165DFF] cursor-pointer transition-colors">
                    {c.name}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-slate-600 font-medium">{c.code}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    ¥{c.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{c.partyB}</td>
                  <td className="px-3.5 py-3 text-slate-600">
                    <span className="bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 text-[11px]">{c.agency}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className="bg-blue-50 text-[#165DFF] border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {c.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#165DFF] font-bold text-xs">
                      <button onClick={() => setViewContract(c)} className="hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Eye size={13} /> 查看
                      </button>
                      <button onClick={() => handleConfirm(c.id)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer text-emerald-600">
                        <CheckCircle size={13} /> 确认
                      </button>
                      <button onClick={() => setShowReturnModal(c)}
                        className="hover:underline flex items-center gap-0.5 cursor-pointer text-amber-600">
                        <Undo2 size={13} /> 退回
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    暂无待确认的分包合同，点击「同步分包合同数据」从其他系统同步
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-gray-200 text-xs text-slate-500">
          说明：分包合同由分包合同管理系统同步产生，确认后进入本组织「分包合同池」；退回后不再同步该合同数据。
        </div>
      </div>

      {/* 退回弹窗 */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[480px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                <h3 className="font-bold text-slate-800 text-sm">分包合同退回</h3>
              </div>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                是否将【{showReturnModal.name}】退回至分包合同管理系统？退回后本组织不再同步该合同数据。
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">退回原因:</label>
                <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  placeholder="请输入退回原因"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-slate-700 h-24 focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2.5 bg-slate-50">
              <button onClick={() => setShowReturnModal(null)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium cursor-pointer">取消</button>
              <button onClick={handleReturn}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow-3xs cursor-pointer">确认退回</button>
            </div>
          </div>
        </div>
      )}

      {/* 查看详情弹窗 */}
      {viewContract && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[560px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#165DFF] rounded-full" />
                <h3 className="font-bold text-slate-800 text-sm">分包合同详情</h3>
              </div>
              <button onClick={() => setViewContract(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              {[
                ['合同名称', viewContract.name], ['合同编号', viewContract.code],
                ['价税金额(元)', `¥${viewContract.amount.toLocaleString()}`],
                ['分包类型', viewContract.type],
                ['发包方', viewContract.partyA], ['分包商', viewContract.partyB],
                ['关联项目', viewContract.projectName], ['经办机构', viewContract.agency],
                ['履约开始', viewContract.performanceStartDate || '-'],
                ['履约结束', viewContract.performanceEndDate || '-'],
                ['同步时间', viewContract.createTime],
                ['当前状态', viewContract.status],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-slate-400 mb-0.5">{label}</div>
                  <div className="font-bold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end bg-slate-50">
              <button onClick={() => setViewContract(null)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium cursor-pointer">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
