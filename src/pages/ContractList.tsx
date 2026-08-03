import React, { useState } from 'react';
import { Search, RotateCcw, Plus, Calendar, FileText, Eye, Edit3, CheckCircle2, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock Data matching Screenshot 2
const INITIAL_CONTRACT_LIST = [
  {
    id: '1',
    seq: 1,
    name: '浙江交工养护集团2026年义龙庆高速公路日常养护协作项目',
    performStatus: '正常履约',
    approvalStatus: '已通过',
    jgCode: 'JG-YH-2026-0112',
    jtCode: 'CICO-JT-2026-0883',
    projectName: '义龙庆标段日常养护及设施抢修工程',
    type: '日常养护类',
    price: '3,845.60'
  },
  {
    id: '2',
    seq: 2,
    name: '沪杭甬高速公路大中修及桥梁专项保养合同',
    performStatus: '正常履约',
    approvalStatus: '已通过',
    jgCode: 'JG-YH-2026-0094',
    jtCode: 'CICO-JT-2026-0612',
    projectName: '沪杭甬高速公路2026年度桥梁养护专项',
    type: '专项施工类',
    price: '1,250.00'
  },
  {
    id: '3',
    seq: 3,
    name: '甬台温高速段雨季山区边坡应急加固与滑坡处理工程协作合同',
    performStatus: '待交工验收',
    approvalStatus: '审批中',
    jgCode: 'JG-YJ-2026-0043',
    jtCode: 'CICO-JT-2026-0429',
    projectName: '台温段抢修应急治理工程',
    type: '应急抢修类',
    price: '680.50'
  },
  {
    id: '4',
    seq: 4,
    name: '申嘉湖高速公路绿化修剪与中分带保洁分包合同',
    performStatus: '正常履约',
    approvalStatus: '已通过',
    jgCode: 'JG-YH-2026-0155',
    jtCode: 'CICO-JT-2026-0901',
    projectName: '申嘉湖高速环境与绿化维护工程',
    type: '日常养护类',
    price: '420.00'
  },
  {
    id: '5',
    seq: 5,
    name: '金丽温高速公路路面铣刨放样及沥青重新铺设专业作业合同',
    performStatus: '已完成交工',
    approvalStatus: '已通过',
    jgCode: 'JG-ZX-2025-0811',
    jtCode: 'CICO-JT-2025-1104',
    projectName: '金丽温高速公路养护大修工程',
    type: '专项施工类',
    price: '2,140.80'
  }
];

// Mock Data for Screenshot 1 Modal Dialog (需求立项列表)
const REQUIREMENT_ITEMS = [
  { id: 'XQ20260041', name: '测-20260624-2', category: '科研项目', catColor: 'text-blue-600 border-blue-300 bg-blue-50', org: '集团总部' },
  { id: 'XQ20260039', name: '测其他项目', category: '其他项目', catColor: 'text-gray-600 border-gray-300 bg-gray-50', org: '集团总部' },
  { id: 'XQ20260037', name: '测运维类项目', category: '运维类项目', catColor: 'text-slate-600 border-slate-300 bg-slate-50', org: '数字中心' },
  { id: 'XQ20260036', name: '1', category: '软件采购项目', catColor: 'text-amber-600 border-amber-300 bg-amber-50', org: '集团总部' },
  { id: 'XQ20260035', name: '0623测测测', category: '软件采购项目', catColor: 'text-amber-600 border-amber-300 bg-amber-50', org: '集团总部' },
  { id: 'XQ20260004', name: '测20260527', category: '科研项目', catColor: 'text-blue-600 border-blue-300 bg-blue-50', org: '数字中心' }
];

export default function ContractList() {
  const [contracts, setContracts] = useState(INITIAL_CONTRACT_LIST);
  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchYear, setSearchYear] = useState('');
  
  // Dialog state for Screenshot 1
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const [reqSearchKey, setReqSearchKey] = useState('');
  const [reqSearchOrg, setReqSearchOrg] = useState('');
  const [selectedReqId, setSelectedReqId] = useState<string | null>('XQ20260041');

  const filteredContracts = contracts.filter(c => {
    const matchName = !searchName || c.name.includes(searchName) || c.projectName.includes(searchName);
    const matchCode = !searchCode || c.jgCode.includes(searchCode) || c.jtCode.includes(searchCode);
    const matchType = !searchType || c.type === searchType;
    return matchName && matchCode && matchType;
  });

  const filteredReqs = REQUIREMENT_ITEMS.filter(r => {
    const matchKey = !reqSearchKey || r.id.includes(reqSearchKey) || r.name.includes(reqSearchKey);
    const matchOrg = !reqSearchOrg || r.org === reqSearchOrg;
    return matchKey && matchOrg;
  });

  const handleReset = () => {
    setSearchName('');
    setSearchCode('');
    setSearchType('');
    setSearchYear('');
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Search & Filter Card - Replicating Screenshot 2 */}
      <div className="bg-white p-4 rounded-lg shadow-2xs border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 items-center">
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同名称:</label>
            <input 
              type="text" 
              placeholder="请输入合同名称" 
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同编号:</label>
            <input 
              type="text" 
              placeholder="请输入合同编号" 
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">合同类别:</label>
            <select 
              value={searchType}
              onChange={e => setSearchType(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF] focus:ring-1 focus:ring-[#165DFF]/20 transition-all"
            >
              <option value="">请选择合同类别</option>
              <option value="日常养护类">日常养护类</option>
              <option value="专项施工类">专项施工类</option>
              <option value="应急抢修类">应急抢修类</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 shrink-0 w-18 text-right">年份:</label>
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="请选择年份" 
                value={searchYear}
                onChange={e => setSearchYear(e.target.value)}
                className="w-full border border-gray-300 rounded pl-2.5 pr-8 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]"
              />
              <Calendar size={14} className="absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Action Buttons Row */}
        <div className="flex justify-end items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
          <button 
            onClick={() => {}}
            className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
          >
            <Search size={14} /> 查询
          </button>
          <button 
            onClick={handleReset}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg shadow-2xs border border-gray-200 overflow-hidden">
        {/* Table Action Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowRequirementDialog(true)}
              className="bg-[#165DFF] hover:bg-[#0E4AD2] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all cursor-pointer"
            >
              <Plus size={14} /> 选择需求（关联合同立项）
            </button>
            <button 
              onClick={() => alert("功能已启用：支持快速起草养护分包合同。")}
              className="bg-white border border-[#165DFF] text-[#165DFF] hover:bg-blue-50 px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <FileText size={14} /> 新增合同
            </button>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            共检索到 <strong className="text-slate-800 font-mono">{filteredContracts.length}</strong> 份合同
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#FAFBFD] border-b border-gray-200 text-slate-500 font-bold">
                <th className="py-3 px-3.5 w-14 text-center">序号</th>
                <th className="py-3 px-4 min-w-[220px]">合同名称</th>
                <th className="py-3 px-3 w-28 text-center">合同履行状态</th>
                <th className="py-3 px-3 w-24 text-center">审批状态</th>
                <th className="py-3 px-3.5 font-mono">合同编号（交工）</th>
                <th className="py-3 px-3.5 font-mono">交投合同编号</th>
                <th className="py-3 px-4 min-w-[180px]">项目名称</th>
                <th className="py-3 px-3">合同类别</th>
                <th className="py-3 px-4 text-right font-mono">原总价</th>
                <th className="py-3 px-4 text-center w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-slate-200" />
                      <span>暂无符合查询条件的合同结果</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, idx) => (
                  <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3 px-3.5 text-center text-slate-400 font-mono">{contract.seq}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 group-hover:text-[#165DFF] transition-colors">
                      {contract.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                        contract.performStatus === '正常履约' && "bg-emerald-50 text-emerald-600 border border-emerald-200",
                        contract.performStatus === '待交工验收' && "bg-blue-50 text-blue-600 border border-blue-200",
                        contract.performStatus === '已完成交工' && "bg-slate-100 text-slate-600 border border-slate-200"
                      )}>
                        {contract.performStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {contract.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 font-medium">{contract.jgCode}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-500">{contract.jtCode}</td>
                    <td className="py-3 px-4 text-slate-600">{contract.projectName}</td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                        {contract.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ¥{contract.price}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => alert(`正在查看合同：${contract.name}`)}
                          className="text-[#165DFF] hover:underline font-bold text-xs cursor-pointer"
                        >
                          查看
                        </button>
                        <span className="text-slate-200">|</span>
                        <button 
                          onClick={() => alert("进入合同变更台账办理流程")}
                          className="text-slate-600 hover:text-[#165DFF] font-medium text-xs cursor-pointer"
                        >
                          变更
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar matching enterprise layout */}
        <div className="p-3.5 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <div>共 {filteredContracts.length} 条记录</div>
          <div className="flex items-center gap-1.5">
            <button disabled className="border border-gray-200 px-2 py-1 rounded text-slate-400 cursor-not-allowed">&lt;</button>
            <button className="bg-[#165DFF] text-white font-bold px-2.5 py-1 rounded">1</button>
            <button disabled className="border border-gray-200 px-2 py-1 rounded text-slate-400 cursor-not-allowed">&gt;</button>
          </div>
        </div>
      </div>

      {/* ================= EXACT REPLICA OF SCREENSHOT 1 DIALOG ================= */}
      {showRequirementDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header Replicating Screenshot 1 */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-4 bg-[#165DFF] rounded-full"></span>
                <h3 className="font-bold text-base text-slate-850 tracking-tight">
                  选择需求 (需求完成集团初审方可进行立项申请)
                </h3>
              </div>
              <button 
                onClick={() => setShowRequirementDialog(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Search Area Replicating Screenshot 1 */}
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 shrink-0">需求名称</label>
                  <input 
                    type="text" 
                    placeholder="搜索需求编号或需求名" 
                    value={reqSearchKey}
                    onChange={e => setReqSearchKey(e.target.value)}
                    className="w-48 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 shrink-0">申报单位</label>
                  <select 
                    value={reqSearchOrg}
                    onChange={e => setReqSearchOrg(e.target.value)}
                    className="w-44 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#165DFF]"
                  >
                    <option value="">请选择申报单位</option>
                    <option value="集团总部">集团总部</option>
                    <option value="数字中心">数字中心</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 ml-1">
                  <button 
                    onClick={() => {}}
                    className="bg-[#654DF7] hover:bg-[#5239E2] text-white px-4 py-1.5 rounded text-xs font-medium shadow-3xs transition-colors cursor-pointer"
                  >
                    搜索
                  </button>
                  <button 
                    onClick={() => { setReqSearchKey(''); setReqSearchOrg(''); }}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-4 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    重置
                  </button>
                </div>
              </div>

              {/* Table Replicating Screenshot 1 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-gray-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-4 w-14 text-center">选择</th>
                      <th className="py-2.5 px-4 font-mono">需求编号</th>
                      <th className="py-2.5 px-4">需求名称</th>
                      <th className="py-2.5 px-4 text-center">项目分类</th>
                      <th className="py-2.5 px-4">申报单位</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredReqs.map((req) => {
                      const isChecked = selectedReqId === req.id;
                      return (
                        <tr 
                          key={req.id} 
                          onClick={() => setSelectedReqId(req.id)}
                          className={cn(
                            "hover:bg-blue-50/40 cursor-pointer transition-colors",
                            isChecked && "bg-blue-50/70"
                          )}
                        >
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="radio" 
                              name="reqSelect" 
                              checked={isChecked}
                              onChange={() => setSelectedReqId(req.id)}
                              className="w-3.5 h-3.5 text-[#165DFF] focus:ring-[#165DFF] border-gray-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 font-medium">{req.id}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{req.name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={cn("inline-block border px-2.5 py-0.5 rounded text-[11px] font-medium", req.catColor)}>
                              {req.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{req.org}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Dialog pagination matching Screenshot 1 */}
                <div className="py-2.5 px-4 bg-white border-t border-gray-150 flex items-center justify-end text-xs text-slate-500 gap-3">
                  <span>共 {filteredReqs.length} 条</span>
                  <div className="flex items-center gap-1">
                    <button disabled className="border border-gray-200 px-2 py-0.5 rounded text-slate-300">&lt;</button>
                    <button className="bg-[#165DFF] text-white font-bold px-2.5 py-0.5 rounded">1</button>
                    <button disabled className="border border-gray-200 px-2 py-0.5 rounded text-slate-300">&gt;</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer Replicating Screenshot 1 */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-gray-200 flex justify-end items-center gap-3">
              <button 
                onClick={() => setShowRequirementDialog(false)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-slate-600 px-5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (!selectedReqId) return;
                  const req = REQUIREMENT_ITEMS.find(r => r.id === selectedReqId);
                  alert(`成功关联立项需求编号 [${req?.id}]：${req?.name}`);
                  setShowRequirementDialog(false);
                }}
                className="bg-[#8692F4] hover:bg-[#6876E8] text-white px-6 py-1.5 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                确认选择
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
