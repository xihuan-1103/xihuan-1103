import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Send, X, Plus, Download, Eye, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_CONTRACTS } from '@/data';
import { Contract, Project } from '@/types';
import { cn } from '@/lib/utils';
import ContractInventoryMaintenance from '@/components/ContractInventoryMaintenance';

const TABS = [
  { id: 'basic', label: '基本信息' },
  { id: 'price', label: '合同价税信息' },
  { id: 'plan', label: '履约计划' },
  { id: 'guarantee', label: '履约保证金/保函' },
  { id: 'file', label: '合同稿' },
  { id: 'maintenance', label: '合同清单维护' },
];

const SUPPLEMENTARY_TABS = [
  { id: 'basic', label: '基本信息' },
  { id: 'collab', label: '协作单位维护' },
  { id: 'other', label: '其他类型数据补充' },
  { id: 'maintenance', label: '合同清单维护' },
];

interface Props {
  contracts: Contract[];
  projects: Project[];
  onSave: (contract: Contract) => void;
}

export default function ContractConfirmationDetail({ contracts, projects, onSave }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const mode = searchParams.get('mode'); // 'view' or 'confirm' or 'edit'
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [contract, setContract] = useState<Contract | null>(null);
  const [step, setStep] = useState(mode === 'edit' ? 2 : 1); // 1: 确认当前合同信息, 2: 合同补充信息
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (id) {
      const found = contracts.find(c => c.id === id);
      if (found) setContract(found);
    }
  }, [id, contracts]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'maintenance') {
      setActiveTab('maintenance');
    }
  }, [searchParams]);

  if (!contract) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
      {[
        { label: '合同名称', value: contract.name },
        { label: '合同类型', value: contract.type },
        { label: '合同编码', value: contract.code },
        { label: '合同性质', value: '固定总额合同' },
        { label: '交投合同 ID', value: 'jh7519249' },
        { label: '交投合同编号', value: 'UID91591' },
        { label: '合同推送财务系统状态', value: contract.financialStatus, color: 'text-blue-600' },
        { label: '合同状态', value: '履行中', color: 'text-blue-600' },
        { label: '经办时间', value: '26/06/2021' },
        { label: '经办机构', value: contract.agency },
        { label: '经办人', value: '周末' },
        { label: '合同签订时间', value: '26/06/2021' },
        { label: '资金流向', value: '收入' },
        { label: '是否关联交易', value: '否' },
        { label: '是否重大合同', value: '否' },
        { label: '采购依据', value: '这里是采购依据' },
      ].map((item, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs text-gray-400">{item.label}</label>
          <div className={cn("text-sm font-medium", item.color)}>{item.value}</div>
        </div>
      ))}
      <div className="col-span-full space-y-1">
        <label className="text-xs text-gray-400">我方签约主体</label>
        <div className="text-sm font-medium">甲方: {contract.partyA}</div>
      </div>
      <div className="col-span-full space-y-1">
        <label className="text-xs text-gray-400">对方签约主体</label>
        <div className="text-sm font-medium">乙方: {contract.partyB}</div>
      </div>
      <div className="col-span-full space-y-1">
        <label className="text-xs text-gray-400">合同说明</label>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 italic">
          这里是合同的说明显示内容
        </div>
      </div>
    </div>
  );

  const renderPriceInfo = () => (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">价税合计总额 / 元</div>
          <div className="text-xl font-bold text-blue-700 font-mono">4,412,312.12</div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">不含税金额 / 元</div>
          <div className="text-xl font-bold text-gray-700 font-mono">4,124,142.12</div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">税额 / 元</div>
          <div className="text-xl font-bold text-gray-700 font-mono">41,412.12</div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">收款方式</div>
          <div className="text-xl font-bold text-gray-700">电汇</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '币种', value: '人民币元' },
          { label: '计税方式', value: '一般计税' },
          { label: '发票类型', value: '增值税普通发票' },
        ].map((item, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs text-gray-400">{item.label}</label>
            <div className="text-sm font-medium">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSupplementaryBasic = () => (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">合同简称:</label>
            <input 
              type="text" 
              readOnly={isView}
              className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm", isView && "bg-gray-50")} 
              placeholder="请输入" 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">甲方负责人:</label>
            <input 
              type="text" 
              readOnly={isView}
              className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm", isView && "bg-gray-50")} 
              placeholder="请输入" 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">乙方负责人:</label>
            <input 
              type="text" 
              readOnly={isView}
              className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm", isView && "bg-gray-50")} 
              placeholder="请输入" 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">已关联项目:</label>
            <div className="flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 min-h-[34px] flex items-center">
              {contract && projects
                .filter(p => p.contractId === contract.id)
                .map(p => p.name)
                .join('、') || <span className="text-gray-400">暂无关联项目</span>}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 invisible"><label className="w-32"></label></div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">负责人联系方式:</label>
            <input 
              type="text" 
              readOnly={isView}
              className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm", isView && "bg-gray-50")} 
              placeholder="请输入" 
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-32 text-right">负责人联系方式:</label>
            <input 
              type="text" 
              readOnly={isView}
              className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm", isView && "bg-gray-50")} 
              placeholder="请输入" 
            />
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <label className="text-sm text-gray-600 w-32 text-right shrink-0">合同说明:</label>
        <textarea 
          readOnly={isView}
          className={cn("flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm h-24 resize-none", isView && "bg-gray-50")} 
          placeholder="请输入"
        ></textarea>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-[#165DFF] transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-base text-slate-800">
            {isView ? '合同查看' : isEdit ? '修改合同补充信息' : '合同确认'}
          </h2>
        </div>
        <div className="flex gap-2.5 items-center">
          {mode === 'confirm' && (
            <>
              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                <Undo2 size={13} className="rotate-180 text-amber-500" /> 退回该合同
              </button>
              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                <Share2 size={13} className="text-rose-500" /> 转派该合同
              </button>
            </>
          )}
          {step === 1 ? (
            <button 
              onClick={() => { setStep(2); setActiveTab('basic'); }}
              className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-5 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-3xs transition-colors cursor-pointer"
            >
              下一步 <ChevronRight size={14} />
            </button>
          ) : (
            <>
              <button 
                onClick={() => { setStep(1); setActiveTab('basic'); }}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                上一步
              </button>
              {(mode === 'confirm' || mode === 'edit') && (
                <button 
                  onClick={() => { 
                    if (contract) {
                      onSave({ ...contract, status: '已确认' });
                      alert(mode === 'confirm' ? '确认成功' : '保存成功'); 
                      navigate('/contract/income/ledger');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
                >
                  <Save size={13} /> {mode === 'confirm' ? '确认通过该合同' : '保存修改'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-center py-5 bg-white border-b border-gray-200 shrink-0 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            step === 1 ? "bg-[#165DFF] text-white shadow-3xs" : "text-slate-400 bg-slate-100"
          )}>
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black",
              step === 1 ? "bg-white text-[#165DFF]" : "bg-slate-200 text-slate-500"
            )}>1</span>
            确认当前合同信息
          </div>
          <div className="w-12 h-0.5 bg-gray-200"></div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            step === 2 ? "bg-[#165DFF] text-white shadow-3xs" : "text-slate-400 bg-slate-100"
          )}>
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black",
              step === 2 ? "bg-white text-[#165DFF]" : "bg-slate-200 text-slate-500"
            )}>2</span>
            合同补充信息
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0 bg-white px-4">
        {(step === 1 ? TABS : SUPPLEMENTARY_TABS).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3.5 text-xs transition-colors relative cursor-pointer font-medium",
              activeTab === tab.id ? "text-[#165DFF] font-bold" : "text-slate-500 hover:text-[#165DFF]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#165DFF]"></div>}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="font-bold text-gray-700">
                {(step === 1 ? TABS : SUPPLEMENTARY_TABS).find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            
            {activeTab === 'maintenance' ? (
              <ContractInventoryMaintenance contract={contract} />
            ) : step === 1 ? (
              <>
                {activeTab === 'basic' && renderBasicInfo()}
                {activeTab === 'price' && renderPriceInfo()}
                {activeTab === 'plan' && (
                  <div className="p-12 text-center text-gray-400">履约计划数据加载中...</div>
                )}
                {activeTab === 'guarantee' && (
                  <div className="p-12 text-center text-gray-400">保证金数据加载中...</div>
                )}
                {activeTab === 'file' && (
                  <div className="p-6 flex items-center justify-between bg-gray-50 rounded m-4 border border-dashed border-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold">PDF</div>
                      <div>
                        <div className="text-sm font-medium">这里是合同的名称.pdf</div>
                        <div className="text-xs text-gray-400">4.2 MB</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-blue-600 text-sm hover:underline flex items-center gap-1"><Eye size={14} /> 预览</button>
                      <button className="text-blue-600 text-sm hover:underline flex items-center gap-1"><Download size={14} /> 下载</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {activeTab === 'basic' && renderSupplementaryBasic()}
                {activeTab === 'collab' && (
                  <div className="p-4 space-y-4">
                    <div className="flex justify-end">
                      <button className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer">
                        <Plus size={14} /> 新增协作单位
                      </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#FAFBFD] text-slate-500 font-bold border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3">协作单位名称</th>
                            <th className="px-4 py-3">协作类型</th>
                            <th className="px-4 py-3">协作范围</th>
                            <th className="px-4 py-3 text-center">状态</th>
                            <th className="px-4 py-3 text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          <tr className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-4 py-3 font-bold text-slate-800">单位A</td>
                            <td className="px-4 py-3 text-slate-600">全合同协同</td>
                            <td className="px-4 py-3 text-slate-400">/</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center">待确认</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button className="text-[#165DFF] hover:underline font-bold cursor-pointer">修改</button>
                                <button className="text-rose-600 hover:underline font-bold cursor-pointer">删除</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {activeTab === 'other' && (
                  <div className="p-12 text-center text-gray-400">其他类型数据补充加载中...</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Undo2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  );
}

function Share2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}
