/**
 * 材料合同
 * 合同数据来源于材料管理系统（同步展示），可查看合同明细及执行情况（累计采购入库）
 * 采购入库「合同来源」可选择本模块同步的材料合同
 */

import React, { useMemo, useState } from 'react';
import {
  C, Modal, SearchBar, Input, Select, TypePill, useToast,
} from './_shared';
import type { MaterialContract, MaterialContractStatus } from './materialContractStore';
import {
  getMaterialContracts, syncMaterialContract, getContractExecution,
  materialContractStatusLabel,
} from './materialContractStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const fmtMoney = (n: number) => `¥${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaterialContractManager({ onRefresh }: Props) {
  const [list, setList] = useState<MaterialContract[]>(() => getMaterialContracts());
  const [version, setVersion] = useState(0);
  const refresh = () => { setList(getMaterialContracts()); setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();
  const [kw, setKw] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<MaterialContract | null>(null);

  const suppliers = useMemo(() =>
    [...new Set(list.map(c => c.supplier))].sort(), [list]);

  const filtered = useMemo(() => list.filter(c => {
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(c.code.toLowerCase().includes(k) || c.name.toLowerCase().includes(k) || (c.projectName || '').toLowerCase().includes(k))) return false;
    }
    if (supplier && c.supplier !== supplier) return false;
    if (status && c.status !== status) return false;
    return true;
  }), [list, kw, supplier, status]);

  const totalAmount = filtered.reduce((s, c) => s + c.amount, 0);
  const activeCount = filtered.filter(c => c.status === 'active').length;

  const handleSync = () => {
    const mc = syncMaterialContract();
    refresh();
    toast(`已从材料管理系统同步合同：【${mc.code}】${mc.name}`, 'success');
  };

  const statusTone = (s: MaterialContractStatus) =>
    s === 'active' ? 'emerald' : s === 'completed' ? 'slate' : 'rose';

  // 详情视图的执行情况（依赖 version 触发重算）
  const execution = useMemo(
    () => (view ? getContractExecution(view.id) : null), [view, version]);

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">合同数量</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">合同总金额(元)</div>
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{fmtMoney(totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">执行中</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{activeCount} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">供应商数量</div>
          <div className="text-2xl font-bold text-cyan-600 tabular-nums">{suppliers.length} <span className="text-sm font-normal text-slate-400">家</span></div>
        </div>
      </div>

      <SearchBar onAdd={handleSync} addLabel="↻ 同步材料合同">
        <Input value={kw} onChange={setKw} placeholder="合同编号 / 名称 / 项目" className="!w-56" />
        <Select value={supplier} onChange={setSupplier} placeholder="全部供应商" className="!w-48"
          options={suppliers.map(s => ({ value: s, label: s }))} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-32"
          options={[
            { value: 'active', label: '执行中' },
            { value: 'completed', label: '已完成' },
            { value: 'terminated', label: '已终止' },
          ]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={C.table}>
            <thead>
              <tr>
                <th className={`${C.th} w-12 text-center`}>序号</th>
                <th className={C.th}>合同编号 / 名称</th>
                <th className={C.th}>供应商</th>
                <th className={`${C.th} text-right`}>合同金额(元)</th>
                <th className={`${C.th} text-right`}>累计入库金额(元)</th>
                <th className={`${C.th} text-center`}>执行进度</th>
                <th className={`${C.th} text-center`}>履约期</th>
                <th className={`${C.th} text-center`}>状态</th>
                <th className={`${C.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, i) => {
                const exec = getContractExecution(c.id);
                const pct = c.amount > 0 ? Math.min(100, Math.round(exec.totalAmount / c.amount * 100)) : 0;
                return (
                  <tr key={c.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className={`${C.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={C.td}>
                      <button className="font-medium text-slate-800 hover:text-orange-600 hover:underline"
                        onClick={() => setView(c)}>{c.name}</button>
                      <div className="text-xs text-slate-500 font-mono">{c.code}</div>
                    </td>
                    <td className={C.td}>{c.supplier}</td>
                    <td className={`${C.td} text-right tabular-nums font-medium`}>{fmtMoney(c.amount)}</td>
                    <td className={`${C.td} text-right tabular-nums ${exec.totalAmount > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
                      {exec.totalAmount > 0 ? fmtMoney(exec.totalAmount) : '暂无入库'}
                    </td>
                    <td className={`${C.td} text-center`}>
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">{pct}%</span>
                      </div>
                    </td>
                    <td className={`${C.td} text-center text-xs text-slate-500 font-mono`}>{c.startDate} ~ {c.endDate}</td>
                    <td className={`${C.td} text-center`}>
                      <TypePill text={materialContractStatusLabel(c.status)} tone={statusTone(c.status) as 'emerald' | 'slate' | 'rose'} />
                    </td>
                    <td className={`${C.td} text-center`}>
                      <button className={C.button.tiny} onClick={() => setView(c)}>查看详情</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className={`${C.td} text-center text-slate-400 py-10`}>
                  暂无材料合同数据，点击「同步材料合同」从材料管理系统同步
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：材料合同由材料管理系统同步产生，采购入库选择「材料合同」来源时可引用；执行进度 = 累计入库金额 ÷ 合同金额。
        </div>
      </div>

      {/* 合同详情弹窗 */}
      <Modal title={`材料合同详情 - ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-4xl"
        footer={<button className={C.button.ghost} onClick={() => setView(null)}>关闭</button>}>
        {view && (
          <div className="space-y-5">
            {/* 基本信息 */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {([
                ['合同名称', view.name], ['合同编号', view.code],
                ['甲方(购买方)', view.buyer], ['乙方(供应商)', view.supplier],
                ['合同金额', fmtMoney(view.amount)], ['关联项目', view.projectName || '-'],
                ['签订日期', view.signDate], ['履约起止', `${view.startDate} ~ ${view.endDate}`],
                ['同步时间', view.syncedAt],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className="font-medium text-slate-800">{value}</div>
                </div>
              ))}
              <div>
                <div className="text-xs text-slate-500 mb-0.5">状态</div>
                <TypePill text={materialContractStatusLabel(view.status)} tone={statusTone(view.status) as 'emerald' | 'slate' | 'rose'} />
              </div>
            </div>

            {/* 执行情况 */}
            <div>
              <div className={C.sectionTitle}>执行情况（累计采购入库）</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <div className="text-xs text-orange-700/70">入库单数</div>
                  <div className="text-lg font-bold text-orange-700 tabular-nums">{execution?.orderCount ?? 0}</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <div className="text-xs text-orange-700/70">累计入库金额</div>
                  <div className="text-lg font-bold text-orange-700 tabular-nums">{fmtMoney(execution?.totalAmount ?? 0)}</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <div className="text-xs text-orange-700/70">剩余合同额</div>
                  <div className="text-lg font-bold text-orange-700 tabular-nums">{fmtMoney(view.amount - (execution?.totalAmount ?? 0))}</div>
                </div>
              </div>
              {execution && execution.orders.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className={C.table}>
                    <thead>
                      <tr>
                        <th className={C.th}>入库单号</th>
                        <th className={C.th}>入库日期</th>
                        <th className={C.th}>仓库名称</th>
                        <th className={C.th}>状态</th>
                        <th className={`${C.th} text-right`}>价税合计(元)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {execution.orders.map(o => (
                        <tr key={o.id}>
                          <td className={`${C.td} font-mono`}>{o.code}</td>
                          <td className={C.td}>{o.docDate}</td>
                          <td className={C.td}>{o.warehouseId || '-'}</td>
                          <td className={C.td}>{o.status}</td>
                          <td className={`${C.td} text-right tabular-nums`}>{fmtMoney(o.totalAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 合同材料明细 */}
            <div>
              <div className={C.sectionTitle}>合同材料明细（{view.lines.length} 项）</div>
              {view.lines.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className={C.table}>
                    <thead>
                      <tr>
                        <th className={C.th}>材料编码</th>
                        <th className={C.th}>材料名称</th>
                        <th className={C.th}>规格</th>
                        <th className={`${C.th} text-center`}>单位</th>
                        <th className={`${C.th} text-right`}>含税单价</th>
                        <th className={`${C.th} text-right`}>约定数量</th>
                        <th className={`${C.th} text-right`}>合价(元)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {view.lines.map(l => (
                        <tr key={l.id}>
                          <td className={`${C.td} font-mono text-slate-500`}>{l.materialCode}</td>
                          <td className={`${C.td} font-medium`}>{l.materialName}</td>
                          <td className={C.td}>{l.spec || '-'}</td>
                          <td className={`${C.td} text-center`}>{l.unit}</td>
                          <td className={`${C.td} text-right tabular-nums`}>{l.price.toLocaleString()}</td>
                          <td className={`${C.td} text-right tabular-nums`}>{l.quantity.toLocaleString()}</td>
                          <td className={`${C.td} text-right tabular-nums font-medium`}>{fmtMoney(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg py-6 text-center">
                  该合同未同步到材料明细
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
