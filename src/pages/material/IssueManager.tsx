/**
 * 领料单管理 - 定项定组（限额领料）
 * 创建：选项目（定项） + 选班组（定组）+ 材料限额清单；提交后审核期间可"直接退料"→ 自动生成退料入库单
 * 发料：点"生成领料出库"→ 弹出"发料确认"→ 用户自行选择发料数量，或点"全量出库"按剩余可发一次发完
 * - 部分出库后：领料单状态仍为"发料中"，只要还有剩余可发就可继续发料或退料
 * - 调拨单页面由 MaterialAdmin 二级菜单（URL ?tab=transfer）切换渲染，不再在本组件内分流
 */

import React, { useMemo, useState } from 'react';
import type { Project, Team } from '@/types';
import type { IssueOrder, IssueOrderStatus, DocLineItem, QuotaLineItem, Material, StockOutOrder, StockInOrder } from './types';
import {
  C, Modal, SearchBar, Input, Select, StatusPill, TypePill,
  MaterialPicker, DocLineEditor, materialsToLines, useToast,
} from './_shared';
import {
  getIssueOrders, upsertIssueOrder, nextDocCode, todayStr, nowStr,
  genId, recalcLine, issueToStockOutWithPartial, issueReturnToStockIn,
  ISSUE_STATUS_MAP, getWarehousesByOrg, auditStockOut, getStockBalancesByMaterialIds,
  getStockOutOrders, getStockInOrders, STOCK_OUT_STATUS_MAP, STOCK_IN_STATUS_MAP,
  STOCK_OUT_TYPE_MAP, STOCK_IN_TYPE_MAP,
} from './materialStore';
import { getOrgsForDropdown } from './materialStore';

interface Props {
  key?: string | number;
  projects: Project[];
  teams: Team[];
  onRefresh?: () => void;
}

// 当前登录操作用户（模拟）
const CURRENT_OPERATOR = '周末';

