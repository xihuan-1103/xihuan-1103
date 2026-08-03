import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Calendar, 
  CloudSun, 
  User, 
  Clock, 
  CheckCircle2, 
  FileText, 
  AlertCircle, 
  MapPin, 
  ShieldAlert, 
  Award, 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  Eye, 
  Briefcase,
  Users2,
  Bookmark,
  Camera,
  FileCheck
} from 'lucide-react';

export interface ProjectQuantitiesItem {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  designQty: number;
}

export interface ProjectData {
  id: string;
  name: string;
  responsible: string; // Responsible person
  roadSections: string[];
  teamName: string;
  items: ProjectQuantitiesItem[];
}

export interface ConstructionLog {
  id: string;
  logCode: string;
  logDate: string;
  projectId: string;
  projectName: string;
  roadSection: string;
  responsible: string;
  teamName: string;
  weather: string;
  temperature: string;
  windStatus: string;
  submitter: string;
  status: '草稿' | '已提交';
  safetyStatus: '良好' | '存在隐患且已整改' | '存在隐患限期整改';
  qualityStatus: '合格' | '局部返工' | '优质示范';
  safetyRemark: string;
  qualityRemark: string;
  otherRemark: string;
  photoUrl?: string;
  contents: {
    itemId: string;
    itemName: string;
    unit: string;
    unitPrice: number;
    completedQty: number; // Completed quantity today
    outputValue: number; // Qty * UnitPrice
  }[];
  createdAt: string;
}

// 1. Initial Mock Projects
export const DEFAULT_PROJECTS: ProjectData[] = [
  {
    id: 'p-1',
    name: '杭徽高速日常路面养护',
    responsible: '张二河',
    roadSections: ['K12+000 - K28+500 上行', 'K15+300 - K32+100 下行'],
    teamName: '中分带班组',
    items: [
      { id: 'item-1-1', itemCode: 'QD-01', itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)', unit: 'm³', unitPrice: 850, designQty: 1200 },
      { id: 'item-1-2', itemCode: 'QD-02', itemName: '微表处MS-3乳化沥青稀浆罩面', unit: '㎡', unitPrice: 28, designQty: 45000 },
      { id: 'item-1-3', itemCode: 'QD-03', itemName: '路面裂缝高聚物灌缝(改性沥青)', unit: 'm', unitPrice: 15, designQty: 18000 },
      { id: 'item-1-4', itemCode: 'QD-04', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, designQty: 50000 }
    ]
  },
  {
    id: 'p-2',
    name: '沪杭甬高速中分带绿化修剪及保洁',
    responsible: '张二河',
    roadSections: ['K0+000 - K50+000 全路段'],
    teamName: '小修班组',
    items: [
      { id: 'item-2-1', itemCode: 'QD-05', itemName: '机械修剪绿化带', unit: 'km', unitPrice: 1200, designQty: 350 },
      { id: 'item-2-2', itemCode: 'QD-06', itemName: '人工清扫保洁及拾垃圾', unit: '工日', unitPrice: 180, designQty: 800 },
      { id: 'item-2-3', itemCode: 'QD-07', itemName: '防撞水马及隔离设施清洗', unit: 'km', unitPrice: 450, designQty: 500 }
    ]
  },
  {
    id: 'p-3',
    name: '杭州湾跨海大桥连接线护栏更换及板件矫正',
    responsible: '王建国',
    roadSections: ['K101+500 - K105+200'],
    teamName: '应急排障保通组',
    items: [
      { id: 'item-3-1', itemCode: 'QD-08', itemName: 'GR-SB-3E三波形梁钢护栏更换', unit: '米', unitPrice: 380, designQty: 2000 },
      { id: 'item-3-2', itemCode: 'QD-09', itemName: '防阻块/托架更新更换', unit: '个', unitPrice: 45, designQty: 1500 },
      { id: 'item-3-3', itemCode: 'QD-10', itemName: '夜间路面紧急排障保通服务 (按次收费)', unit: '项', unitPrice: 12000, designQty: 20 }
    ]
  }
];

