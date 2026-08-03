import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Layers, 
  Check, 
  Calendar, 
  Save, 
  Info, 
  Briefcase, 
  BarChart2, 
  Activity, 
  Zap, 
  Sliders, 
  PlusCircle, 
  Trash2, 
  Download,
  AlertTriangle,
  RefreshCcw,
  Plus,
  Search,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  PieChart
} from 'lucide-react';
import { DEFAULT_PROJECTS, ConstructionLog } from './ConstructionLogFilling';

// Interfaces for structured data
interface LumpSumOption {
  id: string;
  projectId: string;
  projectName: string;
  itemName: string;
  contractAmount: number;
}

const GLOBAL_LUMPSUM_OPTIONS: LumpSumOption[] = [
  {
    id: 'lump-opt-1',
    projectId: 'p-1',
    projectName: '杭徽高速日常路面养护',
    itemName: '日常养护绿化保通临时配合配合包干款',
    contractAmount: 120000,
  },
  {
    id: 'lump-opt-2',
    projectId: 'p-2',
    projectName: '沪杭甬高速中分带绿化修剪及保洁',
    itemName: '高速公路标志及安全防撞移动包干管理费',
    contractAmount: 80000,
  },
  {
    id: 'lump-opt-3',
    projectId: 'p-3',
    projectName: '杭州湾跨海大桥连接线护栏更换及板件矫正',
    itemName: '特急路面保通服务费用包干',
    contractAmount: 240000,
  },
  {
    id: 'lump-opt-4',
    projectId: 'p-1',
    projectName: '杭徽高速日常路面养护',
    itemName: '路面应急排障机械调度包干费',
    contractAmount: 150000,
  }
];

interface LogSyncedProject {
  projectId: string;
  projectName: string;
  logCode: string;
  value: number;
  items: {
    itemId: string;
    itemName: string;
    unit: string;
    unitPrice: number;
    qty: number;
    outputValue: number;
  }[];
}

interface ManualItemInput {
  id: string;
  projectId: string;
  projectName: string;
  itemId: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  qty: number;
  outputValue: number;
}

interface LumpSumItemInput {
  id: string;
  projectId: string;
  projectName: string;
  itemId: string; // custom or global
  itemName: string;
  contractAmount: number;
  ratio: number; // e.g. 5 for 5%
  outputValue: number; // contractAmount * ratio / 100
}

interface DailyReport {
  id: string;
  date: string;
  projectName: string; // e.g. '杭州北项目部 2026-06-09 产值日报'
  totalValue: number;
  logValue: number;
  manualValue: number;
  lumpSumValue: number;
  status: '已确认' | '编制中';
  logsSynced: LogSyncedProject[];
  manualItems: ManualItemInput[];
  lumpSumItems: LumpSumItemInput[];
  creator: string;
  createTime: string;
}

// Initial Mock Daily Reports for beautiful ledger historical data
const INITIAL_REPORTS: DailyReport[] = [
  {
    id: 'rep-2026-06-09',
    date: '2026-06-09',
    projectName: '杭州北项目部 2026-06-09 产值日报',
    totalValue: 34260,
    logValue: 24510, // from actual log-1 and log-2 on June 9th
    manualValue: 4200,
    lumpSumValue: 5550,
    status: '已确认',
    logsSynced: [
      {
        projectId: 'p-1',
        projectName: '杭徽高速日常路面养护',
        logCode: 'SG-20260609-001',
        value: 12750 + 4800 + 5400,
        items: [
          { itemId: 'item-1-1', itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)', unit: 'm³', unitPrice: 850, qty: 15, outputValue: 12750 },
          { itemId: 'item-1-3', itemName: '路面裂缝高聚物灌缝(改性沥青)', unit: 'm', unitPrice: 15, qty: 320, outputValue: 4800 },
          { itemId: 'item-1-4', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, qty: 450, outputValue: 5400 }
        ]
      },
      {
        projectId: 'p-2',
        projectName: '沪杭甬高速中分带绿化修剪及保洁',
        logCode: 'SG-20260609-002',
        value: 9600 + 2160,
        items: [
          { itemId: 'item-2-1', itemName: '机械修剪绿化带', unit: 'km', unitPrice: 1200, qty: 8, outputValue: 9600 },
          { itemId: 'item-2-2', itemName: '人工清扫保洁及拾垃圾', unit: '工日', unitPrice: 180, qty: 12, outputValue: 2160 }
        ]
      }
    ],
    manualItems: [
      {
        id: 'man-init-1',
        projectId: 'p-1',
        projectName: '杭徽高速日常路面养护',
        itemId: 'item-1-2',
        itemName: '微表处MS-3乳化沥青稀浆罩面',
        unit: '㎡',
        unitPrice: 28,
        qty: 150,
        outputValue: 4200
      }
    ],
    lumpSumItems: [
      {
        id: 'lump-init-1',
        projectId: 'p-3',
        projectName: '杭州湾跨海大桥连接线护栏更换及板件矫正',
        itemId: 'lump-opt-3',
        itemName: '特急路面保通服务费用包干',
        contractAmount: 240000,
        ratio: 2.31,
        outputValue: 5550
      }
    ],
    creator: '张二河',
    createTime: '2026-06-09 18:30:15'
  },
  {
    id: 'rep-2026-06-08',
    date: '2026-06-08',
    projectName: '杭州北项目部 2026-06-08 产值日报',
    totalValue: 39820,
    logValue: 19800, // from log-4
    manualValue: 12000,
    lumpSumValue: 8020,
    status: '已确认',
    logsSynced: [
      {
        projectId: 'p-3',
        projectName: '杭州湾跨海大桥连接线护栏更换及板件矫正',
        logCode: 'SG-20260608-002',
        value: 19800,
        items: [
          { itemId: 'item-3-1', itemName: 'GR-SB-3E三波形梁钢护栏更换', unit: '米', unitPrice: 380, qty: 45, outputValue: 17100 },
          { itemId: 'item-3-2', itemName: '防阻块/托架更新更换', unit: '个', unitPrice: 45, qty: 60, outputValue: 2700 }
        ]
      }
    ],
    manualItems: [
      {
        id: 'man-old-1',
        projectId: 'p-1',
        projectName: '杭徽高速日常路面养护',
        itemId: 'item-1-1',
        itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)',
        unit: 'm³',
        unitPrice: 850,
        qty: 12,
        outputValue: 10200
      },
      {
        id: 'man-old-2',
        projectId: 'p-2',
        projectName: '沪杭甬高速中分带绿化修剪及保洁',
        itemId: 'item-2-2',
        itemName: '人工清扫保洁及拾垃圾',
        unit: '工日',
        unitPrice: 180,
        qty: 10,
        outputValue: 1800
      }
    ],
    lumpSumItems: [
      {
        id: 'lump-old-1',
        projectId: 'p-3',
        projectName: '杭州湾跨海大桥连接线护栏更换及板件矫正',
        itemId: 'lump-opt-3',
        itemName: '特急路面保通服务费用包干',
        contractAmount: 240000,
        ratio: 3.34,
        outputValue: 8020
      }
    ],
    creator: '张二河',
    createTime: '2026-06-08 19:42:00'
  },
  {
    id: 'rep-2026-06-07',
    date: '2026-06-07',
    projectName: '杭州北项目部 2026-06-07 产值日报',
    totalValue: 24150,
    logValue: 0,
    manualValue: 13150,
    lumpSumValue: 11000,
    status: '已确认',
    logsSynced: [],
    manualItems: [
      {
        id: 'man-old-3',
        projectId: 'p-1',
        projectName: '杭徽高速日常路面养护',
        itemId: 'item-1-2',
        itemName: '微表处MS-3乳化沥青稀浆罩面',
        unit: '㎡',
        unitPrice: 28,
        qty: 450,
        outputValue: 12600
      },
      {
        id: 'man-old-4',
        projectId: 'p-2',
        projectName: '沪杭甬高速中分带绿化修剪及保洁',
        itemId: 'item-2-3',
        itemName: '防撞水马及隔离设施清洗',
        unit: 'km',
        unitPrice: 450,
        qty: 1.22,
        outputValue: 550
      }
    ],
    lumpSumItems: [
      {
        id: 'lump-old-2',
        projectId: 'p-2',
        projectName: '沪杭甬高速中分带绿化修剪及保洁',
        itemId: 'lump-opt-2',
        itemName: '高速公路标志及安全防撞移动包干管理费',
        contractAmount: 80000,
        ratio: 13.75,
        outputValue: 11000
      }
    ],
    creator: '王建国',
    createTime: '2026-06-07 17:55:04'
  }
];

