/**
 * 分包合同池
 * 展示当前组织已确认的分包合同，可进入分包清单维护
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Eye, CheckCircle2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubContract } from './types';
import { getSubContracts, getSubItems, getLinks } from './subcontractStore';

interface Props { key?: string | number; }

export default function SubContractPool({}: Props) {
  const navigate = useNavigate();
  const [list, setList] = useState<SubContract[]>(() => getSubContracts());
  const [searchForm, setSearchForm] = useState({ name: '', code: '', partyB: '', type: '' });

  const links = useMemo(() => getLinks(), []);

  const confirmed = list.filter(c => c.status === '已确认');

  const filtered = confirmed.filter(c => {
    const matchName = !searchForm.name || c.name.toLowerCase().includes(searchForm.name.toLowerCase());
    const matchCode = !searchForm.code || c.code.toLowerCase().includes(searchForm.code.toLowerCase());
    const matchParty = !searchForm.partyB || c.partyB.toLowerCase().includes(searchForm.partyB.toLowerCase());
    const matchType = !searchForm.type || c.type === searchForm.type;
    return matchName && matchCode && matchParty && matchType;
  });

  const totalAmount = filtered.reduce((s, c) => s + c.amount, 0);

  const getInventoryTotal = (subId: string) =>
    getSubItems(subId).reduce((s, i) => s + i.amount, 0);

  const getLinkCount = (subId: string) =>
    links.filter(l => l.subContractId === subId).length;

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* 搜索区 */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 items-center">
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
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">分包商:</label>
            <input type="text" placeholder="请输入分包商名称" value={searchForm.partyB}
              onChange={e => setSearchForm({ ...searchForm, partyB: e.target.value })}
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
          <button onClick={() => setSearchForm({ name: '', code: '', partyB: '', type: '' })}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3.5">
          <div className="text-xs text-slate-500 mb-1">已确认分包合同</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3.5">
          <div className="text-xs text-slate-500 mb-1">价税总金额(元)</div>
          <div className="text-2xl font-bold text-[#165DFF] tabular-nums">¥{totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3.5">
          <div className="text-xs text-slate-500 mb-1">清单挂接关系</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{links.length} <span className="text-sm font-normal text-slate-400">条</span></div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            <h3 className="font-bold text-sm text-slate-800">分包合同池（本组织已确认）</h3>
            <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded ml-1 font-bold">
              共 {filtered.length} 份
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[200px]">合同名称</th>
                <th className="px-3.5 py-3 font-mono">合同编号</th>
                <th className="px-4 py-3 text-right font-mono">价税合同金额/元</th>
                <th className="px-3.5 py-3 text-right font-mono">分包清单合价/元</th>
                <th className="px-3.5 py-3">分包商</th>
                <th className="px-3.5 py-3 text-center">分包类型</th>
                <th className="px-3.5 py-3">关联项目</th>
                <th className="px-3.5 py-3 text-center font-mono">履约时间跨度</th>
                <th className="px-3.5 py-3 text-center font-mono">确认时间</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filtered.map((c, i) => {
                const invTotal = getInventoryTotal(c.id);
                const linkCount = getLinkCount(c.id);
                return (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-[#165DFF] transition-colors">
                      <div className="flex items-center gap-1.5">
                        {c.name}
                        {linkCount > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" title={`已与收入合同建立 ${linkCount} 条清单挂接`}>
                            <Link2 size={9} /> {linkCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-600 font-medium">{c.code}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      ¥{c.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {invTotal > 0 ? (
                        <span className={cn('text-xs font-bold', invTotal > c.amount ? 'text-rose-600' : 'text-[#165DFF]')}>
                          ¥{invTotal.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">未录入清单</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600">{c.partyB}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {c.type}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-slate-600">{c.projectName}</td>
                    <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-500">
                      {c.performanceStartDate} ~ {c.performanceEndDate}
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-500">{c.confirmTime}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-[#165DFF] font-bold text-xs">
                        <button onClick={() => navigate('/contract/subcontract/inventory')}
                          className="hover:underline flex items-center gap-0.5 cursor-pointer">
                          <Eye size={13} /> 分包清单
                        </button>
                        <button onClick={() => navigate('/contract/subcontract/linking')}
                          className="hover:underline flex items-center gap-0.5 cursor-pointer text-emerald-600">
                          <Link2 size={13} /> 清单挂接
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-slate-300" />
                    暂无已确认的分包合同，请先在「分包合同确认」中确认合同
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
