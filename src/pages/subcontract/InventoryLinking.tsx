/**
 * 清单挂接
 *  - 选择收入合同 → 展示该合同的合同清单细目
 *  - 选择分包合同 → 展示该合同下的分包清单细目
 *  - 勾选两侧细目后一键挂接（笛卡尔积），支持多对多：
 *      一个收入合同细目 可挂接 多个分包合同的细目
 *      一个分包合同细目 可被 多个收入合同的细目挂接
 *  - 挂接关系可调整数量、可解除
 */

import React, { useMemo, useState } from 'react';
import { Link2, Trash2, Info, ArrowLeftRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types';
import type { SubContract, InventoryLink, IncomeItemFlat } from './types';
import { flattenIncomeItems } from './types';
import { getSubContracts, getSubItems, getLinks, addLinks, deleteLink, updateLinkQuantity } from './subcontractStore';

interface Props {
  key?: string | number;
  contracts: Contract[];      // 收入合同（已确认）
}

export default function InventoryLinking({ contracts }: Props) {
  const [subContracts] = useState<SubContract[]>(() => getSubContracts().filter(c => c.status === '已确认'));
  const [incomeId, setIncomeId] = useState<string>(contracts[0]?.id || '');
  const [subId, setSubId] = useState<string>(subContracts[0]?.id || '');
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  const [checkedIncome, setCheckedIncome] = useState<Set<string>>(new Set());
  const [checkedSub, setCheckedSub] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const incomeContract = contracts.find(c => c.id === incomeId);
  const subContract = subContracts.find(c => c.id === subId);

  // 收入合同清单细目（展平）
  const incomeItems = useMemo<IncomeItemFlat[]>(
    () => (incomeContract ? flattenIncomeItems(incomeContract) : []),
    [incomeContract]);

  // 分包清单细目
  const subItems = useMemo(() => (subId ? getSubItems(subId) : []), [subId, version]);

  const links = useMemo(() => getLinks(), [version]);

  // 当前所选合同对之间的挂接关系
  const pairLinks = links.filter(l =>
    (l.incomeContractId === incomeId && l.subContractId === subId));

  // 多对多统计
  const incomeLinkedSubContracts = useMemo(() =>
    new Set(links.filter(l => l.incomeContractId === incomeId).map(l => l.subContractId)),
    [links, incomeId]);
  const subLinkedIncomeContracts = useMemo(() =>
    new Set(links.filter(l => l.subContractId === subId).map(l => l.incomeContractId)),
    [links, subId]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2600);
  };

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    apply(next);
  };

  const incomeItemLinkCount = (itemId: string) =>
    links.filter(l => l.incomeItemId === itemId && l.incomeContractId === incomeId).length;
  const subItemLinkCount = (itemId: string) =>
    links.filter(l => l.subItemId === itemId && l.subContractId === subId).length;

  /** 一键挂接：勾选的收入细目 × 勾选的分包细目（笛卡尔积） */
  const doLink = () => {
    if (!incomeContract || !subContract) return;
    if (checkedIncome.size === 0 || checkedSub.size === 0) {
      showToast('error', '请先在两侧勾选需要挂接的清单细目');
      return;
    }
    const { created, skipped } = addLinks(
      { contractId: incomeContract.id, contractName: incomeContract.name, itemIds: [...checkedIncome] },
      {
        subContractId: subContract.id, subContractName: subContract.name,
        items: subItems.filter(i => checkedSub.has(i.id)).map(i => ({ itemId: i.id, quantity: i.quantity })),
      },
    );
    refresh();
    setCheckedIncome(new Set());
    setCheckedSub(new Set());
    if (created.length > 0) {
      showToast('success', `成功建立 ${created.length} 条挂接关系${skipped > 0 ? `（${skipped} 条已存在，自动跳过）` : ''}`);
    } else {
      showToast('error', '所选细目间的挂接关系均已存在');
    }
  };

  const doUnlink = (id: string) => {
    if (confirm('确定解除该挂接关系？')) {
      deleteLink(id);
      refresh();
    }
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 0) return;
    updateLinkQuantity(id, qty);
    refresh();
  };

  const th = 'px-3 py-2 text-slate-500 font-bold text-[11px] border-b border-gray-200';
  const td = 'px-3 py-2 text-slate-700';

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* 选择区 */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#165DFF] shrink-0 w-20 text-right">收入合同:</span>
            <select value={incomeId} onChange={e => { setIncomeId(e.target.value); setCheckedIncome(new Set()); }}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] transition-all">
              {contracts.map(c => <option key={c.id} value={c.id}>{c.name}（{c.code}）</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-600 shrink-0 w-20 text-right">分包合同:</span>
            <select value={subId} onChange={e => { setSubId(e.target.value); setCheckedSub(new Set()); }}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-purple-500 transition-all">
              {subContracts.map(c => <option key={c.id} value={c.id}>{c.name}（{c.code}）</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Info size={12} />
            当前收入合同已挂接 <b className="text-[#165DFF]">{incomeLinkedSubContracts.size}</b> 个分包合同；
            当前分包合同已挂接 <b className="text-purple-600">{subLinkedIncomeContracts.size}</b> 个收入合同（多对多）
          </span>
        </div>
      </div>

      {/* 双栏清单 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 左：收入合同清单 */}
        <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-[#F0F5FF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#165DFF] rounded-full" />
              <h3 className="font-bold text-xs text-slate-800">收入合同清单</h3>
              <span className="text-[11px] text-slate-500">{incomeContract?.name}</span>
            </div>
            <label className="text-[11px] text-slate-500 flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" className="rounded"
                checked={checkedIncome.size > 0 && checkedIncome.size === incomeItems.length}
                onChange={e => setCheckedIncome(e.target.checked ? new Set(incomeItems.map(i => i.itemId)) : new Set())} />
              全选
            </label>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FAFBFD] sticky top-0">
                <tr>
                  <th className={cn(th, 'w-9 text-center')}></th>
                  <th className={th}>编号</th>
                  <th className={th}>项目名称</th>
                  <th className={cn(th, 'text-right')}>单价</th>
                  <th className={cn(th, 'text-right')}>数量</th>
                  <th className={cn(th, 'text-center w-16')}>挂接</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {incomeItems.map(it => {
                  const cnt = incomeItemLinkCount(it.itemId);
                  return (
                    <tr key={it.itemId} className={cn('hover:bg-blue-50/30 transition-colors', checkedIncome.has(it.itemId) && 'bg-blue-50/50')}>
                      <td className={cn(td, 'text-center')}>
                        <input type="checkbox" className="rounded" checked={checkedIncome.has(it.itemId)}
                          onChange={() => toggle(checkedIncome, it.itemId, setCheckedIncome)} />
                      </td>
                      <td className={cn(td, 'font-mono text-slate-500')}>{it.code}</td>
                      <td className={cn(td, 'font-bold')}>
                        <div title={it.inventoryName}>{it.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{it.inventoryName}</div>
                      </td>
                      <td className={cn(td, 'text-right font-mono')}>{it.price.toLocaleString()}</td>
                      <td className={cn(td, 'text-right font-mono')}>{it.quantity.toLocaleString()}</td>
                      <td className={cn(td, 'text-center')}>
                        {cnt > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold"
                            title={`该细目已建立 ${cnt} 条挂接`}>
                            {cnt}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {incomeItems.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">该合同暂无清单细目</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 中间挂接按钮（小屏时在两栏之间） */}
        <div className="xl:absolute xl:left-1/2 xl:top-1/2 xl:transform xl:-translate-x-1/2 xl:-translate-y-1/2 z-10 flex xl:flex-col items-center justify-center gap-2">
          <button onClick={doLink}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer whitespace-nowrap">
            <Link2 size={15} />
            挂接所选细目
            <span className="bg-white/20 rounded px-1.5 py-0.5 tabular-nums">{checkedIncome.size}×{checkedSub.size}</span>
          </button>
          {(checkedIncome.size > 0 || checkedSub.size > 0) && (
            <button onClick={() => { setCheckedIncome(new Set()); setCheckedSub(new Set()); }}
              className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer underline">清除勾选</button>
          )}
        </div>

        {/* 右：分包清单 */}
        <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-purple-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
              <h3 className="font-bold text-xs text-slate-800">分包清单</h3>
              <span className="text-[11px] text-slate-500">{subContract?.name}</span>
            </div>
            <label className="text-[11px] text-slate-500 flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" className="rounded"
                checked={checkedSub.size > 0 && checkedSub.size === subItems.length}
                onChange={e => setCheckedSub(e.target.checked ? new Set(subItems.map(i => i.id)) : new Set())} />
              全选
            </label>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FAFBFD] sticky top-0">
                <tr>
                  <th className={cn(th, 'w-9 text-center')}></th>
                  <th className={th}>编号</th>
                  <th className={th}>项目名称</th>
                  <th className={cn(th, 'text-right')}>单价</th>
                  <th className={cn(th, 'text-right')}>数量</th>
                  <th className={cn(th, 'text-center w-16')}>挂接</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {subItems.map(it => {
                  const cnt = subItemLinkCount(it.id);
                  return (
                    <tr key={it.id} className={cn('hover:bg-purple-50/30 transition-colors', checkedSub.has(it.id) && 'bg-purple-50/50')}>
                      <td className={cn(td, 'text-center')}>
                        <input type="checkbox" className="rounded" checked={checkedSub.has(it.id)}
                          onChange={() => toggle(checkedSub, it.id, setCheckedSub)} />
                      </td>
                      <td className={cn(td, 'font-mono text-slate-500')}>{it.code}</td>
                      <td className={cn(td, 'font-bold')}>{it.name}</td>
                      <td className={cn(td, 'text-right font-mono')}>{it.price.toLocaleString()}</td>
                      <td className={cn(td, 'text-right font-mono')}>{it.quantity.toLocaleString()}</td>
                      <td className={cn(td, 'text-center')}>
                        {cnt > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold"
                            title={`该细目已建立 ${cnt} 条挂接`}>
                            {cnt}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {subItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">
                      该分包合同暂无清单细目，请先在「分包清单」中维护
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 已建立挂接关系 */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
            <h3 className="font-bold text-sm text-slate-800">
              当前合同对的挂接关系
            </h3>
            <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded ml-1 font-bold">
              共 {pairLinks.length} 条
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowLeftRight size={12} /> 挂接数量可直接编辑
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">序号</th>
                <th className="px-4 py-3 min-w-[220px]">收入合同清单细目</th>
                <th className="px-3.5 py-3 min-w-[220px]">分包合同清单细目</th>
                <th className="px-3.5 py-3 text-center font-mono w-32">挂接数量</th>
                <th className="px-3.5 py-3 text-center font-mono w-40">建立时间</th>
                <th className="px-4 py-3 text-center w-20">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {pairLinks.map((l, i) => {
                const incIt = incomeItems.find(x => x.itemId === l.incomeItemId);
                const subIt = subItems.find(x => x.id === l.subItemId);
                return (
                  <tr key={l.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#165DFF]">{incIt?.name || `细目 ${l.incomeItemId}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {incIt?.code} · {incomeContract?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-purple-600">{subIt?.name || `细目 ${l.subItemId}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {subIt?.code} · {subContract?.name}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <input type="number" value={l.quantity}
                        onChange={e => updateQty(l.id, Number(e.target.value) || 0)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-center font-mono focus:outline-none focus:border-emerald-500" />
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-500">{l.createdAt}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => doUnlink(l.id)}
                        className="text-rose-600 hover:underline flex items-center gap-0.5 font-bold text-xs cursor-pointer mx-auto">
                        <Trash2 size={12} /> 解除
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pairLinks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-xs">
                    <Link2 size={24} className="mx-auto mb-2 text-slate-300" />
                    该收入合同与该分包合同之间暂无挂接关系，勾选两侧细目后点击「挂接所选细目」
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3.5 bg-slate-50 border-t border-gray-200 text-xs text-slate-500 leading-relaxed">
          说明：挂接支持多对多 —— 一个收入合同可与多个分包合同挂接（切换不同分包合同继续操作即可），一个分包合同也可与多个收入合同挂接。
          同一对细目间不会重复建立挂接；更换收入合同或分包合同后可查看/维护其他合同对之间的关系。
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        )}>
          {toast.type === 'success' ? <Link2 size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
