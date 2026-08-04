import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  FileText, 
  Users, 
  Calendar, 
  CloudSun, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Bell, 
  CheckCircle, 
  ExternalLink,
  ChevronRightSquare,
  MessageSquare,
  X,
  Compass,
  FileCheck,
  Send,
  Sparkles,
  PhoneCall,
  UserCheck,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Thermometer,
  Droplets,
  Wind,
  TrendingUp,
  Percent,
  Ruler,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Carousel Images / Banners
const BANNERS = [
  {
    id: 1,
    title: '交工建造 必是精品',
    subtitle: '始于1953',
    bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #111827 100%)',
    tagline: '初心筑梦工程，精益求精铸就丰碑',
    image: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 2,
    title: '追求卓越，筑就大道',
    subtitle: '智慧高速，绿色养护',
    bg: 'linear-gradient(135deg, #0369a1 0%, #075985 50%, #0f172a 100%)',
    tagline: '数字引领养护，新质生产力赋能未来项目',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 3,
    title: '匠心精神 品质交工',
    subtitle: '保障畅通每一天',
    bg: 'linear-gradient(135deg, #047857 0%, #065f46 50%, #022c22 100%)',
    tagline: '以科学管养，守护千万公众安全舒畅出行',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=1200&auto=format&fit=crop'
  }
];

// Shortcuts list
const SHORTCUTS = [
  { name: '员工自助', icon: <UserCheck size={24} className="text-blue-500" />, path: '/teams/list', desc: '考勤及个人事务' },
  { name: '合同管理', icon: <FileText size={24} className="text-indigo-500" />, path: '/contract/income/confirmation', badge: '5', desc: '合同审核确认' },
  { name: '作风建设个人清单', icon: <FileCheck size={24} className="text-emerald-500" />, path: '/project/list', desc: '廉政与作风核验' },
  { name: '部门管理', icon: <Building2 size={24} className="text-violet-500" />, path: '/project/list', desc: '部门架构与设置' },
  { name: '薪酬管理', icon: <Compass size={24} className="text-sky-500" />, path: '/teams/list', desc: '财务薪资明细' },
  { name: '公文管理', icon: <ChevronRightSquare size={24} className="text-amber-500" />, path: '/project/change', desc: '公文审阅分发' },
  { name: '通讯录', icon: <PhoneCall size={24} className="text-teal-500" />, path: '/teams/list', desc: '项目成员联络' },
  { name: '发起流程', icon: <Send size={24} className="text-rose-500" />, path: '/project/setup', desc: '快速项目立项' }
];

// Dummy To-do lists
const INITIAL_TODOS = [
  {
    id: 'todo-1',
    category: '待办',
    type: '新OA系统',
    sender: '况怡蒙',
    action: '请您查阅',
    title: '关于公布集团第三批“守好红色根脉·班前十分钟活动”五星领讲员评选结果的通知',
    isUrgent: false
  },
  {
    id: 'todo-2',
    category: '待办',
    type: '新OA系统',
    sender: '况怡蒙',
    action: '请您查阅',
    title: '关于委派董事调整的通知',
    isUrgent: false
  },
  {
    id: 'todo-3',
    category: '待办',
    type: '新OA系统',
    sender: '况怡蒙',
    action: '请您查阅',
    title: '关于启动集团技术生态图谱编制工作的通知',
    isUrgent: false
  },
  {
    id: 'todo-4',
    category: '待办',
    type: '新OA系统',
    sender: '况怡蒙',
    action: '请您查阅',
    title: '关于表彰“奋进交工 勤廉有我”清廉书画摄影作品评选结果的通报',
    isUrgent: false
  },
  {
    id: 'todo-5',
    category: '待办',
    type: '新OA系统',
    sender: '况怡蒙',
    action: '请您查阅',
    title: '关于开展“青力青为 微光如炬”系列青年志愿服务之公益献血、爱心捐物活动的通知',
    isUrgent: false
  },
  {
    id: 'todo-6',
    category: '办件',
    type: '系统通知',
    sender: '「交工装备数智工厂」潘思楠',
    action: '在【油墩港闵塔路桥】项目中，申请调整钢桁梁双次施工计划时间：由 2026/05/01-2026/...',
    title: '',
    isUrgent: true
  }
];

// News tabs & data
const NEWS_TABS = ['集团新闻', '集团公告', '公司新闻', '公司公告', '项目新闻', '项目公告', '应知应会'];
const NEWS_DATA: Record<string, { title: string; date: string }[]> = {
  '集团新闻': [
    { title: '浙江交工举办2025年度财务培训', date: '2025-07-22' },
    { title: '浙江交工2025年机制砂生产质量控制技术培训圆满结束', date: '2025-07-07' },
    { title: '浙江交工工会干部集中“充电”', date: '2025-06-26' },
    { title: '魏宏峰带队赴甬金衢上衢州段3标调研', date: '2025-06-26' }
  ],
  '集团公告': [
    { title: '关于印发《浙江交工集团优秀项目部评选办法》的通知', date: '2025-07-15' },
    { title: '关于公布2025年度第一批优质工程项目评选结果的公告', date: '2025-07-02' },
    { title: '浙江交工集团总部部分中层管理岗位公开招聘公告', date: '2025-06-18' }
  ],
  '公司新闻': [
    { title: '公路养护公司组织开展安全生产月主题宣誓仪式', date: '2025-06-20' },
    { title: '养护一体化管理平台正式上线测试运行', date: '2025-06-10' }
  ],
  '公司公告': [
    { title: '公司关于2025年端午节放假安排的日常通知', date: '2025-06-01' },
    { title: '设备租赁分公司关于废旧物资公开处置的二次公告', date: '2025-05-24' }
  ],
  '项目新闻': [
    { title: '义龙庆高速丽水段TJ08标成功浇筑首片预制T梁', date: '2025-07-10' },
    { title: '工程创优！项目部开展高填方路基精细化施工现场观摩', date: '2025-07-05' }
  ],
  '项目公告': [
    { title: '关于对杭金衢高速专项白皮路段夜间封道养护施工的温馨提示', date: '2025-06-12' },
    { title: '甬金高速路面预防性养护工程段招标中标结果公示', date: '2025-05-30' }
  ],
  '应知应会': [
    { title: '【知识角】沥青路面微表处及超薄罩面养护施工工艺标准', date: '2025-06-30' },
    { title: '【法律法规】《公路安全保护条例》及日常执法指引重点解读', date: '2025-06-15' }
  ]
};