// 2. Initial Mock Construction Logs
const INITIAL_LOGS: ConstructionLog[] = [
  {
    id: 'log-1',
    logCode: 'SG-20260609-001',
    logDate: '2026-06-09',
    projectId: 'p-1',
    projectName: '杭徽高速日常路面养护',
    roadSection: 'K12+000 - K28+500 上行',
    responsible: '张二河',
    teamName: '中分带班组',
    weather: '晴转多云',
    temperature: '28℃ ~ 34℃',
    windStatus: '东风微风',
    submitter: '张二河',
    status: '已提交',
    safetyStatus: '良好',
    qualityStatus: '合格',
    safetyRemark: '今日重点检查沥青拌合车停靠标识与反光锥摆放，全员合规作业，无任何安全疏漏。',
    qualityRemark: '沥青摊铺平整度经测合格，面层压实度符合技术规程规范。',
    otherRemark: '上午10点气温较高，实施了人员轮换防暑降温，未影响项目施工进度。',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop',
    contents: [
      { itemId: 'item-1-1', itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)', unit: 'm³', unitPrice: 850, completedQty: 15, outputValue: 12750 },
      { itemId: 'item-1-3', itemName: '路面裂缝高聚物灌缝(改性沥青)', unit: 'm', unitPrice: 15, completedQty: 320, outputValue: 4800 },
      { itemId: 'item-1-4', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, completedQty: 450, outputValue: 5400 }
    ],
    createdAt: '2026-06-09 17:30'
  },
  {
    id: 'log-2',
    logCode: 'SG-20260609-002',
    logDate: '2026-06-09',
    projectId: 'p-2',
    projectName: '沪杭甬高速中分带绿化修剪及保洁',
    roadSection: 'K0+000 - K50+000 全路段',
    responsible: '张二河',
    teamName: '小修班组',
    weather: '多云',
    temperature: '26℃ ~ 32℃',
    windStatus: '东北风2级',
    submitter: '张二河',
    status: '已提交',
    safetyStatus: '良好',
    qualityStatus: '优质示范',
    safetyRemark: '修剪作业防撞保障车随行，标志牌醒目，限速导流规范。',
    qualityRemark: '修剪高度整洁划一，中分带垃圾顺带清理干净。',
    otherRemark: '今日共出动工人12名。',
    contents: [
      { itemId: 'item-2-1', itemName: '机械修剪绿化带', unit: 'km', unitPrice: 1200, completedQty: 8, outputValue: 9600 },
      { itemId: 'item-2-2', itemName: '人工清扫保洁及拾垃圾', unit: '工日', unitPrice: 180, completedQty: 12, outputValue: 2160 }
    ],
    createdAt: '2026-06-09 18:00'
  },
  {
    id: 'log-3',
    logCode: 'SG-20260608-001',
    logDate: '2026-06-08',
    projectId: 'p-1',
    projectName: '杭徽高速日常路面养护',
    roadSection: 'K15+300 - K32+100 下行',
    responsible: '张二河',
    teamName: '中分带班组',
    weather: '中雨',
    temperature: '22℃ ~ 26℃',
    windStatus: '北风3级',
    submitter: '张二河',
    status: '草稿',
    safetyStatus: '存在隐患且已整改',
    qualityStatus: '合格',
    safetyRemark: '雨天作业路滑，现场一名工人未扣好安全帽带，已当场通报并整改。',
    qualityRemark: '由于下大雨导致铣刨工作暂停了一段时间，等雨停符合标准后再次开机，铣刨平整符合工艺规范。',
    otherRemark: '降雨导致施工降效，下午3点降雨量变大，部分户外强电作业全部暂停安全避险。',
    contents: [
      { itemId: 'item-1-4', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, completedQty: 210, outputValue: 2520 }
    ],
    createdAt: '2026-06-08 17:10'
  },
  {
    id: 'log-4',
    logCode: 'SG-20260608-002',
    logDate: '2026-06-08',
    projectId: 'p-3',
    projectName: '杭州湾跨海大桥连接线护栏更换及板件矫正',
    responsible: '王建国',
    roadSection: 'K101+500 - K105+200',
    teamName: '应急排障保通组',
    weather: '阴转大风',
    temperature: '23℃ ~ 29℃',
    windStatus: '北风4-5级',
    submitter: '王建国',
    status: '已提交',
    safetyStatus: '良好',
    qualityStatus: '合格',
    safetyRemark: '由于风力较大，高空作业面均停止。重点固牢了两侧防撞围挡。',
    qualityRemark: '更换后的钢梁平顺饱满，防腐锌涂层厚度达标。',
    otherRemark: '今日突发一次应急排障，顺畅过关。',
    contents: [
      { itemId: 'item-3-1', itemName: 'GR-SB-3E三波形梁钢护栏更换', unit: '米', unitPrice: 380, completedQty: 45, outputValue: 17100 },
      { itemId: 'item-3-2', itemName: '防阻块/托架更新更换', unit: '个', unitPrice: 45, completedQty: 60, outputValue: 2700 }
    ],
    createdAt: '2026-06-08 19:22'
  }
];

