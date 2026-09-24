/**
 * 计量数据池（v2 重构）
 *  - 按合同归类（按合同编号排序），合同下可申报计量的清单默认收起，
 *    点击合同行「展开清单」展开该合同子目（按章节层级：100总则 / 200路基 / 300路面 / …）
 *  - 合同行汇总信息：可计量子目数、可申报计量金额（未上报价值）、历史已申报计量、有批复计量
 *  - 主列表仅展示「可计量」子目（正式·合同内）；合同外 / 临时子目不在主列表展示，
 *    其施工量经「转入正式」计入正式·合同内后参与计量
 *  - 支持在合同下直接「发起计量」（分步向导：选时段子目 → 调整 → 预览 → 创建）
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtNum, fmtMoney,
} from './_shared';
import type { MeasurePoolItem, PoolListType, PoolContractAttr, MeasureTransferLog } from './types';
import {
  getPool, getMeasureContracts, upsertPoolItem, deletePoolItem, transferToFormal,
  builtQty, unreportedQty, unapprovedQty, canMeasure, getTransfers,
  chapterOf, chapterName,
} from './measureStore';
import StatementWizard from './StatementWizard';

interface Props { key?: string | number; onRefresh?: () => void; }

export default function MeasurePool({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const pool = useMemo(() => getPool(), [version]);
  const transfers = useMemo(() => getTransfers(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);

  const [kw, setKw] = useState('');
  const [contractId, setContractId] = useState('');
  const [onlyUnreported, setOnlyUnreported] = useState(false);  // 仅看有未计量量的子目

  // 子目编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<MeasurePoolItem>>({});

  // 转入正式弹窗
  const [transferOpen, setTransferOpen] = useState(false);
  const [tf, setTf] = useState({ fromId: '', toId: '', qty: 0, operator: '陈技术' });

  // 转入记录弹窗
  const [logsOpen, setLogsOpen] = useState(false);

  // 发起计量向导（contractId 为空表示关闭）
  const [wizardContract, setWizardContract] = useState<string | null>(null);

  // 合同清单展开状态（默认收起，点击合同行「展开清单」展开该合同下可申报计量的清单）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (cid: string) => setExpanded(e => ({ ...e, [cid]: !e[cid] }));

  /** 主列表：仅可计量（正式·合同内）子目 */
  const measurableItems = pool.filter(p => {
    if (!canMeasure(p)) return false;
    if (contractId && p.contractId !== contractId) return false;
    if (onlyUnreported && unreportedQty(p) <= 0) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(p.code.toLowerCase().includes(k) || p.name.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  /** 按合同 → 章节两级分组（合同按合同编号排序） */
  const grouped = useMemo(() => {
    const byContract = new Map<string, MeasurePoolItem[]>();
    for (const p of measurableItems) {
      if (!byContract.has(p.contractId)) byContract.set(p.contractId, []);
      byContract.get(p.contractId)!.push(p);
    }
    return [...byContract.entries()].map(([cid, items]) => {
      const byChapter = new Map<string, MeasurePoolItem[]>();
      for (const p of items) {
        const ch = chapterOf(p.code);
        if (!byChapter.has(ch)) byChapter.set(ch, []);
        byChapter.get(ch)!.push(p);
      }
      const chapters = [...byChapter.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      return { cid, items, chapters };
    }).sort((a, b) => {
      const ca = contracts.find(x => x.id === a.cid)?.code || a.cid;
      const cb = contracts.find(x => x.id === b.cid)?.code || b.cid;
      return ca.localeCompare(cb);
    });
  }, [measurableItems, contracts]);

  // 汇总
  const allMeasurable = pool.filter(canMeasure);
  const totalUnreportedValue = allMeasurable.reduce((s, p) => s + unreportedQty(p) * p.price, 0);
  const totalUnapprovedValue = allMeasurable.reduce((s, p) => s + unapprovedQty(p) * p.price, 0);
  const contractCount = new Set(allMeasurable.map(p => p.contractId)).size;

  const openEdit = (p: MeasurePoolItem) => { setEdit({ ...p }); setEditOpen(true); };

  const save = () => {
    if (!edit.code || !edit.name) { toast('请填写子目号与子目名称', 'error'); return; }
    if (!edit.contractId) { toast('请选择合同', 'error'); return; }
    const c = contracts.find(x => x.id === edit.contractId)!;
    const item: MeasurePoolItem = {
      ...(edit as MeasurePoolItem),
      contractCode: c.code, contractName: c.name, projectName: c.projectName,
      isSafeFee: edit.isSafeFee,
    };
    upsertPoolItem(item);
    refresh();
    setEditOpen(false);
    const measurable = item.listType === 'formal' && item.contractAttr === 'in';
    toast(measurable ? '数据池子目已保存（可计量）' : '子目已保存（临时/合同外子目不在主列表展示，可经「转入正式」参与计量）', 'success');
  };

  const doDelete = (p: MeasurePoolItem) => {
    if (builtQty(p) > 0 && !confirm(`子目 ${p.code} 存在已施工量，确定删除？`)) return;
    deletePoolItem(p.id);
    refresh();
    toast('子目已删除', 'success');
  };

  const openTransfer = (fromId?: string) => {
    const sources = pool.filter(p => !canMeasure(p));
    const targets = pool.filter(canMeasure);
    if (sources.length === 0) { toast('无临时/合同外子目可转入', 'error'); return; }
    if (targets.length === 0) { toast('无正式·合同内子目可作为转入目标', 'error'); return; }
    setTf({ fromId: fromId || sources[0].id, toId: '', qty: 0, operator: '陈技术' });
    setTransferOpen(true);
  };

  const doTransfer = () => {
    if (!tf.fromId || !tf.toId) { toast('请选择源子目与目标子目', 'error'); return; }
    const err = transferToFormal(tf.fromId, tf.toId, Number(tf.qty) || 0, tf.operator);
    if (err) { toast(err, 'error'); return; }
    refresh();
    setTransferOpen(false);
    toast(`已转入正式：${tf.qty}（已计入目标子目临时转入构成，可参与计量）`, 'success');
  };

  const tfSources = pool.filter(p => !canMeasure(p));
  const tfTargets = pool.filter(canMeasure);
  const tfFrom = pool.find(p => p.id === tf.fromId);
  const tfMaxQty = tfFrom ? builtQty(tfFrom) - tfFrom.transferredQty : 0;

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">可计量合同</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{contractCount} <span className="text-sm font-normal text-slate-400">份</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">可计量子目（正式·合同内）</div>
          <div className="text-2xl font-bold text-violet-600 tabular-nums">{allMeasurable.length} <span className="text-sm font-normal text-slate-400">项</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">未上报计量量价值</div>
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{fmtMoney(totalUnreportedValue)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">未批复计量量价值</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{fmtMoney(totalUnapprovedValue)}</div>
        </div>
      </div>

      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="子目号 / 名称" className="!w-44" />
        <Select value={contractId} onChange={setContractId} placeholder="全部合同" className="!w-56"
          options={contracts.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))} />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={onlyUnreported} onChange={e => setOnlyUnreported(e.target.checked)} className="accent-violet-600" />
          仅看有未计量量
        </label>
        <button className={M.button.tinyViolet} onClick={() => openTransfer()}>⇄ 转入正式</button>
        <button className={M.button.tiny} onClick={() => setLogsOpen(true)}>转入记录</button>
      </SearchBar>

      {/* 按合同 → 章节层级展示（仅可计量子目） */}
      {grouped.map(({ cid, items, chapters }) => {
        const c = contracts.find(x => x.id === cid);
        // 合同级汇总（不受搜索/筛选影响）：可计量子目数、可申报计量金额、历史已申报计量、有批复计量
        const cItems = pool.filter(p => p.contractId === cid && canMeasure(p));
        const unrepValue = cItems.reduce((s, p) => s + unreportedQty(p) * p.price, 0);
        const reportedValue = cItems.reduce((s, p) => s + (p.reportedQty || 0) * p.price, 0);
        const approvedValue = cItems.reduce((s, p) => s + (p.approvedQty || 0) * p.price, 0);
        const isOpen = !!expanded[cid];
        return (
          <div key={cid} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            {/* 合同头（汇总信息 + 展开/收起清单 + 发起计量） */}
            <div className="px-4 py-3 bg-violet-50/60 border-b border-violet-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-4 bg-violet-500 rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{c?.name || items[0].contractName}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {c?.code} · {items[0].projectName} · 业主：{c?.ownerName}
                    {c?.ownerType === 'jtou' ? '（交投·推送批复）' : '（其他·自闭环）'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">可计量子目</div>
                    <div className="text-sm font-bold text-violet-600 tabular-nums">{cItems.length} <span className="text-[11px] font-normal text-slate-400">项</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">可申报计量金额</div>
                    <div className="text-sm font-bold text-orange-600 tabular-nums">{fmtMoney(unrepValue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">历史已申报计量</div>
                    <div className="text-sm font-bold text-sky-600 tabular-nums">{fmtMoney(reportedValue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">有批复计量</div>
                    <div className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(approvedValue)}</div>
                  </div>
                </div>
                <button className={M.button.tiny} onClick={() => toggleExpand(cid)}>{isOpen ? '收起清单' : '展开清单'}</button>
                <button className={M.button.primary} onClick={() => setWizardContract(cid)}>发起计量</button>
              </div>
            </div>
            {/* 章节层级清单（默认收起，点击合同行「展开清单」展开） */}
            {isOpen && (
            <div className="overflow-x-auto">
              <table className={M.table}>
                <thead>
                  <tr>
                    <th className={M.th}>子目号</th>
                    <th className={M.th}>子目名称</th>
                    <th className={`${M.th} text-right`}>子目总量</th>
                    <th className={`${M.th} text-right`}>已施工量</th>
                    <th className={`${M.th} text-right`}>已上报</th>
                    <th className={`${M.th} text-right`}>未上报计量量</th>
                    <th className={`${M.th} text-right`}>已批复</th>
                    <th className={`${M.th} text-right`}>未批复</th>
                    <th className={M.th}>完成批次（时间段）</th>
                    <th className={`${M.th} text-center`}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chapters.map(([ch, chItems]) => (
                    <React.Fragment key={ch || 'other'}>
                      {/* 章节层级行 */}
                      <tr className="bg-slate-50/80">
                        <td colSpan={10} className="px-3 py-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <span className="w-1 h-3 bg-violet-400 rounded-full inline-block" />
                            章节 {ch || '—'} · {chapterName(ch)}
                            <span className="text-slate-400 font-normal">
                              （{chItems.length} 子目 · 合同价 {fmtMoney(chItems.reduce((s, p) => s + (p.totalQty || 0) * p.price, 0))}
                              · 未上报价值 {fmtMoney(chItems.reduce((s, p) => s + unreportedQty(p) * p.price, 0))}）
                            </span>
                          </div>
                        </td>
                      </tr>
                      {chItems.map(p => {
                        const lastBatch = p.completionBatches?.length
                          ? p.completionBatches[p.completionBatches.length - 1] : null;
                        return (
                          <tr key={p.id} className={`hover:bg-violet-50/40 transition-colors ${unreportedQty(p) <= 0 ? 'opacity-60' : ''}`}>
                            <td className={`${M.td} font-mono font-medium text-violet-700`}>
                              {p.code}
                              {p.isSafeFee && <div className="mt-0.5"><TypePill text="安全生产费" tone="cyan" /></div>}
                            </td>
                            <td className={M.td}>
                              <div className="font-medium text-slate-800">{p.name}</div>
                              <div className="text-[11px] text-slate-400">{p.unit} · 单价 {fmtMoney(p.price)}</div>
                            </td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.totalQty)}</td>
                            <td className={`${M.td} text-right tabular-nums font-medium text-slate-800`}>
                              {fmtNum(builtQty(p))}
                              <div className="text-[10px] text-slate-400 font-normal">报工{fmtNum(p.logQty)}/手动{fmtNum(p.manualQty)}/转入{fmtNum(p.transferInQty)}</div>
                            </td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.reportedQty)}</td>
                            <td className={`${M.td} text-right tabular-nums font-bold ${unreportedQty(p) > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                              {fmtNum(unreportedQty(p))}
                            </td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.approvedQty)}</td>
                            <td className={`${M.td} text-right tabular-nums font-medium text-amber-600`}>{fmtNum(unapprovedQty(p))}</td>
                            <td className={`${M.td} text-[11px] text-slate-500`}>
                              {p.completionBatches?.length
                                ? `${p.completionBatches.length} 批 · 最近 ${lastBatch?.date}（${fmtNum(lastBatch?.qty)}）`
                                : '—'}
                            </td>
                            <td className={`${M.td} text-center`}>
                              <div className="flex items-center justify-center gap-1">
                                <button className={M.button.tiny} onClick={() => openEdit(p)}>维护</button>
                                <button className="px-2 py-1 rounded text-[12px] border border-rose-300 text-rose-600 hover:bg-rose-50 transition"
                                  onClick={() => doDelete(p)}>删</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })}
      {grouped.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
          暂无符合条件的可计量子目（主列表仅展示 正式·合同内 子目；子目由合同清单同步，不可手动新增；临时/合同外施工量请经「转入正式」后参与计量）
        </div>
      )}

      {/* 口径说明 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
        <b className="text-slate-700">计量口径（方案表5-1）：</b>
        已施工量 = 施工日志报工 + 手动计入产值 + 临时转入；未上报计量量 = 已施工量 − 已上报计量量；未批复计量量 = 已上报计量量 − 已批复计量量。
        <b className="text-slate-700">数据池展示范围：</b>仅可计量（正式·合同内）子目按合同分组（按合同编号排序）→ 章节层级展示；
        合同下清单默认收起，点击合同行「展开清单」查看；合同行汇总可计量子目数、可申报计量金额（未上报价值）、历史已申报计量、有批复计量；
        合同外 / 临时清单子目不在主列表展示，经「转入正式」后计入目标子目参与计量。
        <b className="text-slate-700">子目来源：</b>数据池子目由合同清单同步维护，不支持手动新增；发起计量时在弹窗内从该合同的合同清单中选择子目，选中后可编辑数量。
        <b className="text-slate-700">发起计量：</b>选择合同 → 在弹窗中从合同清单选择子目（添加后默认带入全部已施工数量，可编辑数量/变更金额；也可在已选栏目点击「添加其他子目」调取该合同合同清单选择并编辑数量）→ 预览（章节汇总+子目明细）→ 手填扣款 → 确认创建。
      </div>

      {/* 发起计量向导（预选合同，直接进入选子目步骤） */}
      {wizardContract && (
        <StatementWizard
          key={wizardContract}
          defaultContractId={wizardContract}
          onClose={() => setWizardContract(null)}
          onDone={() => { setWizardContract(null); refresh(); }}
        />
      )}

      {/* 子目维护弹窗（仅维护已有子目；新增子目请在「发起计量」弹窗中从合同清单选择，不可自行创建） */}
      <Modal title={`维护子目 ${edit.code || ''}`} open={editOpen}
        onClose={() => setEditOpen(false)} width="max-w-3xl"
        footer={<>
          <button className={M.button.ghost} onClick={() => setEditOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={save}>保存</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={M.label}>所属合同 *</label>
              <Select value={edit.contractId || ''} onChange={v => setEdit({ ...edit, contractId: v })}
                options={contracts.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))} />
            </div>
            <div>
              <label className={M.label}>子目号 *</label>
              <Input value={edit.code || ''} onChange={v => setEdit({ ...edit, code: v })} placeholder="如 202-1-a" />
            </div>
            <div>
              <label className={M.label}>子目名称 *</label>
              <Input value={edit.name || ''} onChange={v => setEdit({ ...edit, name: v })} />
            </div>
            <div>
              <label className={M.label}>单位</label>
              <Input value={edit.unit || ''} onChange={v => setEdit({ ...edit, unit: v })} />
            </div>
            <div>
              <label className={M.label}>综合单价(元)</label>
              <Input type="number" step="0.01" value={edit.price ?? 0} onChange={v => setEdit({ ...edit, price: Number(v) || 0 })} />
            </div>
            <div>
              <label className={M.label}>子目总量</label>
              <Input type="number" step="any" value={edit.totalQty ?? 0} onChange={v => setEdit({ ...edit, totalQty: Number(v) || 0 })} />
            </div>
            <div>
              <label className={M.label}>清单类型</label>
              <Select value={edit.listType || 'formal'} onChange={v => setEdit({ ...edit, listType: v as PoolListType })}
                options={[{ value: 'formal', label: '正式' }, { value: 'temp', label: '临时' }]} />
            </div>
            <div>
              <label className={M.label}>合同属性</label>
              <Select value={edit.contractAttr || 'in'} onChange={v => setEdit({ ...edit, contractAttr: v as PoolContractAttr })}
                options={[{ value: 'in', label: '合同内' }, { value: 'out', label: '合同外' }]} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input type="checkbox" checked={!!edit.isSafeFee} onChange={e => setEdit({ ...edit, isSafeFee: e.target.checked })} className="accent-cyan-600" />
                安全生产费子目
              </label>
            </div>
          </div>

          <div>
            <div className={M.sectionTitle}>已施工量构成</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={M.label}>施工日志报工</label>
                <Input type="number" step="any" value={edit.logQty ?? 0} onChange={v => setEdit({ ...edit, logQty: Number(v) || 0 })} />
              </div>
              <div>
                <label className={M.label}>手动计入产值</label>
                <Input type="number" step="any" value={edit.manualQty ?? 0} onChange={v => setEdit({ ...edit, manualQty: Number(v) || 0 })} />
              </div>
              <div className="text-xs text-slate-400 flex items-end pb-2">
                临时转入 = {fmtNum(edit.transferInQty)}（由转入正式操作自动累计，不可直接编辑）
              </div>
            </div>
          </div>

          <div>
            <div className={M.sectionTitle}>计量与分包（仅正式·合同内参与计量）</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={M.label}>已上报计量量</label>
                <Input type="number" step="any" value={edit.reportedQty ?? 0} onChange={v => setEdit({ ...edit, reportedQty: Number(v) || 0 })} />
              </div>
              <div>
                <label className={M.label}>已批复计量量</label>
                <Input type="number" step="any" value={edit.approvedQty ?? 0} onChange={v => setEdit({ ...edit, approvedQty: Number(v) || 0 })} />
              </div>
              <div>
                <label className={M.label}>分包结算量</label>
                <Input type="number" step="any" value={edit.subcontractQty ?? 0} onChange={v => setEdit({ ...edit, subcontractQty: Number(v) || 0 })} />
              </div>
              <div>
                <label className={M.label}>备注</label>
                <Input value={edit.remark || ''} onChange={v => setEdit({ ...edit, remark: v })} />
              </div>
            </div>
          </div>

          {edit.id && (
            <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              当前口径：已施工 {fmtNum((edit.logQty || 0) + (edit.manualQty || 0) + (edit.transferInQty || 0))} ·
              未上报计量 {fmtNum((edit.logQty || 0) + (edit.manualQty || 0) + (edit.transferInQty || 0) - (edit.reportedQty || 0))} ·
              未批复 {fmtNum((edit.reportedQty || 0) - (edit.approvedQty || 0))}
            </div>
          )}
        </div>
      </Modal>

      {/* 转入正式弹窗 */}
      <Modal title="转入正式（临时/合同外 → 正式·合同内）" open={transferOpen}
        onClose={() => setTransferOpen(false)} width="max-w-xl"
        footer={<>
          <button className={M.button.ghost} onClick={() => setTransferOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doTransfer}>确认转入</button>
        </>}>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 leading-relaxed">
            临时/合同外清单的施工量<b>不能直接发起计量</b>；转入正式·合同内清单后，计入目标子目的「临时转入」构成，方作为可计量工程量参与申报。
          </div>
          <div>
            <label className={M.label}>源子目（临时 / 合同外）*</label>
            <Select value={tf.fromId} onChange={v => setTf({ ...tf, fromId: v, toId: '' })}
              options={tfSources.map(p => ({
                value: p.id,
                label: `${p.code} ${p.name}（可转 ${fmtNum(builtQty(p) - p.transferredQty)} ${p.unit}）`,
              }))} />
          </div>
          <div>
            <label className={M.label}>目标子目（正式·合同内）*</label>
            <Select value={tf.toId} onChange={v => setTf({ ...tf, toId: v })}
              options={tfTargets.filter(p => p.contractId === tfFrom?.contractId).map(p => ({
                value: p.id, label: `${p.code} ${p.name}（同合同）`,
              }))} />
            {tfFrom && tfTargets.filter(p => p.contractId === tfFrom.contractId).length === 0 && (
              <div className="text-xs text-rose-500 mt-1">该合同下暂无正式·合同内子目（子目由合同清单同步，不可手动新增）</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={M.label}>转入数量（≤ {fmtNum(tfMaxQty)}）*</label>
              <Input type="number" step="any" value={tf.qty} onChange={v => setTf({ ...tf, qty: Number(v) || 0 })} />
            </div>
            <div>
              <label className={M.label}>经办人</label>
              <Input value={tf.operator} onChange={v => setTf({ ...tf, operator: v })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* 转入记录弹窗 */}
      <Modal title="清单转移记录" open={logsOpen} onClose={() => setLogsOpen(false)} width="max-w-2xl"
        footer={<button className={M.button.ghost} onClick={() => setLogsOpen(false)}>关闭</button>}>
        {transfers.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">暂无转入记录</div>
        ) : (
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>时间</th>
                <th className={M.th}>源子目(临时/合同外)</th>
                <th className={M.th}>→ 目标子目(正式·合同内)</th>
                <th className={`${M.th} text-right`}>转入量</th>
                <th className={M.th}>经办人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t: MeasureTransferLog) => (
                <tr key={t.id}>
                  <td className={`${M.td} font-mono text-xs`}>{t.createdAt}</td>
                  <td className={M.td}><span className="font-mono text-amber-700">{t.fromCode}</span> {t.fromName}</td>
                  <td className={M.td}><span className="font-mono text-emerald-700">{t.toCode}</span> {t.toName}</td>
                  <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtNum(t.qty)}</td>
                  <td className={M.td}>{t.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