const PROJECT_DATA = [
  { name: '道路养护', value: 45, color: '#2b7cb6' },
  { name: '桥梁维护', value: 25, color: '#1e90ff' },
  { name: '隧道保养', value: 15, color: '#10b981' },
  { name: '路面修复', value: 10, color: '#f59e0b' },
  { name: '其他项目', value: 5, color: '#a855f7' },
];

const JUNE_2026_DAYS = [
  // Row 1
  { dayNum: 28, isPrevMonth: true, hasCard: false },
  { dayNum: 29, isPrevMonth: true, hasCard: false },
  { dayNum: 30, isPrevMonth: true, hasCard: false },
  { dayNum: 31, isPrevMonth: true, hasCard: false },
  { dayNum: 1, isPrevMonth: false, hasCard: false },
  { dayNum: 2, isPrevMonth: false, hasCard: false },
  { dayNum: 3, isPrevMonth: false, hasCard: false },
  // Row 2
  { dayNum: 4, isPrevMonth: false, hasCard: false },
  { dayNum: 5, isPrevMonth: false, hasCard: false },
  { dayNum: 6, isPrevMonth: false, hasCard: false },
  { dayNum: 7, isPrevMonth: false, hasCard: true, value: '31,412.41' },
  { dayNum: 8, isPrevMonth: false, hasCard: true, value: '31,412.41' },
  { dayNum: 9, isPrevMonth: false, hasCard: true, value: '31,412.41' },
  { dayNum: 10, isPrevMonth: false, hasCard: true, value: '31,412.41' },
  // Row 3
  { dayNum: 11, isPrevMonth: false, hasCard: false },
  { dayNum: 12, isPrevMonth: false, hasCard: false },
  { dayNum: 13, isPrevMonth: false, hasCard: false },
  { dayNum: 14, isPrevMonth: false, hasCard: false },
  { dayNum: 15, isPrevMonth: false, hasCard: false },
  { dayNum: 16, isPrevMonth: false, hasCard: false },
  { dayNum: 17, isPrevMonth: false, hasCard: false },
  // Row 4
  { dayNum: 18, isPrevMonth: false, hasCard: false },
  { dayNum: 19, isPrevMonth: false, hasCard: false },
  { dayNum: 20, isPrevMonth: false, hasCard: false },
  { dayNum: 21, isPrevMonth: false, hasCard: false },
  { dayNum: 22, isPrevMonth: false, hasCard: false },
  { dayNum: 23, isPrevMonth: false, hasCard: false },
  { dayNum: 24, isPrevMonth: false, hasCard: false },
  // Row 5
  { dayNum: 25, isPrevMonth: false, hasCard: false },
  { dayNum: 26, isPrevMonth: false, hasCard: false },
  { dayNum: 27, isPrevMonth: false, hasCard: false },
  { dayNum: 28, isPrevMonth: false, hasCard: false },
  { dayNum: 29, isPrevMonth: false, hasCard: false },
  { dayNum: 30, isPrevMonth: false, hasCard: false },
  { dayNum: 1, isNextMonth: true, hasCard: false }
];

const getLunarDateStr = (dayNum: number) => {
  if (dayNum === 7) return '四月廿二';
  if (dayNum === 8) return '四月廿三';
  if (dayNum === 9) return '四月廿四';
  if (dayNum === 10) return '四月廿五';
  if (dayNum === 11) return '四月廿六';
  if (dayNum === 12) return '四月廿七';
  if (dayNum === 13) return '四月廿八';
  if (dayNum === 14) return '四月廿九';
  if (dayNum === 15) return '五月初一';
  return `四月${dayNum}`; // default fallback
};

const GET_SHORTCUTS = (level: string) => {
  if (level === '集团') {
    return [
      { name: '公文审批', icon: <FileText size={24} className="text-indigo-500" />, path: '/project/change', desc: '集团公文审签' },
      { name: '决策支持', icon: <Building2 size={24} className="text-blue-500" />, path: '/project/list', desc: '产值与营收大盘' },
      { name: '集团公告', icon: <Bell size={24} className="text-violet-500" />, path: '/project/list', desc: '集团发文通知' },
      { name: '合同大盘', icon: <FileCheck size={24} className="text-emerald-500" />, path: '/contract/income/ledger', desc: '集团合同数据分析' },
      { name: '部门管理', icon: <Users size={24} className="text-violet-500" />, path: '/project/list', desc: '集团组织架构' },
      { name: '作风考核', icon: <Compass size={24} className="text-sky-500" />, path: '/project/list', desc: '廉政与作风核验' },
      { name: '安全监控', icon: <Sparkles size={24} className="text-rose-500" />, path: '/project/list', desc: '全省施工安全态势' },
      { name: '项目底册', icon: <Send size={24} className="text-teal-500" />, path: '/project/list', desc: '集团在建项目清单' }
    ];
  } else if (level === '区域中心') {
    return [
      { name: '区域上报', icon: <Send size={24} className="text-sky-500" />, path: '/project/list', desc: '向集团上报运营周报' },
      { name: '项目巡查', icon: <Compass size={24} className="text-blue-500" />, path: '/project/list', desc: '区域内现场检查' },
      { name: '合同会签', icon: <FileText size={24} className="text-indigo-500" />, path: '/contract/income/confirmation', badge: '3', desc: '合同及补充协议审核' },
      { name: '物资调配', icon: <Building2 size={24} className="text-violet-500" />, path: '/project/list', desc: '区域物资储备与调用' },
      { name: '人员调度', icon: <Users size={24} className="text-emerald-500" />, path: '/teams/list', desc: '项目班组跨区调度' },
      { name: '应急分发', icon: <Sparkles size={24} className="text-rose-500" />, path: '/project/list', desc: '极端天气快速调度' },
      { name: '通讯录', icon: <PhoneCall size={24} className="text-teal-500" />, path: '/teams/list', desc: '区域成员及部门' },
      { name: '进度周报', icon: <FileCheck size={24} className="text-amber-500" />, path: '/project/inventory/list', desc: '各项目施工进度周报' }
    ];
  } else {
    return SHORTCUTS;
  }
};

