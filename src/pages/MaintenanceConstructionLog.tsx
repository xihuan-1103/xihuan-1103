import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  AlertCircle, 
  MapPin, 
  ArrowLeft, 
  Check, 
  Eye, 
  Save, 
  Camera, 
  X,
  ChevronDown,
  RefreshCw,
  FolderOpen,
  Send,
  HelpCircle,
  FileCode,
  Lock,
  RotateCcw
} from 'lucide-react';

// Project structural interfaces
export interface QuantitiesItem {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  designQty: number;
}

export interface DetailedProject {
  id: string;
  name: string;
  responsible: string;
  roadSections: string[];
  teamName: string;
  nature: '日常养护' | '专项养护' | '其他养护';
  items: QuantitiesItem[];
}

export interface MaintenanceLog {
  id: string;
  logCode: string; // RCSGRZ... ZXSGRZ... QTSGRZ...
  logDate: string;
  projectId: string;
  projectName: string;
  projectNature: '日常养护' | '专项养护' | '其他养护';
  roadSection: string;
  responsible: string;
  teamName: string;
  weather: string;
  temperature: string;
  windStatus: string;
  submitter: string;
  status: '编制中' | '待确认' | '已确认' | '驳回';
  startTime: string; // e.g., '08:30'
  endTime: string; // e.g., '11:45'
  closureType: '无需封道' | '一类封道' | '二类封道' | '三类封道';
  constructionDesc: string; // 施工说明
  notes: string; // 施工记事
  rejectedReason?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  contents: {
    itemId: string;
    itemName: string;
    unit: string;
    unitPrice: number;
    completedQty: number; // calculated from input
    outputValue: number;  // completedQty * price
  }[];
  createdAt: string;
}

// 1. Initial Projects Data categorized by "Project Nature" (日常养护 / 专项养护 / 其他养护)
const LOG_PROJECTS: DetailedProject[] = [
  {
    id: 'lp-1',
    name: '杭徽高速日常路面养护',
    responsible: '张二河',
    roadSections: ['K12+000 - K28+500 上行', 'K15+300 - K32+100 下行'],
    teamName: '中分带日常组',
    nature: '日常养护',
    items: [
      { id: 'li-1-1', itemCode: 'QD-01', itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)', unit: 'm³', unitPrice: 850, designQty: 1200 },
      { id: 'li-1-2', itemCode: 'QD-02', itemName: '微表处MS-3乳化沥青稀浆罩面', unit: '㎡', unitPrice: 28, designQty: 45000 },
      { id: 'li-1-3', itemCode: 'QD-03', itemName: '路面裂缝高聚物灌缝(改性沥青)', unit: 'm', unitPrice: 15, designQty: 18000 },
      { id: 'li-1-4', itemCode: 'QD-04', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, designQty: 50000 }
    ]
  },
  {
    id: 'lp-2',
    name: '沪杭甬高速中分带绿化日常整修',
    responsible: '李春风',
    roadSections: ['K0+000 - K50+000 全路段'],
    teamName: '日常绿化班组',
    nature: '日常养护',
    items: [
      { id: 'li-2-1', itemCode: 'QD-05', itemName: '日常机械修剪绿化带', unit: 'km', unitPrice: 1200, designQty: 350 },
      { id: 'li-2-2', itemCode: 'QD-06', itemName: '人工清扫保洁及垃圾清掏', unit: '工日', unitPrice: 180, designQty: 1200 }
    ]
  },
  {
    id: 'lp-3',
    name: '上海方向特定段护栏升级专项工程',
    responsible: '王建国',
    roadSections: ['K101+500 - K105+200'],
    teamName: '应急排障组',
    nature: '专项养护',
    items: [
      { id: 'li-3-1', itemCode: 'QD-07', itemName: 'GR-SB-3E三波形梁钢护栏特殊更换', unit: '米', unitPrice: 380, designQty: 2000 },
      { id: 'li-3-2', itemCode: 'QD-08', itemName: '防阻块及托架更新增强', unit: '个', unitPrice: 45, designQty: 1500 }
    ]
  },
  {
    id: 'lp-4',
    name: '沪深高速桥体裂缝高边坡安全支护其他工程',
    responsible: '徐铁兵',
    roadSections: ['K202+100 - K205+900 全路段'],
    teamName: '特种工程维护组',
    nature: '其他养护',
    items: [
      { id: 'li-4-1', itemCode: 'QD-09', itemName: '特种边坡主动格栅网加固', unit: '㎡', unitPrice: 165, designQty: 8000 },
      { id: 'li-4-2', itemCode: 'QD-10', itemName: '裂缝封堵环氧胶泥灌注', unit: 'kg', unitPrice: 85, designQty: 1200 }
    ]
  }
];

