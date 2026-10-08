/**
 * 应收单管理（工程结算应收单）
 *  - 「创建应收单」三步向导：① 选择合同 → ② 选择计量单（仅已批复且未创建应收单的可选，
 *    支持同合同多张合并）→ ③ 按交工计量系统「工程结算应收单」样式填报（带 * 必填）→ 创建
 *  - 填报区块：基本信息 / 应收信息（金额口径自动汇总）/ 保证金明细 / 开票明细（价税分离）/
 *    发票其他信息 / 收款计划 / 附件
 *  - 创建后经交工计量系统（通道）推送交投财务共享，财务共享确认后进入回款跟踪
 *  - 状态：待推送 → 已推送财务共享 → 财务共享已确认
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  M, Modal, Input, Textarea, Select, SearchBar, ReceivableStatusPill, TypePill, useToast, fmtMoney, fmtNum,
} from './_shared';
import type { ReceivableOrder, MeasureOrder, MeasureContract } from './types';
import {
  getReceivables, getOrders, getMeasureContracts, pushReceivable, confirmReceivable,
  createReceivableWithForm, paidAmountOf,
} from './measureStore';

interface Props { key?: string | number; onRefresh?: () => void; }

const r2 = (n: number) => Math.round(n * 100) / 100;
const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const WIZ_STEPS = [
  { n: 1, label: '选择合同与计量单' },
  { n: 2, label: '填报应收单' },
];

/** 向导表单字段（填报步可编辑部分） */
interface WizForm {
  docDate: string; bizDate: string; regCode: string; dept: string; bizContent: string;
  agingStart: string; invoiceReceived: string; payee: string;
  curChange: number; curMaterialAdj: number; curPenalty: number;
  curAdvanceDeduct: number; curPayableDeduct: number; curOtherAdvanceDeduct: number;
}
interface WizDeposit { type: string; amount: number; invoiceNow: string; remark: string }
interface WizInvoiceLine { name: string; taxCategory: string; amount: number; rate: string; invoiced: number }
interface WizPlan { planDate: string; condition: string; amount: number; incomeItem: string; depositType: string; settledAmount: number; settleMethod: string }

const DEPOSIT_TYPES = ['履约保证金', '质量保证金', '农民工工资保证金', '联合体方工程款', '其他保证金'];
const TAX_CATEGORIES = ['工程服务', '建筑服务', '劳务费', '材料销售'];
const TAX_RATES = [
  { value: '0.09', label: '9%（建筑工程）' },
  { value: '0.06', label: '6%（服务）' },
  { value: '0.03', label: '3%（简易计税）' },
  { value: '0.13', label: '13%（材料销售）' },
];
const PLAN_CONDITIONS = ['民工工资专款', '计量批复后30天', '计量批复后60天', '竣工结算支付', '质保期满支付'];
const INVOICE_TYPES = ['数电票(增值税专用发票)', '数电票(增值税普通发票)', '增值税专用发票', '增值税普通发票'];
const SETTLE_METHODS = ['电汇', '银行承兑', '商业承兑', '支票', '现金', '其他'];