const GET_TODOS = (level: string) => {
  if (level === '集团') {
    return [
      { id: 'g-todo-1', category: '办件', type: '审批中心', sender: '杭州北区域中心', action: '请您审批', title: '关于2026年第二季度养护施工产值指标追加申请的请示', isUrgent: true },
      { id: 'g-todo-2', category: '阅件', type: '集团公文', sender: '集团办公室', action: '请您阅览', title: '关于印发《浙江交通集团2026年半年度安全生产考核实施方案》的通知', isUrgent: false },
      { id: 'g-todo-3', category: '办件', type: '合同审核', sender: '金丽温项目部', action: '请您审批', title: '关于金丽温高速日常养护单价合同重大变更审批流', isUrgent: false }
    ];
  } else if (level === '区域中心') {
    return [
      { id: 'r-todo-1', category: '办件', type: '变更会签', sender: '杭州北项目部', action: '请您审核', title: '关于沪杭甬高速部分高路段伸缩缝抢修清单项新增与计量变更', isUrgent: true },
      { id: 'r-todo-2', category: '阅件', type: '区域动态', sender: '湖州项目部', action: '请您查阅', title: '关于梅雨季节边坡及低洼积水段养护排查情况的每日速报', isUrgent: false },
      { id: 'r-todo-3', category: '办件', type: '产值会签', sender: '嘉兴项目部', action: '请您审批', title: '关于嘉兴项目部6月第一阶段产值结算台账的审核单', isUrgent: false }
    ];
  } else {
    return INITIAL_TODOS;
  }
};

const GET_CHART_DATA = (level: string) => {
  if (level === '集团') {
    return [
      { name: '杭州北区域中心', value: 35, color: '#133c8b' },
      { name: '宁波区域中心', value: 28, color: '#1e90ff' },
      { name: '温州区域中心', value: 22, color: '#10b981' },
      { name: '金丽温区域中心', value: 15, color: '#f59e0b' }
    ];
  } else if (level === '区域中心') {
    return [
      { name: '杭州北项目部', value: 45, color: '#2b7cb6' },
      { name: '湖州项目部', value: 25, color: '#10b981' },
      { name: '嘉兴项目部', value: 20, color: '#f59e0b' },
      { name: '绍兴北项目部', value: 10, color: '#a855f7' }
    ];
  } else {
    return PROJECT_DATA;
  }
};

const GET_BRANDING = (level: string) => {
  if (level === '集团') {
    return {
      sub: '浙江交工集团总部',
      subtitle: '协同调度与数字决策大脑',
      stats: [
        { label: '集团在建项目数', value: '148 个' },
        { label: '集团下辖区域中心', value: '6 个' },
        { label: '在册施工班组数', value: '412 个' }
      ],
      desc: '深入贯彻新发展理念，全面建设现代化综合交通基础设施，浙江交工筑路强国，匠心致远。'
    };
  } else if (level === '区域中心') {
    return {
      sub: '杭州北区域中心',
      subtitle: '区域项目管理与监控一体化中心',
      stats: [
        { label: '区域内在建项目', value: '12 个' },
        { label: '辖下日常管养里程', value: '420.5 公里' },
        { label: '区域在线机械设备', value: '184 台' }
      ],
      desc: '区域协同，一体保障。杭州北区域中心覆盖杭徽、沪杭甬、申苏浙皖等浙北养护施工核心命脉枢纽。'
    };
  } else {
    return {
      sub: '养护工程分公司',
      subtitle: '杭州北区域中心-杭州北项目部',
      stats: [
        { label: '工期履约时间', value: '365 天' },
        { label: '作业现场总人数', value: '78 人' },
        { label: '当前在线施工班组', value: '12 个' }
      ],
      desc: '全力拼抢产值黄金期，围绕一工区桥梁、二工区路基以及绿化管养施工主战场，安全高效管养保障！'
    };
  }
};

const WEATHER_DATA = {
  '杭徽高速段': {
    today: { temp: '26℃', range: '24℃ ~ 29℃', status: '大暴雨转雷阵雨', wind: '西南风 4-5级', humidity: '88%', alert: '黄色暴雨预警：杭徽高速临安段地质灾害风险较高，建议限制大型集卡通行并布设抢险抽水泵。' },
    forecast: [
      { day: '今天', status: '暴雨', temp: '24/29℃', icon: 'storm', severe: true },
      { day: '周四', status: '雷阵雨', temp: '25/30℃', icon: 'thunder', severe: true },
      { day: '周五', status: '大雨', temp: '24/28℃', icon: 'rain', severe: true },
      { day: '周六', status: '多云', temp: '26/32℃', icon: 'cloudy', severe: false },
      { day: '周日', status: '晴', temp: '27/34℃', icon: 'sun', severe: false }
    ]
  },
  '沪杭甬临平段': {
    today: { temp: '28℃', range: '25℃ ~ 32℃', status: '雷阵雨', wind: '南风 3-4级', humidity: '82%', alert: '强对流天气预警：预计午后伴有短时强降水，路面摩擦系数降低，做好电子情报板限速提示。' },
    forecast: [
      { day: '今天', status: '阵雨', temp: '25/32℃', icon: 'rain', severe: true },
      { day: '周四', status: '多云', temp: '26/33℃', icon: 'cloudy', severe: false },
      { day: '周五', status: '晴', temp: '27/35℃', icon: 'sun', severe: false },
      { day: '周六', status: '晴', temp: '28/35℃', icon: 'sun', severe: false },
      { day: '周日', status: '晴', temp: '28/36℃', icon: 'sun', severe: false }
    ]
  },
  '杭州绕城北段': {
    today: { temp: '27℃', range: '24℃ ~ 30℃', status: '阴天', wind: '东风 2级', humidity: '75%', alert: null },
    forecast: [
      { day: '今天', status: '阴', temp: '24/30℃', icon: 'cloudy', severe: false },
      { day: '周四', status: '阵雨', temp: '25/31℃', icon: 'rain', severe: true },
      { day: '周五', status: '阴', temp: '25/29℃', icon: 'cloudy', severe: false },
      { day: '周六', status: '多云', temp: '26/33℃', icon: 'cloudy', severe: false },
      { day: '周日', status: '晴', temp: '27/34℃', icon: 'sun', severe: false }
    ]
  }
};

const MEASUREMENT_DATA = {
  annualPlan: 5200, // 万元
  accumulated: 3380, // 万元
  currentPeriod: 450, // 本期申报万元
  approvedPeriod: 380, // 本期已确立/审核通过万元
  completionRate: 65.0, // 完成率
};

const COST_DATA = {
  budget: 3000, // 年度成本控制预算
  actual: 2450.5, // 实际总支出
  items: [
    { name: '人工费 (工)', value: 686.1, percentage: 28, color: 'bg-indigo-500', text: '班组劳务分包、考勤工日、特殊补贴' },
    { name: '材料费 (料)', value: 1151.7, percentage: 47, color: 'bg-amber-500', text: '沥青混合料、钢护栏、各类管材砂石' },
    { name: '机械使用 (机)', value: 441.1, percentage: 18, color: 'bg-emerald-500', text: '特种作业车、摊铺机、租赁与油耗燃料' },
    { name: '其他直接费', value: 171.6, percentage: 7, color: 'bg-rose-500', text: '现场安全文明施工、临时设施、现场办公' }
  ]
};

