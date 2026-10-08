/**
 * 计量数据池（v3 重构）
 *  - Tab 区分「主合同 / 协同合同」：
 *      主合同 = 当前单位为合同签订的主要单位；协同合同 = 当前单位为合同协同单位的合同
 *  - 主合同：按合同归类（按合同编号排序），合同下可申报计量的清单默认收起，
 *    点击合同行「展开清单」展开（按章节层级：100总则 / 200路基 / 300路面 / …）；
 *    子目区分「本组织完成 / 协同单位完成」两种来源，根据两个组织完成的量生成计量单
 *  - 协同合同：只可查看当前合同已完工未计量的量（只读确认）；
 *    选中子目后可推送到关联主合同（协同合同不直接生成计量单）；
 *    合同行提供「全部推送」：一键将该合同下全部有未推送量子目按同子目号推送到关联主合同
 *  - 主列表仅展示「可计量」子目（正式·合同内）；合同外 / 临时子目不在主列表展示
 *  - 支持 URL 参数 ?tab=coop 直达协同合同页签
 */

import React, { useMemo, useState } from 'react';
import {
  M, Modal, Input, Select, SearchBar, TypePill, useToast, fmtNum, fmtMoney,
} from './_shared';
import type { MeasurePoolItem, PoolListType, PoolContractAttr, CoopPushLog } from './types';
import {
  getPool, getMeasureContracts, upsertPoolItem, deletePoolItem,
  pushCoopToMain, getCoopPushes, pushAllCoopToMain,
  ownQty, coopBuiltQty, builtQty, unreportedQty, unapprovedQty, unpushedQty,
  canMeasure, chapterOf, chapterName,
} from './measureStore';
import StatementWizard from './StatementWizard';

interface Props { key?: string | number; onRefresh?: () => void; }

type PoolTab = 'main' | 'coop';