// 2. Initial Logs Data
const INITIAL_DAILY_LOGS: MaintenanceLog[] = [
  {
    id: 'mlog-1',
    logCode: 'RCSGRZ260610001',
    logDate: '2026-06-10',
    projectId: 'lp-1',
    projectName: '杭徽高速日常路面养护',
    projectNature: '日常养护',
    roadSection: 'K12+000 - K28+500 上行',
    responsible: '张二河',
    teamName: '中分带日常组',
    weather: '晴转多云',
    temperature: '28℃ ~ 34℃',
    windStatus: '东风微风',
    submitter: '张二河',
    status: '已确认',
    startTime: '08:30',
    endTime: '12:00',
    closureType: '二类封道',
    constructionDesc: '例常道路铣刨并灌封处理。现场严格按照道路管制标准放设路标，配派了安全员全程把控。',
    notes: '早上10点天气较热，给班组分发了防暑饮品，工作平稳进行。',
    beforePhotos: ['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop'],
    afterPhotos: ['https://images.unsplash.com/photo-1581094288338-2314dddb7eed?q=80&w=600&auto=format&fit=crop'],
    contents: [
      { itemId: 'li-1-1', itemName: 'AC-13C细粒式沥青混凝土路面铺筑 (修补)', unit: 'm³', unitPrice: 850, completedQty: 12, outputValue: 10200 },
      { itemId: 'li-1-4', itemName: '旧路面冷铣刨 (厚度4cm)', unit: '㎡', unitPrice: 12, completedQty: 300, outputValue: 3600 }
    ],
    createdAt: '2026-06-10 17:00'
  },
  {
    id: 'mlog-2',
    logCode: 'ZXSGRZ260609001',
    logDate: '2026-06-09',
    projectId: 'lp-3',
    projectName: '上海方向特定段护栏升级专项工程',
    projectNature: '专项养护',
    roadSection: 'K101+500 - K105+200',
    responsible: '王建国',
    teamName: '应急排障组',
    weather: '阴天',
    temperature: '22℃ ~ 26℃',
    windStatus: '北风3-4级',
    submitter: '王建国',
    status: '待确认',
    startTime: '09:00',
    endTime: '15:30',
    closureType: '一类封道',
    constructionDesc: '对损耗严重的路段进行钢护栏彻底拆换，提升沪向段防撞等级。',
    notes: '该路段由于车速快，安全指挥车始终保持警报提示。',
    beforePhotos: [],
    afterPhotos: [],
    contents: [
      { itemId: 'li-3-1', itemName: 'GR-SB-3E三波形梁钢护栏特殊更换', unit: '米', unitPrice: 380, completedQty: 15, outputValue: 5700 }
    ],
    createdAt: '2026-06-09 16:30'
  },
  {
    id: 'mlog-3',
    logCode: 'QTSGRZ260608001',
    logDate: '2026-06-08',
    projectId: 'lp-4',
    projectName: '沪深高速桥体裂缝高边坡安全支护其他工程',
    projectNature: '其他养护',
    roadSection: 'K202+100 - K205+900 全路段',
    responsible: '徐铁兵',
    teamName: '特种工程维护组',
    weather: '烈日',
    temperature: '31℃ ~ 36℃',
    windStatus: '无持续风向',
    submitter: '张二河', // Created by Zhang Erhe
    status: '编制中',
    startTime: '08:00',
    endTime: '11:00',
    closureType: '无需封道',
    constructionDesc: '用环氧对边角和边坡局部网层进行抹平，属于巡检后的应急辅助工程。',
    notes: '由于气温极为炎热，中午提前收工避暑。',
    beforePhotos: [],
    afterPhotos: [],
    contents: [
      { itemId: 'li-4-2', itemName: '裂缝封堵环氧胶泥灌注', unit: 'kg', unitPrice: 85, completedQty: 8, outputValue: 680 }
    ],
    createdAt: '2026-06-08 14:15'
  },
  {
    id: 'mlog-4',
    logCode: 'RCSGRZ260607001',
    logDate: '2026-06-07',
    projectId: 'lp-2',
    projectName: '沪杭甬高速中分带绿化日常整修',
    projectNature: '日常养护',
    roadSection: 'K0+000 - K50+000 全路段',
    responsible: '李春风',
    teamName: '日常绿化班组',
    weather: '雷阵雨',
    temperature: '24℃ ~ 29℃',
    windStatus: '西北风4级',
    submitter: '李春风',
    status: '驳回',
    startTime: '08:30',
    endTime: '10:15',
    closureType: '三类封道',
    constructionDesc: '保洁清扫和日常剪裁。由于中途突降暴雨，为了现场人员安全，施工暂时中止。',
    notes: '雨势太大，工人都已安全撤离回返。',
    rejectedReason: '填报的今日完成量与本日产值有异议，需复核机械修剪公里数是否多记，重新复核后提交。',
    beforePhotos: [],
    afterPhotos: [],
    contents: [
      { itemId: 'li-2-1', itemName: '日常机械修剪绿化带', unit: 'km', unitPrice: 1200, completedQty: 1.5, outputValue: 1800 }
    ],
    createdAt: '2026-06-07 11:30'
  }
];