const renderWeatherIcon = (iconName: string, size = 18) => {
  switch (iconName) {
    case 'storm':
      return <CloudLightning className="text-red-500 animate-pulse" size={size} />;
    case 'thunder':
      return <CloudRain className="text-amber-500" size={size} />;
    case 'rain':
      return <CloudRain className="text-blue-500 animate-bounce" size={size} />;
    case 'cloudy':
      return <Cloud className="text-slate-400" size={size} />;
    case 'sun':
      return <CloudSun className="text-amber-500" size={size} />;
    default:
      return <CloudSun className="text-slate-400" size={size} />;
  }
};

export default function Workbench() {
  const navigate = useNavigate();
  const [orgLevel, setOrgLevel] = useState<string>(() => localStorage.getItem('cico-org-level') || '集团');

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setOrgLevel(customEvent.detail);
      }
    };
    window.addEventListener('cico-org-level-change', handler as EventListener);
    return () => {
      window.removeEventListener('cico-org-level-change', handler as EventListener);
    };
  }, []);

  const [selectedDayObj, setSelectedDayObj] = useState<any>(JUNE_2026_DAYS[13]); // Default June 10 (index 13)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTodoTab, setActiveTodoTab] = useState('全部');
  const [todos, setTodos] = useState(() => GET_TODOS(orgLevel));

  useEffect(() => {
    setTodos(GET_TODOS(orgLevel));
  }, [orgLevel]);
  const [activeNewsTab, setActiveNewsTab] = useState('集团新闻');
  const [activeAppTab, setActiveAppTab] = useState<'shortcuts' | 'aiTools'>('shortcuts');
  const [weatherSegment, setWeatherSegment] = useState<'杭徽高速段' | '沪杭甬临平段' | '杭州绕城北段'>('杭徽高速段');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([
    { sender: 'assistant', text: '您好！我是您的智能助理【养乐多】。今天我为您准备了最新的工作排程，您有什么需要协助的吗？' }
  ]);
  const [userInput, setUserInput] = useState('');

  // Auto slider for Carousel Banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % BANNERS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleResolveTodo = (id: string) => {
    setTodos(prev => prev.filter(item => item.id !== id));
  };

  const handleAiToolClick = (toolName: string) => {
    setIsChatOpen(true);
    let reply = '';
    let userText = '';

    if (toolName === '养护排班助手') {
      userText = '启动养护排班助手';
      reply = '✨ 已为您唤起【养护智能排班系统】！当前项目：杭州北项目部。\n正在为您排查当前32名一线班组人员的状态，并结合明后天（6月3日）的中小雨气象情况，建议对2号及3号班组的室外路面养护顺延，自动调度至室内安全教育与设备维护日程。是否保存此份智能排班表？';
    } else if (toolName === '养护知识库') {
      userText = '查询养护知识库：沥青施工规范';
      reply = '📖 已为您接通【智能养护知识大脑】！\n已在库中匹配到规范：《公路沥青路面养护技术规范(JTG 5142)》。规范要点：在雨天及潮湿环境下严禁施工。微表处和超薄罩面的最佳施工温度在 15℃ 以上。您可以通过『公文管理-应知应会』一键下载规范全文，或继续向我提问更具体的问题！';
    } else if (toolName === '养护调度AI') {
      userText = '调用养护调度AI';
      reply = '🚨 【养护调度AI自动化预案】已就绪！\n当前收到大风预警信号（风速可达6-8级）。已下发安全控制指令至防汛及钢梁施工班组，排查高空特种设备悬空吊装并及时固定。需要我帮您联络相关班组组长进行现场电话连线吗？';
    }

    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: userText },
      { sender: 'assistant', text: reply }
    ]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setUserInput('');

    setTimeout(() => {
      let reply = '我为您在合同确认池和项目管理中进行全库搜索。';
      if (userMsg.includes('合同') || userMsg.includes('收入')) {
        reply = '我们在【合同确认池】为您加载出最新待确认的 5 条款项合规性内容，其中包含：系统同步高速养护等多条数据记录，您可以进入【合同管理-收入合同】选项页点击审核！';
      } else if (userMsg.includes('立项') || userMsg.includes('项目')) {
        reply = '我们在【项目管理-项目立项】中查询到您最近编制的“义龙庆高速公路义乌至龙泉段”资料，显示目前处于【草稿】阶段，可以在路段和班组配置妥当后快速发起审批或暂存！';
      } else {
        reply = '好的，关于您的资讯。目前可以通过上方的“常用应用或AI工具”一键直达“公文管理”、“合同台账”和“通讯录”等智能管养服务！需要我帮您导航吗？';
      }
      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
    }, 1000);
  };

  return (
    <div className="space-y-5 select-none text-gray-800 pb-12">
      
      {/* Main Layout Grid with 2.5 : 5.0 : 2.5 ratio (xl:col-span-3, xl:col-span-6, xl:col-span-3) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN (2.5 / 10 = col-span-3) ================= */}
        <div className="xl:col-span-3 flex flex-col gap-5 w-full">
          
          {/* Block 1: 组织信息 Branding Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden group">
            {/* Background design graphics */}
            <div className="absolute right-0 top-0 w-28 h-28 bg-blue-50/60 rounded-bl-full flex items-center justify-center -mr-6 -mt-6 transition-all group-hover:scale-105 duration-500">
              <Building2 className="w-10 h-10 text-blue-500/20 mr-3 mt-3" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wide">
                  {GET_BRANDING(orgLevel).sub}
                </span>
                <span className="text-[10px] text-gray-400 font-bold bg-gray-50 border border-gray-100 px-1.5 py-0.2 rounded">
                  {orgLevel}层级
                </span>
              </div>
              <h1 className="text-sm font-black text-slate-800 leading-snug mb-3 pr-8 group-hover:text-blue-700 transition-colors">
                {GET_BRANDING(orgLevel).subtitle}
              </h1>
              
              {/* Short stats indicators */}
              <div className="grid grid-cols-3 gap-1 py-2 border-t border-b border-slate-100 mb-2.5 text-center">
                {GET_BRANDING(orgLevel).stats.map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold truncate" title={stat.label}>{stat.label}</span>
                    <span className="text-xs font-black text-slate-700 font-mono mt-0.5">{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <div className="flex items-center gap-1.5 text-orange-600">
                  <span className="animate-pulse">🔥</span> 动态大盘
                </div>
                <div>2026-07</div>
              </div>
              <p className="mt-2 text-[10px] text-slate-500 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100 italic">
                {GET_BRANDING(orgLevel).desc}
              </p>
            </div>
          </div>

          {/* Block 2: 月度产值日历 (Calendar Card) */}
          {orgLevel === '集团' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 select-none space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded-full"></span>
                  <h3 className="font-bold text-xs text-gray-800 tracking-tight flex items-center gap-1">
                    <span>集团核心运营监控</span>
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">实时大盘</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold">季度总产值指标</span>
                    <span className="font-mono font-bold text-blue-600">78.4%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: '78.4%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold">年度投资计划</span>
                    <span className="font-mono font-bold text-indigo-600">61.2%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: '61.2%' }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-emerald-50/50 rounded-lg p-2 border border-emerald-100 flex flex-col justify-center">
                    <span className="text-[9px] text-emerald-700 font-bold">🌲 安全天数</span>
                    <span className="text-xs font-black font-mono text-emerald-800 mt-0.5">1,842 天</span>
                  </div>
                  <div className="bg-sky-50/50 rounded-lg p-2 border border-sky-100 flex flex-col justify-center">
                    <span className="text-[9px] text-sky-700 font-bold">🧭 处置率</span>
                    <span className="text-xs font-black font-mono text-sky-800 mt-0.5">99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {orgLevel === '区域中心' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 select-none space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded-full"></span>
                  <h3 className="font-bold text-xs text-gray-800 tracking-tight flex items-center gap-1">
                    <span>区域项目进度</span>
                  </h3>
                </div>
                <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.2 rounded font-bold">杭州北</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: '杭徽日常养护', progress: '92.5%', color: 'from-blue-500 to-indigo-500' },
                  { name: '沪杭甬养护', progress: '84.1%', color: 'from-indigo-500 to-purple-500' },
                  { name: '申苏浙皖路面', progress: '70.3%', color: 'from-purple-500 to-pink-500' },
                  { name: '绕城北段大修', progress: '45.2%', color: 'from-pink-500 to-orange-500' }
                ].map((proj, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-700 font-bold truncate">{proj.name}</span>
                      <span className="font-mono text-gray-500 font-semibold">{proj.progress}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full bg-gradient-to-r rounded-full", proj.color)} style={{ width: proj.progress }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orgLevel === '项目部' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 select-none space-y-3">
              <div className="flex items-center justify-between gap-1 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-emerald-500 rounded-full"></span>
                  <h3 className="font-bold text-xs text-gray-800 tracking-tight flex items-center gap-1">
                    <span>6月月度产值日历</span>
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.2 rounded text-[9px] font-bold">
                    {JUNE_2026_DAYS.filter(d => d.hasCard).length}天有产值
                  </span>
                </div>
              </div>

              {/* Month Picker Header */}
              <div className="flex items-center justify-between px-1">
                <button type="button" className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-black text-gray-800 font-mono">2026年06月</span>
                <button type="button" className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-[9px] font-bold text-gray-400">
                {['一', '二', '三', '四', '五', '六', '日'].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {JUNE_2026_DAYS.map((day, idx) => {
                  const isPad = day.isPrevMonth || day.isNextMonth;
                  if (isPad) {
                    return (
                      <div key={idx} className="h-8 flex items-center justify-center text-[10px] text-gray-300 font-mono">
                        {day.dayNum}
                      </div>
                    );
                  }
                  const isSelected = selectedDayObj?.dayNum === day.dayNum && !isPad;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayObj(day)}
                      className={cn(
                        "h-8 rounded-md p-0.5 flex flex-col justify-between cursor-pointer transition-all border text-center relative",
                        isSelected 
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 shadow-2xs z-10" 
                          : day.hasCard 
                            ? "bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50" 
                            : "bg-gray-50/50 border-gray-100 hover:bg-gray-100/60"
                      )}
                    >
                      <span className={cn(
                        "text-[9px] font-mono leading-none block",
                        isSelected ? "font-black text-blue-700" : day.hasCard ? "font-bold text-emerald-800" : "text-gray-500"
                      )}>
                        {day.dayNum}
                      </span>
                      {day.hasCard ? (
                        <span className="text-[7px] font-mono font-black text-emerald-600 truncate leading-none">
                          ¥3.1w
                        </span>
                      ) : (
                        <span className="text-[7px] text-gray-300 font-mono">-</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Info Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5 text-[10px]">
                {selectedDayObj && selectedDayObj.hasCard ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">
                        🗓️ 06月{selectedDayObj.dayNum}日 记账单据：
                      </span>
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-1 py-0.2 rounded text-[9px] font-bold">
                        已入账
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>当日产值:</span>
                        <span className="font-mono font-bold text-emerald-600">¥{selectedDayObj.value} 元</span>
                      </div>
                      <div className="flex justify-between">
                        <span>核算班组:</span>
                        <span className="font-bold text-slate-700">道路养护第一班组</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-1 text-slate-400 text-[10px]">
                    💡 6月{selectedDayObj?.dayNum}日无产值申报
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Block 3: 常用应用 & AI工具 Shortcuts Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveAppTab('shortcuts')}
                  className={cn(
                    "font-bold text-xs pb-1 border-b-2 transition-all flex items-center gap-1",
                    activeAppTab === 'shortcuts'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  )}
                >
                  <span className={cn("w-1.5 h-3 rounded-full inline-block", activeAppTab === 'shortcuts' ? "bg-blue-600" : "bg-gray-400")}></span>
                  常用应用
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAppTab('aiTools')}
                  className={cn(
                    "font-bold text-xs pb-1 border-b-2 transition-all flex items-center gap-1",
                    activeAppTab === 'aiTools'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Sparkles size={12} className={cn("transition-colors", activeAppTab === 'aiTools' ? "text-blue-600 animate-pulse" : "text-gray-400")} />
                  AI工具
                </button>
              </div>
              <MoreHorizontal size={14} className="text-gray-400 cursor-pointer" />
            </div>
            
            {activeAppTab === 'shortcuts' ? (
              <div className="grid grid-cols-4 gap-y-3 gap-x-1">
                {GET_SHORTCUTS(orgLevel).map((shortcut, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => navigate(shortcut.path)}
                    className="flex flex-col items-center justify-center p-1 hover:bg-gray-50 rounded-lg cursor-pointer transition-all duration-200 group text-center"
                    style={{ minHeight: '68px' }}
                  >
                    <div className="relative mb-1 p-2 bg-gray-50 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all border border-gray-100 group-hover:border-blue-100">
                      {shortcut.icon}
                      {shortcut.badge && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white font-mono text-[8px] font-bold rounded-full flex items-center justify-center ring-1 ring-white">
                          {shortcut.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-700 font-medium group-hover:text-blue-600 leading-tight block truncate w-full px-0.5">
                      {shortcut.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 py-0.5">
                {[
                  { name: '养护排班助手', icon: <Calendar size={18} className="text-blue-600" />, desc: 'AI一键智能排班', label: '智能分析' },
                  { name: '养护知识库', icon: <Compass size={18} className="text-emerald-600" />, desc: '快速查阅路段规范', label: '知识检索' },
                  { name: '养护调度AI', icon: <Sparkles size={18} className="text-purple-600" />, desc: '突发事件智能调度', label: '突发预案' }
                ].map((tool, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAiToolClick(tool.name)}
                    className="flex items-center justify-between p-2 rounded-lg border border-blue-50/50 bg-gradient-to-r from-blue-50/40 to-white hover:from-blue-50 hover:to-blue-50/20 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-blue-100 group-hover:scale-105 transition-transform">
                        {tool.icon}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600">{tool.name}</span>
                        <p className="text-[9px] text-gray-400 font-medium">{tool.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-blue-400 group-hover:text-blue-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ================= MIDDLE COLUMN (5.0 / 10 = col-span-6) ================= */}
        <div className="xl:col-span-6 flex flex-col gap-5 w-full">
          
          {/* Block 1: 项目过程管控 Card */}
          <div className="bg-white rounded-xl border border-blue-200/90 shadow-sm p-4 flex flex-col justify-between">
            {/* Header Title Row */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-50/80">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  项目过程管控
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  数据截止: 2026-06-22
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100/80">
                  实时监测
                </span>
              </div>
            </div>

            {/* 6 Process Control Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
              
              {/* 1. 开累形象收入 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-sky-300 via-blue-500 to-blue-600 p-0.5 shadow-md shadow-blue-500/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/40 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <TrendingUp className="w-4 h-4 text-white relative z-10" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">开累形象收入</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  8.42 <span className="text-[10px] font-normal text-slate-600 font-sans">亿</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  当年开累: <strong className="text-slate-900 font-bold">3.20</strong> 亿
                </span>
              </div>

              {/* 2. 开累实际成本 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-sky-200 via-blue-400 to-blue-600 p-0.5 shadow-md shadow-blue-400/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-white/50 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <span className="relative z-10 text-white font-black text-xs">¥</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">开累实际成本</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  7.67 <span className="text-[10px] font-normal text-slate-600 font-sans">亿</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  当年开累: <strong className="text-slate-900 font-bold">2.80</strong> 亿
                </span>
              </div>

              {/* 3. 开累计量 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-sky-300 via-blue-500 to-blue-600 p-0.5 shadow-md shadow-blue-500/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/40 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <Ruler className="w-4 h-4 text-white relative z-10" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">开累计量</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  7.50 <span className="text-[10px] font-normal text-slate-600 font-sans">亿</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  当年开累: <strong className="text-slate-900 font-bold">2.50</strong> 亿
                </span>
              </div>

              {/* 4. 开累支付 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-sky-300 via-blue-500 to-blue-600 p-0.5 shadow-md shadow-blue-500/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-white/50 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <span className="relative z-10 text-white font-black text-xs flex items-center">
                      ¥<span className="text-[8px] font-bold">&gt;</span>
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">开累支付</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  7.67 <span className="text-[10px] font-normal text-slate-600 font-sans">亿</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  当年开累: <strong className="text-slate-900 font-bold">2.80</strong> 亿
                </span>
              </div>

              {/* 5. 计量形象比 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-sky-300 via-blue-500 to-blue-600 p-0.5 shadow-md shadow-blue-500/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/40 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <ShieldCheck className="w-4 h-4 text-white relative z-10" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">计量形象比</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  96.8%
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#f0f9f1] text-[#2e7d32] border border-[#b7ebc6] inline-block">
                  无预警
                </span>
              </div>

              {/* 6. 支付计量比 */}
              <div className="bg-[#f2f6ff] hover:bg-[#ebf2ff] transition-all rounded-xl p-2.5 flex flex-col items-center justify-between text-center border border-blue-100/50 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-sky-300 via-blue-500 to-blue-600 p-0.5 shadow-md shadow-blue-500/20 relative group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/40 via-white/10 to-transparent flex items-center justify-center relative overflow-hidden">
                    <BarChart3 className="w-4 h-4 text-white relative z-10" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-1.5 mb-0.5">支付计量比</span>
                <div className="text-lg font-black text-slate-900 font-mono tracking-tight my-0.5">
                  84.9%
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#fff8e1] text-[#d97706] border border-[#ffe082] inline-block">
                  II 级预警
                </span>
              </div>

            </div>
          </div>

          {/* Block 2: 待办事项 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                <h3 className="font-bold text-gray-950 flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  待办事项
                </h3>
                <span className="text-[11px] text-blue-600 hover:underline cursor-pointer font-bold flex items-center">
                  更多 <ChevronRight size={12} />
                </span>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 pb-2 border-b border-gray-100/60 mb-3 overflow-x-auto scrollbar-none">
                {['全部', `待办 · ${todos.length}`, '预警 · 0', '交接待办 · 0', '交待待阅 · 0'].map((tab, idx) => {
                  const pureName = tab.split(' · ')[0];
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveTodoTab(pureName)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] transition-all font-bold whitespace-nowrap",
                        activeTodoTab === pureName 
                          ? "bg-blue-50 text-blue-600" 
                          : "text-gray-500 hover:text-blue-500 hover:bg-gray-50"
                      )}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rows list */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin max-h-[220px]">
              <AnimatePresence mode="popLayout">
                {todos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-blue-100 bg-white/50 hover:bg-blue-50/10 transition-all gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.2 rounded font-black shrink-0",
                        todo.category === '办件' 
                          ? "bg-orange-50 text-orange-600 border border-orange-100" 
                          : "bg-blue-50 text-blue-600 border border-blue-150"
                      )}>
                        {todo.category}
                      </span>
                      <div className="text-[11px] text-gray-700 font-bold truncate flex-1 leading-tight">
                        <span className="text-slate-400">[{todo.type}]</span>
                        <span className="text-gray-900 ml-1 font-extrabold">{todo.sender}</span>
                        <span className="text-gray-800 ml-1 font-semibold">{todo.title || todo.action}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolveTodo(todo.id)}
                      className="px-2 py-1 rounded border border-blue-200 bg-white text-blue-600 font-extrabold text-[10px] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-3xs shrink-0 flex items-center gap-0.5 cursor-pointer"
                    >
                      <CheckCircle size={10} />
                      已办
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {todos.length === 0 && (
                <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-1">
                  <span className="text-2xl">🎉</span>
                  <span className="font-bold text-[11px] text-gray-500">全部待办处理完毕！</span>
                </div>
              )}
            </div>
          </div>

          {/* Block 3: 公告栏 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  公告栏
                </h3>
                <span className="text-[11px] text-blue-600 hover:underline cursor-pointer font-bold flex items-center">
                  更多 <ChevronRight size={12} />
                </span>
              </div>

              {/* News navigation tabs */}
              <div className="flex border-b border-gray-150 mb-2.5 overflow-x-auto scrollbar-none pb-0.5">
                {NEWS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveNewsTab(tab)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-bold relative whitespace-nowrap transition-colors cursor-pointer",
                      activeNewsTab === tab 
                        ? "text-blue-600 font-black" 
                        : "text-gray-500 hover:text-blue-500"
                    )}
                  >
                    {tab}
                    {activeNewsTab === tab && (
                      <motion.div 
                        layoutId="activeNewsLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" 
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* News articles list */}
            <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin max-h-[180px]">
              {NEWS_DATA[activeNewsTab]?.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 text-[11px] text-gray-700 transition-all border border-transparent hover:border-gray-100 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full group-hover:bg-blue-600 shrink-0"></span>
                    <span className="font-bold text-gray-800 line-clamp-1 group-hover:text-blue-700 flex-1">
                      {item.title}
                    </span>
                  </div>
                  <span className="font-mono text-gray-400 shrink-0 group-hover:text-gray-600 font-medium scale-90">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN (2.5 / 10 = col-span-3) ================= */}
        <div className="xl:col-span-3 flex flex-col gap-5 w-full">
          
          {/* Block 1: 智能天气环境订阅 Weather Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-sky-500 rounded-full"></span>
                <span className="font-black text-xs text-gray-800 tracking-tight">智能天气环境订阅</span>
              </div>
              <select 
                value={weatherSegment} 
                onChange={(e) => setWeatherSegment(e.target.value as any)}
                className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="杭徽高速段">杭徽高速段</option>
                <option value="沪杭甬临平段">沪杭甬临平段</option>
                <option value="杭州绕城北段">杭州绕城北段</option>
              </select>
            </div>

            {/* Weather Details */}
            <div className="space-y-2.5">
              
              {/* Today's Weather Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-sky-50/60 to-blue-50/40 rounded-xl p-2.5 border border-sky-100/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-sky-100">
                    {renderWeatherIcon(WEATHER_DATA[weatherSegment].forecast[0].icon, 22)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black text-slate-800 font-mono leading-none">
                        {WEATHER_DATA[weatherSegment].today.temp}
                      </span>
                      <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 rounded px-1 py-0.2">
                        {WEATHER_DATA[weatherSegment].today.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                      范围: {WEATHER_DATA[weatherSegment].today.range}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col text-[9px] text-slate-500 font-bold">
                  <span>{WEATHER_DATA[weatherSegment].today.wind}</span>
                  <span className="text-slate-400 mt-0.5">湿度: {WEATHER_DATA[weatherSegment].today.humidity}</span>
                </div>
              </div>

              {/* Severe Weather Alert (If available) */}
              {WEATHER_DATA[weatherSegment].today.alert && (
                <div className="bg-red-50/80 border border-red-150 p-2 rounded-lg animate-pulse">
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs shrink-0 mt-0.5">🚨</span>
                    <p className="text-[9px] text-red-700 font-bold leading-tight">
                      {WEATHER_DATA[weatherSegment].today.alert}
                    </p>
                  </div>
                </div>
              )}

              {/* Forecast Grid (5-day) */}
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {WEATHER_DATA[weatherSegment].forecast.map((fc, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all",
                      fc.severe 
                        ? "bg-red-50/40 border-red-150 ring-1 ring-red-100" 
                        : "bg-slate-50/40 border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-[9px] font-bold text-slate-500">{fc.day}</span>
                    <div className="my-1">
                      {renderWeatherIcon(fc.icon, 14)}
                    </div>
                    <span className={cn(
                      "text-[8px] font-black leading-none truncate w-full",
                      fc.severe ? "text-red-600" : "text-slate-600"
                    )}>
                      {fc.status}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 mt-1 font-mono leading-none">
                      {fc.temp}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Block 2: 项目部年度计量执行 Annual Measurement Execution Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-emerald-500 rounded-full"></span>
                <span className="font-black text-xs text-gray-800 tracking-tight">年度计量执行</span>
              </div>
              <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-black font-mono">
                完成率: {MEASUREMENT_DATA.completionRate}%
              </span>
            </div>

            {/* Progress Meter bar */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500">年度已确立计量金额</span>
                  <span className="font-mono text-emerald-600">¥{MEASUREMENT_DATA.accumulated}万 <span className="text-slate-300 font-normal">/ {MEASUREMENT_DATA.annualPlan}万</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${MEASUREMENT_DATA.completionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Breakdown grids */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 flex flex-col justify-center">
                  <span className="text-[9px] text-slate-400 font-bold">📂 本期 (月) 申报</span>
                  <span className="text-[11px] font-black text-slate-700 font-mono mt-0.5">¥{MEASUREMENT_DATA.currentPeriod} 万元</span>
                </div>
                <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-1.5 flex flex-col justify-center">
                  <span className="text-[9px] text-emerald-700 font-bold">✅ 本期已确认入账</span>
                  <span className="text-[11px] font-black text-emerald-800 font-mono mt-0.5">¥{MEASUREMENT_DATA.approvedPeriod} 万元</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-500 leading-normal bg-slate-50 p-2 rounded border border-slate-100">
                💡 <span className="font-bold text-slate-700">执行说明：</span>
                本年度计划 5,200 万，进度健康。本期审核通过率 84.4%，剩余 70 万处于复核阶段。
              </p>
            </div>
          </div>

          {/* Block 3: 年度工料机及其他成本 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-violet-600 rounded-full"></span>
                <span className="font-black text-xs text-gray-800 tracking-tight">年度工料机及其他成本</span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold">预算控制内</span>
            </div>

            {/* Stacked Percentage bar */}
            <div className="space-y-2.5">
              <div className="flex flex-col">
                <div className="flex justify-between items-baseline text-[10px] font-bold mb-1">
                  <span className="text-slate-500">累计实际成本支出</span>
                  <span className="font-mono text-slate-700 text-xs">
                    ¥{COST_DATA.actual}万 <span className="text-slate-400 text-[9px] font-normal">/ 预算 {COST_DATA.budget}万</span>
                  </span>
                </div>
                
                {/* Stacked segment bar */}
                <div className="h-2.5 rounded-full overflow-hidden flex border border-slate-100">
                  {COST_DATA.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ width: `${item.percentage}%` }}
                      className={cn("h-full transition-all", item.color)}
                      title={`${item.name}: ${item.percentage}%`}
                    />
                  ))}
                </div>
              </div>

              {/* Split list */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-0.5">
                {COST_DATA.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col group relative">
                    <div className="flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-sm shrink-0", item.color)}></span>
                      <span className="text-[9px] font-bold text-slate-500 truncate" title={item.name}>{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-700 font-mono mt-0.5 ml-2.5">
                      ¥{item.value}万 <span className="text-slate-400 text-[8px] font-bold">({item.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

      </div>



      {/* Section for Project Share as requested */}
      {orgLevel !== '项目部' && (
        <div className="w-full">
          {/* Right Card: 项目产值占比 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-150 p-5 select-none flex flex-col justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                  <h3 className="font-black text-sm text-slate-850 tracking-tight">
                    {orgLevel === '集团' && '集团各区域中心产值占比'}
                    {orgLevel === '区域中心' && '区域内各项目部产值占比'}
                    {orgLevel === '项目部' && '项目部日常管养产值占比'}
                  </h3>
                </div>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-black font-mono">
                  本月统计
                </span>
              </div>

              {/* Chart + Legend side-by-side flex representation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full py-4">
                
                {/* Donut Chart Container */}
                <div className="w-full sm:w-[50%] h-[220px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={GET_CHART_DATA(orgLevel)}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {GET_CHART_DATA(orgLevel).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend in the middle of donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider">
                      {orgLevel === '集团' && '集团总完成'}
                      {orgLevel === '区域中心' && '区域总产值'}
                      {orgLevel === '项目部' && '总入账额'}
                    </span>
                    <span className="text-lg font-black text-slate-800 font-mono">
                      {orgLevel === '集团' && '3.42 亿'}
                      {orgLevel === '区域中心' && '4510万'}
                      {orgLevel === '项目部' && '12.5万'}
                    </span>
                  </div>
                </div>

                {/* Vertical Detailed Legend */}
                <div className="w-full sm:w-[50%] flex flex-col gap-3.5 justify-center pl-0 sm:pl-6 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0">
                  {GET_CHART_DATA(orgLevel).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span 
                        className="w-4 h-4 rounded-md shrink-0 shadow-3xs border border-white" 
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-750 truncate">{item.name}</span>
                        <span className="text-[11px] font-mono text-slate-400 font-bold">
                          {item.value}% | ¥
                          {orgLevel === '集团' && `${(342 * item.value / 100).toFixed(1)} 百万`}
                          {orgLevel === '区域中心' && `${(4510 * item.value / 100).toFixed(0)} 万元`}
                          {orgLevel === '项目部' && (125649.64 * item.value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Analytical Footnote */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed font-medium">
              💡 <span className="font-bold text-slate-650">多级产值智能分析：</span>
              {orgLevel === '集团' && '当前季度大区核心运营情况中，杭州北中心贡献了35%的体量，宁波中心占比28%。集团总体季度产值指标完成顺畅，暂无高偏离度标段。'}
              {orgLevel === '区域中心' && '区域内生产计划执行分析：下辖杭州北项目部大中修现场产值达1840万，各路段项目均有序抢抓施工黄金节点。'}
              {orgLevel === '项目部' && '项目部日常管养产值分析：本月以道路养护为主导，产值占比45%，其次是桥梁维护25%。全标段总预算执行状态良好，班组效率正常。'}
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING MASCOT COMPANION ================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.div 
          animate={isChatOpen ? "open" : "closed"}
          className="relative"
        >
          {/* Main Mascot Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-white relative group overflow-hidden"
          >
            {/* Hard-hat mascot illustration layout */}
            <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            
            {/* Mascot face / graphics */}
            <div className="flex flex-col items-center justify-center">
              {/* Miner helmet styled arc */}
              <div className="w-9 h-3.5 bg-yellow-400 rounded-t-full border border-yellow-500 flex items-center justify-center -mb-0.5 z-10">
                <span className="text-[6px] font-bold text-gray-800 scale-75">养护</span>
              </div>
              {/* Cute avatar face */}
              <div className="w-8 h-8 rounded-full bg-[#ffedd5] border border-blue-400 overflow-hidden flex items-center justify-center text-lg shadow-inner">
                🧑‍🔧
              </div>
            </div>

            {/* Glowing sparkle badge */}
            <span className="absolute top-1 right-1 bg-red-500 w-2.5 h-2.5 rounded-full ring-2 ring-white"></span>
          </motion.button>

          {/* Prompt bubble pop up */}
          {!isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="absolute right-20 top-3 bg-white text-xs border border-blue-100 rounded-xl px-3 py-1.5 font-semibold text-blue-700 shadow-md whitespace-nowrap leading-none before:absolute before:right-[-6px] before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-l-white"
            >
              您好，我是养乐多 ⚡️
            </motion.div>
          )}

          {/* Interactive Chat Tray panel */}
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="absolute bottom-20 right-0 w-[380px] bg-white border border-gray-150 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50"
            >
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">智能助理「养乐多」</h3>
                    <p className="text-[10px] text-white/70">养护一体化智能服务助手</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/85 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Messages Screen */}
              <div className="h-64 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex max-w-[85%] flex-col rounded-2xl p-3 text-xs leading-normal leading-relaxed shadow-sm whitespace-pre-line",
                      msg.sender === 'user' 
                        ? "bg-blue-600 text-white rounded-br-none self-end ml-auto" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none self-start"
                    )}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Suggestions shortcuts */}
              <div className="px-4 py-2 border-t border-gray-100 flex gap-1.5 overflow-x-auto bg-white whitespace-nowrap">
                <button 
                  onClick={() => { setUserInput('查询我的收入合同'); }}
                  className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold border border-blue-100 px-2.5 py-1 rounded-full"
                >
                  📝 查我的合同
                </button>
                <button 
                  onClick={() => { setUserInput('获取立项项目的状态'); }}
                  className="text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold border border-emerald-100 px-2.5 py-1 rounded-full"
                >
                  🚀 查项目状态
                </button>
              </div>

              {/* Chat Send Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="说一些您的困惑，例如：查询收入合同清单..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:border-blue-500 outline-none"
                />
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}

        </motion.div>
      </div>

    </div>
  );
}