export default function OutputValueDailyReport() {
  // Navigation states: 'list' | 'create' | 'view'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Loaded historical reports
  const [reports, setReports] = useState<DailyReport[]>(() => {
    const saved = localStorage.getItem('OUTPUT_VALUE_DAILY_REPORTS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_REPORTS;
      }
    }
    return INITIAL_REPORTS;
  });

  // Filter in list view
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');

  // Calendar-based output view states
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(6);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>('2026-06-10');
  
  // Project proportion dimension toggle: 'month' | 'year'
  const [projectProportionMode, setProjectProportionMode] = useState<'month' | 'year'>('month');

  // Creation/Editing Form States
  const [createDate, setCreateDate] = useState('2026-06-10');
  const [createLogsSynced, setCreateLogsSynced] = useState<LogSyncedProject[]>([]);
  const [createManualItems, setCreateManualItems] = useState<ManualItemInput[]>([]);
  const [createLumpSumItems, setCreateLumpSumItems] = useState<LumpSumItemInput[]>([]);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals inside Creation Worksheet
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [showAddLumpModal, setShowAddLumpModal] = useState(false);

  // Modal 2: Manual add states
  const [manualProjId, setManualProjId] = useState('');
  const [manualItemId, setManualItemId] = useState('');
  const [manualQty, setManualQty] = useState<number>(1);

  // Modal 3: Lump Sum add states
  const [lumpProjId, setLumpProjId] = useState('');
  const [lumpSelectionType, setLumpSelectionType] = useState<'preset' | 'custom'>('preset');
  const [lumpPresetId, setPresetId] = useState('');
  const [customLumpName, setCustomLumpName] = useState('');
  const [lumpContractAmount, setLumpContractAmount] = useState<number>(100000);
  const [lumpRatio, setLumpRatio] = useState<number>(5); // defaults to 5%
  
  // Save daily reports to persistence whenever modified
  useEffect(() => {
    localStorage.setItem('OUTPUT_VALUE_DAILY_REPORTS', JSON.stringify(reports));
  }, [reports]);

  // Handle Delete Report
  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除或撤销该日期的产值日报吗？删除后此产值数据不再计入汇总。')) {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  // Switch to Create New report mode
  const handleOpenCreateMode = () => {
    // Default to the next day with no report (e.g. 2026-06-10)
    setCreateDate('2026-06-10');
    setCreateLogsSynced([]);
    setCreateManualItems([]);
    setCreateLumpSumItems([]);
    setSyncStatusText('');
    setViewMode('create');
  };

  // Switch back to List Mode
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedReportId(null);
  };

  // Look up item list for selected project in Manual Add Modal
  const selectedManualProject = DEFAULT_PROJECTS.find(p => p.id === manualProjId);
  const manualItemsList = selectedManualProject?.items || [];

  // Look up preset list for selected project in Lump Sum Modal
  const lumpPresetsList = GLOBAL_LUMPSUM_OPTIONS.filter(o => o.projectId === lumpProjId);

  // Keep preset values updated
  useEffect(() => {
    if (lumpSelectionType === 'preset' && lumpPresetId) {
      const preset = GLOBAL_LUMPSUM_OPTIONS.find(o => o.id === lumpPresetId);
      if (preset) {
        setLumpContractAmount(preset.contractAmount);
      }
    }
  }, [lumpPresetId, lumpSelectionType]);

  // Effect to sync default states when project dropdown changes in Manual Add Modal
  useEffect(() => {
    if (manualProjId && manualItemsList.length > 0) {
      setManualItemId(manualItemsList[0].id);
    } else {
      setManualItemId('');
    }
  }, [manualProjId]);

  // Effect to sync default states when project dropdown changes in Lump Sum Modal
  useEffect(() => {
    const list = GLOBAL_LUMPSUM_OPTIONS.filter(o => o.projectId === lumpProjId);
    if (list.length > 0) {
      setPresetId(list[0].id);
      setLumpContractAmount(list[0].contractAmount);
    } else {
      setPresetId('');
      setLumpContractAmount(100000);
    }
  }, [lumpProjId]);

  // ============================================
  // CHANNEL 1: HANDLERS (SYNC FROM CONSTRUCTION LOG)
  // ============================================
  const handleSyncConstructionLogs = () => {
    setIsSyncing(true);
    setSyncStatusText('正在扫描检索对应日期的施工日志记录...');

    setTimeout(() => {
      // Find logs inside localStorage
      const savedLogs = localStorage.getItem('CONSTRUCTION_LOGS');
      let targetLogs: ConstructionLog[] = [];
      
      if (savedLogs) {
        const allLogs: ConstructionLog[] = JSON.parse(savedLogs);
        // Match with the chosen date and submitted logs
        targetLogs = allLogs.filter(l => l.logDate === createDate && l.status === '已提交');
      }

      if (targetLogs.length === 0) {
        setIsSyncing(false);
        setSyncStatusText('未找到任何符合日期 ' + createDate + ' 且已提交通过审核的现场施工日志。请检查日志填报页面！');
        setCreateLogsSynced([]);
        return;
      }

      // Group these logs into the reports synced list
      const projectsMapped: LogSyncedProject[] = targetLogs.map(log => {
        const sumValue = log.contents.reduce((s, col) => s + col.outputValue, 0);
        return {
          projectId: log.projectId,
          projectName: log.projectName,
          logCode: log.logCode,
          value: sumValue,
          items: log.contents.map(c => ({
            itemId: c.itemId,
            itemName: c.itemName,
            unit: c.unit,
            unitPrice: c.unitPrice,
            qty: c.completedQty,
            outputValue: c.outputValue
          }))
        };
      });

      setCreateLogsSynced(projectsMapped);
      setIsSyncing(false);
      const grandSum = projectsMapped.reduce((s, p) => s + p.value, 0);
      setSyncStatusText(`成功同步匹配当日施工日志：检测到并合并 ${projectsMapped.length} 个现场养护项目的已审定进度，产值价值 ¥${grandSum.toLocaleString()} 元！`);
    }, 700);
  };


  // ============================================
  // CHANNEL 2: HANDLERS (MANUAL PROJECTS & QUANTITIES)
  // ============================================
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProjId || !manualItemId || manualQty <= 0) {
      alert('请选择有效的项目、清单科目，并填写正确的今日完成工程量');
      return;
    }

    const proj = DEFAULT_PROJECTS.find(p => p.id === manualProjId);
    const item = proj?.items.find(it => it.id === manualItemId);

    if (proj && item) {
      const computedValue = Number((manualQty * item.unitPrice).toFixed(2));
      const newItem: ManualItemInput = {
        id: `man-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        projectId: manualProjId,
        projectName: proj.name,
        itemId: manualItemId,
        itemName: item.itemName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        qty: manualQty,
        outputValue: computedValue
      };

      setCreateManualItems(prev => [...prev, newItem]);
      setShowAddManualModal(false);
      setManualQty(1);
    }
  };

  const removeManualItem = (id: string) => {
    setCreateManualItems(prev => prev.filter(item => item.id !== id));
  };


  // ============================================
  // CHANNEL 3: HANDLERS (LUMP SUM CONTRACT ITEM RATIOS)
  // ============================================
  const handleAddLumpSumItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lumpProjId || lumpContractAmount <= 0 || lumpRatio <= 0) {
      alert('请输入合法的包干设计金额与本日完成的分摊进度！');
      return;
    }

    const proj = DEFAULT_PROJECTS.find(p => p.id === lumpProjId);
    if (!proj) return;

    let finalItemName = '';
    let finalItemId = '';

    if (lumpSelectionType === 'preset') {
      const preset = GLOBAL_LUMPSUM_OPTIONS.find(o => o.id === lumpPresetId);
      finalItemName = preset ? preset.itemName : '预配包干清单';
      finalItemId = lumpPresetId;
    } else {
      finalItemName = customLumpName.trim() || '自定义阶段性包干款项';
      finalItemId = `custom-lump-${Date.now()}`;
    }

    const computedValue = Number(((lumpContractAmount * lumpRatio) / 100).toFixed(2));

    const newItem: LumpSumItemInput = {
      id: `lump-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      projectId: lumpProjId,
      projectName: proj.name,
      itemId: finalItemId,
      itemName: finalItemName,
      contractAmount: lumpContractAmount,
      ratio: lumpRatio,
      outputValue: computedValue
    };

    setCreateLumpSumItems(prev => [...prev, newItem]);
    setShowAddLumpModal(false);
    setCustomLumpName('');
    setLumpRatio(5);
  };

  const removeLumpSumItem = (id: string) => {
    setCreateLumpSumItems(prev => prev.filter(item => item.id !== id));
  };


  // ============================================
  // FINAL CONFIRMATION FLOW (SUBMIT WORKSPACE)
  // ============================================
  const handleConfirmAndPublishReport = () => {
    const logTotal = createLogsSynced.reduce((sum, p) => sum + p.value, 0);
    const manualTotal = createManualItems.reduce((sum, i) => sum + i.outputValue, 0);
    const lumpSumTotal = createLumpSumItems.reduce((sum, i) => sum + i.outputValue, 0);
    const grandTotal = logTotal + manualTotal + lumpSumTotal;

    if (grandTotal <= 0) {
      alert('请至少通过一种渠道添加或导入一些有效产值后再确认发布日报！');
      return;
    }

    // Check if the chosen date already has a daily report
    const existing = reports.find(r => r.date === createDate);
    if (existing) {
      if (!confirm(`日期 ${createDate} 已经存在一份产值日报，继续确认发布将会覆盖并更新已有版本。是否要继续？`)) {
        return;
      }
    }

    const newReport: DailyReport = {
      id: `rep-${createDate}`,
      date: createDate,
      projectName: `杭州北项目部 ${createDate} 产值日报`,
      totalValue: grandTotal,
      logValue: logTotal,
      manualValue: manualTotal,
      lumpSumValue: lumpSumTotal,
      status: '已确认',
      logsSynced: createLogsSynced,
      manualItems: createManualItems,
      lumpSumItems: createLumpSumItems,
      creator: '张二河', // Currently logged in project manager
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setReports(prev => {
      const filtered = prev.filter(r => r.date !== createDate);
      return [newReport, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });

    alert('产值日报创建并确认过账发布成功！');
    setViewMode('list');
  };


  // ============================================
  // MATHS & CALCS FOR VIEWING STATS (LIST VIEW)
  // ============================================
  const totalValueSum = reports.reduce((s, r) => s + r.totalValue, 0);
  const totalLogsSum = reports.reduce((s, r) => s + r.logValue, 0);
  const totalManualSum = reports.reduce((s, r) => s + r.manualValue, 0);
  const totalLumpSum = reports.reduce((s, r) => s + r.lumpSumValue, 0);

  // Helper: Get days in selected month for the interactive calendar
  const getCalendarDays = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const days: { day: number | null; dateString: string | null }[] = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateString: null });
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateString: dateStr });
    }
    return days;
  };

  // Helper: Get realistic approximation of Lunar calendar text for professional style
  const getLunarDayStr = (year: number, month: number, day: number) => {
    if (year === 2026 && month === 6) {
      if (day === 5) return '芒种';
      if (day === 10) return '四月廿五';
      if (day === 15) return '五月初一';
      if (day === 21) return '夏至';
      if (day === 25) return '五月十一';
      const lunarDays = ['十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五'];
      return lunarDays[(day - 1) % lunarDays.length];
    }
    // Simple mock lunar for other months
    const otherLunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    return otherLunarDays[(day - 1) % 30];
  };

  // Switch month helpers
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarYear(y => y - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarYear(y => y + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  // Calculate project proportions dynamic filter: MONTH vs YEAR
  // Users want: "以项目维度进行当月产值下各项目的占比以环形图/占比显示，可切换成年"
  const isYearlyMode = projectProportionMode === 'year';
  const proportionFilteredReports = reports.filter(r => {
    if (isYearlyMode) {
      return r.date.startsWith(`${calendarYear}`);
    } else {
      return r.date.startsWith(`${calendarYear}-${String(calendarMonth).padStart(2, '0')}`);
    }
  });

  const proportionProjectMap: { [name: string]: number } = {};
  proportionFilteredReports.forEach(r => {
    r.logsSynced.forEach(l => {
      proportionProjectMap[l.projectName] = (proportionProjectMap[l.projectName] || 0) + l.value;
    });
    r.manualItems.forEach(m => {
      proportionProjectMap[m.projectName] = (proportionProjectMap[m.projectName] || 0) + m.outputValue;
    });
    r.lumpSumItems.forEach(l => {
      proportionProjectMap[l.projectName] = (proportionProjectMap[l.projectName] || 0) + l.outputValue;
    });
  });

  const sortedProportionProjects = Object.entries(proportionProjectMap)
    .map(([projectName, val]) => ({ name: projectName, value: val }))
    .sort((a, b) => b.value - a.value);

  const proportionTotalValue = sortedProportionProjects.reduce((sum, p) => sum + p.value, 0);

  // Still compute generic top projects for backward compatibility if needed, else reference sortedProportionProjects
  const topProjectsSorted = sortedProportionProjects;

  const selectedReport = reports.find(r => r.id === selectedReportId);

  // List view filters lookup
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.date.includes(searchQuery) ||
                          r.creator.includes(searchQuery);

    if (selectedMonthFilter === 'ALL') return matchesSearch;
    return matchesSearch && r.date.startsWith(selectedMonthFilter);
  });

  // Calculate percentage of each source
  const sourcePercent = (val: number) => {
    if (totalValueSum <= 0) return 0;
    return Number(((val / totalValueSum) * 100).toFixed(1));
  };


  return (
    <div className="space-y-6 select-none pb-12" id="output-value-daily-container">

      {/* ========================================================
          1. LIST VIEW OF DAILY REPORTS
          ======================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4" id="daily-report-header">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full font-bold">进度管理</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-500 text-xs">产值管理</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2" id="daily-report-title">
                <TrendingUp className="text-teal-600" size={24} />
                产值日报管理
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200/40 rounded ml-2">杭州北项目部</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                支持各向养护项目每日产值的<strong>手动新建填报与正式确认记账流程</strong>。包含现场施工日志智能同步、项目追加清单以及包干进度核销三种编制途径。
              </p>
            </div>

            <button
              onClick={handleOpenCreateMode}
              id="btn-create-daily-report"
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.01]"
            >
              <PlusCircle size={16} />
              手动创建当日产值
            </button>
          </div>

          {/* Graphical View - Project breakdown and trends (Interactive Calendar & Project share donut) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" id="stats-graphical-section">
            
            {/* CARD 1: Calendar View of Confirmed Daily Output (以日历的形式展示已确认的每日产值) */}
            <div className="lg:col-span-7 bg-white p-3 rounded-xl border border-teal-150/40 shadow-sm flex flex-col justify-between" id="daily-output-calendar-card">
              <div className="space-y-2">
                {/* Calendar Header with lunar decoration and month selector */}
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-teal-900 text-xs font-black tracking-tight" id="calendar-lunar-title">
                      {calendarMonth}月月度产值 <span className="text-slate-200 font-normal mx-1 border-l border-slate-200 h-2.5 inline-block align-middle"></span> 
                      <span className="text-slate-400 text-[10px] font-semibold">
                        {selectedCalendarDate ? (() => {
                          const dayNum = parseInt(selectedCalendarDate.substring(8, 10)) || 10;
                          return getLunarDayStr(calendarYear, calendarMonth, dayNum);
                        })() : '四月廿五'}
                      </span>
                    </span>
                    <p className="text-[9px] text-slate-450 block -mt-0.5">
                      选择日期快速速览当日记账产值与撤报台账
                    </p>
                  </div>
 
                  {/* Month Switch buttons */}
                  <div className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-lg border border-slate-100" id="current-month-selectors">
                    <button
                      onClick={handlePrevMonth}
                      type="button"
                      className="p-1 hover:bg-white hover:text-teal-600 rounded text-slate-400 cursor-pointer transition-colors"
                      title="上个月"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-bold min-w-[58px] text-center text-slate-650 font-mono">
                      {calendarYear}年{String(calendarMonth).padStart(2, '0')}月
                    </span>
                    <button
                      onClick={handleNextMonth}
                      type="button"
                      className="p-1 hover:bg-white hover:text-teal-600 rounded text-slate-400 cursor-pointer transition-colors"
                      title="下个月"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Day of the Week Header Row */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 py-0.5" id="calendar-days-of-week">
                  <div className="text-rose-400 font-medium">日</div>
                  <div className="font-medium text-slate-400">一</div>
                  <div className="font-medium text-slate-400">二</div>
                  <div className="font-medium text-slate-400">三</div>
                  <div className="font-medium text-slate-400">四</div>
                  <div className="font-medium text-slate-400">五</div>
                  <div className="text-slate-455 font-medium">六</div>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-1" id="calendar-days-grid">
                  {getCalendarDays(calendarYear, calendarMonth).map((cell, index) => {
                    if (!cell.day || !cell.dateString) {
                      return <div key={`empty-${index}`} className="h-[34px]"></div>;
                    }

                    const isSelected = selectedCalendarDate === cell.dateString;
                    const reportOnDay = reports.find(r => r.date === cell.dateString && r.status === '已确认');
                    const isToday = cell.day === 10 && calendarMonth === 6 && calendarYear === 2026; // Highlight today (June 10th, 2026)

                    return (
                      <div
                        key={cell.dateString}
                        onClick={() => setSelectedCalendarDate(cell.dateString)}
                        className={`h-[34px] rounded-md flex flex-col justify-between p-0.5 border transition-all cursor-pointer select-none relative group
                          ${isSelected 
                            ? 'border-teal-500 bg-teal-50/30 shadow-xs' 
                            : reportOnDay 
                              ? 'border-emerald-100 bg-emerald-50/10 hover:bg-emerald-50/20' 
                              : 'border-slate-50 hover:bg-slate-50'
                          }
                        `}
                        id={`day-cell-${cell.day}`}
                      >
                        {/* Day number count */}
                        <div className="flex justify-between items-center leading-none">
                          {isSelected ? (
                            <span className="w-3.5 h-3.5 flex items-center justify-center bg-teal-600 text-white rounded-full text-[9px] font-black shrink-0">
                              {cell.day}
                            </span>
                          ) : isToday ? (
                            <span className="w-3.5 h-3.5 flex items-center justify-center border border-teal-500 text-teal-600 rounded-full text-[9px] font-black shrink-0 relative">
                              {cell.day}
                              <span className="absolute bottom-[0px] left-1/2 -translate-x-1/2 w-1 h-[1px] bg-teal-500 rounded-full"></span>
                            </span>
                          ) : (
                            <span className={`text-[10px] font-semibold ${index % 7 === 0 ? 'text-rose-455' : index % 7 === 6 ? 'text-slate-400' : 'text-slate-500'}`}>
                              {cell.day}
                            </span>
                          )}

                          {/* Tiny tick badge if confirmed report exists on this day */}
                          {reportOnDay && (
                            <CheckCircle2 size={8} className="text-teal-500 shrink-0" />
                          )}
                        </div>

                        {/* Amount or text indicator */}
                        <div className="leading-none text-right">
                          {reportOnDay ? (
                            <div className="text-[8px] font-mono font-bold text-teal-750 truncate" title={`产值: ¥${reportOnDay.totalValue.toLocaleString()}`}>
                              ¥{(reportOnDay.totalValue / 1000).toFixed(0)}k
                            </div>
                          ) : (
                            <div className="text-[7.5px] text-slate-350 group-hover:text-teal-555/40 transition-colors leading-none truncate">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Details Context interactive panel underneath */}
              <div className="mt-2 bg-gradient-to-r from-teal-50/15 to-emerald-50/10 p-2 rounded-lg border border-teal-100/30" id="calendar-day-details-panel">
                {(() => {
                  if (!selectedCalendarDate) return <div className="text-[11px] text-slate-400 text-center">请在上方选中一个日期以查看每日产值日报</div>;
                  
                  const rOnDay = reports.find(r => r.date === selectedCalendarDate && r.status === '已确认');
                  if (rOnDay) {
                    return (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 text-[8px] font-bold rounded border border-teal-100/40">
                              已记账
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 font-mono">
                              {selectedCalendarDate} 进度产值
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-550 leading-tight">
                            当日录报总额：<strong className="text-teal-650 font-mono font-black text-xs">¥{rOnDay.totalValue.toLocaleString()}</strong>（日志 ¥{rOnDay.logValue.toLocaleString()} | 清单 ¥{rOnDay.manualValue.toLocaleString()} | 包干 ¥{rOnDay.lumpSumValue.toLocaleString()}）
                          </p>
                        </div>

                        {/* Actions drawer */}
                        <div className="flex items-center gap-1" id="day-actions-row">
                          <button
                            onClick={() => {
                              setSelectedReportId(rOnDay.id);
                              setViewMode('view');
                            }}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                          >
                            查看详情
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteReport(rOnDay.id, e)}
                            className="px-2 py-1 border border-red-100 hover:border-red-200 text-red-500 hover:bg-red-50 rounded text-[10px] font-medium cursor-pointer transition-colors"
                          >
                            撤销
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-semibold rounded">
                              暂无
                            </span>
                            <span className="text-[11px] font-bold text-slate-650 font-mono">
                              {selectedCalendarDate} 进度待确认
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            该汇总日期暂未编制产值日报，在右侧可直接补充。
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setCreateDate(selectedCalendarDate);
                            setCreateLogsSynced([]);
                            setCreateManualItems([]);
                            setCreateLumpSumItems([]);
                            setSyncStatusText('');
                            setViewMode('create');
                          }}
                          className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Plus size={10} />
                          补充当日
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>

            </div>
 
            {/* CARD 2: Project Share circular card (当月或全年占比) */}
            <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between" id="project-proportion-donut-card">
              
              <div className="space-y-3">
                {/* Switcher & Header */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <PieChart size={14} className="text-teal-600" />
                    <span className="font-extrabold text-slate-800 text-xs tracking-wide">
                      {isYearlyMode ? `${calendarYear}年项目产值占比` : `${calendarMonth}月项目产值占比`}
                    </span>
                  </div>
 
                  {/* Month/Year toggle */}
                  <div className="flex rounded-md bg-slate-50 p-0.5 border border-slate-150" id="proportion-period-switcher">
                    <button
                      onClick={() => setProjectProportionMode('month')}
                      type="button"
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer select-none
                        ${!isYearlyMode 
                           ? 'bg-white text-teal-700 shadow-xs ring-1 ring-black/[0.01]' 
                           : 'text-slate-500 hover:text-slate-800'
                        }
                      `}
                    >
                      按月
                    </button>
                    <button
                      onClick={() => setProjectProportionMode('year')}
                      type="button"
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer select-none
                        ${isYearlyMode 
                           ? 'bg-white text-teal-700 shadow-xs ring-1 ring-black/[0.01]' 
                           : 'text-slate-500 hover:text-slate-800'
                        }
                      `}
                    >
                      按年
                    </button>
                  </div>
                </div>
 
                {sortedProportionProjects.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4 space-y-1">
                    <span className="text-2xl">📊</span>
                    <p className="text-xs font-bold text-slate-500">
                      该周期的产值记账数据为空
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">
                      您可以切换成【按年】或在左侧日历中填报已确认产值！
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-1">
                    {/* Ring Svg (Side by Side) - Reduced size for compact screen */}
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" stroke="#f8fafc" strokeWidth="12" fill="transparent" />
                        {sortedProportionProjects.map((item, idx) => {
                          const percent = proportionTotalValue > 0 ? (item.value / proportionTotalValue) * 100 : 0;
                          const precedingSum = sortedProportionProjects.slice(0, idx).reduce((s, p) => s + (p.value / proportionTotalValue) * 100, 0);
                          const dashArray = `${percent} ${100 - percent}`;
                          const dashOffset = `${-precedingSum}`;
                          const strokeColor = idx === 0 ? '#0d9488' : idx === 1 ? '#0ea5e9' : idx === 2 ? '#6366f1' : '#f59e0b';
                          
                          return (
                            <circle
                              key={item.name}
                              cx="50"
                              cy="50"
                              r="38"
                              stroke={strokeColor}
                              strokeWidth="12"
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              fill="transparent"
                              className="transition-all duration-300 hover:opacity-85"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[9px] text-slate-400 font-bold block leading-none">总计</span>
                        <span className="text-[11px] font-extrabold text-slate-800 font-mono tracking-tight my-0.5">
                          ¥{(proportionTotalValue / 1000).toFixed(0)}K
                        </span>
                        <span className="text-[8px] text-teal-700 font-extrabold bg-teal-50 px-1 py-0.2 rounded scale-90">
                          {isYearlyMode ? '年度' : '月计'}
                        </span>
                      </div>
                    </div>
 
                    {/* Proportions Breakdown details list (Side by Side) */}
                    <div className="flex-1 space-y-1 w-full max-h-[120px] overflow-y-auto pr-1" id="project-proportions-legends">
                      {sortedProportionProjects.map((item, idx) => {
                        const percent = proportionTotalValue > 0 ? ((item.value / proportionTotalValue) * 100).toFixed(1) : '0';
                        const bulletColor = idx === 0 ? 'bg-teal-600' : idx === 1 ? 'bg-sky-500' : idx === 2 ? 'bg-indigo-500' : 'bg-amber-500';
                        const textBadgeColor = idx === 0 ? 'text-teal-700 bg-teal-50 border border-teal-100/50' : idx === 1 ? 'text-sky-700 bg-sky-50 border border-sky-100/50' : idx === 2 ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50';
                        
                        return (
                          <div key={item.name} className="flex items-center justify-between text-[11px] text-slate-600 py-0.5 hover:bg-slate-50 px-1.5 rounded transition-colors">
                            <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                              <span className={`w-2 h-2 rounded-full ${bulletColor} shrink-0`}></span>
                              <span className="truncate font-semibold text-slate-700" title={item.name}>
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-mono">
                              <span className="text-slate-450 text-[9px]">¥{(item.value / 1000).toFixed(0)}k</span>
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded scale-95 tracking-tighter ${textBadgeColor}`}>
                                {percent}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
 
              {/* Summary stat badge line */}
              <div className="text-[10px] text-slate-400 font-semibold flex justify-between pt-2 border-t border-slate-50" id="donut-total-summary-line">
                <span>范围: 养护承包项目标段</span>
                <span className="text-teal-600 font-bold flex items-center gap-0.5">
                  已析合 {proportionFilteredReports.length} 份产值
                </span>
              </div>
 
            </div>
 
          </div>

          {/* Historical Daily Reports Ledger Table Card */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden" id="daily-ledger-box">
            
            {/* Ledger Toolbar filter */}
            <div className="p-4 bg-gray-50/50 border-b border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-gray-500" />
                <span className="font-bold text-gray-800 text-xs">产值日报历史台账</span>
                <span className="text-[10px] text-gray-400 font-normal">({filteredReports.length} 篇日报记录)</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Search query input */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索汇总日期/编制人/编号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-full bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-purple-500"
                  />
                </div>

                {/* Filter Month */}
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-bold outline-none cursor-pointer"
                >
                  <option value="ALL">全期检索</option>
                  <option value="2026-06">2026年06月</option>
                  <option value="2026-05">2026年05月</option>
                </select>
              </div>
            </div>

            {/* Daily report list table */}
            {filteredReports.length === 0 ? (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3 bg-white">
                <span className="text-3xl">📭</span>
                <div className="font-bold text-gray-500">没有查找到任何匹配的产值日报记录</div>
                <p className="text-xs text-gray-400">您可以点击右上角的“手动创建当日产值”按钮生成一份新的日报。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-150 text-gray-500 font-bold">
                      <th className="p-4 w-28">汇总日期</th>
                      <th className="p-4">产值日报名称</th>
                      <th className="p-4 text-right">总确报产值</th>
                      <th className="p-4 text-center">日志同步占比</th>
                      <th className="p-4 text-center">清单直接填报</th>
                      <th className="p-4 text-center">包干比例分摊</th>
                      <th className="p-4 w-24 text-center">状态</th>
                      <th className="p-4 w-32">编制过账人</th>
                      <th className="p-4 w-24 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-gray-700">
                    {filteredReports.map(rep => (
                      <tr 
                        key={rep.id} 
                        onClick={() => {
                          setSelectedReportId(rep.id);
                          setViewMode('view');
                        }}
                        className="hover:bg-purple-50/10 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-gray-950">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            {rep.date}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{rep.projectName}</div>
                          <div className="text-[10px] text-gray-400 font-medium">过账时间: {rep.createTime}</div>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-rose-600 text-sm">
                          ¥{rep.totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center ">
                          <span className="font-mono font-bold text-emerald-600 block">¥{rep.logValue.toLocaleString()}</span>
                          <span className="text-[9px] text-gray-400">({rep.totalValue > 0 ? ((rep.logValue / rep.totalValue) * 100).toFixed(0) : 0}%)</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono font-bold text-blue-600 block">¥{rep.manualValue.toLocaleString()}</span>
                          <span className="text-[9px] text-gray-400">({rep.totalValue > 0 ? ((rep.manualValue / rep.totalValue) * 100).toFixed(0) : 0}%)</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono font-bold text-purple-600 block">¥{rep.lumpSumValue.toLocaleString()}</span>
                          <span className="text-[9px] text-gray-400">({rep.totalValue > 0 ? ((rep.lumpSumValue / rep.totalValue) * 100).toFixed(0) : 0}%)</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            {rep.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-gray-800">{rep.creator}</span>
                          <span className="text-[10px] text-gray-400 block">杭州北核算科</span>
                        </td>
                        <td className="p-4 text-center flex items-center justify-center gap-2 pt-6">
                          <button
                            onClick={(e) => {
                              setSelectedReportId(rep.id);
                              setViewMode('view');
                              e.stopPropagation();
                            }}
                            className="px-2 py-1 text-purple-600 hover:bg-purple-100 rounded text-[11px] font-bold"
                          >
                            详情
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteReport(rep.id, e)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="删除撤销日报"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}


      {/* ========================================================
          2. CREATION WORKSPACE CONTAINER (新增与合并产值填报)
          ======================================================== */}
      {viewMode === 'create' && (
        <div className="space-y-6">
          
          {/* Create Header Block */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <button 
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-bold cursor-pointer hover:underline mb-1"
              >
                <ArrowLeft size={12} />
                返回日报台账
              </button>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                新增编制产值日报 
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  杭州北项目部
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                请先选定汇总日期，再从三大途径中补充数据。最后确认产值后点击右下角按钮记账。
              </p>
            </div>

            {/* Date Input with alert */}
            <div className="flex items-center gap-3 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
              <span className="text-xs text-indigo-900 font-bold flex items-center gap-1 shrink-0">
                <Calendar size={14} className="text-indigo-600" />
                产值汇总日期:
              </span>
              <input
                type="date"
                value={createDate}
                onChange={(e) => {
                  setCreateDate(e.target.value);
                  // Refresh on change logs
                  setCreateLogsSynced([]);
                  setSyncStatusText('');
                }}
                className="bg-white border border-gray-300 focus:border-purple-500 font-mono text-xs font-bold px-2 py-1.5 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Real-time total calculated values */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-900 text-white rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] text-blue-200 font-bold block uppercase">本日总产值 (实时计合)</span>
              <span className="text-2xl font-black font-mono">
                ¥{(
                  createLogsSynced.reduce((sum, p) => sum + p.value, 0) +
                  createManualItems.reduce((sum, i) => sum + i.outputValue, 0) +
                  createLumpSumItems.reduce((sum, i) => sum + i.outputValue, 0)
                ).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400 font-medium">途径 1: 施工日志智能同步</span>
              <span className="text-base font-black font-mono text-emerald-600 mt-1">
                ¥{createLogsSynced.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400 font-medium">途径 2: 合同清单追加填报</span>
              <span className="text-base font-black font-mono text-blue-600 mt-1">
                ¥{createManualItems.reduce((sum, i) => sum + i.outputValue, 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400 font-medium">途径 3: 包干类清单进度核销</span>
              <span className="text-base font-black font-mono text-purple-600 mt-1">
                ¥{createLumpSumItems.reduce((sum, i) => sum + i.outputValue, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* WORKSPACE AREA */}
          <div className="space-y-6">
            
            {/* ====== WAY 1: SYNC FROM LOG ====== */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">1</span>
                    <h3 className="font-bold text-gray-900 text-sm">一键同步当日施工日志内容</h3>
                  </div>
                  <p className="text-[11px] text-gray-400">读取在现场施工日志填报系统里已审核提交的清单计件工程量。</p>
                </div>

                <button
                  type="button"
                  onClick={handleSyncConstructionLogs}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCcw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? '正在拉取...' : '同步施工日志数据'}
                </button>
              </div>

              {/* Log Sync Status Display message */}
              {syncStatusText && (
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  createLogsSynced.length > 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {syncStatusText}
                </div>
              )}

              {createLogsSynced.length > 0 ? (
                <div className="space-y-3">
                  {createLogsSynced.map(proj => (
                    <div key={proj.logCode} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div>
                          <span className="font-extrabold text-gray-900 mr-2">{proj.projectName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">({proj.logCode})</span>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-700">项目日志产值: ¥{proj.value.toLocaleString()}</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] bg-white divide-y divide-gray-150">
                          <thead>
                            <tr className="bg-gray-50/50 text-gray-400 font-semibold border-b border-gray-150">
                              <th className="p-2.5">清单项名称</th>
                              <th className="p-2.5 text-right w-24">单价</th>
                              <th className="p-2.5 text-right w-24">今日完成工程量</th>
                              <th className="p-2.5 text-center w-16">单位</th>
                              <th className="p-2.5 text-right w-28">产值小计</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 text-gray-600">
                            {proj.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/30">
                                <td className="p-2.5 font-medium">{it.itemName}</td>
                                <td className="p-2.5 text-right font-mono text-gray-400">¥{it.unitPrice}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-gray-800">{it.qty}</td>
                                <td className="p-2.5 text-center text-gray-500">{it.unit}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600">¥{it.outputValue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs bg-gray-50/20">
                  ⌛ 点击上方“同步施工日志数据”按钮后，系统将会根据选定的汇总日期智能调取日志列表。
                </div>
              )}
            </div>

            {/* ====== WAY 2: MANUAL ENTRY QUANTITIES ====== */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="font-bold text-gray-900 text-sm">手动追加项目并维护填报清单数量</h3>
                  </div>
                  <p className="text-[11px] text-gray-400">允许您随意为任何标段项目追加合同预算内的具体数量，以计算并汇算当日统计产值。</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setManualProjId(DEFAULT_PROJECTS[0]?.id || '');
                    setShowAddManualModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer animate-none"
                >
                  <PlusCircle size={13} />
                  追加项目清单产值
                </button>
              </div>

              {createManualItems.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <th className="p-3">项目标段</th>
                        <th className="p-3">清单科目</th>
                        <th className="p-3 text-right">单价</th>
                        <th className="p-3 text-right w-24">本日追加工程量</th>
                        <th className="p-3 text-center w-16">单位</th>
                        <th className="p-3 text-right w-28">产值价值</th>
                        <th className="p-3 w-16 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {createManualItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/20">
                          <td className="p-3 font-semibold text-gray-800">{item.projectName}</td>
                          <td className="p-3 text-gray-700">{item.itemName}</td>
                          <td className="p-3 text-right font-mono text-gray-400">¥{item.unitPrice}</td>
                          <td className="p-3 text-right font-mono font-bold text-blue-600">{item.qty}</td>
                          <td className="p-3 text-center text-gray-500 font-semibold">{item.unit}</td>
                          <td className="p-3 text-right font-mono font-black text-rose-600">¥{item.outputValue.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeManualItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs bg-gray-50/20">
                  ⌛ 暂无手动追加的计件清单项。点击右上角按钮可以自由追加。
                </div>
              )}
            </div>

            {/* ====== WAY 3: LUMPSUM ALLOCATION ====== */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">3</span>
                    <h3 className="font-bold text-gray-900 text-sm">特急及包干类清单产值（按进度比例分摊）</h3>
                  </div>
                  <p className="text-[11px] text-gray-400">针对项目内没有日志记录的总价包干或配合费用清单项，可以通过本功能手动分摊百分比比例计入产值。</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLumpProjId(DEFAULT_PROJECTS[0]?.id || '');
                    setShowAddLumpModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle size={13} />
                  添加包干进度分摊
                </button>
              </div>

              {createLumpSumItems.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <th className="p-3">关联大项目</th>
                        <th className="p-3">总价包干款项名称</th>
                        <th className="p-3 text-right">包干设计合总额</th>
                        <th className="p-3 text-right w-28">本日进度分摊百分比</th>
                        <th className="p-3 text-right w-32">本日核销产值</th>
                        <th className="p-3 w-16 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {createLumpSumItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/20">
                          <td className="p-3 font-semibold text-gray-800">{item.projectName}</td>
                          <td className="p-3 text-gray-700">{item.itemName}</td>
                          <td className="p-3 text-right font-mono text-gray-400">¥{item.contractAmount.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <span className="inline-block bg-purple-50 text-purple-700 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                              {item.ratio.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-600">¥{item.outputValue.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLumpSumItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs bg-gray-50/20">
                  ⌛ 暂无包干分摊大项。对于包干计件或大型临时工程配合，点击右上角自主添加分摊比例。
                </div>
              )}
            </div>

          </div>

          {/* Creation submit and bottom bar */}
          <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200">
              <Info size={15} className="shrink-0" />
              <span>系统将按汇总日期进行唯一化过账存储。请再次检查并确认当日产值各项分量是否录入核算无误！</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-250 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                取消并不予存储
              </button>

              <button
                type="button"
                onClick={handleConfirmAndPublishReport}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                确认当日产值，完成创建
              </button>
            </div>
          </div>

        </div>
      )}


      {/* ========================================================
          3. INTERACTIVE DETAILED VIEW MODE (查看产值日报详案)
          ======================================================== */}
      {viewMode === 'view' && selectedReport && (
        <div className="space-y-6">
          
          {/* View Toolbar Header */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <button 
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-bold cursor-pointer hover:underline mb-1"
              >
                <ArrowLeft size={12} />
                返回日报历史台账列表
              </button>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                产值日报详情查看
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-0.5 rounded font-black">
                  {selectedReport.status}
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                当前查阅为已过账账目信息，仅做审计备份，不可直接改写。如要修改请删除并重新追加。
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-705 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download size={13} />
                打印 / 导出账单
              </button>
              <button
                onClick={handleBackToList}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                返回列表
              </button>
            </div>
          </div>

          {/* Metadata info cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-800 to-emerald-950 text-white rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-[10px] text-teal-150 font-bold uppercase tracking-wider block">日报统计日期</span>
              <span className="text-lg font-black font-mono mt-2 flex items-center gap-1.5">
                <Calendar size={18} className="text-teal-200" />
                {selectedReport.date}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-205 p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-400 font-medium">当日核定产值总计</span>
              <span className="text-xl font-black font-mono text-emerald-600 mt-1">
                ¥{selectedReport.totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-205 p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-400 font-medium">编制人签名</span>
              <span className="text-sm font-semibold text-slate-800 mt-2 flex items-center gap-1">
                <Briefcase size={14} className="text-slate-400" />
                {selectedReport.creator} (杭州北项目部)
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-205 p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-400 font-medium">过账记账时间</span>
              <span className="text-xs font-mono font-bold text-slate-500 mt-2">
                {selectedReport.createTime}
              </span>
            </div>
          </div>

          {/* DETAILED LEDGER BREAKDOWN LISTS */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            <h3 className="font-extrabold text-gray-900 text-sm border-b border-gray-100 pb-3 flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" />
              当日产值核算细表 (本级项目部过账核发)
            </h3>

            {/* CHANNEL 1 DATA */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  管道一：现场施工日志提取的工程产值 (共计 ¥{selectedReport.logValue.toLocaleString()} 元)
                </h4>
              </div>

              {selectedReport.logsSynced.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50/50 rounded-xl text-[11px] border border-dashed border-gray-200">
                  无施工日志合并产生的数据
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedReport.logsSynced.map(proj => (
                    <div key={proj.logCode} className="border border-gray-150 rounded-xl overflow-hidden bg-gray-50/40">
                      <div className="p-2.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-900">{proj.projectName} <span className="text-gray-400 font-mono text-[10px] ml-1">({proj.logCode})</span></span>
                        <span className="font-mono font-black text-emerald-700">小计产值: ¥{proj.value.toLocaleString()}</span>
                      </div>
                      <table className="w-full text-left text-[11px] bg-white divide-y divide-gray-150">
                        <thead>
                          <tr className="bg-gray-50/30 text-gray-400 font-bold border-b border-gray-100">
                            <th className="p-2">清单项名称</th>
                            <th className="p-2 text-right">单价</th>
                            <th className="p-2 text-right">日志填报工程量</th>
                            <th className="p-2 text-center">单位</th>
                            <th className="p-2 text-right">产值估价</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-600">
                          {proj.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/20">
                              <td className="p-2 font-medium text-gray-800">{it.itemName}</td>
                              <td className="p-2 text-right font-mono text-gray-400">¥{it.unitPrice}</td>
                              <td className="p-2 text-right font-mono text-gray-800">{it.qty}</td>
                              <td className="p-2 text-center text-gray-400">{it.unit}</td>
                              <td className="p-2 text-right font-mono font-bold text-gray-900">¥{it.outputValue.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CHANNEL 2 DATA */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                管道二：不限日志的手动直接维护清单产值 (共计 ¥{selectedReport.manualValue.toLocaleString()} 元)
              </h4>

              {selectedReport.manualItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50/50 rounded-xl text-[11px] border border-dashed border-gray-200">
                  不包含手工追加的清单项工程产值
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <th className="p-3">追加项目名称</th>
                        <th className="p-3">追加合同清单项</th>
                        <th className="p-3 text-right">清单单价</th>
                        <th className="p-3 text-right">追加数量</th>
                        <th className="p-3 text-center">工程单位</th>
                        <th className="p-3 text-right">生成产值</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {selectedReport.manualItems.map(item => (
                        <tr key={item.id}>
                          <td className="p-3 font-semibold text-gray-800">{item.projectName}</td>
                          <td className="p-3 text-gray-600">{item.itemName}</td>
                          <td className="p-3 text-right font-mono text-gray-400">¥{item.unitPrice}</td>
                          <td className="p-3 text-right font-mono font-bold text-blue-600">{item.qty}</td>
                          <td className="p-3 text-center text-gray-500">{item.unit}</td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">¥{item.outputValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CHANNEL 3 DATA */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                管道三：总价及包干大项进度比例分摊产值 (共计 ¥{selectedReport.lumpSumValue.toLocaleString()} 元)
              </h4>

              {selectedReport.lumpSumItems.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50/50 rounded-xl text-[11px] border border-dashed border-gray-200">
                  不包含包干进度比例分摊类的产值大项
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                        <th className="p-3">对应主项目</th>
                        <th className="p-3">包干配合费大项名称</th>
                        <th className="p-3 text-right">合同包干总金额</th>
                        <th className="p-3 text-right">今日进度分摊 %</th>
                        <th className="p-3 text-right">计核本日产值</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {selectedReport.lumpSumItems.map(item => (
                        <tr key={item.id}>
                          <td className="p-3 font-semibold text-gray-800">{item.projectName}</td>
                          <td className="p-3 text-gray-600">{item.itemName}</td>
                          <td className="p-3 text-right font-mono text-gray-400">¥{item.contractAmount.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <span className="bg-purple-50 text-purple-600 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                              {item.ratio}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-950">¥{item.outputValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Audit signature section */}
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3">
            <span>
              🔒 *此报表已上传至交投项目部集成财务系统。任何撤销操作均会触发审批流。*
            </span>
            <span>
              审计盖章：<strong className="text-gray-800 font-mono">HZB-AUDIT-PASS-2026</strong>
            </span>
          </div>

        </div>
      )}


      {/* ========================================================
          MODALS AREA inside worksheet
          ======================================================== */}
      
      {/* 1. Modal: Way 2 Add Custom Unit Price Quantities item */}
      <AnimatePresence>
        {showAddManualModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg border border-gray-100"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 font-bold text-sm flex items-center justify-between">
                <span>手动新增项目和清单计件</span>
                <button 
                  onClick={() => setShowAddManualModal(false)}
                  className="text-white/80 hover:text-white text-lg font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddManualItem} className="p-5 space-y-4">
                
                {/* select project */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">1. 选择所属项目标段</label>
                  <select
                    required
                    value={manualProjId}
                    onChange={(e) => setManualProjId(e.target.value)}
                    className="w-full bg-white border border-gray-350 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">-- 请选择对应主项目 --</option>
                    {DEFAULT_PROJECTS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* select item */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">2. 选择合同清单科目 (含单价/单位)</label>
                  <select
                    required
                    value={manualItemId}
                    onChange={(e) => setManualItemId(e.target.value)}
                    disabled={!manualProjId}
                    className="w-full bg-white border border-gray-350 focus:border-purple-500 disabled:bg-gray-55 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- 请选择关联的中标清单目 --</option>
                    {manualItemsList.map(it => (
                      <option key={it.id} value={it.id}>
                        [{it.itemCode}] {it.itemName} (¥{it.unitPrice} / {it.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* qty input */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">3. 本次追加填报完成工程量</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      min="0.001"
                      step="any"
                      placeholder="例如 12"
                      value={manualQty || ''}
                      onChange={(e) => setManualQty(Number(e.target.value))}
                      className="flex-1 border border-gray-350 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                    />
                    <span className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-500 shrink-0 min-w-[50px] text-center">
                      {manualItemsList.find(it => it.id === manualItemId)?.unit || '米'}
                    </span>
                  </div>
                </div>

                {/* live preview total value */}
                {manualItemId && manualQty > 0 && (
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center font-bold text-xs text-rose-950">
                    💥 本次追加预算产值预设：¥{(manualQty * (manualItemsList.find(it => it.id === manualItemId)?.unitPrice || 0)).toLocaleString()} 元
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddManualModal(false)}
                    className="bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 px-4 py-2 rounded-xl"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 font-bold text-white px-5 py-2 rounded-xl"
                  >
                    添加至产值表
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal: Way 3 Add Lump Sum contract items */}
      <AnimatePresence>
        {showAddLumpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg border border-gray-100"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 font-bold text-sm flex items-center justify-between">
                <span>添加包干工程进度比例分摊</span>
                <button 
                  onClick={() => setShowAddLumpModal(false)}
                  className="text-white/80 hover:text-white text-lg font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddLumpSumItem} className="p-5 space-y-4">
                
                {/* select project */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">1. 选择关联项目部标段</label>
                  <select
                    required
                    value={lumpProjId}
                    onChange={(e) => setLumpProjId(e.target.value)}
                    className="w-full bg-white border border-gray-350 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">-- 选择大项目 --</option>
                    {DEFAULT_PROJECTS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* selectpreset vs custom */}
                <div className="flex gap-4 items-center py-1">
                  <span className="text-xs text-gray-400 font-bold">2. 科目获取模式：</span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={lumpSelectionType === 'preset'}
                      onChange={() => setLumpSelectionType('preset')}
                      className="accent-purple-600"
                    />
                    选择标段预配包干清单
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={lumpSelectionType === 'custom'}
                      onChange={() => setLumpSelectionType('custom')}
                      className="accent-purple-600"
                    />
                    手动新增自定义包干科目
                  </label>
                </div>

                {/* selection inputs */}
                {lumpSelectionType === 'preset' ? (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold block">预配包干收费项</label>
                    <select
                      value={lumpPresetId}
                      onChange={(e) => setPresetId(e.target.value)}
                      disabled={lumpPresetsList.length === 0}
                      className="w-full bg-white border border-gray-350 focus:border-purple-500 disabled:bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
                    >
                      {lumpPresetsList.length === 0 ? (
                        <option value="">-- 该项目未配置预备包干项，请使用手动新增模式 --</option>
                      ) : (
                        lumpPresetsList.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.itemName} (预设总金: ¥{opt.contractAmount.toLocaleString()})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-bold block">自定义包干清单大项名称</label>
                      <input
                        required
                        type="text"
                        placeholder="例如: 沪杭绿化防撞保通临时夜间配合包干服务项"
                        value={customLumpName}
                        onChange={(e) => setCustomLumpName(e.target.value)}
                        className="w-full border border-gray-350 focus:border-purple-500 rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Contract Amount */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">3. 包干设计总金额 (元)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="例如: 100000"
                    value={lumpContractAmount || ''}
                    onChange={(e) => setLumpContractAmount(Number(e.target.value))}
                    disabled={lumpSelectionType === 'preset' && lumpPresetsList.length > 0}
                    className="w-full border border-gray-350 focus:border-purple-500 disabled:bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>

                {/* Progress ratio percentage slider & input */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold block">4. 今日进度分摊比例 / 百分比 (%)</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="range"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={lumpRatio}
                      onChange={(e) => setLumpRatio(Number(e.target.value))}
                      className="flex-1 accent-purple-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0 w-24">
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={lumpRatio}
                        onChange={(e) => setLumpRatio(Number(e.target.value))}
                        className="w-full border border-gray-350 focus:border-purple-500 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-center outline-none"
                      />
                      <span className="text-xs font-extrabold text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                {/* computed live total values */}
                {lumpContractAmount > 0 && lumpRatio > 0 && (
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center font-bold text-xs text-rose-950">
                    💥 预估计入今日产值：¥{((lumpContractAmount * lumpRatio) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddLumpModal(false)}
                    className="bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 px-4 py-2 rounded-xl"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 font-bold text-white px-5 py-2 rounded-xl"
                  >
                    确定添加
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
