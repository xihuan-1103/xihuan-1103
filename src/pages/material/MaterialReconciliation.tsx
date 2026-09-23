/**
 * 材料对账
 *  - 生成对账单：选择材料合同 + 对账期间 → 自动汇总该期间该合同的采购入库明细
 *  - 对账单列表：期间/合同/供应商/入库金额/结算金额/差异/状态
 *  - 对账确认：核对结算金额（可调整）→ 确认后归档（与供应商双方对账一致）
 */

import React, { useMemo, useState } from 'react';
import {
  C, Modal, SearchBar, Input, Select, TypePill, useToast,
} from './_shared';
import type { MaterialContract, ReconStatement } from './materialContractStore';
import {
  getMaterialContracts, getReconStatements, buildReconStatement,
  addReconStatement, confirmReconStatement, deleteReconStatement,
} from './materialContractStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const fmtMoney = (n: number) => `¥${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function MaterialReconciliation({ onRefresh }: Props) {
  const [list, setList] = useState<ReconStatement[]>(() => getReconStatements());
  const [contracts] = useState<MaterialContract[]>(() => getMaterialContracts());
  const refresh = () => { setList(getReconStatements()); onRefresh?.(); };
  const toast = useToast();

  const [period, setPeriod] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');

  // 生成对账单弹窗
  const [genOpen, setGenOpen] = useState(false);
  const [genContractId, setGenContractId] = useState('');
  const [genPeriod, setGenPeriod] = useState(currentPeriod());

  // 详情/确认弹窗
  const [view, setView] = useState<ReconStatement | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [remark, setRemark] = useState('');

  const suppliers = useMemo(() =>
    [...new Set(list.map(r => r.supplier))].sort(), [list]);

  const filtered = useMemo(() => list.filter(r => {
    if (period && !r.period.startsWith(period)) return false;
    if (supplier && r.supplier !== supplier) return false;
    if (status && r.status !== status) return false;
    return true;
  }).sort((a, b) => (b.period + b.code).localeCompare(a.period + a.code)), [list, period, supplier, status]);

  const totalIn = filtered.reduce((s, r) => s + r.inAmount, 0);
  const pendingCount = filtered.filter(r => r.status === 'pending').length;
  const totalDiff = filtered.reduce((s, r) => s + (r.settleAmount - r.inAmount), 0);

  const openGen = () => {
    setGenContractId(contracts[0]?.id || '');
    setGenPeriod(currentPeriod());
    setGenOpen(true);
  };

  /** 生成前预览：该合同该期间的入库单数与金额 */
  const genPreview = useMemo(() => {
    if (!genContractId || !genPeriod) return null;
    const st = buildReconStatement(contracts.find(c => c.id === genContractId)!, genPeriod);
    // buildReconStatement 对已存在的返回 null，需区分「无数据」与「已存在」
    return st;
  }, [genContractId, genPeriod, contracts]);

  const genExists = useMemo(() =>
    list.some(r => r.contractId === genContractId && r.period === genPeriod),
    [list, genContractId, genPeriod]);

  const doGenerate = () => {
    const contract = contracts.find(c => c.id === genContractId);
    if (!contract) { toast('请选择材料合同', 'error'); return; }
    if (!genPeriod) { toast('请选择对账期间', 'error'); return; }
    const st = buildReconStatement(contract, genPeriod);
    if (!st) {
      toast(genExists ? '该合同该期间的对账单已存在' : '该合同在所选期间无采购入库数据，无法生成对账单', 'error');
      return;
    }
    addReconStatement(st);
    refresh();
    setGenOpen(false);
    toast(`对账单【${st.code}】已生成：${st.lines.length} 条明细，入库金额 ${fmtMoney(st.inAmount)}`, 'success');
  };

  const openView = (r: ReconStatement) => {
    setView(r);
    setSettleAmount(r.settleAmount);
    setRemark(r.remark || '');
  };

  const doConfirm = () => {
    if (!view) return;
    if (settleAmount < 0) { toast('结算金额不能为负数', 'error'); return; }
    confirmReconStatement(view.id, settleAmount, remark);
    refresh();
    toast(`对账单【${view.code}】已确认`, 'success');
    setView(null);
  };

  const doDelete = (r: ReconStatement) => {
    if (r.status === 'confirmed') { toast('已确认的对账单不可删除', 'error'); return; }
    if (confirm(`确定删除对账单【${r.code}】？`)) {
      deleteReconStatement(r.id);
      refresh();
      toast('对账单已删除', 'success');
    }
  };

  const diff = view ? Math.round((settleAmount - view.inAmount) * 100) / 100 : 0;

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">对账单数</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">待确认</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{pendingCount} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">对账入库总额(元)</div>
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{fmtMoney(totalIn)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">结算差异合计(元)</div>
          <div className={`text-2xl font-bold tabular-nums ${Math.abs(totalDiff) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmtMoney(totalDiff)}
          </div>
        </div>
      </div>

      <SearchBar onAdd={openGen} addLabel="+ 生成对账单">
        <Input type="month" value={period} onChange={setPeriod} placeholder="对账期间" className="!w-36" />
        <Select value={supplier} onChange={setSupplier} placeholder="全部供应商" className="!w-48"
          options={suppliers.map(s => ({ value: s, label: s }))} />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-32"
          options={[
            { value: 'pending', label: '待确认' },
            { value: 'confirmed', label: '已确认' },
          ]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={C.table}>
            <thead>
              <tr>
                <th className={`${C.th} w-12 text-center`}>序号</th>
                <th className={C.th}>对账单号</th>
                <th className={`${C.th} text-center`}>对账期间</th>
                <th className={C.th}>材料合同</th>
                <th className={C.th}>供应商</th>
                <th className={`${C.th} text-center`}>明细条数</th>
                <th className={`${C.th} text-right`}>本期入库金额(元)</th>
                <th className={`${C.th} text-right`}>本期结算金额(元)</th>
                <th className={`${C.th} text-right`}>差异(元)</th>
                <th className={`${C.th} text-center`}>状态</th>
                <th className={`${C.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const d = Math.round((r.settleAmount - r.inAmount) * 100) / 100;
                return (
                  <tr key={r.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className={`${C.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={C.td}>
                      <button className="font-medium text-slate-800 hover:text-orange-600 hover:underline font-mono"
                        onClick={() => openView(r)}>{r.code}</button>
                    </td>
                    <td className={`${C.td} text-center font-mono`}>{r.period}</td>
                    <td className={C.td}>
                      <div className="font-medium">{r.contractName}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.contractCode}</div>
                    </td>
                    <td className={C.td}>{r.supplier}</td>
                    <td className={`${C.td} text-center tabular-nums`}>{r.lines.length}</td>
                    <td className={`${C.td} text-right tabular-nums font-medium`}>{fmtMoney(r.inAmount)}</td>
                    <td className={`${C.td} text-right tabular-nums font-medium`}>{fmtMoney(r.settleAmount)}</td>
                    <td className={`${C.td} text-right tabular-nums ${Math.abs(d) > 0.01 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                      {Math.abs(d) > 0.01 ? fmtMoney(d) : '一致'}
                    </td>
                    <td className={`${C.td} text-center`}>
                      <TypePill text={r.status === 'confirmed' ? '已确认' : '待确认'}
                        tone={r.status === 'confirmed' ? 'emerald' : 'amber'} />
                    </td>
                    <td className={`${C.td} text-center`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button className={C.button.tiny} onClick={() => openView(r)}>查看{r.status === 'pending' ? '/对账' : ''}</button>
                        {r.status === 'pending' && (
                          <button className="px-2 py-1 rounded text-[12px] border border-rose-300 text-rose-600 hover:bg-rose-50 transition"
                            onClick={() => doDelete(r)}>删除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className={`${C.td} text-center text-slate-400 py-10`}>
                  暂无对账单，点击「生成对账单」按合同+期间汇总采购入库开始对账
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          说明：对账单按「材料合同 + 期间」自动汇总采购入库明细生成；与供应商核对结算金额（可调整）后确认归档，差异 = 结算金额 − 入库金额。
        </div>
      </div>

      {/* 生成对账单弹窗 */}
      <Modal title="生成对账单" open={genOpen} onClose={() => setGenOpen(false)} width="max-w-xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => setGenOpen(false)}>取消</button>
          <button className={C.button.primary} onClick={doGenerate}>生成对账单</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={C.label}>材料合同 *</label>
              <Select value={genContractId} onChange={setGenContractId} placeholder="选择材料合同"
                options={contracts.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))} />
            </div>
            <div>
              <label className={C.label}>对账期间 *</label>
              <Input type="month" value={genPeriod} onChange={setGenPeriod} />
            </div>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            系统将汇总该合同在所选期间内全部已提交/已审核的<b>采购入库单</b>明细，生成对账单快照。
          </div>
          {/* 预览 */}
          {genContractId && genPeriod && (
            <div className={`rounded-lg border p-3 text-sm ${genPreview ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
              {genPreview ? (
                <div className="space-y-1">
                  <div className="text-slate-700">供应商：<b>{genPreview.supplier}</b></div>
                  <div className="text-slate-700">汇总入库单 <b className="tabular-nums text-orange-700">{new Set(genPreview.lines.map(l => l.stockInCode)).size}</b> 张，明细 <b className="tabular-nums text-orange-700">{genPreview.lines.length}</b> 条</div>
                  <div className="text-slate-700">本期入库金额：<b className="tabular-nums text-orange-700">{fmtMoney(genPreview.inAmount)}</b></div>
                </div>
              ) : (
                <div className="text-slate-500">
                  {genExists ? '该合同该期间的对账单已存在' : '该合同在所选期间无采购入库数据，无法生成'}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 对账单详情/对账弹窗 */}
      <Modal title={`对账单 ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-4xl"
        footer={view?.status === 'pending' ? (<>
          <button className={C.button.ghost} onClick={() => setView(null)}>取消</button>
          <button className={C.button.primary} onClick={doConfirm}>确认对账</button>
        </>) : (
          <button className={C.button.ghost} onClick={() => setView(null)}>关闭</button>
        )}>
        {view && (
          <div className="space-y-5">
            {/* 头部信息 */}
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {([
                ['对账期间', view.period], ['材料合同', `${view.contractName}`],
                ['合同编号', view.contractCode], ['供应商', view.supplier],
                ['创建时间', view.createdAt],
                ['状态', view.status === 'confirmed' ? '已确认' : '待确认'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className="font-medium text-slate-800">{value}</div>
                </div>
              ))}
              {view.status === 'confirmed' && (
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">确认人/时间</div>
                  <div className="font-medium text-slate-800">{view.confirmedBy} · {view.confirmedAt}</div>
                </div>
              )}
            </div>

            {/* 对账明细 */}
            <div>
              <div className={C.sectionTitle}>对账明细（本期入库快照，{view.lines.length} 条）</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className={C.table}>
                  <thead className="sticky top-0">
                    <tr>
                      <th className={C.th}>入库单号</th>
                      <th className={C.th}>入库日期</th>
                      <th className={C.th}>材料</th>
                      <th className={`${C.th} text-center`}>单位</th>
                      <th className={`${C.th} text-right`}>数量</th>
                      <th className={`${C.th} text-right`}>价税合计(元)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {view.lines.map(l => (
                      <tr key={l.id}>
                        <td className={`${C.td} font-mono text-slate-600`}>{l.stockInCode}</td>
                        <td className={C.td}>{l.docDate}</td>
                        <td className={C.td}>
                          <div className="font-medium">{l.materialName}</div>
                          <div className="text-xs text-slate-500 font-mono">{l.materialCode}{l.spec ? ` · ${l.spec}` : ''}</div>
                        </td>
                        <td className={`${C.td} text-center`}>{l.unit}</td>
                        <td className={`${C.td} text-right tabular-nums`}>{l.quantity.toLocaleString()}</td>
                        <td className={`${C.td} text-right tabular-nums font-medium`}>{fmtMoney(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 对账核对 */}
            <div>
              <div className={C.sectionTitle}>对账核对</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">本期入库金额（我方账面）</div>
                  <div className="text-lg font-bold text-slate-800 tabular-nums">{fmtMoney(view.inAmount)}</div>
                </div>
                <div>
                  <label className={C.label}>本期结算金额（供应商账面，元）{view.status === 'pending' ? ' *' : ''}</label>
                  {view.status === 'pending' ? (
                    <Input type="number" value={settleAmount} onChange={v => setSettleAmount(Number(v) || 0)} />
                  ) : (
                    <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm font-bold tabular-nums">{fmtMoney(view.settleAmount)}</div>
                  )}
                </div>
                <div className={`rounded-lg p-3 border ${Math.abs(diff) > 0.01 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="text-xs text-slate-500 mb-1">对账差异</div>
                  <div className={`text-lg font-bold tabular-nums ${Math.abs(diff) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {Math.abs(diff) > 0.01 ? fmtMoney(diff) : '账实一致'}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className={C.label}>对账备注</label>
                {view.status === 'pending' ? (
                  <Input value={remark} onChange={setRemark} placeholder="对账说明（如差异原因）" />
                ) : (
                  <div className="text-sm text-slate-600">{view.remark || '-'}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