export default function ConstructionLogFilling() {
  const [logs, setLogs] = useState<ConstructionLog[]>(() => {
    const saved = localStorage.getItem('CONSTRUCTION_LOGS');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [filterProject, setFilterProject] = useState<string>('');
  const [filterManager, setFilterManager] = useState<string>('张二河'); // Current logged in user is "张二河"
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isViewingLog, setIsViewingLog] = useState<ConstructionLog | null>(null);

  // Form states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('2026-06-09');
  const [formWeather, setFormWeather] = useState<string>('晴转多云');
  const [formTemp, setFormTemp] = useState<string>('28℃ ~ 34℃');
  const [formWind, setFormWind] = useState<string>('东风微风');
  const [formRoadSection, setFormRoadSection] = useState<string>('');
  const [formSafetyStatus, setFormSafetyStatus] = useState<ConstructionLog['safetyStatus']>('良好');
  const [formQualityStatus, setFormQualityStatus] = useState<ConstructionLog['qualityStatus']>('合格');
  const [formSafetyRemark, setFormSafetyRemark] = useState<string>('');
  const [formQualityRemark, setFormQualityRemark] = useState<string>('');
  const [formOtherRemark, setFormOtherRemark] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'草稿' | '已提交'>('已提交');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop');

  // Completed item quantities tracker [itemId]: completedQty
  const [formItemQuantities, setFormItemQuantities] = useState<Record<string, number>>({});

  // Track dual input forms per清单 item: 'absolute' (numerical quantity) or 'percentage' (% ratio)
  const [formItemInputModes, setFormItemInputModes] = useState<Record<string, 'absolute' | 'percentage'>>({});
  const [formItemPercentages, setFormItemPercentages] = useState<Record<string, string>>({});

  const handleToggleInputMode = (itemId: string, mode: 'absolute' | 'percentage', designQty: number) => {
    setFormItemInputModes(prev => ({ ...prev, [itemId]: mode }));
    if (mode === 'percentage') {
      const currentQty = formItemQuantities[itemId] || 0;
      const currentPct = ((currentQty / designQty) * 100).toFixed(2);
      setFormItemPercentages(prev => ({ 
        ...prev, 
        [itemId]: parseFloat(currentPct) <= 0 ? '' : currentPct 
      }));
    }
  };

  const handleQtyChange = (itemId: string, valStr: string) => {
    const v = parseFloat(valStr) || 0;
    setFormItemQuantities(prev => ({
      ...prev,
      [itemId]: v
    }));
  };

  const handlePctChange = (itemId: string, valStr: string, designQty: number) => {
    // Keep raw typed input to support typing decimal places e.g '12.' without immediate truncation mapping
    setFormItemPercentages(prev => ({
      ...prev,
      [itemId]: valStr
    }));
    
    const pct = parseFloat(valStr) || 0;
    const computedQty = parseFloat(((pct / 100) * designQty).toFixed(4));
    setFormItemQuantities(prev => ({
      ...prev,
      [itemId]: computedQty
    }));
  };

  useEffect(() => {
    localStorage.setItem('CONSTRUCTION_LOGS', JSON.stringify(logs));
  }, [logs]);

  // Handle Project Change
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = DEFAULT_PROJECTS.find(p => p.id === projId);
    if (proj) {
      setFormRoadSection(proj.roadSections[0] || '');
      // Initialize items quantities to 0
      const initialQtys: Record<string, number> = {};
      proj.items.forEach(it => {
        initialQtys[it.id] = 0;
      });
      setFormItemQuantities(initialQtys);
    }
  };

  const currentProjectDetails = DEFAULT_PROJECTS.find(p => p.id === selectedProjectId);

  const calculateTotalOutputValue = (qtys: Record<string, number>) => {
    if (!currentProjectDetails) return 0;
    return currentProjectDetails.items.reduce((sum, item) => {
      const q = qtys[item.id] || 0;
      return sum + (q * item.unitPrice);
    }, 0);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('请选择施工项目');
      return;
    }

    const proj = DEFAULT_PROJECTS.find(p => p.id === selectedProjectId)!;
    
    // Process items contents
    const contents = proj.items
      .map(item => {
        const qty = formItemQuantities[item.id] || 0;
        return {
          itemId: item.id,
          itemName: item.itemName,
          unit: item.unit,
          unitPrice: item.unitPrice,
          completedQty: qty,
          outputValue: qty * item.unitPrice
        };
      })
      .filter(c => c.completedQty > 0); // Only save items with positive output value

    if (contents.length === 0 && formStatus === '已提交') {
      const confirmSubmit = window.confirm('您没有填报任何今日清单工程量，确定提交一笔空白施工内容日志吗？');
      if (!confirmSubmit) return;
    }

    const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCodeNum = Math.floor(100 + Math.random() * 900);
    const newLogCode = `SG-${todayDateStr}-${randCodeNum}`;

    const newLog: ConstructionLog = {
      id: `log-${Date.now()}`,
      logCode: newLogCode,
      logDate: formDate,
      projectId: selectedProjectId,
      projectName: proj.name,
      roadSection: formRoadSection,
      responsible: proj.responsible,
      teamName: proj.teamName,
      weather: formWeather,
      temperature: formTemp,
      windStatus: formWind,
      submitter: '张二河', // Mock current user
      status: formStatus,
      safetyStatus: formSafetyStatus,
      qualityStatus: formQualityStatus,
      safetyRemark: formSafetyRemark || '见现场。全员安全装备穿戴规范。',
      qualityRemark: formQualityRemark || '施工质量达标，已进行验收校验。',
      otherRemark: formOtherRemark,
      photoUrl: formPhotoUrl,
      contents,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setLogs(prev => [newLog, ...prev]);
    setIsAddingNew(false);
    resetForm();
  };

  const deleteLog = (id: string) => {
    if (window.confirm('您确定要删除这笔施工日志吗？此操作不可逆。')) {
      setLogs(prev => prev.filter(item => item.id !== id));
    }
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setFormDate('2026-06-09');
    setFormWeather('晴转多云');
    setFormTemp('28℃ ~ 34℃');
    setFormWind('东风微风');
    setFormRoadSection('');
    setFormSafetyStatus('良好');
    setFormQualityStatus('合格');
    setFormSafetyRemark('');
    setFormQualityRemark('');
    setFormOtherRemark('');
    setFormStatus('已提交');
    setFormItemQuantities({});
    setFormItemInputModes({});
    setFormItemPercentages({});
  };

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    const matchProj = filterProject ? log.projectId === filterProject : true;
    const matchManager = filterManager === 'all' 
      ? true 
      : (filterManager === '我负责的' ? log.responsible === '张二河' : true);
    return matchProj && matchManager;
  });

  return (
    <div className="space-y-6 select-none pb-10">
      
      {/* 1. Header with Breadcrumb and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">进度管理</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-xs">养护施工</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            施工日志填报
          </h1>
          <p className="text-xs text-gray-500 mt-1">负责管理杭州北项目部多项目日常现场养护施工日志，可在线查阅填报工程量并一键挂钩产值汇总。</p>
        </div>

        {!isAddingNew && !isViewingLog && (
          <button
            onClick={() => {
              resetForm();
              setIsAddingNew(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            填报施工日志
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ================== LISTING STATE ================== */}
        {!isAddingNew && !isViewingLog && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Filter Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Manager scope switcher */}
                <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setFilterManager('我负责的')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      filterManager === '我负责的'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    由我负责的项目 (张二河)
                  </button>
                  <button
                    onClick={() => setFilterManager('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      filterManager === 'all'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    全部负责人项目
                  </button>
                </div>

                {/* Project selector */}
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg text-xs px-3 py-1.5 focus:border-blue-500 outline-none max-w-[240px]"
                >
                  <option value="">全部施工项目</option>
                  {DEFAULT_PROJECTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-500 font-medium">
                共检索到 <span className="text-blue-600 font-bold font-mono">{filteredLogs.length}</span> 篇施工日志
              </div>
            </div>

            {/* Logs Table / Cards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-200/80 text-gray-500 font-bold uppercase select-none">
                      <th className="p-4 pl-6 text-center w-12">序号</th>
                      <th className="p-4 w-32">施工日期</th>
                      <th className="p-4 w-40">日志单号</th>
                      <th className="p-4">项目名称</th>
                      <th className="p-4 w-32">施工负责人</th>
                      <th className="p-4 w-36">施工班组</th>
                      <th className="p-4 w-24 text-center">状态</th>
                      <th className="p-4 w-28 text-center">产值测算 (元)</th>
                      <th className="p-4 text-center w-40 pr-6">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log, index) => {
                      const totalValue = log.contents.reduce((sum, item) => sum + item.outputValue, 0);
                      return (
                        <tr key={log.id} className="hover:bg-blue-50/10 transition-colors group">
                          <td className="p-4 pl-6 text-center text-gray-400 font-bold font-mono">{index + 1}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 text-gray-900 font-semibold font-mono">
                              <Calendar size={13} className="text-gray-400" />
                              {log.logDate}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-600 group-hover:text-blue-600">
                            {log.logCode}
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-bold text-gray-950 text-sm group-hover:text-blue-700 transition-colors">
                                {log.projectName}
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium block truncate max-w-sm mt-0.5">
                                {log.roadSection}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-gray-700">
                            <span className="flex items-center gap-1">
                              <User size={13} className={log.responsible === '张二河' ? 'text-blue-500' : 'text-gray-400'} />
                              {log.responsible}
                              {log.responsible === '张二河' && (
                                <span className="text-[8px] bg-blue-100 text-blue-700 font-extrabold scale-90 px-1 py-0 rounded">我</span>
                              )}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-600">{log.teamName}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === '已提交'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                            }`}>
                              {log.status === '已提交' ? '已提交' : '草稿'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-rose-600 text-sm">
                            ¥{totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-center pr-6">
                            <div className="flex items-center justify-center gap-2">
                              {/* View Details */}
                              <button
                                onClick={() => setIsViewingLog(log)}
                                className="p-1 px-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={12} />
                                查阅
                              </button>

                              {/* Edit Draft */}
                              {log.status === '草稿' ? (
                                <button
                                  onClick={() => {
                                    // Prepopulate form to edit
                                    setSelectedProjectId(log.projectId);
                                    setFormDate(log.logDate);
                                    setFormWeather(log.weather);
                                    setFormTemp(log.temperature);
                                    setFormWind(log.windStatus);
                                    setFormRoadSection(log.roadSection);
                                    setFormSafetyStatus(log.safetyStatus);
                                    setFormQualityStatus(log.qualityStatus);
                                    setFormSafetyRemark(log.safetyRemark);
                                    setFormQualityRemark(log.qualityRemark);
                                    setFormOtherRemark(log.otherRemark);
                                    setFormStatus('已提交'); // default submit on edit draft
                                    
                                    // Fill quantities
                                    const proj = DEFAULT_PROJECTS.find(p => p.id === log.projectId);
                                    const qtys: Record<string, number> = {};
                                    if (proj) {
                                      proj.items.forEach(it => {
                                        const parsed = log.contents.find(c => c.itemId === it.id);
                                        qtys[it.id] = parsed ? parsed.completedQty : 0;
                                      });
                                    }
                                    setFormItemQuantities(qtys);
                                    setFormItemInputModes({});
                                    setFormItemPercentages({});
                                    
                                    // Remove draft item and prompt create form
                                    setLogs(prev => prev.filter(item => item.id !== log.id));
                                    setIsAddingNew(true);
                                  }}
                                  className="p-1 px-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 size={12} />
                                  编辑
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1 px-2 text-xs font-bold text-gray-300 bg-gray-50 rounded border border-gray-100 flex items-center gap-1 select-none"
                                  title="已提交的日志不可编辑，如需修改请作废重建"
                                >
                                  <Edit3 size={12} />
                                  编辑
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => deleteLog(log.id)}
                                className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span className="text-3xl">📭</span>
                            <span className="font-bold text-gray-500">无匹配的施工日志信息</span>
                            <span className="text-xs text-gray-400">请选择不同的负责人或点击“填报施工日志”开始录入</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================== DETAILED LOG VIEW STATE ================== */}
        {isViewingLog && (
          <motion.div
            key="view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsViewingLog(null)}
                className="p-1.5 hover:bg-gray-100 rounded bg-white border border-gray-200 text-gray-600 flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors"
              >
                <ArrowLeft size={14} />
                返回施工日志列表
              </button>
              <span className="text-xs text-gray-400 font-mono">/ 日志唯一标识: {isViewingLog.id}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left 2 Cols: Details & Quantities Table */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Basic Header Block */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full pointer-events-none transform translate-x-12 -translate-y-12"></div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-white/10 rounded-lg text-white font-mono text-xs font-bold backdrop-blur-sm">
                      施工单号: {isViewingLog.logCode}
                    </span>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {isViewingLog.status}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold tracking-tight mb-2 leading-snug">{isViewingLog.projectName}</h2>
                  <p className="text-xs text-blue-200 flex items-center gap-1.5 font-medium mb-4">
                    <MapPin size={13} />
                    施工实施路段: {isViewingLog.roadSection}
                  </p>

                  <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-4 text-xs">
                    <div>
                      <span className="text-blue-300 block">填报人 / 现场组长</span>
                      <span className="font-bold text-gray-100 mt-1 block">{isViewingLog.responsible}</span>
                    </div>
                    <div>
                      <span className="text-blue-300 block">施工日期 / 时间</span>
                      <span className="font-bold text-gray-100 mt-1 block font-mono">{isViewingLog.logDate}</span>
                    </div>
                    <div>
                      <span className="text-blue-300 block">气象实况环境</span>
                      <span className="font-bold text-gray-100 mt-1 block">{isViewingLog.weather} • {isViewingLog.temperature}</span>
                    </div>
                  </div>
                </div>

                {/* Construction Quantities Completed Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
                    <Briefcase size={16} className="text-blue-600" />
                    今日现场清单完成明细
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                          <th className="p-3">清单项</th>
                          <th className="p-3 text-right">单价 (元)</th>
                          <th className="p-3 text-right">今日完成工程量</th>
                          <th className="p-3 text-right">单位</th>
                          <th className="p-3 text-right">今日产生总产值 (元)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {isViewingLog.contents.map((item) => (
                          <tr key={item.itemId} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <span className="font-bold text-gray-800 text-xs">
                                {item.itemName}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-gray-500">
                              ¥{item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                              {item.completedQty}
                            </td>
                            <td className="p-3 text-right text-gray-500 font-semibold">{item.unit}</td>
                            <td className="p-3 text-right font-mono font-black text-rose-600 text-sm">
                              ¥{item.outputValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-rose-50/20 font-bold border-t border-rose-100">
                          <td colSpan={4} className="p-3 text-rose-950 font-extrabold text-right">
                            施工总产值测算合计 :
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-700 text-base">
                            ¥{isViewingLog.contents.reduce((s, c) => s + c.outputValue, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Safety & Quality Status */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <h4 className="text-xs uppercase font-extrabold text-gray-400">安全与质量评价</h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">安全状况</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isViewingLog.safetyStatus === '良好'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          🛡️ {isViewingLog.safetyStatus}
                        </span>
                      </div>
                      <p className="text-gray-600 bg-gray-50/80 p-2 rounded leading-relaxed italic">
                        {isViewingLog.safetyRemark}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500 font-medium">质量验收评分</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isViewingLog.qualityStatus === '优质示范'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          ⭐ {isViewingLog.qualityStatus}
                        </span>
                      </div>
                      <p className="text-gray-600 bg-gray-50/80 p-2 rounded leading-relaxed italic">
                        {isViewingLog.qualityRemark}
                      </p>
                    </div>
                  </div>

                  {/* General / Other Remarks */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs uppercase font-extrabold text-gray-400 mb-2">其他关键记叙信息</h4>
                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/80 p-3 rounded leading-relaxed min-h-[80px]">
                        {isViewingLog.otherRemark || '今日项目运行顺畅，材料设备齐整到位。无其他异常记叙。'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 font-medium font-mono">
                      <span>录入提交时间: {isViewingLog.createdAt}</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right 1 Col: Photo & Action Sidebar */}
              <div className="space-y-6">
                
                {/* Project Photo / Field Attachments */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-500 flex items-center gap-1">
                    <Camera size={14} className="text-blue-500" />
                    现场施工影像附件
                  </h4>

                  <div className="relative rounded-lg overflow-hidden h-44 bg-gray-100 border border-gray-200">
                    {isViewingLog.photoUrl ? (
                      <img 
                        src={isViewingLog.photoUrl} 
                        alt="现场情况" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                        📸 暂未上传影像
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/55 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      杭州北区域中心实时校验
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-450 leading-relaxed text-center italic">
                    提示：上传的高画质影像可以作为施工质量评价以及应对突发预警的留档审核佐证。
                  </p>
                </div>

                {/* Approver Check State */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3.5">
                  <h4 className="text-xs uppercase font-extrabold text-gray-400">审核记账进度</h4>
                  
                  <div className="relative pl-6 space-y-4">
                    {/* Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-blue-100"></div>

                    {/* Step 1 */}
                    <div className="relative">
                      <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                      <div>
                        <div className="text-xs font-bold text-gray-800">日志录入成功</div>
                        <p className="text-[10px] text-gray-500">张二河（组长）提交于 {isViewingLog.createdAt}</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                      <div>
                        <div className="text-xs font-bold text-gray-800">系统产值测算完成</div>
                        <p className="text-[10px] text-gray-500">自动完成关联测算，单价核验通过</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] font-bold">●</span>
                      <div>
                        <div className="text-xs font-bold text-gray-800">等待本日产值日报归纳汇总</div>
                        <p className="text-[10px] text-gray-400">归口管理处由项目经理发布确认</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* ================== ADD LOG FORM STATE ================== */}
        {isAddingNew && (
          <motion.form
            onSubmit={handleCreateSubmit}
            key="add"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Top Back Actions */}
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('您确定要放弃对当前施工日志的编辑吗？未保存内容将丢失。')) {
                    setIsAddingNew(false);
                    resetForm();
                  }
                }}
                className="px-3.5 py-1.5 hover:bg-gray-100 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                放弃返回施工日志
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormStatus('草稿');
                    setTimeout(() => {
                      // Trigger a dummy click or call handleSave direct
                      alert('已暂存施工日志为草稿');
                    });
                  }}
                  className="px-4.5 py-2 hover:bg-amber-100 bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  暂存草稿
                </button>
                <button
                  type="submit"
                  onClick={() => setFormStatus('已提交')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck size={14} />
                  确认提交施工日志
                </button>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Form: Basic Block & Quantities Fill */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Form Part 1: Basic Choice */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
                    1. 施工项目及路段选择
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-bold block">施工项目 <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={selectedProjectId}
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs outline-none"
                      >
                        <option value="">-- 请选择施工项目 --</option>
                        {DEFAULT_PROJECTS.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.responsible === '张二河' ? '我负责' : p.responsible})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Road Section */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-bold block">施工路段 <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formRoadSection}
                        onChange={(e) => setFormRoadSection(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs outline-none"
                        disabled={!selectedProjectId}
                      >
                        <option value="">-- 请选择具体实施路段 --</option>
                        {currentProjectDetails?.roadSections.map(rs => (
                          <option key={rs} value={rs}>{rs}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {currentProjectDetails && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-gray-600 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-1 font-bold text-blue-800">
                        <Users2 size={14} />
                        作业班组: {currentProjectDetails.teamName}
                      </div>
                      <div className="text-gray-400">
                        项目合同负责人: <span className="font-bold text-gray-700">{currentProjectDetails.responsible}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Part 2: Quantity list of project */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
                    2. 二次施工内容及工程量维护 (依据项目工程清单)
                  </h3>

                  {!selectedProjectId ? (
                    <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      ⚠️ 请先选择上面的“施工项目”以智能载入该项目的合同执行清单
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-500">
                        请在下方输入各清单项目今日实际完成的工程量。系统将自动根据中标单价测算出本日施工产值总和。
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                              <th className="p-3 w-16 text-center">编码</th>
                              <th className="p-3">清单名称与工艺规范</th>
                              <th className="p-3 text-right">单价 (元)</th>
                              <th className="p-3 text-right">总设计量</th>
                              <th className="p-3 text-center w-52">今日申报工程量 (实数/百分比%)</th>
                              <th className="p-3 text-right">单位</th>
                              <th className="p-3 text-right pr-4">小计产值 (元)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {currentProjectDetails?.items.map((item) => {
                              const qty = formItemQuantities[item.id] || 0;
                              const value = qty * item.unitPrice;
                              return (
                                <tr key={item.id} className="hover:bg-gray-50/50">
                                  <td className="p-3 text-center font-mono font-bold text-gray-400">{item.itemCode}</td>
                                  <td className="p-3 font-semibold text-gray-950 text-xs">{item.itemName}</td>
                                  <td className="p-3 text-right font-mono text-gray-500">¥{item.unitPrice.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono text-gray-400">{item.designQty}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[195px] mx-auto py-1">
                                      {/* Mode switch segmented buttons */}
                                      <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200 text-[10px] w-full shadow-inner select-none">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleInputMode(item.id, 'absolute', item.designQty)}
                                          className={`flex-1 py-0.5 text-center font-bold rounded transition-all ${
                                            (formItemInputModes[item.id] || 'absolute') === 'absolute'
                                              ? 'bg-white text-blue-600 shadow-xs'
                                              : 'text-gray-400 hover:text-gray-700'
                                          }`}
                                        >
                                          实际数值
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleInputMode(item.id, 'percentage', item.designQty)}
                                          className={`flex-1 py-0.5 text-center font-bold rounded transition-all ${
                                            (formItemInputModes[item.id] || 'absolute') === 'percentage'
                                              ? 'bg-white text-teal-600 shadow-xs'
                                              : 'text-gray-400 hover:text-gray-700'
                                          }`}
                                        >
                                          百分比填报%
                                        </button>
                                      </div>

                                      {/* Input control and dynamic labels */}
                                      {(formItemInputModes[item.id] || 'absolute') === 'absolute' ? (
                                        <div className="w-full space-y-1">
                                          <div className="relative flex items-center justify-center">
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              placeholder="0"
                                              value={qty || ''}
                                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                              className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 rounded-lg pl-3 pr-9 py-1 text-center font-mono font-bold text-xs outline-none"
                                            />
                                            <span className="absolute right-1 text-[9px] text-gray-500 bg-gray-50/80 px-1 border border-gray-150 rounded">
                                              {item.unit}
                                            </span>
                                          </div>
                                          {qty > 0 && (
                                            <div className="text-[9px] text-gray-400 font-mono text-center">
                                              占总进度: <span className="font-bold text-blue-600">{((qty / item.designQty) * 100).toFixed(2)}%</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full space-y-1">
                                          <div className="relative flex items-center justify-center">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              placeholder="0.0"
                                              value={formItemPercentages[item.id] !== undefined ? formItemPercentages[item.id] : ''}
                                              onChange={(e) => handlePctChange(item.id, e.target.value, item.designQty)}
                                              className="w-full border border-teal-300 bg-teal-50/5 text-teal-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 rounded-lg pl-3 pr-7 py-1 text-center font-mono font-bold text-xs outline-none"
                                            />
                                            <span className="absolute right-1 text-[9px] text-teal-600 font-bold bg-teal-50/50 px-1.5 border border-teal-150 rounded">
                                              %
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-gray-400 font-mono text-center">
                                            估算工程量: <span className="font-bold text-teal-600">{qty.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} {item.unit}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right text-gray-500 font-bold">{item.unit}</td>
                                  <td className="p-3 text-right pr-4 font-mono font-black text-rose-600 text-xs">
                                    ¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}

                            <tr className="bg-rose-50/20 font-bold border-t border-rose-100">
                              <td colSpan={6} className="p-3 text-right text-rose-950 font-extrabold text-sm pr-4">
                                今日拟报产值合计 :
                              </td>
                              <td className="p-3 text-right pr-4 font-mono font-black text-rose-700 text-base">
                                ¥{calculateTotalOutputValue(formItemQuantities).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Form: Conditions & Photos */}
              <div className="space-y-6">
                
                {/* Weather & Metadata */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <CloudSun className="text-blue-500" size={16} />
                    3. 现场基本工况
                  </h3>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">施工日期 <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none font-mono"
                    />
                  </div>

                  {/* Weather description */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">天气状况</label>
                    <select
                      value={formWeather}
                      onChange={(e) => setFormWeather(e.target.value)}
                      className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none"
                    >
                      <option value="晴转多云">晴转多云</option>
                      <option value="多云">多云</option>
                      <option value="晴朗">晴朗</option>
                      <option value="阴">阴</option>
                      <option value="小雨">小雨</option>
                      <option value="中雨">中雨</option>
                      <option value="大风">大风</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Temperature */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-bold block">温度范围</label>
                      <input
                        type="text"
                        value={formTemp}
                        onChange={(e) => setFormTemp(e.target.value)}
                        placeholder="22℃ ~ 28℃"
                        className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none"
                      />
                    </div>
                    {/* Wind */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-bold block">风向风况</label>
                      <input
                        type="text"
                        value={formWind}
                        onChange={(e) => setFormWind(e.target.value)}
                        placeholder="东风微风"
                        className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Safety & Quality Fill */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <ShieldAlert className="text-orange-500" size={16} />
                    4. 安全与质量自查
                  </h3>

                  {/* Safety Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">安全检查状况</label>
                    <select
                      value={formSafetyStatus}
                      onChange={(e) => setFormSafetyStatus(e.target.value as any)}
                      className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none"
                    >
                      <option value="良好">🟢 良好（现场整齐，合规施工）</option>
                      <option value="存在隐患且已整改">🟡 存在隐患且已整改</option>
                      <option value="存在隐患限期整改">🔴 存在隐患限期整改</option>
                    </select>
                  </div>

                  {/* Safety remark */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">安全检查描述</label>
                    <textarea
                      value={formSafetyRemark}
                      onChange={(e) => setFormSafetyRemark(e.target.value)}
                      placeholder="例：路权封闭、标志和爆闪指示灯按规范摆放，中分带无杂物抛洒，人员穿戴完毕反光衣等。"
                      className="w-full border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs outline-none h-16 resize-none"
                    />
                  </div>

                  {/* Quality Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs text-gray-400 font-bold block">施工质量自检</label>
                    <select
                      value={formQualityStatus}
                      onChange={(e) => setFormQualityStatus(e.target.value as any)}
                      className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none"
                    >
                      <option value="合格">合格</option>
                      <option value="优质示范">⭐ 优质示范工程</option>
                      <option value="局部返工">🔴 局部不达标返工整改</option>
                    </select>
                  </div>

                  {/* Quality remark */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">质量控制说明</label>
                    <textarea
                      value={formQualityRemark}
                      onChange={(e) => setFormQualityRemark(e.target.value)}
                      placeholder="例：沥青路面铣刨深度达标、灌缝封水紧密、微表处压实度经核合格。"
                      className="w-full border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs outline-none h-16 resize-none"
                    />
                  </div>
                </div>

                {/* Additional Record Remark & Photograph */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <Bookmark className="text-indigo-500" size={16} />
                    5. 其他记事与照片附件
                  </h3>

                  {/* Photo mock selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">留档照片模型</label>
                    <select
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-1.8 text-xs outline-none font-mono"
                    >
                      <option value="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop">公路机械现场摊铺图片</option>
                      <option value="https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=600&auto=format&fit=crop">中分带灌浆微小机械</option>
                      <option value="https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=600&auto=format&fit=crop">护手修饰与安全组装</option>
                    </select>
                  </div>

                  {/* Other description */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold block">其他文字记事</label>
                    <textarea
                      value={formOtherRemark}
                      onChange={(e) => setFormOtherRemark(e.target.value)}
                      placeholder="记录例如：下午突发一次车流卡口疏导、某设备更换零配件暂缓20分钟。"
                      className="w-full border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-xs outline-none h-20 resize-none"
                    />
                  </div>
                </div>

              </div>

            </div>
          </motion.form>
        )}
      </AnimatePresence>

    </div>
  );
}