export default function ReceivableManager({ onRefresh }: Props) {
  const [version, setVersion] = useState(0);
  const refresh = () => { setVersion(v => v + 1); onRefresh?.(); };
  const toast = useToast();

  const receivables = useMemo(() => getReceivables(), [version]);
  const orders = useMemo(() => getOrders(), [version]);
  const contracts = useMemo(() => getMeasureContracts(), [version]);

  const [kw, setKw] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<ReceivableOrder | null>(null);
  const [remark, setRemark] = useState('');

  // ===== 创建应收单向导（支持 ?wiz=1 直达打开，便于预览/分享） =====
  const [wizOpen, setWizOpen] = useState(() => new URLSearchParams(window.location.search).get('wiz') === '1');
  const [wizStep, setWizStep] = useState(() => Number(new URLSearchParams(window.location.search).get('step')) || 1);
  const [wizContractId, setWizContractId] = useState(() => new URLSearchParams(window.location.search).get('cid') || '');
  const [wizOrderIds, setWizOrderIds] = useState<string[]>(() =>
    (new URLSearchParams(window.location.search).get('ws') || '').split(',').filter(Boolean));
  const [wizSearch, setWizSearch] = useState('');

  // URL 直达 step=2 时按所选计量单初始化表单（与点击「下一步」一致，用于预览/分享）
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('wiz') !== '1' || sp.get('step') !== '2') return;
    const cid = sp.get('cid') || '';
    const ws = (sp.get('ws') || '').split(',').filter(Boolean);
    if (!cid || ws.length === 0) return;
    const c = getMeasureContracts().find(x => x.id === cid);
    if (!c) return;
    const cm = r2(getOrders().filter(o => ws.includes(o.id)).reduce((s, o) => s + o.approvedAmount, 0));
    setF(f0 => ({ ...f0, dept: `${c.projectName}办公室`, bizContent: '工程款' }));
    setInvoiceAmount(cm);
    setInvoiceLines([{ name: '工程款', taxCategory: '工程服务', amount: cm, rate: '0.09', invoiced: 0 }]);
    setInvInfo({ projectName: `顺畅养护公司${c.projectName}`, invoiceType: INVOICE_TYPES[0], email: '', phone: '', goods: '工程款', remark: `合同编号 ${c.code}` });
    setPlans([{ planDate: '', condition: '计量批复后30天', amount: 0, incomeItem: '工程结算收入', depositType: '', settledAmount: 0, settleMethod: '电汇' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step2 表单
  const [f, setF] = useState<WizForm>({
    docDate: todayStr(), bizDate: todayStr(), regCode: '', dept: '', bizContent: '工程款',
    agingStart: '', invoiceReceived: '是', payee: '',
    curChange: 0, curMaterialAdj: 0, curPenalty: 0, curAdvanceDeduct: 0, curPayableDeduct: 0, curOtherAdvanceDeduct: 0,
  });
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [deposits, setDeposits] = useState<WizDeposit[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<WizInvoiceLine[]>([]);
  const [invInfo, setInvInfo] = useState({ projectName: '', invoiceType: INVOICE_TYPES[0], email: '', phone: '', goods: '工程款', remark: '' });
  const [invMinorAdjust, setInvMinorAdjust] = useState('否');
  const [plans, setPlans] = useState<WizPlan[]>([]);
  const [attFiles, setAttFiles] = useState<string[]>([]);
  const [attInput, setAttInput] = useState('');

  const filtered = receivables.filter(r => {
    if (status && r.status !== status) return false;
    if (kw.trim()) {
      const k = kw.trim().toLowerCase();
      if (!(r.code.toLowerCase().includes(k) || r.contractName.toLowerCase().includes(k) || r.measureOrderCode.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const draftCount = filtered.filter(r => r.status === 'draft').length;
  const paidTotal = receivables.reduce((s, r) => s + paidAmountOf(r.id), 0);

  // 已创建应收单的计量单 id 集合
  const usedOrderIds = useMemo(() => {
    const s = new Set<string>();
    receivables.forEach(r => (r.measureOrderIds || [r.measureOrderId]).forEach(id => s.add(id)));
    return s;
  }, [receivables]);

  // ===== Step1：合同（含已批复未创建应收单的计量单数与批复金额） =====
  const wizContracts = useMemo(() => {
    return contracts.filter(c => c.role === 'main').map(c => {
      const cos = orders.filter(o => o.contractId === c.id && o.status === 'effective');
      const usable = cos.filter(o => !usedOrderIds.has(o.id));
      return {
        contract: c,
        usableCount: usable.length,
        usableAmount: usable.reduce((s, o) => s + o.approvedAmount, 0),
      };
    });
  }, [contracts, orders, usedOrderIds]);

  // ===== Step2：该合同下计量单（可选中 = 已批复且未创建应收单） =====
  const wizContract = contracts.find(c => c.id === wizContractId);
  const wizContractOrders = useMemo(() => {
    if (!wizContractId) return [];
    return orders
      .filter(o => o.contractId === wizContractId)
      .filter(o => !wizSearch.trim() || o.code.toLowerCase().includes(wizSearch.trim().toLowerCase()))
      .sort((a, b) => a.periodNo - b.periodNo);
  }, [orders, wizContractId, wizSearch]);

  // 所选计量单金额口径
  const chosenOrders = wizContractOrders.filter(o => wizOrderIds.includes(o.id));
  const curMeasure = r2(chosenOrders.reduce((s, o) => s + o.approvedAmount, 0));
  const prevCum = useMemo(() => r2(orders
    .filter(o => o.contractId === wizContractId && o.status === 'effective' && !wizOrderIds.includes(o.id))
    .reduce((s, o) => s + o.approvedAmount, 0)), [orders, wizContractId, wizOrderIds]);
  const depositTotal = r2(deposits.reduce((s, d) => s + (d.amount || 0), 0));
  const collectible = r2(curMeasure + (f.curChange || 0) + (f.curMaterialAdj || 0)
    - (f.curPenalty || 0) - (f.curAdvanceDeduct || 0) - (f.curPayableDeduct || 0)
    - (f.curOtherAdvanceDeduct || 0) + depositTotal);

  const openWiz = () => {
    setWizStep(1); setWizContractId(''); setWizOrderIds([]); setWizSearch('');
    setWizOpen(true);
  };

  /** 选择步 → 填报步：按所选计量单初始化表单 */
  const goStep2 = () => {
    if (wizOrderIds.length === 0) { toast('请至少勾选一张计量单', 'error'); return; }
    const c = contracts.find(x => x.id === wizContractId)!;
    setF(f0 => ({ ...f0, dept: `${c.projectName}办公室`, bizContent: '工程款' }));
    setInvoiceAmount(curMeasure);
    setInvoiceLines([{ name: '工程款', taxCategory: '工程服务', amount: curMeasure, rate: '0.09', invoiced: 0 }]);
    setInvInfo({ projectName: `顺畅养护公司${c.projectName}`, invoiceType: INVOICE_TYPES[0], email: '', phone: '', goods: '工程款', remark: `合同编号 ${c.code}` });
    setDeposits([]);
    setPlans([{ planDate: '', condition: '计量批复后30天', amount: 0, incomeItem: '工程结算收入', depositType: '', settledAmount: 0, settleMethod: '电汇' }]);
    setAttFiles([]); setAttInput('');
    setWizStep(2);
  };

  const doCreate = () => {
    const invLines = invoiceLines.map(l => {
      const rate = Number(l.rate) || 0;
      const excl = rate > 0 ? r2(l.amount / (1 + rate)) : l.amount;
      return { name: l.name, taxCategory: l.taxCategory, amount: r2(l.amount), taxRate: rate, taxAmount: r2(l.amount - excl), exclTaxAmount: excl, invoicedAmount: l.invoiced || 0 };
    });
    const res = createReceivableWithForm({
      orderIds: wizOrderIds,
      docDate: f.docDate, bizDate: f.bizDate, regCode: f.regCode, dept: f.dept, bizContent: f.bizContent,
      agingStart: f.agingStart || undefined,
      invoiceReceived: f.invoiceReceived === '是',
      payee: f.payee || undefined,
      curChange: f.curChange, curMaterialAdj: f.curMaterialAdj, curPenalty: f.curPenalty,
      curAdvanceDeduct: f.curAdvanceDeduct, curPayableDeduct: f.curPayableDeduct, curOtherAdvanceDeduct: f.curOtherAdvanceDeduct,
      curInvoiceAmount: invoiceAmount,
      deposits: deposits.map(d => ({ type: d.type, amount: d.amount || 0, invoiceNow: d.invoiceNow === '是', remark: d.remark || undefined })),
      invoices: invLines,
      invoiceInfo: invInfo,
      plans: plans.map(p => ({ planDate: p.planDate, condition: p.condition, amount: p.amount || 0, incomeItem: p.incomeItem, depositType: p.depositType || undefined, settledAmount: p.settledAmount || 0, settleMethod: p.settleMethod })),
      attachments: attFiles.map(fileName => ({ fileName })),
    });
    if (!res.ok) { toast(res.msg, 'error'); return; }
    refresh();
    setWizOpen(false);
    toast(res.msg, 'success');
  };

  const doPush = (r: ReceivableOrder) => {
    const err = pushReceivable(r.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`应收单 ${r.code} 已经交工计量系统填报并推送交投财务共享`, 'success');
  };

  const doConfirm = (r: ReceivableOrder) => {
    const err = confirmReceivable(r.id);
    if (err) { toast(err, 'error'); return; }
    refresh();
    toast(`交投财务共享已确认 ${r.code}，可在回款跟踪中登记回款`, 'success');
  };

  // 表单小区块标题
  const Sec = ({ title, hint }: { title: string; hint?: string }) => (
    <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
      <span className="w-1 h-4 bg-sky-500 rounded-full" />
      <span className="text-sm font-semibold text-slate-800">{title}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
  // 必填标签
  const Req = () => <span className="text-rose-500 ml-0.5">*</span>;
  // 只读展示字段
  const RO = ({ label, value, required }: { label: string; value: React.ReactNode; required?: boolean }) => (
    <div>
      <label className={M.label}>{label}{required && <Req />}</label>
      <div className="px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700 min-h-[34px] flex items-center break-all">{value}</div>
    </div>
  );

  return (
    <div className="p-5">
      {/* 汇总卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">应收单数量</div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{filtered.length} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">待推送</div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums">{draftCount} <span className="text-sm font-normal text-slate-400">张</span></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计应收金额</div>
          <div className="text-2xl font-bold text-violet-600 tabular-nums">{fmtMoney(totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">累计回款</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtMoney(paidTotal)}</div>
        </div>
      </div>

      <SearchBar onAdd={openWiz} addLabel="+ 创建应收单">
        <Input value={kw} onChange={setKw} placeholder="应收单号 / 计量单号 / 合同名称" className="!w-60" />
        <Select value={status} onChange={setStatus} placeholder="全部状态" className="!w-40"
          options={[
            { value: 'draft', label: '待推送' },
            { value: 'pushed', label: '已推送财务共享' },
            { value: 'confirmed', label: '财务共享已确认' },
          ]} />
      </SearchBar>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={M.table}>
            <thead>
              <tr>
                <th className={`${M.th} w-12 text-center`}>序号</th>
                <th className={M.th}>应收单号 / 在册单据编号</th>
                <th className={M.th}>对应计量单 / 期间</th>
                <th className={M.th}>合同（1:1）</th>
                <th className={M.th}>业主</th>
                <th className={`${M.th} text-right`}>本期可收金额(元)</th>
                <th className={`${M.th} text-right`}>已回款(元)</th>
                <th className={`${M.th} text-center`}>状态</th>
                <th className={M.th}>推送 / 确认时间</th>
                <th className={`${M.th} text-center`}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const paid = paidAmountOf(r.id);
                return (
                  <tr key={r.id} className="hover:bg-violet-50/40 transition-colors">
                    <td className={`${M.td} text-center text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={M.td}>
                      <button className="font-mono font-medium text-violet-700 hover:underline"
                        onClick={() => { setView(r); setRemark(r.remark || ''); }}>{r.code}</button>
                      {r.regCode && <div className="text-xs text-slate-500 font-mono">{r.regCode}</div>}
                    </td>
                    <td className={M.td}>
                      <div className="font-mono text-xs text-slate-600">{r.measureOrderCode}</div>
                      <div className="text-xs text-slate-500">{r.period}{r.settleBatch ? ` · 第 ${r.settleBatch} 期` : ''}</div>
                    </td>
                    <td className={M.td}>
                      <div className="font-medium text-slate-800">{r.contractName}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.contractCode} · {r.projectName}</div>
                    </td>
                    <td className={M.td}>
                      <div className="text-slate-700">{r.ownerName}</div>
                      {r.ownerType === 'jtou' ? <TypePill text="交投" tone="sky" /> : <TypePill text="其他" tone="amber" />}
                    </td>
                    <td className={`${M.td} text-right tabular-nums font-medium`}>{fmtMoney(r.amount)}</td>
                    <td className={`${M.td} text-right tabular-nums ${paid > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {paid > 0 ? fmtMoney(paid) : '—'}
                    </td>
                    <td className={`${M.td} text-center`}><ReceivableStatusPill status={r.status} /></td>
                    <td className={`${M.td} text-xs font-mono text-slate-500`}>
                      {r.pushedAt || '-'}
                      {r.confirmedAt && <div className="text-emerald-600">{r.confirmedAt}</div>}
                    </td>
                    <td className={`${M.td} text-center`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === 'draft' && (
                          <button className={M.button.tinyViolet} onClick={() => doPush(r)}>推送</button>
                        )}
                        {r.status === 'pushed' && (
                          <button className={M.button.tinyViolet} onClick={() => doConfirm(r)}>财务共享确认</button>
                        )}
                        <button className={M.button.tiny} onClick={() => { setView(r); setRemark(r.remark || ''); }}>详情</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className={`${M.td} text-center text-slate-400 py-10`}>
                  暂无应收单。点击右上角「创建应收单」，选择合同与已批复计量单后按工程结算应收单样式填报。
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          应收单按合同一一对应（支持同合同多张已批复计量单合并填报）；经交工计量系统「工程结算应收单」填报后推送交投财务共享。
          2026-11 交投关闭直报口子后，此链路成为养护应收的唯一通道。财务共享确认后进入回款跟踪。
        </div>
      </div>

      {/* ==================== 创建应收单向导 ==================== */}
      <Modal title="创建应收单（工程结算应收单）" open={wizOpen}
        onClose={() => setWizOpen(false)} width="max-w-6xl"
        footer={<>
          {wizStep === 2 && <button className={M.button.ghost} onClick={() => setWizStep(1)}>上一步</button>}
          {wizStep === 1 && (
            <button className={M.button.primary} disabled={wizOrderIds.length === 0} onClick={goStep2}
              style={wizOrderIds.length === 0 ? { opacity: .4 } : undefined}>下一步 · 填报应收单</button>
          )}
          {wizStep === 2 && (
            <button className={M.button.primary} onClick={doCreate}>确认创建应收单</button>
          )}
        </>}>
        {/* 步骤条 */}
        <div className="flex items-center gap-2 mb-4">
          {WIZ_STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-1.5 text-sm ${wizStep === s.n ? 'text-sky-600 font-semibold' : wizStep > s.n ? 'text-emerald-600' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${wizStep === s.n ? 'border-sky-500 bg-sky-500 text-white' : wizStep > s.n ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                  {wizStep > s.n ? '✓' : s.n}
                </span>{s.label}
              </div>
              {i < WIZ_STEPS.length - 1 && <span className="flex-1 h-px bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>

        {/* ===== Step1 选择合同（下拉）与计量单 ===== */}
        {wizStep === 1 && (
          <div className="space-y-3">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700 leading-relaxed">
              通过下拉选择合同（仅主合同），选中后下方展示该合同下的计量单；仅<b>已批复且未创建应收单</b>的计量单可勾选（可多选，合并生成一张应收单），灰色行为不可选。
            </div>
            <div>
              <label className={M.label}>选择合同<Req /></label>
              <Select value={wizContractId} onChange={v => { setWizContractId(v); setWizOrderIds([]); setWizSearch(''); }}
                placeholder="请选择合同" className="!w-full"
                options={wizContracts.map(({ contract, usableCount, usableAmount }) => ({
                  value: contract.id,
                  label: `${contract.name}（${contract.code}）· 可选计量单 ${usableCount} 张 / 批复金额 ${fmtMoney(usableAmount)}${usableCount === 0 ? '（无已批复未创建）' : ''}`,
                }))} />
            </div>
            {wizContractId && (
              <>
                {wizContract && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span>业主：<b className="text-slate-800">{wizContract.ownerName}</b></span>
                    <span>项目部：{wizContract.projectName}</span>
                    <TypePill text="主合同" tone="violet" />
                    <span className="text-cyan-600">已选 {wizOrderIds.length} 张 · 本期计量金额合计 <b>{fmtMoney(curMeasure)}</b></span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Input value={wizSearch} onChange={setWizSearch} placeholder="搜索计量单号" className="!w-64" />
                  <span className="text-xs text-slate-400">仅「已批复 · 可选」的计量单可勾选</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {wizContractOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">该合同下暂无计量单</div>
                  ) : wizContractOrders.map(o => {
                    const usable = o.status === 'effective' && !usedOrderIds.has(o.id);
                    const checked = wizOrderIds.includes(o.id);
                    return (
                      <div key={o.id} onClick={() => {
                          if (!usable) return;
                          setWizOrderIds(ids => checked ? ids.filter(x => x !== o.id) : [...ids, o.id]);
                        }}
                        className={`p-3 text-sm flex items-center justify-between gap-3 transition-colors
                          ${!usable ? 'bg-slate-50 opacity-55 cursor-not-allowed' : checked ? 'bg-sky-50 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'}`}>
                        <div className="flex items-center gap-2.5">
                          <input type="checkbox" checked={checked} disabled={!usable} readOnly
                            className="w-4 h-4 accent-sky-600" />
                          <div>
                            <div className="font-medium text-slate-800">
                              <span className="font-mono text-sky-700 mr-2">{o.code}</span>第 {o.periodNo} 期
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {o.period} · 批复 <b className="text-slate-700">{fmtMoney(o.approvedAmount)}</b>
                              {o.deduction > 0 && <span className="text-rose-500">（扣款 {fmtMoney(o.deduction)}）</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs shrink-0">
                          {o.status !== 'effective'
                            ? <span className="text-rose-500">未批复，不可选</span>
                            : usedOrderIds.has(o.id)
                              ? <span className="text-slate-400">已创建应收单，不可选</span>
                              : checked
                                ? <TypePill text="已勾选" tone="sky" />
                                : <span className="text-emerald-600">已批复 · 可选</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== Step2 填报应收单（按工程结算应收单样式，* 为必填） ===== */}
        {wizStep === 2 && wizContract && (
          <div className="max-h-[72vh] overflow-y-auto pr-1">
            {/* 基本信息 */}
            <Sec title="基本信息" hint="带 * 为必填项；组织/合同/客户按所选合同自动带入" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <RO label="单据类型" value="工程结算应收单" required />
              <RO label="资金流向" value="收款" required />
              <RO label="是否有合同" value="是" required />
              <RO label="合同" value={`${wizContract.name}（${wizContract.code}）`} required />
              <RO label="客户（往来类型：客户）" value={wizContract.ownerName} required />
              <RO label="结算组织" value={`顺畅养护公司${wizContract.projectName}`} required />
              <RO label="申请开票组织" value={`顺畅养护公司${wizContract.projectName}`} required />
              <RO label="入账组织" value={`顺畅养护公司${wizContract.projectName}`} required />
              <RO label="收款组织" value={`顺畅养护公司${wizContract.projectName}`} required />
              <div>
                <label className={M.label}>单据日期<Req /></label>
                <input type="date" value={f.docDate} onChange={e => setF({ ...f, docDate: e.target.value })}
                  className={M.input} />
              </div>
              <div>
                <label className={M.label}>业务日期<Req /></label>
                <input type="date" value={f.bizDate} onChange={e => setF({ ...f, bizDate: e.target.value })}
                  className={M.input} />
              </div>
              <div>
                <label className={M.label}>在册单据编号<Req /></label>
                <Input value={f.regCode} onChange={v => setF({ ...f, regCode: v })} placeholder="如 YS-13005761-2610-0006" />
              </div>
              <div>
                <label className={M.label}>部门<Req /></label>
                <Input value={f.dept} onChange={v => setF({ ...f, dept: v })} placeholder="如 xx项目部办公室" />
              </div>
              <div>
                <label className={M.label}>业务内容<Req /></label>
                <Input value={f.bizContent} onChange={v => setF({ ...f, bizContent: v })} placeholder="工程款" />
              </div>
              <div>
                <label className={M.label}>是否收票<Req /></label>
                <Select value={f.invoiceReceived} onChange={v => setF({ ...f, invoiceReceived: v })} className="!w-full"
                  options={[{ value: '是', label: '是' }, { value: '否', label: '否' }]} />
              </div>
              <div>
                <label className={M.label}>账龄起算日</label>
                <input type="date" value={f.agingStart} onChange={e => setF({ ...f, agingStart: e.target.value })}
                  className={M.input} />
              </div>
              <div>
                <label className={M.label}>收款人</label>
                <Input value={f.payee} onChange={v => setF({ ...f, payee: v })} placeholder="收款人" />
              </div>
            </div>

            {/* 应收信息 */}
            <Sec title="应收信息" hint="计量金额按所选计量单自动汇总；保证金 = 保证金明细合计（负数扣留）" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <RO label="本期计量金额" value={<b className="text-slate-900">{fmtMoney(curMeasure)}</b>} required />
              <RO label="上期末累计计量金额" value={fmtMoney(prevCum)} />
              <RO label="到本期末累计计量金额" value={fmtMoney(r2(prevCum + curMeasure))} />
              {([
                ['本期变更', 'curChange'], ['本期材料调差', 'curMaterialAdj'], ['本期罚款', 'curPenalty'],
                ['本期应扣预付款', 'curAdvanceDeduct'], ['本期应扣待付扣回', 'curPayableDeduct'], ['本期其他预付款扣回', 'curOtherAdvanceDeduct'],
              ] as [string, keyof WizForm][]).map(([label, key]) => (
                <div key={key}>
                  <label className={M.label}>{label}</label>
                  <input type="number" step="0.01" min="0" value={f[key] as number}
                    onChange={e => setF({ ...f, [key]: Number(e.target.value) || 0 })} className={M.input} />
                </div>
              ))}
              <RO label="本期保证金（明细合计）" value={<b className={depositTotal < 0 ? 'text-rose-600' : 'text-slate-900'}>{fmtMoney(depositTotal)}</b>} />
              <div>
                <label className={M.label}>本期开票金额<Req /></label>
                <input type="number" step="0.01" min="0" value={invoiceAmount}
                  onChange={e => setInvoiceAmount(Number(e.target.value) || 0)} className={M.input} />
              </div>
              <RO label="本期可收金额" value={<b className="text-sky-700 text-base">{fmtMoney(collectible)}</b>} required />
              <RO label="结算批次" value={`第 ${chosenOrders.map(o => o.periodNo).sort((a, b) => a - b).join('、')} 期`} required />
              <RO label="结算币别" value="CNY 人民币" required />
              <RO label="多币别" value="否" />
            </div>

            {/* 保证金明细 */}
            <Sec title="保证金明细" hint="金额填负数表示扣留（如 -908465.00）" />
            <table className={M.table}>
              <thead>
                <tr>
                  <th className={`${M.th} w-12 text-center`}>序号</th>
                  <th className={M.th}>保证金类型</th>
                  <th className={M.th}>保证金金额</th>
                  <th className={M.th}>是否立即开票</th>
                  <th className={M.th}>说明</th>
                  <th className={`${M.th} w-16 text-center`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d, i) => (
                  <tr key={i}>
                    <td className={`${M.td} text-center text-slate-400`}>{i + 1}</td>
                    <td className={M.td}>
                      <Select value={d.type} onChange={v => setDeposits(list => list.map((x, j) => j === i ? { ...x, type: v } : x))}
                        className="!w-full" options={DEPOSIT_TYPES.map(t => ({ value: t, label: t }))} />
                    </td>
                    <td className={M.td}>
                      <input type="number" step="0.01" value={d.amount}
                        onChange={e => setDeposits(list => list.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))}
                        className={M.input} />
                    </td>
                    <td className={M.td}>
                      <Select value={d.invoiceNow} onChange={v => setDeposits(list => list.map((x, j) => j === i ? { ...x, invoiceNow: v } : x))}
                        className="!w-full" options={[{ value: '是', label: '是' }, { value: '否', label: '否' }]} />
                    </td>
                    <td className={M.td}>
                      <Input value={d.remark} onChange={v => setDeposits(list => list.map((x, j) => j === i ? { ...x, remark: v } : x))} placeholder="说明" />
                    </td>
                    <td className={`${M.td} text-center`}>
                      <button className="text-rose-500 hover:text-rose-600 text-xs" onClick={() => setDeposits(list => list.filter((_, j) => j !== i))}>删除</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className={`${M.td} text-center py-2`}>
                    <button className="text-sky-600 hover:text-sky-700 text-xs" onClick={() => setDeposits(list => [...list, { type: DEPOSIT_TYPES[0], amount: 0, invoiceNow: '是', remark: '' }])}>+ 添加保证金</button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 开票明细 */}
            <Sec title="开票明细" hint="价税分离：税额 = 开票金额 − 不含税金额；不含税金额 = 开票金额 ÷（1 + 税率）；未开票金额 = 本期开票金额 − 已开票金额" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-2">
              <div>
                <label className={M.label}>是否微调<Req /></label>
                <Select value={invMinorAdjust} onChange={setInvMinorAdjust} className="!w-full"
                  options={[{ value: '是', label: '是' }, { value: '否', label: '否' }]} />
              </div>
            </div>
            <table className={M.table}>
              <thead>
                <tr>
                  <th className={`${M.th} w-12 text-center`}>序号</th>
                  <th className={M.th}>开票名称</th>
                  <th className={M.th}>税收分类</th>
                  <th className={M.th}>本期开票金额</th>
                  <th className={M.th}>已开票金额</th>
                  <th className={`${M.th} text-right`}>未开票金额</th>
                  <th className={M.th}>开票税率</th>
                  <th className={`${M.th} text-right`}>开票税额</th>
                  <th className={`${M.th} text-right`}>不含税金额</th>
                  <th className={`${M.th} w-16 text-center`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {invoiceLines.map((l, i) => {
                  const rate = Number(l.rate) || 0;
                  const excl = rate > 0 ? r2(l.amount / (1 + rate)) : l.amount;
                  const tax = r2(l.amount - excl);
                  return (
                    <tr key={i}>
                      <td className={`${M.td} text-center text-slate-400`}>{i + 1}</td>
                      <td className={M.td}><Input value={l.name} onChange={v => setInvoiceLines(list => list.map((x, j) => j === i ? { ...x, name: v } : x))} /></td>
                      <td className={M.td}>
                        <Select value={l.taxCategory} onChange={v => setInvoiceLines(list => list.map((x, j) => j === i ? { ...x, taxCategory: v } : x))}
                          className="!w-full" options={TAX_CATEGORIES.map(t => ({ value: t, label: t }))} />
                      </td>
                      <td className={M.td}>
                        <input type="number" step="0.01" value={l.amount}
                          onChange={e => setInvoiceLines(list => list.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))}
                          className={M.input} />
                      </td>
                      <td className={M.td}>
                        <input type="number" step="0.01" min="0" value={l.invoiced}
                          onChange={e => setInvoiceLines(list => list.map((x, j) => j === i ? { ...x, invoiced: Number(e.target.value) || 0 } : x))}
                          className={M.input} />
                      </td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(r2(l.amount - (l.invoiced || 0)))}</td>
                      <td className={M.td}>
                        <Select value={l.rate} onChange={v => setInvoiceLines(list => list.map((x, j) => j === i ? { ...x, rate: v } : x))}
                          className="!w-full" options={TAX_RATES} />
                      </td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(tax)}</td>
                      <td className={`${M.td} text-right tabular-nums`}>{fmtMoney(excl)}</td>
                      <td className={`${M.td} text-center`}>
                        <button className="text-rose-500 hover:text-rose-600 text-xs" onClick={() => setInvoiceLines(list => list.filter((_, j) => j !== i))}>删除</button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={10} className={`${M.td} text-center py-2`}>
                    <button className="text-sky-600 hover:text-sky-700 text-xs"
                      onClick={() => setInvoiceLines(list => [...list, { name: '工程款', taxCategory: '工程服务', amount: 0, rate: '0.09', invoiced: 0 }])}>+ 添加开票行</button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 发票其他信息 */}
            <Sec title="发票其他信息" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={M.label}>工程发票名称</label>
                <Input value={invInfo.projectName} onChange={v => setInvInfo({ ...invInfo, projectName: v })} />
              </div>
              <div>
                <label className={M.label}>发票类型</label>
                <Select value={invInfo.invoiceType} onChange={v => setInvInfo({ ...invInfo, invoiceType: v })}
                  className="!w-full" options={INVOICE_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <div>
                <label className={M.label}>电子发票发票邮箱</label>
                <Input value={invInfo.email} onChange={v => setInvInfo({ ...invInfo, email: v })} placeholder="电子发票接收邮箱" />
              </div>
              <div>
                <label className={M.label}>电子发票收票电话</label>
                <Input value={invInfo.phone} onChange={v => setInvInfo({ ...invInfo, phone: v })} placeholder="收票电话" />
              </div>
              <div>
                <label className={M.label}>货种</label>
                <Input value={invInfo.goods} onChange={v => setInvInfo({ ...invInfo, goods: v })} />
              </div>
              <div>
                <label className={M.label}>发票备注信息</label>
                <Input value={invInfo.remark} onChange={v => setInvInfo({ ...invInfo, remark: v })} />
              </div>
            </div>

            {/* 收款计划 */}
            <Sec title="收款计划" />
            <table className={M.table}>
              <thead>
                <tr>
                  <th className={`${M.th} w-12 text-center`}>序号</th>
                  <th className={M.th}>合同</th>
                  <th className={M.th}>约定收款日期</th>
                  <th className={M.th}>约定收款条件</th>
                  <th className={M.th}>应收金额</th>
                  <th className={M.th}>收入项目</th>
                  <th className={M.th}>保证金类型</th>
                  <th className={M.th}>已结算金额</th>
                  <th className={M.th}>结算方式</th>
                  <th className={`${M.th} w-16 text-center`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p, i) => (
                  <tr key={i}>
                    <td className={`${M.td} text-center text-slate-400`}>{i + 1}</td>
                    <td className={`${M.td} text-xs text-slate-600`}>
                      <div className="font-medium text-slate-800 text-sm">{wizContract.name}</div>
                      <div className="font-mono text-slate-500">{wizContract.code}</div>
                    </td>
                    <td className={M.td}>
                      <input type="date" value={p.planDate}
                        onChange={e => setPlans(list => list.map((x, j) => j === i ? { ...x, planDate: e.target.value } : x))}
                        className={M.input} />
                    </td>
                    <td className={M.td}>
                      <Select value={p.condition} onChange={v => setPlans(list => list.map((x, j) => j === i ? { ...x, condition: v } : x))}
                        className="!w-full" options={PLAN_CONDITIONS.map(t => ({ value: t, label: t }))} />
                    </td>
                    <td className={M.td}>
                      <input type="number" step="0.01" value={p.amount}
                        onChange={e => setPlans(list => list.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))}
                        className={M.input} />
                    </td>
                    <td className={M.td}>
                      <Input value={p.incomeItem} onChange={v => setPlans(list => list.map((x, j) => j === i ? { ...x, incomeItem: v } : x))} />
                    </td>
                    <td className={M.td}>
                      <Select value={p.depositType} onChange={v => setPlans(list => list.map((x, j) => j === i ? { ...x, depositType: v } : x))}
                        placeholder="无" className="!w-full" options={DEPOSIT_TYPES.map(t => ({ value: t, label: t }))} />
                    </td>
                    <td className={M.td}>
                      <input type="number" step="0.01" min="0" value={p.settledAmount}
                        onChange={e => setPlans(list => list.map((x, j) => j === i ? { ...x, settledAmount: Number(e.target.value) || 0 } : x))}
                        className={M.input} />
                    </td>
                    <td className={M.td}>
                      <Select value={p.settleMethod} onChange={v => setPlans(list => list.map((x, j) => j === i ? { ...x, settleMethod: v } : x))}
                        className="!w-full" options={SETTLE_METHODS.map(t => ({ value: t, label: t }))} />
                    </td>
                    <td className={`${M.td} text-center`}>
                      <button className="text-rose-500 hover:text-rose-600 text-xs" onClick={() => setPlans(list => list.filter((_, j) => j !== i))}>删除</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={10} className={`${M.td} text-center py-2`}>
                    <button className="text-sky-600 hover:text-sky-700 text-xs"
                      onClick={() => setPlans(list => [...list, { planDate: '', condition: '计量批复后30天', amount: collectible, incomeItem: '工程结算收入', depositType: '', settledAmount: 0, settleMethod: '电汇' }])}>+ 添加收款计划</button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 附件 */}
            <Sec title="附件" hint="登记随单附件文件名（如开票申请、民工工资说明等）" />
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                {attFiles.length === 0 && <div className="text-xs text-slate-400 py-1">暂无附件</div>}
                {attFiles.map((name, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <span className="text-slate-700 truncate"><span className="text-sky-500 mr-1.5">▸</span>{name}</span>
                    <button className="text-rose-500 hover:text-rose-600 text-xs shrink-0" onClick={() => setAttFiles(list => list.filter((_, j) => j !== i))}>删除</button>
                  </div>
                ))}
              </div>
              <div className="w-72 shrink-0">
                <Input value={attInput} onChange={setAttInput} placeholder="输入附件文件名后点击添加" />
                <button className="mt-1.5 w-full px-3 py-1.5 rounded-md border border-sky-500 text-sky-600 text-sm hover:bg-sky-50 transition disabled:opacity-40"
                  disabled={!attInput.trim()}
                  onClick={() => { setAttFiles(list => [...list, attInput.trim()]); setAttInput(''); }}>+ 添加附件</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== 应收单详情 ==================== */}
      <Modal title={`应收单 ${view?.code || ''}`} open={!!view}
        onClose={() => setView(null)} width="max-w-xl"
        footer={<>
          {view?.status === 'draft' && (
            <button className={M.button.primary} onClick={() => { doPush(view!); setView(null); }}>推送财务共享</button>
          )}
          {view?.status === 'pushed' && (
            <button className={M.button.primary} onClick={() => { doConfirm(view!); setView(null); }}>财务共享确认</button>
          )}
          <button className={M.button.ghost} onClick={() => setView(null)}>关闭</button>
        </>}>
        {view && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {([
                ['对应计量单', view.measureOrderCode], ['计量期间', view.period],
                ['合同名称', view.contractName], ['合同编号', view.contractCode],
                ['项目部', view.projectName], ['业主', view.ownerName],
                ['推送时间', view.pushedAt || '未推送'], ['确认时间', view.confirmedAt || '未确认'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                  <div className="font-medium text-slate-800">{v}</div>
                </div>
              ))}
            </div>

            {/* 工程结算应收单填报信息 */}
            {view.sysCode && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-sky-500 rounded-full" />工程结算应收单填报信息
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="text-slate-500">系统单据编号：<span className="font-mono text-slate-700">{view.sysCode}</span></div>
                  <div className="text-slate-500">在册单据编号：<span className="font-mono text-slate-700">{view.regCode}</span></div>
                  <div className="text-slate-500">单据日期：{view.docDate}</div>
                  <div className="text-slate-500">业务日期：{view.bizDate}</div>
                  <div className="text-slate-500">业务内容：{view.bizContent}</div>
                  <div className="text-slate-500">结算批次：第 {view.settleBatch} 期 · {view.currency}</div>
                  <div className="text-slate-500">本期计量金额：<b className="text-slate-800">{fmtMoney(view.curMeasureAmount || 0)}</b></div>
                  <div className="text-slate-500">上期末累计：{fmtMoney(view.prevCumMeasureAmount || 0)}</div>
                  <div className="text-slate-500">到本期末累计：<b className="text-slate-800">{fmtMoney(view.endCumMeasureAmount || 0)}</b></div>
                  <div className="text-slate-500">本期保证金：<span className={(view.curDeposit || 0) < 0 ? 'text-rose-600' : ''}>{fmtMoney(view.curDeposit || 0)}</span></div>
                  <div className="text-slate-500">本期开票金额：{fmtMoney(view.curInvoiceAmount || 0)}</div>
                  <div className="text-slate-500">是否收票：{view.invoiceReceived ? '是' : '否'}</div>
                </div>
                {(view.deposits?.length || 0) > 0 && (
                  <div className="text-xs text-slate-500 pt-1 border-t border-dashed border-slate-200">
                    保证金明细：{view.deposits!.map(d => `${d.type} ${fmtMoney(d.amount)}${d.invoiceNow ? '（立即开票）' : ''}`).join('；')}
                  </div>
                )}
                {(view.invoices?.length || 0) > 0 && (
                  <div className="text-xs text-slate-500">
                    开票明细：{view.invoices!.map(v => `${v.name}（${v.taxCategory}）${fmtMoney(v.amount)}，税率 ${fmtNum(v.taxRate * 100)}%，税额 ${fmtMoney(v.taxAmount)}`).join('；')}
                  </div>
                )}
                {(view.plans?.length || 0) > 0 && (
                  <div className="text-xs text-slate-500">
                    收款计划：{view.plans!.map(p => `${p.planDate || '未约定'} ${p.condition} ${fmtMoney(p.amount)}`).join('；')}
                  </div>
                )}
                {(view.attachments?.length || 0) > 0 && (
                  <div className="text-xs text-slate-500">
                    附件：{view.attachments!.map(a => a.fileName).join('、')}
                  </div>
                )}
              </div>
            )}

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">应收金额（本期可收，含税）</span>
              <span className="text-xl font-bold text-violet-700 tabular-nums">{fmtMoney(view.amount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700/70">已回款</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(paidAmountOf(view.id))}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-500">未回款</div>
                <div className="text-lg font-bold text-slate-700 tabular-nums">{fmtMoney(view.amount - paidAmountOf(view.id))}</div>
              </div>
            </div>
            <div>
              <label className={M.label}>备注</label>
              <Textarea value={remark} onChange={setRemark} placeholder="应收单备注（经交工计量系统填报推送）" />
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              链路：计量单（已批复）→ 交工计量系统应收单填报 → 推送交投财务共享 → 财务共享确认 → 回款跟踪登记回款。
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