export default function MaintenanceConstructionLog() {
  const [logs, setLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('MAINTENANCE_LOGS_DATA');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('MAINTENANCE_LOGS_DATA', JSON.stringify(logs));
  }, [logs]);

  // 1. Search Criteria States
  const [searchCreator, setSearchCreator] = useState<'all' | 'mine'>('all'); // all vs mine (张二河)
  const [searchProjectId, setSearchProjectId] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');

  // 2. Navigation Mode
  // 'list' | 'view' | 'create' | 'edit' (which could be editing draft or revision on confirmed)
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  const [currentSelectedLog, setCurrentSelectedLog] = useState<MaintenanceLog | null>(null);
  const [isRevisionMode, setIsRevisionMode] = useState(false); // revision edit for confirmed logs

  // 3. Confirm Modal for Approvers
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [logToConfirm, setLogToConfirm] = useState<MaintenanceLog | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'pass' | 'reject'>('pass');
  const [rejectReason, setRejectReason] = useState<string>('');

  // 4. Form States for creating/editing construction log
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('2026-06-14');
  const [formStartTime, setFormStartTime] = useState<string>('08:00');
  const [formEndTime, setFormEndTime] = useState<string>('12:00');
  const [formRoadSection, setFormRoadSection] = useState<string>('');
  const [formClosureType, setFormClosureType] = useState<MaintenanceLog['closureType']>('无需封道');
  const [formConstructionDesc, setFormConstructionDesc] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formWeather, setFormWeather] = useState<string>('晴天');
  const [formTemperature, setFormTemperature] = useState<string>('26℃ ~ 32℃');
  const [formWind, setFormWind] = useState<string>('北风微风');
  
  // Custom mock upload image links
  const [formBeforePhotos, setFormBeforePhotos] = useState<string[]>([]);
  const [formAfterPhotos, setFormAfterPhotos] = useState<string[]>([]);

  // Item completed quantities representation
  const [formItemQuantities, setFormItemQuantities] = useState<Record<string, number>>({});
  const [formItemInputModes, setFormItemInputModes] = useState<Record<string, 'absolute' | 'percentage'>>({});
  const [formItemPercentages, setFormItemPercentages] = useState<Record<string, string>>({});

  // Reset form helper
  const resetFormState = () => {
    setFormProjectId('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStartTime('08:30');
    setFormEndTime('12:00');
    setFormRoadSection('');
    setFormClosureType('无需封道');
    setFormConstructionDesc('');
    setFormNotes('');
    setFormWeather('晴天');
    setFormTemperature('27℃ ~ 33℃');
    setFormWind('北风微风');
    setFormBeforePhotos([]);
    setFormAfterPhotos([]);
    setFormItemQuantities({});
    setFormItemInputModes({});
    setFormItemPercentages({});
    setIsRevisionMode(false);
  };

  // Switch between actual numeric or percentage
  const handleToggleInputMode = (itemId: string, mode: 'absolute' | 'percentage', designQty: number) => {
    setFormItemInputModes(prev => ({ ...prev, [itemId]: mode }));
    if (mode === 'percentage') {
      const currentQty = formItemQuantities[itemId] || 0;
      const pctValue = ((currentQty / designQty) * 100).toFixed(2);
      setFormItemPercentages(prev => ({
        ...prev,
        [itemId]: parseFloat(pctValue) <= 0 ? '' : pctValue
      }));
    }
  };

  const handleQtyChange = (itemId: string, val: string) => {
    const parsed = parseFloat(val) || 0;
    setFormItemQuantities(prev => ({ ...prev, [itemId]: parsed }));
  };

  const handlePctChange = (itemId: string, val: string, designQty: number) => {
    setFormItemPercentages(prev => ({ ...prev, [itemId]: val }));
    const pct = parseFloat(val) || 0;
    const computed = parseFloat(((pct / 100) * designQty).toFixed(4));
    setFormItemQuantities(prev => ({ ...prev, [itemId]: computed }));
  };

  // Choose a project in form, auto-fill sections and empty quantitites
  const handleSelectProject = (projId: string) => {
    setFormProjectId(projId);
    const selected = LOG_PROJECTS.find(p => p.id === projId);
    if (selected) {
      setFormRoadSection(selected.roadSections[0] || '');
      const defaultQtys: Record<string, number> = {};
      selected.items.forEach(it => {
        defaultQtys[it.id] = 0;
      });
      setFormItemQuantities(defaultQtys);
    }
  };

  // Sync photo links mock uploads
  const triggerPhotoUpload = (type: 'before' | 'after') => {
    const urls = [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581094288338-2314dddb7eed?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop'
    ];
    const picked = urls[Math.floor(Math.random() * urls.length)];
    if (type === 'before') {
      setFormBeforePhotos(prev => [...prev, picked]);
    } else {
      setFormAfterPhotos(prev => [...prev, picked]);
    }
  };

  // Generate automated serial number bill code based on nature & date
  const generateSerialNo = (nature: DetailedProject['nature'], dateStr: string): string => {
    let prefix = 'RCSGRZ';
    if (nature === '专项养护') prefix = 'ZXSGRZ';
    else if (nature === '其他养护') prefix = 'QTSGRZ';

    const cleanDate = dateStr.replace(/-/g, '').slice(2); // e.g. 260610
    // find count of logs on this same nature & date to generate sequential number
    const sameCount = logs.filter(l => l.projectNature === nature && l.logDate === dateStr).length;
    const serial = String(sameCount + 1).padStart(3, '0');
    return `${prefix}${cleanDate}${serial}`;
  };

  // Get total completed output value of current form items
  const getFormOutputVal = () => {
    const proj = LOG_PROJECTS.find(p => p.id === formProjectId);
    if (!proj) return 0;
    return proj.items.reduce((sum, item) => {
      const q = formItemQuantities[item.id] || 0;
      return sum + (q * item.unitPrice);
    }, 0);
  };

  // Save / Submit creation or edits
  const handleSaveForm = (asDraft: boolean) => {
    if (!formProjectId) {
      alert('请选择施工项目');
      return;
    }
    const proj = LOG_PROJECTS.find(p => p.id === formProjectId)!;

    // Check duplicate logic: 当日施工项目已创建日志，不能重复创建！(exclude current log when editing)
    const isEditing = viewMode === 'edit' && currentSelectedLog;
    const isSameProjAndDateExists = logs.some(l => 
      l.projectId === formProjectId && 
      l.logDate === formDate && 
      (!isEditing || l.id !== currentSelectedLog?.id)
    );

    if (isSameProjAndDateExists) {
      alert(`该项目已创建当日(${formDate})施工日志，请温和查阅或更新，请勿重复创建！`);
      return;
    }

    // Compile items content list
    const contents = proj.items.map(it => {
      const q = formItemQuantities[it.id] || 0;
      return {
        itemId: it.id,
        itemName: it.itemName,
        unit: it.unit,
        unitPrice: it.unitPrice,
        completedQty: q,
        outputValue: q * it.unitPrice
      };
    }).filter(c => c.completedQty > 0 || asDraft); // drafts keep empty, finalized require at least something usually but allow drafts

    const statusVal: MaintenanceLog['status'] = asDraft 
      ? '编制中' 
      : (isRevisionMode ? '已确认' : '待确认');

    // Confirm warning when editing under "待确认" state
    if (isEditing && currentSelectedLog?.status === '待确认' && !asDraft) {
      const rePush = window.confirm('此日志当前处于待确认审核状态，重新编辑提交后将重新推送供确认人重新查核，是否继续？');
      if (!rePush) return;
    }

    // Check race condition mock: if in background the log is confirmed
    if (isEditing && currentSelectedLog?.id) {
      const currentRealStatus = logs.find(l => l.id === currentSelectedLog.id)?.status;
      if (currentRealStatus === '已确认' && !isRevisionMode) {
        alert('警告：在您编辑期间，该施工日志已被确认，系统当前拒绝您的普通修改，请使用【修订】功能重新修正！');
        return;
      }
    }

    if (isEditing && currentSelectedLog) {
      // Update existing item
      const updatedLog: MaintenanceLog = {
        ...currentSelectedLog,
        logDate: formDate,
        projectId: formProjectId,
        projectName: proj.name,
        projectNature: proj.nature,
        roadSection: formRoadSection,
        weather: formWeather,
        temperature: formTemperature,
        windStatus: formWind,
        status: statusVal,
        startTime: formStartTime,
        endTime: formEndTime,
        closureType: formClosureType,
        constructionDesc: formConstructionDesc,
        notes: formNotes,
        beforePhotos: formBeforePhotos,
        afterPhotos: formAfterPhotos,
        contents,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };

      setLogs(prev => prev.map(l => l.id === currentSelectedLog.id ? updatedLog : l));
    } else {
      // Create new record
      const serial = generateSerialNo(proj.nature, formDate);
      const newLog: MaintenanceLog = {
        id: `mlog-${Date.now()}`,
        logCode: serial,
        logDate: formDate,
        projectId: formProjectId,
        projectName: proj.name,
        projectNature: proj.nature,
        roadSection: formRoadSection,
        responsible: proj.responsible,
        teamName: proj.teamName,
        weather: formWeather,
        temperature: formTemperature,
        windStatus: formWind,
        submitter: '张二河', // Standard current submitter
        status: statusVal,
        startTime: formStartTime,
        endTime: formEndTime,
        closureType: formClosureType,
        constructionDesc: formConstructionDesc,
        notes: formNotes,
        beforePhotos: formBeforePhotos,
        afterPhotos: formAfterPhotos,
        contents,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };

      setLogs(prev => [newLog, ...prev]);
    }

    setViewMode('list');
    resetFormState();
  };

  // Perform deletion of logs
  const handleDeleteLog = (log: MaintenanceLog) => {
    if (log.status === '待确认') {
      const confirmDel = window.confirm(`此日志单号[${log.logCode}]处于等确认审核流程中。点击确定后，将取消该条报送，该日志已从消息反馈中同步消除。确定删除吗？`);
      if (!confirmDel) return;
    } else {
      const confirmDel = window.confirm(`您确定要彻底删除该篇日志吗？日志编号：[${log.logCode}]，删除后无法恢复。`);
      if (!confirmDel) return;
    }
    setLogs(prev => prev.filter(l => l.id !== log.id));
  };

  // Approve or reject submission logic
  const handlePerformConfirmation = () => {
    if (!logToConfirm) return;

    const targetStatus = confirmStatus === 'pass' ? '已确认' : '驳回';
    setLogs(prev => prev.map(l => {
      if (l.id === logToConfirm.id) {
        return {
          ...l,
          status: targetStatus,
          rejectedReason: confirmStatus === 'reject' ? rejectReason : undefined
        };
      }
      return l;
    }));

    setShowConfirmModal(false);
    setLogToConfirm(null);
    setRejectReason('');
  };

  // Trigger setup for editing log
  const startEditLog = (log: MaintenanceLog, forceRevision = false) => {
    setCurrentSelectedLog(log);
    setIsRevisionMode(forceRevision);
    setFormProjectId(log.projectId);
    setFormDate(log.logDate);
    setFormStartTime(log.startTime || '08:30');
    setFormEndTime(log.endTime || '12:00');
    setFormRoadSection(log.roadSection);
    setFormClosureType(log.closureType || '无需封道');
    setFormConstructionDesc(log.constructionDesc || '');
    setFormNotes(log.notes || '');
    setFormWeather(log.weather);
    setFormTemperature(log.temperature);
    setFormWind(log.windStatus);
    setFormBeforePhotos(log.beforePhotos || []);
    setFormAfterPhotos(log.afterPhotos || []);

    // Set item quantities
    const qtys: Record<string, number> = {};
    const mockProj = LOG_PROJECTS.find(p => p.id === log.projectId);
    if (mockProj) {
      mockProj.items.forEach(it => {
        const found = log.contents.find(c => c.itemId === it.id);
        qtys[it.id] = found ? found.completedQty : 0;
      });
    }
    setFormItemQuantities(qtys);
    setFormItemInputModes({});
    setFormItemPercentages({});

    setViewMode('edit');
  };

  // Reset filtering options
  const handleResetSearch = () => {
    setSearchCreator('all');
    setSearchProjectId('');
    setSearchStartDate('');
    setSearchEndDate('');
  };

  // Filtering implementation
  const filteredLogs = logs.filter(l => {
    // 1. Creator scope
    if (searchCreator === 'mine' && l.submitter !== '张二河') {
      return false;
    }
    // 2. Project ID filter
    if (searchProjectId && l.projectId !== searchProjectId) {
      return false;
    }
    // 3. Date constraint
    if (searchStartDate && l.logDate < searchStartDate) {
      return false;
    }
    if (searchEndDate && l.logDate > searchEndDate) {
      return false;
    }
    return true;
  });

  // Calculate sum counts
  const totalFinishedOutputValueCalculated = logs
    .filter(l => l.status === '已确认')
    .reduce((val, l) => val + l.contents.reduce((inSum, item) => inSum + item.outputValue, 0), 0);

  return (
    <div className="space-y-6 select-none bg-slate-50/50 min-h-screen pb-14">
      {/* 1. TOP BREADCRUMB HEADER PANEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-xs border border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-teal-50 text-teal-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">进度管理</span>
            <span className="text-slate-300">/</span>
            <span className="bg-teal-50 text-teal-650 text-[10px] px-2.5 py-0.5 rounded-full font-bold">养护施工</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 text-[10px] font-semibold">日常养护日常管理</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="text-teal-600" size={20} />
            日常养护施工日志
          </h1>
          <p className="text-xs text-slate-450 mt-1">
            实时汇总登记项目部日常养护日志状况，支持实际数值跟百分比双模录入进度，系统全自动化核算分项工程本日产值流转审批。
          </p>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={() => {
              resetFormState();
              setViewMode('create');
            }}
            id="btn-add-brand-log"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            填报施工日志
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==================== PANEL 1: MAIN LISTING MODULE ==================== */}
        {viewMode === 'list' && (
          <motion.div
            key="list-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* SEARCH CRITERIA CONSOLE */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-3.5 bg-teal-600 rounded-xs"></span>
                  条件检索筛选
                </span>
                <span className="text-[10px] text-slate-400 font-medium">您可以根据编制人、项目范围或施工日期区间精确排查</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Filter 1: Submitter choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">编制人范围 (单选)</label>
                  <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSearchCreator('all')}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                        searchCreator === 'all'
                          ? 'bg-white text-teal-600 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      全部日志
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchCreator('mine')}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                        searchCreator === 'mine'
                          ? 'bg-white text-teal-600 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      由我填报的日志
                    </button>
                  </div>
                </div>

                {/* Filter 2: Project Choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">挑选关联项目 (可快速搜索)</label>
                  <select
                    value={searchProjectId}
                    onChange={(e) => setSearchProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg text-xs p-1.5 select-none outline-none font-medium text-slate-600"
                  >
                    <option value="">-- 全部项目部养护工程 --</option>
                    {LOG_PROJECTS.map(p => (
                      <option key={p.id} value={p.id}>({p.nature}) {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter 3: Date Range Start */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">起始施工日期</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={searchStartDate}
                      onChange={(e) => setSearchStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg text-xs p-1.5 outline-none font-mono font-medium text-slate-600"
                    />
                  </div>
                </div>

                {/* Filter 4: Date Range End */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">截至施工日期</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={searchEndDate}
                      onChange={(e) => setSearchEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg text-xs p-1.5 outline-none font-mono font-medium text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Reset/Search triggers */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400">
                  当前累计确认产值: <span className="font-mono text-xs font-black text-teal-600">¥{totalFinishedOutputValueCalculated.toLocaleString()}</span> 元
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSearch}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    title="重置全部筛选条件"
                  >
                    <RotateCcw size={12} />
                    重置
                  </button>
                  <div className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold rounded-lg cursor-default">
                    共检索到 <span className="font-mono font-black">{filteredLogs.length}</span> 篇施工日志
                  </div>
                </div>
              </div>
            </div>

            {/* LOGS LISTING TABLE VIEW */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-3xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 font-bold">
                      <th className="p-3.5 text-center w-12">序号</th>
                      <th className="p-3.5">单据编号</th>
                      <th className="p-3.5">施工日期</th>
                      <th className="p-3.5">关联项目</th>
                      <th className="p-3.5 text-right">本日完成产值 (元)</th>
                      <th className="p-3.5 text-center">编制人</th>
                      <th className="p-3.5">最后定稿日期</th>
                      <th className="p-3.5 text-center w-24">流程状态</th>
                      <th className="p-3.5 text-center w-52">管理操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-slate-400">
                          <FolderOpen size={36} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-medium">暂无符合检索条件的养护施工日志记录</p>
                          <p className="text-[10px] text-slate-400 mt-1">您可以通过点击右上角“填报施工日志”全新添加一笔</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => {
                        // Calculate total output value of daily contents
                        const logTotalVal = log.contents.reduce((sum, item) => sum + item.outputValue, 0);

                        return (
                          <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                            <td className="p-3.5 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                            <td className="p-3.5">
                              <div className="flex flex-col">
                                <span className="font-mono font-black text-slate-800">{log.logCode}</span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                                  类型: <strong className="text-teal-600">{log.projectNature}</strong>
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-500 font-semibold">{log.logDate}</td>
                            <td className="p-3.5">
                              <div className="max-w-[190px] truncate" title={log.projectName}>
                                <div className="font-bold text-slate-700 truncate">{log.projectName}</div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <MapPin size={9} className="text-slate-350" />
                                  <span>{log.roadSection}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-800 font-extrabold">
                              ¥{logTotalVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-center font-medium pr-4">{log.submitter}</td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">{log.createdAt}</td>
                            <td className="p-3.5 text-center">
                              {log.status === '编制中' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">编制中</span>
                              )}
                              {log.status === '待确认' && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[10px] font-extrabold">待确认</span>
                              )}
                              {log.status === '已确认' && (
                                <span className="px-2 py-0.5 bg-teal-50 text-teal-600 border border-teal-200 rounded text-[10px] font-extrabold flex items-center justify-center gap-0.5 mx-auto w-fit">
                                  <Check size={10} className="stroke-[3]" /> 已确认
                                </span>
                              )}
                              {log.status === '驳回' && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-extrabold" title={log.rejectedReason}>已驳回</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* VIEW BUTTON */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentSelectedLog(log);
                                    setViewMode('view');
                                  }}
                                  className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
                                  title="查看施工日志详情"
                                >
                                  <Eye size={14} />
                                </button>

                                {/* EDIT BUTTON (Only for 编制中, 待确认, 驳回) */}
                                {(log.status === '编制中' || log.status === '待确认' || log.status === '驳回') ? (
                                  <button
                                    type="button"
                                    onClick={() => startEditLog(log, false)}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                    title="在线编辑修改日志"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                ) : (
                                  <span className="p-1 text-slate-200 cursor-not-allowed" title="已确认无法常规编辑">
                                    <Edit3 size={14} />
                                  </span>
                                )}

                                {/* CONFIRM BUTTON ROLE (Only for 待确认) */}
                                {log.status === '待确认' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLogToConfirm(log);
                                      setConfirmStatus('pass');
                                      setRejectReason('');
                                      setShowConfirmModal(true);
                                    }}
                                    className="px-1.5 py-0.5 border border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white rounded text-[10px] font-bold transition-all"
                                    title="审核并确认此日志"
                                  >
                                    业务确认
                                  </button>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-slate-200 border border-slate-100 rounded text-[10px] cursor-not-allowed">
                                    审核
                                  </span>
                                )}

                                {/* REVISE BUTTON (Only for 已确认 state) */}
                                {log.status === '已确认' ? (
                                  <button
                                    type="button"
                                    onClick={() => startEditLog(log, true)}
                                    className="px-1.5 py-0.5 border border-purple-200 text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded text-[10px] font-bold transition-all"
                                    title="对其进行工程量增补或修订"
                                  >
                                    日志修订
                                  </button>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-slate-200 border border-slate-100 rounded text-[10px] cursor-not-allowed">
                                    修订
                                  </span>
                                )}

                                {/* DELETE BUTTON (Only for 编制中, 待确认, 驳回) */}
                                {(log.status === '编制中' || log.status === '待确认' || log.status === '驳回') ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLog(log)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="删除该条日志"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <span className="p-1 text-slate-200 cursor-not-allowed" title="已结算归档，不允许删除">
                                    <Trash2 size={14} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== PANEL 2: DETAIL VIEW DRAWER ==================== */}
        {viewMode === 'view' && currentSelectedLog && (
          <motion.div
            key="view-panel"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="space-y-4"
          >
            {/* Header detail menu */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="h-6 w-[1px] bg-slate-200"></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-400">单号</span>
                    <h2 className="text-md font-extrabold text-slate-800 font-mono leading-none">{currentSelectedLog.logCode}</h2>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 uppercase">
                      {currentSelectedLog.projectNature}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    最后更新时间: {currentSelectedLog.createdAt} | 申报人: {currentSelectedLog.submitter}
                  </p>
                </div>
              </div>

              {/* Status Header Badge details */}
              <div className="flex items-center gap-2">
                {currentSelectedLog.status === '编制中' && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded text-xs font-black">状态：草稿编制中</span>
                )}
                {currentSelectedLog.status === '待确认' && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-black">状态：审核待确认</span>
                )}
                {currentSelectedLog.status === '已确认' && (
                  <span className="px-3 py-1 bg-teal-50 text-teal-600 border border-teal-200 rounded text-xs font-black">状态：审查已确认</span>
                )}
                {currentSelectedLog.status === '驳回' && (
                  <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-black">状态：已被驳回</span>
                )}
              </div>
            </div>

            {/* Rejection Notification panel */}
            {currentSelectedLog.status === '驳回' && currentSelectedLog.rejectedReason && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-2.5 text-rose-800 text-[11px]">
                <AlertCircle className="shrink-0 text-rose-500 mt-0.5" size={15} />
                <div>
                  <strong className="font-bold">审核驳回退回原由：</strong>
                  <span className="italic font-medium">{currentSelectedLog.rejectedReason}</span>
                </div>
              </div>
            )}

            {/* View grid blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column blocks: Basic infos */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Visual Block 1: Basic project info */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-3.5">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                    <span className="w-1 h-3.5 bg-teal-500 rounded-full"></span>
                    1. 施工基本申报信息
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block">施工项目</span>
                      <span className="text-xs font-bold text-slate-700">{currentSelectedLog.projectName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block">施工路段/位置</span>
                      <span className="text-xs font-bold text-slate-700">{currentSelectedLog.roadSection}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block">施工日期 / 作业时间</span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {currentSelectedLog.logDate} &nbsp; ({currentSelectedLog.startTime || '---'} ~ {currentSelectedLog.endTime || '---'})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block">封闭类型 (交安管段)</span>
                      <span className="text-xs font-bold text-teal-650 bg-teal-50/50 px-2 py-0.5 rounded border border-teal-100 w-fit">
                        {currentSelectedLog.closureType || '无需封道'}
                      </span>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block">施工情况说明</span>
                      <p className="text-xs text-slate-650 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {currentSelectedLog.constructionDesc || '无详细填报说明。'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Block 2: Detailed Quantity check */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 ">
                      <span className="w-1 h-3.5 bg-teal-500 rounded-full"></span>
                      2. 完成清单内容及工程量明细
                    </h3>
                    <span className="text-[10px] text-slate-400 font-black">
                      本日申报产值小计：
                      <strong className="text-emerald-600 font-mono text-xs">
                        ¥{currentSelectedLog.contents.reduce((sm, i) => sm + i.outputValue, 0).toLocaleString()}
                      </strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                          <th className="p-2.5">清单名目</th>
                          <th className="p-2.5 text-right">综合单价</th>
                          <th className="p-2.5 text-right font-semibold text-teal-600">本日完成申报</th>
                          <th className="p-2.5 text-center">工程单位</th>
                          <th className="p-2.5 text-right pr-4">核算产值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSelectedLog.contents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                              当日未上报任何清单量，为零工或空白施工记录
                            </td>
                          </tr>
                        ) : (
                          currentSelectedLog.contents.map((item) => (
                            <tr key={item.itemId} className="border-b border-slate-50 hover:bg-slate-50/20">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-700">{item.itemName}</span>
                              </td>
                              <td className="p-2.5 text-right text-slate-400 font-mono">¥{item.unitPrice.toFixed(2)}</td>
                              <td className="p-2.5 text-right text-emerald-600 font-mono font-black">{item.completedQty}</td>
                              <td className="p-2.5 text-center text-slate-500">{item.unit}</td>
                              <td className="p-2.5 text-right text-slate-800 font-mono font-extrabold pr-4">
                                ¥{item.outputValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column blocks: Side notes and photos */}
              <div className="space-y-4">
                {/* Side block 1: Weather check */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100/50 pb-1.5">
                    天气与环境监控
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100/50 text-center">
                      <span className="text-[9px] text-slate-400 font-bold block">气象状况</span>
                      <span className="font-semibold text-slate-700">{currentSelectedLog.weather}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100/50 text-center">
                      <span className="text-[9px] text-slate-400 font-bold block">温差起落</span>
                      <span className="font-semibold text-slate-700">{currentSelectedLog.temperature}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100/50 text-center col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold block">风向级别</span>
                      <span className="font-semibold text-slate-700">{currentSelectedLog.windStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Side block 2: Photos preview */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100/50 pb-1.5">
                    其他记事与现场媒介
                  </h3>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">施工日志记事</span>
                    <p className="text-slate-600 text-xs bg-amber-50/20 p-2.5 rounded border border-amber-100/40 italic">
                      "{currentSelectedLog.notes || '当日暂无特殊记事备注'}"
                    </p>
                  </div>

                  {/* Photos list view */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold block">施工前照片 ({currentSelectedLog.beforePhotos.length})</span>
                    <div className="grid grid-cols-3 gap-1">
                      {currentSelectedLog.beforePhotos.length === 0 ? (
                        <div className="col-span-3 text-[10px] bg-slate-50 text-slate-400 text-center py-2.0 border border-dashed border-slate-250 rounded">
                          无施工前照片上传
                        </div>
                      ) : (
                        currentSelectedLog.beforePhotos.map((url, i) => (
                          <img key={i} src={url} alt="施工前" className="h-14 w-full object-cover rounded border border-slate-100 referrerPolicy='no-referrer'" />
                        ))
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-bold block pt-1">施工后成果照片 ({currentSelectedLog.afterPhotos.length})</span>
                    <div className="grid grid-cols-3 gap-1">
                      {currentSelectedLog.afterPhotos.length === 0 ? (
                        <div className="col-span-3 text-[10px] bg-slate-50 text-slate-400 text-center py-2.0 border border-dashed border-slate-250 rounded">
                          无施工后照片上传
                        </div>
                      ) : (
                        currentSelectedLog.afterPhotos.map((url, i) => (
                          <img key={i} src={url} alt="施工后" className="h-14 w-full object-cover rounded border border-slate-100 referrerPolicy='no-referrer'" />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Back controls */}
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="w-full text-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  返回施工日志列表
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== PANEL 3: CREATE / EDIT WORKSPACE ==================== */}
        {(viewMode === 'create' || (viewMode === 'edit' && currentSelectedLog)) && (
          <motion.div
            key="compose-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5"
          >
            {/* Header controls for compose workspace */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('您确定要放弃并返回吗？当前已修改的内容不会被保存。')) {
                      setViewMode('list');
                      resetFormState();
                    }
                  }}
                  className="p-1 px-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded transition-all flex items-center gap-1 cursor-pointer text-xs"
                >
                  <ArrowLeft size={13} />
                  放弃并返回
                </button>
                <div className="h-4 w-[1px] bg-slate-200"></div>
                <h2 className="text-sm font-black text-slate-800">
                  {viewMode === 'create' ? '正在新建日常现场养护日志' : isRevisionMode ? `正在修订 confirmed 施工日志 - ${currentSelectedLog?.logCode}` : `编辑施工日志 - ${currentSelectedLog?.logCode}`}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveForm(true)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  暂存草稿
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(false)}
                  className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Send size={12} />
                  {isRevisionMode ? '确认修订并发布' : '确认提交施工日志'}
                </button>
              </div>
            </div>

            {/* Compose Section details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Central Section Form sheets */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* 1. STATE BLOCK:施工信息 */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-4">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                    <span className="w-1.5 h-3 bg-teal-600 rounded-sm"></span>
                    1. 施工基本申报信息
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project choose dropdown */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        施工项目 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formProjectId}
                        onChange={(e) => handleSelectProject(e.target.value)}
                        disabled={viewMode === 'edit'} // Lock project when editing for extreme layout safety
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-2 text-xs select-none outline-none font-medium text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">-- 请选择要填报的施工项目 --</option>
                        {LOG_PROJECTS.map(p => (
                          <option key={p.id} value={p.id}>({p.nature}) {p.name}</option>
                        ))}
                      </select>
                      {formProjectId && (
                        <div className="text-[9px] text-teal-600 font-bold">
                          该项目属性: 【{LOG_PROJECTS.find(p => p.id === formProjectId)?.nature}】，编号系统将采用【
                          {LOG_PROJECTS.find(p => p.id === formProjectId)?.nature === '日常养护' ? 'RCSGRZ' : LOG_PROJECTS.find(p => p.id === formProjectId)?.nature === '专项养护' ? 'ZXSGRZ' : 'QTSGRZ'}
                          】前缀
                        </div>
                      )}
                    </div>

                    {/* Route information */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        施工路线/具体路段 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formRoadSection}
                        onChange={(e) => setFormRoadSection(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-2 text-xs select-none outline-none font-medium text-slate-600"
                      >
                        <option value="">-- 请选择对应维护路段 --</option>
                        {formProjectId && LOG_PROJECTS.find(p => p.id === formProjectId)?.roadSections.map(rs => (
                          <option key={rs} value={rs}>{rs}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date choice */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        施工日期 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1.5 text-xs outline-none font-mono font-bold text-slate-600"
                      />
                    </div>

                    {/* Start time & End Time */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        施工起止时间 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formStartTime}
                          placeholder="08:30"
                          onChange={(e) => setFormStartTime(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1 text-xs text-center font-mono placeholder-slate-350 outline-none"
                        />
                        <span className="text-[11px] text-slate-350">至</span>
                        <input
                          type="text"
                          value={formEndTime}
                          placeholder="12:00"
                          onChange={(e) => setFormEndTime(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1 text-xs text-center font-mono placeholder-slate-350 outline-none"
                        />
                      </div>
                    </div>

                    {/* Closure Type */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        封道管制类型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formClosureType}
                        onChange={(e) => setFormClosureType(e.target.value as MaintenanceLog['closureType'])}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-2 text-xs select-none outline-none font-medium text-slate-600"
                      >
                        <option value="无需封道">无需封道</option>
                        <option value="一类封道">一类封道</option>
                        <option value="二类封道">二类封道</option>
                        <option value="三类封道">三类封道</option>
                      </select>
                    </div>

                    {/* Sub Description */}
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">施工图文说明与内容概述</label>
                      <textarea
                        rows={2}
                        value={formConstructionDesc}
                        onChange={(e) => setFormConstructionDesc(e.target.value)}
                        placeholder="请输入该日施工路段主要实施内容、现场工艺管控交代..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-2.5 text-xs outline-none placeholder-slate-350"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. DYNAMIC QUANTITIES:完成清单内容及工程量维护 */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 ">
                      <span className="w-1.5 h-3 bg-teal-600 rounded-sm"></span>
                      2. 二次施工内容及工程量维护
                    </h3>
                    {formProjectId && (
                      <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-black">
                        此路段挂钩子目清单，请核定本日量
                      </span>
                    )}
                  </div>

                  {!formProjectId ? (
                    <div className="py-8 bg-slate-50/50 rounded-lg text-center border border-dashed border-slate-200 text-slate-400 text-xs">
                      <HelpCircle size={28} className="mx-auto text-slate-300 mb-2" />
                      请先选择上方【施工项目】，系统将在此处展示对应子项的计量清单明细
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 leading-relaxed md:flex items-center justify-between">
                        <span>
                          提示: 清单条目支持 <strong>实际数</strong> 填报，也支持 <strong>百分比填报(%)</strong>。本日产值 = 单价 * 今日完成量。
                        </span>
                        <span className="font-extrabold text-teal-700 font-mono mt-1 md:mt-0 block text-right">
                          今日产值合计: ¥{getFormOutputVal().toLocaleString()}
                        </span>
                      </div>

                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-500">
                              <th className="p-3">清单编码 / 名目</th>
                              <th className="p-3 text-right">名目单价 (元)</th>
                              <th className="p-3 text-right">总设计用量</th>
                              <th className="p-3 text-center w-[210px]">今日完成量申报 (双模支持)</th>
                              <th className="p-3 text-right">单位</th>
                              <th className="p-3 text-right pr-4">本日小计 (元)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {LOG_PROJECTS.find(p => p.id === formProjectId)?.items.map((it) => {
                              const qty = formItemQuantities[it.id] || 0;
                              const value = qty * it.unitPrice;
                              const mode = formItemInputModes[it.id] || 'absolute';

                              return (
                                <tr key={it.id} className="border-b border-slate-50 hover:bg-slate-50/20">
                                  <td className="p-3">
                                    <div className="font-mono font-bold text-slate-400 text-[9px] leading-tight">{it.itemCode}</div>
                                    <div className="font-bold text-slate-700 leading-normal">{it.itemName}</div>
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-500">¥{it.unitPrice.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{it.designQty}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col gap-1 w-full max-w-[190px] mx-auto py-1">
                                      {/* Mode switch switchers */}
                                      <div className="flex p-0.5 bg-slate-100 rounded-md border border-slate-200 select-none text-[9px]">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleInputMode(it.id, 'absolute', it.designQty)}
                                          className={`flex-1 py-0.5 text-center font-bold rounded-sm transition-all ${
                                            mode === 'absolute'
                                              ? 'bg-white text-teal-600 shadow-3xs'
                                              : 'text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          实际数值
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleInputMode(it.id, 'percentage', it.designQty)}
                                          className={`flex-1 py-0.5 text-center font-bold rounded-sm transition-all ${
                                            mode === 'percentage'
                                              ? 'bg-white text-teal-600 shadow-3xs'
                                              : 'text-slate-400 hover:text-slate-700'
                                          }`}
                                        >
                                          百分比填报%
                                        </button>
                                      </div>

                                      {/* Dual input display */}
                                      {mode === 'absolute' ? (
                                        <div className="space-y-1">
                                          <div className="relative flex items-center">
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              placeholder="0"
                                              value={qty || ''}
                                              onChange={(e) => handleQtyChange(it.id, e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-lg py-1 px-2.0 font-mono text-center text-xs font-bold outline-none"
                                            />
                                            <span className="absolute right-1 text-[8.5px] text-slate-400 px-1 bg-slate-50 rounded">
                                              {it.unit}
                                            </span>
                                          </div>
                                          {qty > 0 && (
                                            <div className="text-[8px] text-slate-400 font-mono">
                                              占总进度: <span className="text-teal-600 font-bold">{((qty / it.designQty) * 100).toFixed(3)}%</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="relative flex items-center">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              placeholder="0.0"
                                              value={formItemPercentages[it.id] !== undefined ? formItemPercentages[it.id] : ''}
                                              onChange={(e) => handlePctChange(it.id, e.target.value, it.designQty)}
                                              className="w-full bg-white border border-teal-200 focus:border-teal-500 text-teal-700 rounded-lg py-1 px-2.0 font-mono text-center text-xs font-bold outline-none"
                                            />
                                            <span className="absolute right-1 text-[8.5px] text-teal-600 font-bold px-1.5 bg-teal-50 rounded">
                                              %
                                            </span>
                                          </div>
                                          <div className="text-[8px] text-slate-400 font-mono">
                                            计算量: <span className="text-teal-600 font-bold">{qty.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} {it.unit}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right text-slate-400 font-bold">{it.unit}</td>
                                  <td className="p-3 text-right font-mono font-black text-slate-700 pr-4">
                                    ¥{value.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side metadata form parameters */}
              <div className="space-y-4">
                {/* Weather config parameter */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-1.5">
                    天气与外部作业参数
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">气象状况 (多云/大雨等)</label>
                      <input
                        type="text"
                        value={formWeather}
                        onChange={(e) => setFormWeather(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">现场最高/最低温度</label>
                      <input
                        type="text"
                        value={formTemperature}
                        onChange={(e) => setFormTemperature(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">风速级别说明</label>
                      <input
                        type="text"
                        value={formWind}
                        onChange={(e) => setFormWind(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* notes and visual attachment images */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-1.5">
                    其他日常记事与照片附件
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">其它施工随笔/日志记事</label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="记录班组出场、交安全提示、物资消耗辅助或其它重要杂务记录..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-lg p-2 text-xs outline-none placeholder-slate-350"
                      />
                    </div>

                    {/* image additions */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>施工前照片 ({formBeforePhotos.length})</span>
                        <button
                          type="button"
                          onClick={() => triggerPhotoUpload('before')}
                          className="text-[9px] text-teal-600 hover:text-teal-700 flex items-center gap-0.5 border border-teal-100 px-1 rounded hover:bg-teal-50 transition-all cursor-pointer"
                        >
                          模拟现场拍摄
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {formBeforePhotos.map((url, i) => (
                          <div key={i} className="relative h-10 border border-slate-100 rounded overflow-hidden">
                            <img src={url} alt="前" className="h-full w-full object-cover referrerPolicy='no-referrer'" />
                            <button
                              type="button"
                              onClick={() => setFormBeforePhotos(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0 right-0 bg-red-500/80 text-white rounded-bl p-0.5 shadow cursor-pointer text-[8px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1">
                        <span>修毕完工照 ({formAfterPhotos.length})</span>
                        <button
                          type="button"
                          onClick={() => triggerPhotoUpload('after')}
                          className="text-[9px] text-teal-600 hover:text-teal-700 flex items-center gap-0.5 border border-teal-100 px-1 rounded hover:bg-teal-50 transition-all cursor-pointer"
                        >
                          模拟现场拍摄
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {formAfterPhotos.map((url, i) => (
                          <div key={i} className="relative h-10 border border-slate-100 rounded overflow-hidden">
                            <img src={url} alt="后" className="h-full w-full object-cover referrerPolicy='no-referrer'" />
                            <button
                              type="button"
                              onClick={() => setFormAfterPhotos(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0 right-0 bg-red-500/80 text-white rounded-bl p-0.5 shadow cursor-pointer text-[8px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submitting Actions bottom panel */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-2 text-center">
                  <div className="text-[10px] text-slate-400 mb-1 leading-normal text-left">
                    温馨提示:
                    <br />1. 您可以点击顶部或此处的发布提交确认人审批汇总。
                    <br />2. 常规日志在被业务确认通过前均可以反复修正，若已确认则需“修订”。
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveForm(true)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      暂存草稿
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveForm(false)}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-extrabold transition-all shadow-3xs cursor-pointer"
                    >
                      确认发布提审
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== PANEL 4: APPROVE / REJECT MODAL ==================== */}
      <AnimatePresence>
        {showConfirmModal && logToConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-40 transition-opacity">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md border border-slate-150 p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="text-amber-500" size={17} />
                  日常养护施工日志 · 业务确认
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Description of what is being confirmed */}
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 space-y-1">
                <p>单据编号: <strong className="font-mono text-slate-800">{logToConfirm.logCode}</strong></p>
                <p>施工项目: <strong className="text-slate-700">{logToConfirm.projectName}</strong></p>
                <p>完成产值分摊: <strong className="text-teal-650 font-mono">¥{logToConfirm.contents.reduce((sm, i) => sm + i.outputValue, 0).toLocaleString()}元</strong></p>
                <p>编制人员: <strong className="text-slate-700">{logToConfirm.submitter} ({logToConfirm.logDate})</strong></p>
              </div>

              {/* Choice: 通过 / 驳回 */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-505 block">审核结果</label>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="confirm-status-radio"
                        checked={confirmStatus === 'pass'}
                        onChange={() => setConfirmStatus('pass')}
                        className="accent-teal-600 h-3.5 w-3.5"
                      />
                      <span>予以审核通过 (已确认)</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="confirm-status-radio"
                        checked={confirmStatus === 'reject'}
                        onChange={() => setConfirmStatus('reject')}
                        className="accent-rose-600 h-3.5 w-3.5"
                      />
                      <span className="text-rose-600">予以审核驳回 (退回修改)</span>
                    </label>
                  </div>
                </div>

                {/* Optional/Required rejection reason input block */}
                {confirmStatus === 'reject' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                      驳回原因描述 (必填) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="请详细叙述退回原由，如清单量录入与本日现场监理测算偏差等..."
                      className="w-full border border-rose-200 focus:border-rose-450 rounded-lg p-2 text-xs outline-none placeholder-slate-350 bg-rose-50/15 text-rose-900"
                    />
                  </div>
                )}
              </div>

              {/* Approve actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={confirmStatus === 'reject' && !rejectReason.trim()}
                  onClick={handlePerformConfirmation}
                  className={`px-4 py-1.5 text-white font-extrabold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-3xs ${
                    confirmStatus === 'pass'
                      ? 'bg-teal-600 hover:bg-teal-700 cursor-pointer'
                      : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  确认提审
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