export default function MeasurePool({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const pool = useMemo(() => getPool(), [version]);
  const coopPushes = useMemo(() => getCoopPushes(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);

  // 页签：主合同 / 协同合同（支持 ?tab=coop 直达）
  const [tab, setTab] = useState<PoolTab>(() => {
    try {
      return new URLSearchParams(window.location.search).get('tab') === 'coop' ? 'coop' : 'main';
    } catch { return 'main'; }
  });

  const [kw, setKw] = useState('');
  const [contractId, setContractId] = useState('');

  // 子目编辑弹窗（仅主合同 tab）
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<MeasurePoolItem>>({});

  // 推送记录弹窗
  const [pushLogsOpen, setPushLogsOpen] = useState(false);

  // 推送到主合同弹窗（协同合同 tab）
  const [pushOpen, setPushOpen] = useState(false);
  const [pushFrom, setPushFrom] = useState<MeasurePoolItem | null>(null);
  const [pf, setPf] = useState({ toId: '', qty: 0, operator: '陈技术' });

  // 全部推送弹窗（协同合同行一键推送该合同下全部可推送子目到关联主合同）
  const [pushAllOpen, setPushAllOpen] = useState(false);
  const [pushAllC, setPushAllC] = useState<string>('');          // 协同合同 id
  const [pushAllOperator, setPushAllOperator] = useState('陈技术');

  // 发起计量向导（仅主合同；contractId 为空表示关闭；支持 ?wizc=<合同id> 直达打开，便于预览/分享）
  const [wizardContract, setWizardContract] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('wizc'));

  // 合同清单展开状态（默认收起，点击合同行「展开清单」展开该合同下可申报计量的清单）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (cid: string) => setExpanded(e => ({ ...e, [cid]: !e[cid] }));

  // 合同按页签分组：主合同 / 协同合同
  const mainContracts = useMemo(() => contracts.filter(c => c.role === 'main'), [contracts]);
  const coopContracts = useMemo(() => contracts.filter(c => c.role === 'coop'), [contracts]);
  const scopedContracts = tab === 'main' ? mainContracts : coopContracts;
  const scopedIds = useMemo(() => new Set(scopedContracts.map(c => c.id)), [scopedContracts]);

  /** 当前页签主列表：仅可计量（正式·合同内）子目 */
  const measurableItems = pool.filter(p => {
    if (!canMeasure(p)) return false;
    if (!scopedIds.has(p.contractId)) return false;
    if (contractId && p.contractId !== contractId) return false;
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

  // 汇总（按页签）
  const mainIds = useMemo(() => new Set(mainContracts.map(c => c.id)), [mainContracts]);
  const coopIds = useMemo(() => new Set(coopContracts.map(c => c.id)), [coopContracts]);
  const allMainMeasurable = pool.filter(p => canMeasure(p) && mainIds.has(p.contractId));
  const allCoopMeasurable = pool.filter(p => canMeasure(p) && coopIds.has(p.contractId));
  const totalUnreportedValue = allMainMeasurable.reduce((s, p) => s + unreportedQty(p) * p.price, 0);
  const totalCoopUnpushedValue = allCoopMeasurable.reduce((s, p) => s + unpushedQty(p) * p.price, 0);

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
    toast(measurable ? '数据池子目已保存（可计量）' : '子目已保存（临时/合同外子目不在主列表展示）', 'success');
  };

  const doDelete = (p: MeasurePoolItem) => {
    if (builtQty(p) > 0 && !confirm(`子目 ${p.code} 存在已施工量，确定删除？`)) return;
    deletePoolItem(p.id);
    refresh();
    toast('子目已删除', 'success');
  };

  // ===== 协同合同 → 主合同 推送 =====

  /** 推送目标：源协同合同关联主合同下 正式·合同内 子目（同子目号优先） */
  const pushTargets = useMemo(() => {
    if (!pushFrom) return [] as MeasurePoolItem[];
    const fromContract = contracts.find(c => c.id === pushFrom.contractId);
    const mainId = fromContract?.mainContractId;
    if (!mainId) return [];
    return pool.filter(p => p.contractId === mainId && canMeasure(p));
  }, [pushFrom, contracts, pool]);

  const openPush = (p: MeasurePoolItem) => {
    const fromContract = contracts.find(c => c.id === p.contractId);
    const mainId = fromContract?.mainContractId;
    if (!mainId) { toast('该协同合同未关联主合同，无法推送', 'error'); return; }
    const targets = pool.filter(x => x.contractId === mainId && canMeasure(x));
    if (targets.length === 0) { toast('关联主合同下暂无可计量子目（正式·合同内）', 'error'); return; }
    const sameCode = targets.find(x => x.code === p.code);
    setPf({ toId: sameCode?.id || targets[0].id, qty: Math.max(0, unpushedQty(p)), operator: '陈技术' });
    setPushFrom(p);
    setPushOpen(true);
  };

  const doPush = () => {
    if (!pushFrom) return;
    if (!pf.toId) { toast('请选择主合同目标子目', 'error'); return; }
    const err = pushCoopToMain(pushFrom.id, pf.toId, Number(pf.qty) || 0, pf.operator);
    if (err) { toast(err, 'error'); return; }
    refresh();
    setPushOpen(false);
    toast(`已推送到主合同：${pf.qty}（计入主合同子目「协同单位完成」构成，合并参与计量）`, 'success');
  };

  const pushFromContract = contracts.find(c => c.id === pushFrom?.contractId);
  const pushMainContract = contracts.find(c => c.id === pushFromContract?.mainContractId);
  const pushMaxQty = pushFrom ? unpushedQty(pushFrom) : 0;

  /** 全部推送预演：该协同合同下有未推送量的可计量子目 → 关联主合同同子目号目标（匹配不到的标记跳过） */
  const pushAllPlan = useMemo(() => {
    if (!pushAllC) return null;
    const contract = contracts.find(c => c.id === pushAllC);
    const mainC = contracts.find(c => c.id === contract?.mainContractId);
    if (!contract || !mainC) return null;
    const mainItems = pool.filter(p => p.contractId === mainC.id && canMeasure(p));
    const rows = pool
      .filter(p => p.contractId === pushAllC && canMeasure(p) && unpushedQty(p) > 0)
      .map(p => ({ src: p, target: mainItems.find(t => t.code === p.code) || null, qty: unpushedQty(p) }));
    return { contract, mainC, rows };
  }, [pushAllC, contracts, pool]);

  const doPushAll = () => {
    if (!pushAllC) return;
    const r = pushAllCoopToMain(pushAllC, pushAllOperator);
    if (!r) { toast('该合同下暂无有未推送量的可推送子目', 'error'); return; }
    refresh();
    setPushAllOpen(false);
    let msg = `全部推送完成：${r.pushedCount} 个子目共 ${fmtNum(r.totalQty)}（约 ${fmtMoney(r.totalValue)}），已计入主合同「协同单位完成」`;
    if (r.skipped.length > 0) msg += `；${r.skipped.length} 个子目已跳过`;
    toast(msg, r.skipped.length > 0 ? 'info' : 'success');
  };

  return (
    <div className="p-5">
      {/* 页签：主合同 / 协同合同 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'main'
            ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => { setTab('main'); setContractId(''); }}>
            主合同
            <span className={`ml-1.5 text-xs tabular-nums ${tab === 'main' ? 'text-violet-200' : 'text-slate-400'}`}>{mainContracts.length}</span>
          </button>
          <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'coop'
            ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => { setTab('coop'); setContractId(''); }}>
            协同合同
            <span className={`ml-1.5 text-xs tabular-nums ${tab === 'coop' ? 'text-sky-200' : 'text-slate-400'}`}>{coopContracts.length}</span>
          </button>
        </div>
        <div className="text-xs text-slate-400">
          {tab === 'main'
            ? '当前单位为合同签订主要单位的合同；子目区分本组织完成 / 协同单位完成，合并生成计量单'
            : '当前单位为合同协同单位的合同；只做查看确认，选中子目推送主合同后参与计量（协同合同不直接生成计量单）'}
        </div>
      </div>

      {/* 汇总卡片（按页签） */}
      {tab === 'main' ? (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">可计量合同（主合同）</div>
            <div className="text-2xl font-bold text-slate-800 tabular-nums">{mainContracts.length} <span className="text-sm font-normal text-slate-400">份</span></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">可计量子目（正式·合同内）</div>
            <div className="text-2xl font-bold text-violet-600 tabular-nums">{allMainMeasurable.length} <span className="text-sm font-normal text-slate-400">项</span></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">未上报计量量价值</div>
            <div className="text-2xl font-bold text-orange-600 tabular-nums">{fmtMoney(totalUnreportedValue)}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">协同合同</div>
            <div className="text-2xl font-bold text-slate-800 tabular-nums">{coopContracts.length} <span className="text-sm font-normal text-slate-400">份</span></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">协同子目（正式·合同内）</div>
            <div className="text-2xl font-bold text-sky-600 tabular-nums">{allCoopMeasurable.length} <span className="text-sm font-normal text-slate-400">项</span></div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500 mb-1">未推送量价值（可推送主合同）</div>
            <div className="text-2xl font-bold text-cyan-600 tabular-nums">{fmtMoney(totalCoopUnpushedValue)}</div>
          </div>
        </div>
      )}

      <SearchBar>
        <Input value={kw} onChange={setKw} placeholder="子目号 / 名称" className="!w-44" />
        <Select value={contractId} onChange={setContractId}
          placeholder={tab === 'main' ? '全部主合同' : '全部协同合同'} className="!w-56"
          options={scopedContracts.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))} />
        {tab !== 'main' && (
          <button className="px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 text-xs font-medium hover:bg-sky-50 transition"
            onClick={() => setPushLogsOpen(true)}>推送记录</button>
        )}
      </SearchBar>

      {/* 按合同 → 章节层级展示（仅可计量子目） */}
      {grouped.map(({ cid, items, chapters }) => {
        const c = contracts.find(x => x.id === cid);
        const isOpen = !!expanded[cid];
        if (tab === 'main') {
          // ===== 主合同：合同级汇总（可计量子目数、可申报计量金额、历史已申报计量、有批复计量）=====
          const cItems = pool.filter(p => p.contractId === cid && canMeasure(p));
          const unrepValue = cItems.reduce((s, p) => s + unreportedQty(p) * p.price, 0);
          const reportedValue = cItems.reduce((s, p) => s + (p.reportedQty || 0) * p.price, 0);
          const approvedValue = cItems.reduce((s, p) => s + (p.approvedQty || 0) * p.price, 0);
          const coopValue = cItems.reduce((s, p) => s + coopBuiltQty(p) * p.price, 0);
          return (
            <div key={cid} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              {/* 合同头（汇总信息 + 展开/收起清单 + 发起计量） */}
              <div className="px-4 py-3 bg-violet-50/60 border-b border-violet-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-4 bg-violet-500 rounded-full shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">
                      {c?.name || items[0].contractName}
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-semibold align-middle">主合同</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      {c?.code} · {items[0].projectName} · 业主：{c?.ownerName}
                      {c?.ownerType === 'jtou' ? '（交投业主）' : '（其他业主）'}
                      {coopValue > 0 && <span className="text-cyan-600"> · 含协同单位完成 {fmtMoney(coopValue)}</span>}
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
              {/* 章节层级清单（默认收起；子目区分本组织完成 / 协同单位完成） */}
              {isOpen && (
              <div className="overflow-x-auto">
                <table className={M.table}>
                  <thead>
                    <tr>
                      <th className={M.th}>子目号</th>
                      <th className={M.th}>子目名称</th>
                      <th className={`${M.th} text-right`}>子目总量</th>
                      <th className={`${M.th} text-right`}>本组织完成</th>
                      <th className={`${M.th} text-right`}>协同单位完成</th>
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
                          <td colSpan={11} className="px-3 py-1.5">
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
                          const coop = coopBuiltQty(p);
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
                                {fmtNum(ownQty(p))}
                                <div className="text-[10px] text-slate-400 font-normal">报工{fmtNum(p.logQty)}/手动{fmtNum(p.manualQty)}/转入{fmtNum(p.transferInQty)}</div>
                              </td>
                              <td className={`${M.td} text-right tabular-nums font-medium ${coop > 0 ? 'text-cyan-700' : 'text-slate-300'}`}>
                                {fmtNum(coop)}
                                {coop > 0 && <div className="text-[10px] font-normal text-cyan-500">协同合同推送</div>}
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
        }
        // ===== 协同合同：只读查看 + 推送到主合同（不直接生成计量单）=====
        const cItems = pool.filter(p => p.contractId === cid && canMeasure(p));
        const unpushedValue = cItems.reduce((s, p) => s + unpushedQty(p) * p.price, 0);
        const pushedValue = cItems.reduce((s, p) => s + (p.pushedQty || 0) * p.price, 0);
        const mainC = contracts.find(x => x.id === c?.mainContractId);
        return (
          <div key={cid} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            {/* 合同头（协同单位视角，只读确认 + 推送主合同） */}
            <div className="px-4 py-3 bg-sky-50/60 border-b border-sky-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-4 bg-sky-500 rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">
                    {c?.name || items[0].contractName}
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-semibold align-middle">协同合同</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {c?.code} · {items[0].projectName} · 主要单位：{c?.mainOrgName || '—'} · 关联主合同：{mainC?.code || '—'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">协同子目</div>
                    <div className="text-sm font-bold text-sky-600 tabular-nums">{cItems.length} <span className="text-[11px] font-normal text-slate-400">项</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">未推送量价值</div>
                    <div className="text-sm font-bold text-cyan-600 tabular-nums">{fmtMoney(unpushedValue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400">已推送价值</div>
                    <div className="text-sm font-bold text-emerald-600 tabular-nums">{fmtMoney(pushedValue)}</div>
                  </div>
                </div>
                <button
                  className="px-2.5 py-1 rounded text-[12px] border border-sky-500 bg-sky-500 text-white hover:bg-sky-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={cItems.filter(p => unpushedQty(p) > 0).length === 0}
                  onClick={() => { setPushAllC(cid); setPushAllOpen(true); }}
                >全部推送</button>
                <button className={M.button.tiny} onClick={() => toggleExpand(cid)}>{isOpen ? '收起清单' : '展开清单'}</button>
              </div>
            </div>
            {/* 章节层级清单（只读查看，可推送到主合同） */}
            {isOpen && (
            <div className="overflow-x-auto">
              <table className={M.table}>
                <thead>
                  <tr>
                    <th className={M.th}>子目号</th>
                    <th className={M.th}>子目名称</th>
                    <th className={`${M.th} text-right`}>子目总量</th>
                    <th className={`${M.th} text-right`}>已完工量（本组织）</th>
                    <th className={`${M.th} text-right`}>已推送主合同</th>
                    <th className={`${M.th} text-right`}>未推送量（可推送）</th>
                    <th className={M.th}>完成批次（时间段）</th>
                    <th className={`${M.th} text-center`}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chapters.map(([ch, chItems]) => (
                    <React.Fragment key={ch || 'other'}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="px-3 py-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <span className="w-1 h-3 bg-sky-400 rounded-full inline-block" />
                            章节 {ch || '—'} · {chapterName(ch)}
                            <span className="text-slate-400 font-normal">
                              （{chItems.length} 子目 · 未推送价值 {fmtMoney(chItems.reduce((s, p) => s + unpushedQty(p) * p.price, 0))}）
                            </span>
                          </div>
                        </td>
                      </tr>
                      {chItems.map(p => {
                        const lastBatch = p.completionBatches?.length
                          ? p.completionBatches[p.completionBatches.length - 1] : null;
                        const unpushed = unpushedQty(p);
                        return (
                          <tr key={p.id} className={`hover:bg-sky-50/40 transition-colors ${unpushed <= 0 ? 'opacity-60' : ''}`}>
                            <td className={`${M.td} font-mono font-medium text-sky-700`}>
                              {p.code}
                              {p.isSafeFee && <div className="mt-0.5"><TypePill text="安全生产费" tone="cyan" /></div>}
                            </td>
                            <td className={M.td}>
                              <div className="font-medium text-slate-800">{p.name}</div>
                              <div className="text-[11px] text-slate-400">{p.unit} · 单价 {fmtMoney(p.price)}</div>
                            </td>
                            <td className={`${M.td} text-right tabular-nums`}>{fmtNum(p.totalQty)}</td>
                            <td className={`${M.td} text-right tabular-nums font-medium text-slate-800`}>
                              {fmtNum(ownQty(p))}
                              <div className="text-[10px] text-slate-400 font-normal">报工{fmtNum(p.logQty)}/手动{fmtNum(p.manualQty)}</div>
                            </td>
                            <td className={`${M.td} text-right tabular-nums font-medium text-emerald-600`}>{fmtNum(p.pushedQty || 0)}</td>
                            <td className={`${M.td} text-right tabular-nums font-bold ${unpushed > 0 ? 'text-cyan-600' : 'text-slate-300'}`}>
                              {fmtNum(unpushed)}
                            </td>
                            <td className={`${M.td} text-[11px] text-slate-500`}>
                              {p.completionBatches?.length
                                ? `${p.completionBatches.length} 批 · 最近 ${lastBatch?.date}（${fmtNum(lastBatch?.qty)}）`
                                : '—'}
                            </td>
                            <td className={`${M.td} text-center`}>
                              <button className="px-2.5 py-1 rounded text-[12px] border border-sky-300 text-sky-700 hover:bg-sky-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={unpushed <= 0} onClick={() => openPush(p)}>推送到主合同</button>
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
          {tab === 'main'
            ? '暂无符合条件的可计量子目（主列表仅展示 正式·合同内 子目；子目由合同清单同步，不可手动新增）'
            : '暂无可查看的协同合同子目（协同合同仅做查看确认，选中子目推送主合同后参与计量）'}
        </div>
      )}

      {/* 口径说明 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
        <b className="text-slate-700">合同角色：</b>
        主合同 = 当前单位为合同签订的主要单位；协同合同 = 当前单位为合同协同单位的合同（仅查看确认 + 推送主合同，不直接生成计量单）。
        {tab === 'main' ? (
          <>
            <b className="text-slate-700">计量口径（方案表5-1）：</b>
            已施工量 = 本组织完成（施工日志报工 + 手动计入产值 + 临时转入）+ 协同单位完成（协同合同推送）；未上报计量量 = 已施工量 − 已上报计量量；未批复计量量 = 已上报计量量 − 已批复计量量。
            <b className="text-slate-700">发起计量：</b>主合同子目按「本组织完成 + 协同单位完成」合并生成计量单，行上区分来源构成；添加后默认带入全部已施工数量（≤未上报计量量），可编辑。
          </>
        ) : (
          <>
            <b className="text-slate-700">协同口径：</b>
            已完工量 = 施工日志报工 + 手动计入产值；未推送量 = 已完工量 − 已推送到主合同的量；推送后计入主合同子目「协同单位完成」构成，由主合同统一发起计量。
            <b className="text-slate-700">推送校验：</b>仅可推送到该协同合同关联主合同下 正式·合同内 子目，推送量不得超过源子目未推送量。
          </>
        )}
      </div>

      {/* 发起计量向导（仅主合同可发起；预选合同直接进入选子目步骤） */}
      {wizardContract && (
        <StatementWizard
          key={wizardContract}
          defaultContractId={wizardContract}
          onClose={() => setWizardContract(null)}
          onDone={() => { setWizardContract(null); refresh(); }}
        />
      )}

      {/* 子目维护弹窗（仅主合同 tab；协同完成量由推送累计，不可直接编辑） */}
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
                options={mainContracts.map(c => ({ value: c.id, label: `${c.code} ${c.name}` }))} />
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
                临时转入 = {fmtNum(edit.transferInQty)}（历史转入操作自动累计，不可直接编辑）
              </div>
            </div>
            <div className="mt-2 text-xs text-cyan-600 bg-cyan-50 border border-cyan-100 rounded px-2 py-1 inline-block">
              协同单位完成 = {fmtNum(edit.coopQty)}（由协同合同推送自动累计，不可直接编辑）
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
              当前口径：已施工（本组织+协同）{fmtNum((edit.logQty || 0) + (edit.manualQty || 0) + (edit.transferInQty || 0) + (edit.coopQty || 0))} ·
              未上报计量 {fmtNum((edit.logQty || 0) + (edit.manualQty || 0) + (edit.transferInQty || 0) + (edit.coopQty || 0) - (edit.reportedQty || 0))} ·
              未批复 {fmtNum((edit.reportedQty || 0) - (edit.approvedQty || 0))}
            </div>
          )}
        </div>
      </Modal>

      {/* 推送到主合同弹窗（协同合同子目 → 关联主合同子目） */}
      <Modal title={`推送到主合同 · ${pushFrom?.code || ''}`} open={pushOpen}
        onClose={() => setPushOpen(false)} width="max-w-xl"
        footer={<>
          <button className={M.button.ghost} onClick={() => setPushOpen(false)}>取消</button>
          <button className={M.button.primary} onClick={doPush}>确认推送</button>
        </>}>
        {pushFrom && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700 leading-relaxed">
              协同合同<b>不直接生成计量单</b>：已完工未计量量确认后推送到关联主合同，计入主合同子目的「协同单位完成」构成，由主合同统一发起计量。
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1">
              <div>源子目：<b className="font-mono text-sky-700">{pushFrom.code}</b> {pushFrom.name}（{pushFrom.unit} · 单价 {fmtMoney(pushFrom.price)}）</div>
              <div>已完工量 {fmtNum(ownQty(pushFrom))} · 已推送 {fmtNum(pushFrom.pushedQty || 0)} · <b className="text-cyan-600">未推送（可推送）{fmtNum(pushMaxQty)}</b></div>
              <div>关联主合同：<b className="font-mono">{pushMainContract?.code}</b> {pushMainContract?.name}</div>
            </div>
            <div>
              <label className={M.label}>主合同目标子目（正式·合同内）*</label>
              <Select value={pf.toId} onChange={v => setPf({ ...pf, toId: v })}
                options={pushTargets.map(p => ({
                  value: p.id,
                  label: `${p.code === pushFrom.code ? '★ ' : ''}${p.code} ${p.name}（已含协同完成 ${fmtNum(coopBuiltQty(p))}）`,
                }))} />
              <div className="text-[11px] text-slate-400 mt-1">★ 与源子目同子目号的默认目标；推送后目标子目「协同单位完成」累计增加</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={M.label}>推送数量（≤ {fmtNum(pushMaxQty)}）*</label>
                <Input type="number" step="any" value={pf.qty} onChange={v => setPf({ ...pf, qty: Number(v) || 0 })} />
              </div>
              <div>
                <label className={M.label}>经办人</label>
                <Input value={pf.operator} onChange={v => setPf({ ...pf, operator: v })} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 全部推送弹窗（协同合同行 → 关联主合同，一键推送全部可推送子目） */}
      <Modal title={`全部推送 · ${pushAllPlan?.contract.code || ''}`} open={pushAllOpen}
        onClose={() => setPushAllOpen(false)} width="max-w-2xl"
        footer={<>
          <button className={M.button.ghost} onClick={() => setPushAllOpen(false)}>取消</button>
          <button
            className="px-4 py-1.5 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!pushAllPlan || pushAllPlan.rows.length === 0 || pushAllPlan.rows.every(r => !r.target)}
            onClick={doPushAll}
          >确认全部推送</button>
        </>}>
        {pushAllPlan && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700 leading-relaxed">
              将该协同合同下<b>所有有未推送量</b>的可计量子目，按<b>同子目号</b>推送到关联主合同 <b className="font-mono">{pushAllPlan.mainC.code}</b>，计入主合同子目的「协同单位完成」构成，由主合同统一发起计量；关联主合同下无同子目号目标的子目将<b>跳过</b>（可在子目行单独推送时手动选择目标）。
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1">
              <div>协同合同：<b className="font-mono text-sky-700">{pushAllPlan.contract.code}</b> {pushAllPlan.contract.name}</div>
              <div>关联主合同：<b className="font-mono">{pushAllPlan.mainC.code}</b> {pushAllPlan.mainC.name}</div>
              <div>待推送子目：<b className="text-cyan-600">{pushAllPlan.rows.length} 项</b>
                （可自动匹配 {pushAllPlan.rows.filter(r => r.target).length} 项 · 未推送量价值 {fmtMoney(pushAllPlan.rows.reduce((s, r) => s + r.qty * r.src.price, 0))}）</div>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className={M.table}>
                <thead>
                  <tr>
                    <th className={M.th}>源子目（协同合同）</th>
                    <th className={M.th}>未推送量</th>
                    <th className={M.th}>主合同目标子目（同子目号）</th>
                  </tr>
                </thead>
                <tbody>
                  {pushAllPlan.rows.map(r => (
                    <tr key={r.src.id}>
                      <td className={M.td}><span className="font-mono text-sky-700">{r.src.code}</span> {r.src.name}</td>
                      <td className={`${M.td} text-right tabular-nums font-medium text-cyan-600`}>{fmtNum(r.qty)} {r.src.unit}</td>
                      <td className={M.td}>
                        {r.target
                          ? <span><span className="font-mono text-violet-700">{r.target.code}</span> {r.target.name}（已含协同完成 {fmtNum(coopBuiltQty(r.target))}）</span>
                          : <span className="text-rose-500">跳过：主合同下无同子目号子目</span>}
                      </td>
                    </tr>
                  ))}
                  {pushAllPlan.rows.length === 0 && (
                    <tr><td className={`${M.td} text-center text-slate-400 py-4`} colSpan={3}>该合同下暂无有未推送量的可推送子目</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <label className={M.label}>经办人</label>
              <Input value={pushAllOperator} onChange={v => setPushAllOperator(v)} />
            </div>
          </div>
        )}
      </Modal>

      {/* 协同推送记录弹窗 */}
      <Modal title="协同推送记录（协同合同 → 主合同）" open={pushLogsOpen} onClose={() => setPushLogsOpen(false)} width="max-w-3xl"
        footer={<button className={M.button.ghost} onClick={() => setPushLogsOpen(false)}>关闭</button>}>
        {coopPushes.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">暂无推送记录</div>
        ) : (
          <table className={M.table}>
            <thead>
              <tr>
                <th className={M.th}>时间</th>
                <th className={M.th}>协同合同</th>
                <th className={M.th}>源子目（协同施工）</th>
                <th className={M.th}>→ 主合同目标子目</th>
                <th className={`${M.th} text-right`}>推送量</th>
                <th className={M.th}>经办人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coopPushes.map((t: CoopPushLog) => (
                <tr key={t.id}>
                  <td className={`${M.td} font-mono text-xs`}>{t.createdAt}</td>
                  <td className={`${M.td} font-mono text-xs text-sky-700`}>{t.fromContractCode}</td>
                  <td className={M.td}><span className="font-mono text-sky-700">{t.fromCode}</span> {t.fromName}</td>
                  <td className={M.td}><span className="font-mono text-violet-700">{t.toCode}</span> {t.toName} <span className="text-[11px] text-slate-400">({t.toContractCode})</span></td>
                  <td className={`${M.td} text-right tabular-nums font-medium text-cyan-600`}>{fmtNum(t.qty)}</td>
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