export default function IssueManager({ projects, teams, onRefresh }: Props) {
  const [keyword, setKw] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [orgFilter, setOrgFilter] = useState('');
  const orgs = useMemo(() => getOrgsForDropdown(), []);

  const [list, setList] = useState<IssueOrder[]>(() => getIssueOrders());
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<IssueOrder | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [issueOutOpen, setIssueOutOpen] = useState(false);   // 领料出库确认窗
  const [issueOutDraft, setIssueOutDraft] = useState<{
    issueId: string; warehouseId: string; lines: DocLineItem[];
  } | null>(null);
  const toast = useToast();

  const refresh = () => { setList(getIssueOrders()); onRefresh?.(); };

  // 当前编辑单：根据项目过滤可用班组
  const availableTeams = useMemo(() => {
    if (!editing?.projectId) return [];
    const project = projects.find(p => p.id === editing.projectId);
    if (!project?.teams || project.teams.length === 0) return teams; // 项目未配置班组则显示全部
    return teams.filter(t => project.teams.includes(t.id));
  }, [editing?.projectId, projects, teams]);

  // 当前编辑单：根据班组过滤可用领料人
  const availableHandlers = useMemo(() => {
    if (!editing?.teamId) return [];
    const team = teams.find(t => t.id === editing.teamId);
    const members = team?.members || [];
    // 加上班长作为候选
    const leader = team?.leader;
    const names = new Set<string>();
    members.forEach(m => names.add(m.name));
    if (leader) names.add(leader);
    return Array.from(names);
  }, [editing?.teamId, teams]);

  const filtered = useMemo(() => {
    let r = list;
    if (orgFilter) r = r.filter(i => i.orgId === orgFilter);
    if (statusFilter) r = r.filter(i => i.status === statusFilter);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      r = r.filter(i =>
        i.code.toLowerCase().includes(k) ||
        i.projectName.toLowerCase().includes(k) ||
        i.teamName.toLowerCase().includes(k)
      );
    }
    return r.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [list, orgFilter, statusFilter, keyword]);

  const openNew = () => {
    const d: IssueOrder = {
      id: genId('io'),
      code: nextDocCode('LL-'),
      orgId: '', orgName: '',
      projectId: '', projectName: '',
      teamId: '', teamName: '',
      docDate: todayStr(),
      status: 'draft',
      lines: [],
      createdAt: nowStr(),
      updatedAt: nowStr(),
      handler: CURRENT_OPERATOR, // 领料人/操作人默认当前用户
      operator: CURRENT_OPERATOR, // 操作人默认当前用户
    };
    setEditing(d); setOpen(true);
  };

  // 项目改变时：清空班组、领料人；若只有1个班组自动选中
  const handleProjectChange = (pid: string) => {
    if (!editing) return;
    const project = projects.find(p => p.id === pid);
    const relatedTeams = (project?.teams?.length ?? 0) > 0
      ? teams.filter(t => project!.teams.includes(t.id))
      : teams;
    const firstTeam = relatedTeams.length === 1 ? relatedTeams[0] : undefined;
    const handlers = firstTeam
      ? Array.from(new Set([firstTeam.leader, ...firstTeam.members.map(m => m.name)].filter(Boolean) as string[]))
      : [];
    setEditing({
      ...editing,
      projectId: pid,
      projectName: project?.name || '',
      orgId: project?.org || editing.orgId,
      orgName: orgs.find(o => o.id === (project?.org || ''))?.path || editing.orgName || '',
      teamId: firstTeam?.id || '',
      teamName: firstTeam?.name || '',
      handler: handlers[0] || CURRENT_OPERATOR,
    });
  };

  // 班组改变时：自动选中第一个成员作为领料人
  const handleTeamChange = (tid: string) => {
    if (!editing) return;
    const team = teams.find(t => t.id === tid);
    const handlers = team
      ? Array.from(new Set([team.leader, ...team.members.map(m => m.name)].filter(Boolean) as string[]))
      : [];
    setEditing({
      ...editing,
      teamId: tid,
      teamName: team?.name || '',
      handler: handlers[0] || editing.handler || CURRENT_OPERATOR,
    });
  };

  const saveEditing = (submit: boolean) => {
    if (!editing) return;
    if (!editing.projectId) return toast('请选择项目（定项）', 'error');
    if (!editing.teamId) return toast('请选择领料班组（定组）', 'error');
    if (editing.lines.length === 0) return toast('请添加领料明细', 'error');
    const project = projects.find(p => p.id === editing.projectId);
    const org = orgs.find(o => o.id === (project?.org || ''));
    const team = teams.find(t => t.id === editing.teamId);
    const lines: QuotaLineItem[] = editing.lines.map(l => ({
      ...l,
      quotaQty: l.quantity,  // 当前录入的数量即定额
      issuedQty: l.quantity ? 0 : 0,
      returnedQty: 0,
    }));
    const status: IssueOrderStatus = submit ? 'submitted' : 'draft';
    const doc: IssueOrder = {
      ...editing,
      orgId: project?.org || editing.orgId,
      orgName: org?.name || editing.orgName || '',
      projectId: editing.projectId,
      projectName: project?.name || editing.projectName,
      teamId: editing.teamId,
      teamName: team?.name || editing.teamName,
      lines,
      status,
      operator: editing.operator || CURRENT_OPERATOR,
      handler: editing.handler || CURRENT_OPERATOR,
    };
    upsertIssueOrder(doc);
    refresh();
    setOpen(false); setEditing(null);
    toast(submit ? '已提交领料单' : '已保存草稿', 'success');
  };

  const onPickMats = (mats: Material[]) => {
    if (!editing) return;
    const existIds = new Set(editing.lines.map(l => l.materialId));
    const add: QuotaLineItem[] = materialsToLines(mats.filter(m => !existIds.has(m.id)))
      .map(l => ({ ...l, quotaQty: l.quantity, issuedQty: 0, returnedQty: 0 }));
    setEditing({ ...editing, lines: [...editing.lines, ...add] });
  };

  /** 打开"发料出库确认"弹窗（用户可自行选择数量）*/
  const doIssueOut = (id: string) => {
    const issue = list.find(i => i.id === id);
    if (!issue) return;
    const warehouses = getWarehousesByOrg(issue.orgId);
    const wh = warehouses[0];
    if (!wh) return toast('该组织暂无可用仓库，请先在基础数据中创建', 'error');
    // 初始化每个 line 的出库数量 = 0，允许用户选填；同时检查剩余可领
    const remainLines: DocLineItem[] = issue.lines
      .map(l => {
        const remain = Math.max(0, Number(l.quotaQty || 0) - Number(l.issuedQty || 0) + Number(l.returnedQty || 0));
        return {
          id: l.id, materialId: l.materialId, materialCode: l.materialCode,
          materialName: l.materialName, spec: l.spec, unit: l.unit,
          unitPrice: l.unitPrice || 0,
          quantity: 0,            // 待用户填写
          totalAmount: 0,
          remark: `剩余可领 ${remain}${l.unit}`,
          __remain: remain,       // 附加字段，用于前端校验
        } as DocLineItem & { __remain: number };
      })
      .filter(l => (l as any).__remain > 0);
    if (remainLines.length === 0) return toast('当前领料单可领数量均为0，无需继续出库', 'info');
    setIssueOutDraft({ issueId: id, warehouseId: wh.id, lines: remainLines });
    setIssueOutOpen(true);
  };

  /** 全量出库按钮：把确认页中每行数量一次性填到剩余可领最大值 */
  const fillFullIssueOutQty = () => {
    if (!issueOutDraft) return;
    const lines = issueOutDraft.lines.map(l => ({
      ...l,
      quantity: Number((l as any).__remain || 0),
    }));
    setIssueOutDraft({ ...issueOutDraft, lines });
  };

  /** 确认出库（按草稿逐行数量生成出库单）*/
  const confirmIssueOut = () => {
    if (!issueOutDraft) return;
    const validLines: DocLineItem[] = [];
    for (const l of issueOutDraft.lines) {
      const remain = Number((l as any).__remain || 0);
      const qty = Number(l.quantity || 0);
      if (qty < 0) return toast(`材料 ${l.materialCode} 数量不能为负`, 'error');
      if (qty > remain) return toast(`材料 ${l.materialCode} 出库数量超过可领（最大 ${remain}${l.unit}）`, 'error');
      if (qty > 0) validLines.push(l);
    }
    if (validLines.length === 0) return toast('请至少填写一行出库数量（>0）', 'error');
    const issue = list.find(i => i.id === issueOutDraft.issueId)!;
    const out = issueToStockOutWithPartial(
      issue.id, issue.orgId, issue.orgName || '', issueOutDraft.warehouseId,
      validLines.map(l => ({ materialId: l.materialId, quantity: Number(l.quantity || 0), unitPrice: l.unitPrice || 0, remark: l.remark })),
      issue.handler || CURRENT_OPERATOR,
    );
    if (!out) return toast('生成出库单失败', 'error');
    auditStockOut(out.id);
    setIssueOutOpen(false); setIssueOutDraft(null);
    refresh();
    toast(`发料成功：生成领料出库单 ${out.code}，共 ${validLines.length} 项`, 'success');
  };

  const startReturn = (id: string) => { setViewId(id); setReturnOpen(true); };

  const currentView = viewId ? list.find(i => i.id === viewId) : null;

  return (
    <div className="p-5">
      <SearchBar onAdd={openNew}>
        <Input value={keyword} onChange={setKw} placeholder="搜索单号/项目/班组" className="!w-64" />
        <Select value={orgFilter} onChange={setOrgFilter}
          options={orgs.map(o => ({ value: o.id, label: o.path }))}
          placeholder="所属组织" className="!w-60" />
        <Select value={statusFilter} onChange={setStatusFilter}
          options={Object.keys(ISSUE_STATUS_MAP).map(k => ({ value: k, label: ISSUE_STATUS_MAP[k as IssueOrderStatus] }))}
          placeholder="状态" className="!w-40" />
        <button className={C.button.ghost} onClick={refresh}>刷新</button>
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className={C.table}>
          <thead>
            <tr>
              <th className={C.th}>单据编号</th>
              <th className={C.th}>项目（定项）</th>
              <th className={C.th}>班组（定组）</th>
              <th className={C.th}>明细行</th>
              <th className={C.th}>定额数量</th>
              <th className={C.th}>已发/已退</th>
              <th className={C.th}>日期</th>
              <th className={C.th}>状态</th>
              <th className={C.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className={`${C.td} text-center text-slate-400 py-10`}>暂无领料单，点击右上角"+ 新建"创建</td></tr>
            )}
            {filtered.map(i => {
              const sumQuota = i.lines.reduce((s, l) => s + l.quotaQty, 0);
              const sumIssued = i.lines.reduce((s, l) => s + l.issuedQty, 0);
              const sumReturned = i.lines.reduce((s, l) => s + l.returnedQty, 0);
              const sumRemain = i.lines.reduce((s, l) => s + Math.max(0, l.quotaQty - l.issuedQty + l.returnedQty), 0);
              const canIssueMore = (i.status === 'submitted' || i.status === 'issuing' || i.status === 'completed') && sumRemain > 0;
              const canReturn = (i.status === 'submitted' || i.status === 'issuing' || i.status === 'completed') && (sumIssued - sumReturned) > 0;
              const pct = sumQuota ? Math.min(100, Math.round(sumIssued * 100 / sumQuota)) : 0;
              return (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className={`${C.td} font-medium text-slate-800`}>
                    {i.code}
                    {(i.status === 'completed' || i.status === 'issuing') && (
                      <div className="w-36 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: pct + '%' }} />
                      </div>
                    )}
                  </td>
                  <td className={C.td}>{i.projectName}</td>
                  <td className={C.td}>{i.teamName}</td>
                  <td className={C.td}>
                    <TypePill text={`${i.lines.length} 项`} tone="cyan" />
                  </td>
                  <td className={`${C.td} text-right tabular-nums`}>{sumQuota.toLocaleString()}</td>
                  <td className={C.td}>
                    <span className="text-emerald-700 tabular-nums">{sumIssued.toLocaleString()}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-amber-600 tabular-nums">退{sumReturned.toLocaleString()}</span>
                  </td>
                  <td className={C.td}>{i.docDate}</td>
                  <td className={C.td}><StatusPill status={ISSUE_STATUS_MAP[i.status]} /></td>
                  <td className={`${C.td} space-x-1 whitespace-nowrap`}>
                    <button className={C.button.tiny} onClick={() => { setViewId(i.id); setReturnOpen(false); }}>查看</button>
                    {i.status === 'draft' && (
                      <button className={C.button.tiny + ' text-cyan-700 border-cyan-300'} onClick={() => { setEditing(i); setOpen(true); }}>编辑</button>
                    )}
                    {(i.status === 'submitted' || i.status === 'issuing' || i.status === 'completed') && (
                      <>
                        {canIssueMore && (
                          <button className={C.button.tiny + ' text-emerald-700 border-emerald-300'} onClick={() => doIssueOut(i.id)}>发料出库</button>
                        )}
                        {canReturn && (
                          <button className={C.button.tiny + ' text-amber-700 border-amber-300'} onClick={() => startReturn(i.id)}>直接退料</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑 */}
      <Modal
        title={editing?.code ? `领料单 ${editing.code}` : '新建领料单'}
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        width="max-w-5xl"
        footer={<>
          <button className={C.button.ghost} onClick={() => { setOpen(false); setEditing(null); }}>取消</button>
          <button className={C.button.ghost} onClick={() => saveEditing(false)}>保存草稿</button>
          <button className={C.button.primary} onClick={() => saveEditing(true)}>提交</button>
        </>}
      >
        {editing && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className={C.label}>单据编号</label>
                <Input value={editing.code} onChange={() => {}} className="bg-slate-50" />
              </div>
              <div>
                <label className={C.label}>单据日期</label>
                <Input type="date" value={editing.docDate} onChange={v => setEditing({ ...editing, docDate: v })} />
              </div>
              <div>
                <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>项目（定项）</label>
                <Select value={editing.projectId} onChange={handleProjectChange}
                  options={projects.map(p => ({ value: p.id, label: p.name + '（' + (p.org || '') + '）' }))}
                  placeholder="请选择项目" />
              </div>
              <div>
                <label className={C.label + ' after:content-["*"] after:ml-0.5 after:text-rose-500'}>班组（定组）</label>
                <Select value={editing.teamId} onChange={handleTeamChange}
                  options={availableTeams.map(t => ({ value: t.id, label: `${t.name}（队长:${t.leader}，成员${t.members.length}人）` }))}
                  placeholder={editing.projectId ? (availableTeams.length === 0 ? '该项目暂无可用班组' : '请选择班组') : '请先选择项目'}
                  disabled={!editing.projectId} />
              </div>
              <div>
                <label className={C.label}>领料人</label>
                {availableHandlers.length > 0 ? (
                  <Select value={editing.handler || ''} onChange={v => setEditing({ ...editing, handler: v })}
                    options={availableHandlers.map(n => ({ value: n, label: n }))}
                    placeholder="请选择领料人"
                    disabled={!editing.teamId} />
                ) : (
                  <Input value={editing.handler || ''} onChange={v => setEditing({ ...editing, handler: v })}
                    placeholder={editing.teamId ? '班组暂无人员，可手工输入' : '请先选择班组'} />
                )}
              </div>
              <div>
                <label className={C.label}>操作人</label>
                <Input value={editing.operator || CURRENT_OPERATOR} onChange={() => {}} className="bg-slate-50" />
              </div>
              <div className="lg:col-span-2">
                <label className={C.label}>备注</label>
                <Input value={editing.remark || ''} onChange={v => setEditing({ ...editing, remark: v })} />
              </div>
            </div>
            <DocLineEditor
              lines={editing.lines}
              onChange={(lines) => setEditing({ ...editing, lines: lines as QuotaLineItem[] })}
              onPickMaterials={() => setPickOpen(true)}
              qtyLabel="定额数量"
              enablePrice={false}
            />
          </>
        )}
      </Modal>

      <MaterialPicker open={pickOpen} onClose={() => setPickOpen(false)} onPick={onPickMats} showStock scopeOrgId={editing?.orgId || undefined} />

      {/* 查看单据 */}
      <ViewIssueModal
        open={!!currentView && !returnOpen}
        onClose={() => setViewId(null)}
        issue={currentView}
        onReturn={() => { if (currentView) startReturn(currentView.id); }}
        onIssueOut={() => { if (currentView) { doIssueOut(currentView.id); setViewId(null); } }}
      />

      {/* 退料 */}
      {currentView && returnOpen && (
        <ReturnModal
          open
          onClose={() => { setReturnOpen(false); setViewId(null); }}
          issue={currentView}
          onConfirm={(returnLines, whId, handler) => {
            const wh = getWarehousesByOrg(currentView.orgId).find(w => w.id === whId);
            const si = issueReturnToStockIn(
              currentView.id,
              currentView.orgId,
              currentView.orgName,
              wh?.id || 'default',
              returnLines,
              handler,
            );
            if (si) {
              toast(`已生成退料入库单 ${si.code}（待审核）`, 'success');
              setReturnOpen(false); setViewId(null);
              refresh();
            } else {
              toast('未选择有效退料行', 'error');
            }
          }}
        />
      )}

      {/* 发料出库确认：逐行输入数量，或全量出库 */}
      {issueOutDraft && (
        <IssueOutConfirmModal
          open={issueOutOpen}
          onClose={() => { setIssueOutOpen(false); setIssueOutDraft(null); }}
          draft={issueOutDraft}
          onChange={setIssueOutDraft}
          onFillFull={fillFullIssueOutQty}
          onConfirm={confirmIssueOut}
        />
      )}
    </div>
  );
}

function ViewIssueModal({ open, onClose, issue, onReturn, onIssueOut }: {
  open: boolean; onClose: () => void; issue: IssueOrder | null | undefined;
  onReturn: () => void; onIssueOut: () => void;
}) {
  const [viewTab, setViewTab] = useState<'materials' | 'docs'>('materials');
  const [docView, setDocView] = useState<{ type: 'out' | 'in'; id: string } | null>(null);
  if (!issue) return null;
  const sumQuota = issue.lines.reduce((s, l) => s + l.quotaQty, 0);
  const sumIssued = issue.lines.reduce((s, l) => s + l.issuedQty, 0);
  const sumReturned = issue.lines.reduce((s, l) => s + l.returnedQty, 0);
  const sumRemain = issue.lines.reduce((s, l) => s + Math.max(0, l.quotaQty - l.issuedQty + l.returnedQty), 0);
  const canIssueMore = sumRemain > 0 && (issue.status === 'submitted' || issue.status === 'issuing' || issue.status === 'completed');
  const canReturn = (sumIssued - sumReturned) > 0 && (issue.status === 'submitted' || issue.status === 'issuing' || issue.status === 'completed');

  // 查询该领料单关联的出库单和退料入库单
  const relatedOuts = getStockOutOrders().filter(o => o.issueOrderId === issue.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const relatedIns = getStockInOrders().filter(o => o.issueOrderId === issue.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // 当前查看的单据
  const currentDoc = docView ? (docView.type === 'out' ? relatedOuts : relatedIns).find(d => d.id === docView.id) : null;

  return (
    <Modal title={`领料单 ${issue.code}`} open={open} onClose={onClose} width="max-w-5xl"
      footer={<>
        <button className={C.button.ghost} onClick={onClose}>关闭</button>
        {(issue.status === 'submitted' || issue.status === 'issuing' || issue.status === 'completed') && (
          <>
            {canReturn && <button className={C.button.amber} onClick={onReturn}>直接退料</button>}
            {canIssueMore && <button className={C.button.success} onClick={onIssueOut}>选择数量 / 全量 发料出库</button>}
          </>
        )}
      </>}>
      {/* 基本信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
        <Info label="项目" value={issue.projectName} />
        <Info label="班组" value={issue.teamName} />
        <Info label="领料人" value={issue.handler || '-'} />
        <Info label="操作人" value={issue.operator || CURRENT_OPERATOR} />
        <Info label="单据日期" value={issue.docDate} />
        <Info label="组织" value={issue.orgName || '-'} />
        <Info label="状态" value={<StatusPill status={ISSUE_STATUS_MAP[issue.status]} />} />
        <Info label="已发进度" value={`${sumIssued}/${sumQuota}（退${sumReturned}）`} />
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${viewTab === 'materials' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => { setViewTab('materials'); setDocView(null); }}
        >
          材料明细
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${viewTab === 'docs' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => { setViewTab('docs'); setDocView(null); }}
        >
          关联单据（出库{relatedOuts.length} / 退料入库{relatedIns.length}）
        </button>
      </div>

      {/* Tab 内容 */}
      {viewTab === 'materials' ? (
        <>
          <DocLineEditor
            readOnly
            lines={issue.lines.map(l => ({
              id: l.id, materialId: l.materialId, materialCode: l.materialCode, materialName: l.materialName,
              spec: l.spec, unit: l.unit, quantity: l.quotaQty, unitPrice: l.unitPrice,
              totalAmount: l.totalAmount, remark: l.remark,
            }))}
            onChange={() => {}}
            onPickMaterials={() => {}}
            enablePrice={false}
            extraColumns={[
              { key: 'issuedQty', label: '已发数量', render: (l) => {
                const q = issue.lines.find(x => x.id === l.id)?.issuedQty || 0;
                return <span className="tabular-nums text-right block">{q.toLocaleString()}</span>;
              }},
              { key: 'returnedQty', label: '已退数量', render: (l) => {
                const q = issue.lines.find(x => x.id === l.id)?.returnedQty || 0;
                return <span className="tabular-nums text-right block text-amber-600">{q.toLocaleString()}</span>;
              }},
              { key: 'remain', label: '剩余可发', render: (l) => {
                const ql = issue.lines.find(x => x.id === l.id)!;
                const remain = ql.quotaQty - ql.issuedQty + ql.returnedQty;
                return <span className="tabular-nums text-right block text-emerald-700 font-medium">{remain.toLocaleString()}</span>;
              }},
            ]}
          />
          {issue.remark && <div className="mt-3 text-sm text-slate-500">备注：{issue.remark}</div>}
        </>
      ) : currentDoc ? (
        /* 单据详情视图 */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button className={C.button.tiny} onClick={() => setDocView(null)}>← 返回单据列表</button>
            <span className="text-sm font-medium text-slate-700">
              {docView!.type === 'out' ? STOCK_OUT_TYPE_MAP[(currentDoc as StockOutOrder).type] : STOCK_IN_TYPE_MAP[(currentDoc as StockInOrder).type]}
              {' '}{currentDoc.code}
            </span>
            <StatusPill status={(docView!.type === 'out' ? STOCK_OUT_STATUS_MAP : STOCK_IN_STATUS_MAP)[currentDoc.status]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
            <Info label="单据日期" value={currentDoc.docDate} />
            <Info label="组织" value={currentDoc.orgName || '-'} />
            <Info label="经办人" value={currentDoc.handler || '-'} />
            {docView!.type === 'out' && <Info label="仓库" value={(currentDoc as StockOutOrder).warehouseId || '-'} />}
            {docView!.type === 'in' && <Info label="仓库" value={(currentDoc as StockInOrder).warehouseId || '-'} />}
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">材料编码</th>
                  <th className="px-3 py-2 text-left">材料名称</th>
                  <th className="px-3 py-2 text-left">规格</th>
                  <th className="px-3 py-2 text-right">数量</th>
                  <th className="px-3 py-2 text-left">单位</th>
                  <th className="px-3 py-2 text-right">单价</th>
                  <th className="px-3 py-2 text-right">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDoc.lines.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 tabular-nums">{l.materialCode}</td>
                    <td className="px-3 py-2">{l.materialName}</td>
                    <td className="px-3 py-2 text-slate-500">{l.spec || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{l.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-500">{l.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.unitPrice ? l.unitPrice.toLocaleString() : '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.totalAmount ? l.totalAmount.toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentDoc.remark && <div className="mt-3 text-sm text-slate-500">备注：{currentDoc.remark}</div>}
        </div>
      ) : (
        /* 关联单据列表 */
        <div>
          {relatedOuts.length === 0 && relatedIns.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">暂无关联的出库/退料单据</div>
          ) : (
            <div className="space-y-4">
              {/* 出库单 */}
              {relatedOuts.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <span className="w-1 h-3 bg-emerald-500 rounded-sm" />领料出库单（{relatedOuts.length}）
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">单据编号</th>
                          <th className="px-3 py-2 text-left">单据日期</th>
                          <th className="px-3 py-2 text-left">经办人</th>
                          <th className="px-3 py-2 text-left">状态</th>
                          <th className="px-3 py-2 text-right">明细数</th>
                          <th className="px-3 py-2 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {relatedOuts.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-cyan-700">{o.code}</td>
                            <td className="px-3 py-2">{o.docDate}</td>
                            <td className="px-3 py-2">{o.handler || '-'}</td>
                            <td className="px-3 py-2"><StatusPill status={STOCK_OUT_STATUS_MAP[o.status]} /></td>
                            <td className="px-3 py-2 text-right tabular-nums">{o.lines.length}</td>
                            <td className="px-3 py-2 text-center">
                              <button className={C.button.tiny} onClick={() => setDocView({ type: 'out', id: o.id })}>查看</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* 退料入库单 */}
              {relatedIns.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <span className="w-1 h-3 bg-amber-500 rounded-sm" />退料入库单（{relatedIns.length}）
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">单据编号</th>
                          <th className="px-3 py-2 text-left">单据日期</th>
                          <th className="px-3 py-2 text-left">经办人</th>
                          <th className="px-3 py-2 text-left">状态</th>
                          <th className="px-3 py-2 text-right">明细数</th>
                          <th className="px-3 py-2 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {relatedIns.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-amber-700">{o.code}</td>
                            <td className="px-3 py-2">{o.docDate}</td>
                            <td className="px-3 py-2">{o.handler || '-'}</td>
                            <td className="px-3 py-2"><StatusPill status={STOCK_IN_STATUS_MAP[o.status]} /></td>
                            <td className="px-3 py-2 text-right tabular-nums">{o.lines.length}</td>
                            <td className="px-3 py-2 text-center">
                              <button className={C.button.tiny} onClick={() => setDocView({ type: 'in', id: o.id })}>查看</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-800 text-sm font-medium truncate">{value}</div>
    </div>
  );
}

/** 发料出库确认 Modal：按领料单剩余可额逐行输入出库数量；提供"全量出库"一键填到最大值 */
function IssueOutConfirmModal({ open, onClose, draft, onChange, onFillFull, onConfirm }: {
  open: boolean; onClose: () => void;
  draft: { issueId: string; warehouseId: string; lines: DocLineItem[] };
  onChange: (d: { issueId: string; warehouseId: string; lines: DocLineItem[] }) => void;
  onFillFull: () => void; onConfirm: () => void;
}) {
  const whList = getWarehousesByOrg(getIssueOrders().find(i => i.id === draft.issueId)?.orgId || '');
  const totals = draft.lines.reduce((acc, l) => {
    acc.qty += Number(l.quantity || 0);
    acc.max += Number((l as any).__remain || 0);
    return acc;
  }, { qty: 0, max: 0 });
  const okCount = draft.lines.filter(l => Number(l.quantity || 0) > 0).length;

  const updateQty = (lid: string, qty: number) => {
    const max = Number((draft.lines.find(l => l.id === lid) as any)?.__remain || 0);
    const v = Math.max(0, Math.min(max, qty || 0));
    onChange({
      ...draft,
      lines: draft.lines.map(l => l.id === lid ? { ...l, quantity: v } : l),
    });
  };
  return (
    <Modal title="发料出库确认（请输入本次发放数量）" open={open} onClose={onClose} width="max-w-5xl"
      footer={<>
        <button className={C.button.ghost} onClick={onClose}>取消</button>
        <div className="mr-auto flex items-center gap-3 text-xs text-slate-500">
          <span>已填写 <b className="text-slate-800">{okCount}</b> / {draft.lines.length} 行</span>
          <span>共 <b className="text-cyan-700 tabular-nums">{totals.qty.toLocaleString()}</b> / {totals.max.toLocaleString()}</span>
        </div>
        <button className={C.button.amber} onClick={onFillFull}>⚡ 全量出库（剩余一次发完）</button>
        <button className={C.button.success} disabled={totals.qty === 0} onClick={onConfirm}>确认发放并生成出库单</button>
      </>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className={C.label}>出库仓库</label>
          <Select value={draft.warehouseId}
            onChange={v => onChange({ ...draft, warehouseId: v })}
            options={whList.map(w => ({ value: w.id, label: w.name + (w.keeper ? `（${w.keeper}）` : '') }))} />
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-auto max-h-[56vh]">
        <table className={C.table}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={C.th + ' w-12'}>序</th>
              <th className={C.th}>材料编码</th>
              <th className={C.th}>材料名称 / 规格</th>
              <th className={C.th + ' w-16'}>单位</th>
              <th className={`${C.th} w-28 text-right`}>剩余可领</th>
              <th className={`${C.th} w-36 text-right`}>本次出库数量</th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((l, idx) => {
              const remain = Number((l as any).__remain || 0);
              const qty = Number(l.quantity || 0);
              const pct = remain ? Math.round(qty * 100 / remain) : 0;
              return (
                <tr key={l.id}>
                  <td className={C.td + ' text-slate-400'}>{idx + 1}</td>
                  <td className={C.td + ' text-slate-500'}>{l.materialCode}</td>
                  <td className={C.td}>
                    <div className="font-medium text-slate-800">{l.materialName}</div>
                    <div className="text-[11px] text-slate-500">{l.spec || '-'}</div>
                    <div className="mt-1 w-40 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: pct + '%' }} />
                    </div>
                  </td>
                  <td className={C.td}>{l.unit}</td>
                  <td className={`${C.td} text-right tabular-nums font-medium text-emerald-700`}>{remain.toLocaleString()}</td>
                  <td className={C.td}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(l.id, qty - 1)} className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">-</button>
                      <input type="number" step="any" min="0" max={remain}
                        value={qty}
                        onChange={e => updateQty(l.id, Number(e.target.value) || 0)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded-md text-right text-sm focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums" />
                      <button onClick={() => updateQty(l.id, qty + 1)} className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/** 退料弹窗：按当前单据每行输入退料数量，选择仓库，确认后生成退料入库单 */
function ReturnModal({ open, onClose, issue, onConfirm }: {
  open: boolean; onClose: () => void; issue: IssueOrder;
  onConfirm: (lines: { materialId: string; quantity: number; remark?: string }[], warehouseId: string, handler?: string) => void;
}) {
  const [rows, setRows] = useState(() => issue.lines.map(l => ({
    id: l.id, materialId: l.materialId, qty: 0, max: l.issuedQty - l.returnedQty, remark: '',
  })));
  const [wh, setWh] = useState<string>(() => getWarehousesByOrg(issue.orgId)[0]?.id || 'default');
  const whList = getWarehousesByOrg(issue.orgId);
  const [handler, setHandler] = useState('');
  const validRows = rows.filter(r => r.qty > 0 && r.qty <= (r.max + 1e-6));

  return (
    <Modal title={`${issue.code} - 退料入库（直接操作）`} open={open} onClose={onClose} width="max-w-4xl"
      footer={<>
        <button className={C.button.ghost} onClick={onClose}>取消</button>
        <button className={C.button.primary}
          disabled={validRows.length === 0}
          onClick={() => onConfirm(
            validRows.map(r => ({ materialId: r.materialId, quantity: r.qty, remark: r.remark || undefined })),
            wh,
            handler || undefined,
          )}>
          确认退料（生成入库单）
        </button>
      </>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className={C.label}>入库仓库</label>
          <Select value={wh} onChange={setWh}
            options={whList.map(w => ({ value: w.id, label: w.name + (w.keeper ? `（${w.keeper}）` : '') }))} />
        </div>
        <div>
          <label className={C.label}>经办人</label>
          <Input value={handler} onChange={setHandler} placeholder="默认当前用户" />
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-auto">
        <table className={C.table}>
          <thead>
            <tr>
              <th className={C.th}>材料</th>
              <th className={C.th}>单位</th>
              <th className={`${C.th} text-right`}>已发数量</th>
              <th className={`${C.th} text-right`}>已退数量</th>
              <th className={`${C.th} text-right`}>最多可退</th>
              <th className={`${C.th} w-40`}>本次退料数量</th>
              <th className={C.th}>备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const line = issue.lines.find(l => l.id === r.id)!;
              return (
                <tr key={r.id}>
                  <td className={C.td}>
                    <div className="font-medium">{line.materialName}</div>
                    <div className="text-[11px] text-slate-500">{line.materialCode} {line.spec || ''}</div>
                  </td>
                  <td className={C.td}>{line.unit}</td>
                  <td className={`${C.td} text-right tabular-nums`}>{line.issuedQty}</td>
                  <td className={`${C.td} text-right tabular-nums text-amber-600`}>{line.returnedQty}</td>
                  <td className={`${C.td} text-right tabular-nums text-emerald-700`}>{r.max}</td>
                  <td className={C.td}>
                    <input type="number" step="any" min="0" max={r.max}
                      value={r.qty}
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, qty: Math.max(0, Math.min(r.max, Number(e.target.value) || 0)) } : x))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-md text-right text-sm focus:ring-1 focus:ring-amber-500 outline-none" />
                  </td>
                  <td className={C.td}>
                    <input type="text" value={r.remark}
                      onChange={e => setRows(rs => rs.map(x => x.id === r.id ? { ...x, remark: e.target.value } : x))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-md text-xs" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
