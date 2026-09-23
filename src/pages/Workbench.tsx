import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  BarChart3,
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  Wallet,
  Briefcase,
  HandCoins,
  Landmark,
  MapPin,
  Truck,
  Gauge,
  HardHat,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Video,
  Battery,
  Navigation,
  Radio,
  Clock,
  PlayCircle,
  Signal,
  Plane,
  Newspaper,
  Bot,
  Plus,
  Trash2,
  RefreshCw,
  CalendarClock,
  Sparkle,
  Settings,
  Loader2,
  Database,
  Filter,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Clock3,
  Layers,
  LayoutDashboard,
  PackageOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Line, ComposedChart } from 'recharts';
import { getFrameworks, getCompTypes, getComponents, getTemplates, getPortalCurrentUser, getAvailableTemplatesForUser, getUserPortalLayout, saveUserPortalLayout } from './portal/portalStore';
import type { PortalFramework, ComponentType, PortalComponent, PortalTemplate } from './portal/types';
import type { UserPortalLayout } from './portal/portalStore';

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
  return `四月${dayNum}`;
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
  annualPlan: 5200,
  accumulated: 3380,
  currentPeriod: 450,
  approvedPeriod: 380,
  completionRate: 65.0,
};

const COST_DATA = {
  budget: 3000,
  actual: 2450.5,
  items: [
    { name: '人工费 (工)', value: 686.1, percentage: 28, color: 'bg-indigo-500', text: '班组劳务分包、考勤工日、特殊补贴' },
    { name: '材料费 (料)', value: 1151.7, percentage: 47, color: 'bg-amber-500', text: '沥青混合料、钢护栏、各类管材砂石' },
    { name: '机械使用 (机)', value: 441.1, percentage: 18, color: 'bg-emerald-500', text: '特种作业车、摊铺机、租赁与油耗燃料' },
    { name: '其他直接费', value: 171.6, percentage: 7, color: 'bg-rose-500', text: '现场安全文明施工、临时设施、现场办公' }
  ]
};

const COLLECTION_DATA = {
  annualBase: 5000,
  collected: 3200,
  uncollected: 1800,
  completionRate: 64.0,
};

// Comprehensive dashboard data
const NEW_CONTRACT_DATA = {
  total: 68500,
  unit: '万元',
  items: [
    { name: '交工沪杭甬', value: 28000, color: '#3b82f6' },
    { name: '顺桥养护', value: 22000, color: '#06b6d4' },
    { name: '交工养护', value: 17000, color: '#8b5cf6' },
  ],
};

const PROJECT_CONTRACT_DATA = {
  currentYear: 26800,
  targetRevenue: 35000,
  completionRate: 76.57,
  distribution: [
    { name: '交工沪杭甬', value: 40, color: '#3b82f6' },
    { name: '顺桥养护', value: 29.7, color: '#06b6d4' },
    { name: '交工养护', value: 24.24, color: '#8b5cf6' },
    { name: '其他', value: 6.06, color: '#94a3b8' },
  ],
};

const JOINT_VENTURE_DATA = {
  total: 28,
  jiaogong: 8,
  annualRevenue: 2.85,
  companies: [
    { name: '丽水市缙云万力沥青材料研发有限公司', equity: 45.0, staff: 6, revenue: 8520.8 },
    { name: '丽水市恒安交通设施有限公司', equity: 35.0, staff: 4, revenue: 4910.4 },
    { name: '浙江交科智行科技有限公司', equity: 51.0, staff: 12, revenue: 12350.0 },
    { name: '杭州交工养护技术有限公司', equity: 40.0, staff: 8, revenue: 6780.5 },
  ],
};

const BUSINESS_KPI_DATA = {
  profitRates: [
    { label: '利润总额', value: '28.5亿', change: '+12.3%' },
    { label: '资产负债率', value: '68.5%', change: '-2.1%' },
    { label: '净资产收益率', value: '12.3%', change: '+0.8%' },
    { label: '研发投入强度', value: '3.8%', change: '+0.5%' },
    { label: '劳动生产率', value: '486万/人', change: '+8.2%' },
    { label: '营业收现率', value: '92.6%', change: '+3.4%' },
  ],
  personnel: { total: 1280, formal: 850, outsourced: 430, avgAge: 36.5 },
  equipment: { total: 426, onSite: 112, rented: 85, rentalCost: 1420.0 },
  maintenance: { total: 8290, regions: [
    { name: '省内交投内', value: 4220 },
    { name: '省内交投外', value: 2220 },
    { name: '省外', value: 1520 },
    { name: '海外', value: 330 },
  ]},
  projectDistribution: [
    { name: '杭州', value: 12 },
    { name: '宁波', value: 8 },
    { name: '温州', value: 6 },
    { name: '嘉兴', value: 5 },
    { name: '湖州', value: 4 },
    { name: '其他', value: 9 },
  ],
};

const DASHBOARD_MEASUREMENT_DATA = {
  outputValue: 45280,
  reportedMeasurement: 38150,
  receivedPayment: 2170,
  measurementReceived: 32770,
  measurementRatio: 84.25,
  collectionRatio: 77.16,
};

const DASHBOARD_PROGRESS_DATA = {
  annualPlan: 50000,
  annualActual: 45280,
  achievementRate: 90.56,
  monthly: [
    { month: '1月', planned: 3800, actual: 3650 },
    { month: '2月', planned: 3600, actual: 3420 },
    { month: '3月', planned: 4100, actual: 3980 },
    { month: '4月', planned: 4200, actual: 4150 },
    { month: '5月', planned: 4300, actual: 4280 },
    { month: '6月', planned: 4500, actual: 4450 },
    { month: '7月', planned: 4400, actual: 4380 },
    { month: '8月', planned: 4200, actual: 4120 },
    { month: '9月', planned: 4100, actual: 4050 },
    { month: '10月', planned: 4000, actual: 3980 },
    { month: '11月', planned: 3900, actual: 3850 },
    { month: '12月', planned: 3800, actual: 2120 },
  ],
};

const DASHBOARD_COLLECTION_DATA = {
  regions: [
    { name: '杭州', base: 8800, collected: 7200, rate: 90, uncollected: -800 },
    { name: '绍兴', base: 5000, collected: 4250, rate: 85, uncollected: -750 },
    { name: '甬舟', base: 4500, collected: 3600, rate: 80, uncollected: -900 },
    { name: '嘉兴', base: 4000, collected: 3000, rate: 75, uncollected: -1000 },
    { name: '台州', base: 3500, collected: 2450, rate: 70, uncollected: -1050 },
    { name: '温州', base: 6000, collected: 3900, rate: 65, uncollected: -2100 },
    { name: '金衢', base: 4200, collected: 2520, rate: 60, uncollected: -1680 },
    { name: '湖州', base: 3800, collected: 1550, rate: 55, uncollected: -2250 },
  ],
};

// Drone inspection data
const DRONE_DATA = {
  status: {
    name: '大疆经纬 M350 RTK',
    online: true,
    battery: 78,
    gpsSignal: '强',
    satellites: 18,
    altitude: 120,
    speed: 15.3,
    flightMode: '自动巡航',
    temperature: 32,
    lastUpdate: '2026-08-05 14:32',
  },
  flightRecords: [
    { id: 'FL-0805-01', date: '2026-08-05', route: '杭徽高速K15-K20段', duration: '32分钟', distance: '4.2km', area: '0.8km²', status: '已完成' },
    { id: 'FL-0804-02', date: '2026-08-04', route: '沪杭甬临平段', duration: '45分钟', distance: '6.5km', area: '1.2km²', status: '已完成' },
    { id: 'FL-0803-01', date: '2026-08-03', route: '杭州绕城北段', duration: '28分钟', distance: '3.8km', area: '0.7km²', status: '已完成' },
    { id: 'FL-0802-01', date: '2026-08-02', route: '杭徽高速K8-K12段', duration: '38分钟', distance: '5.1km', area: '0.9km²', status: '已完成' },
  ],
  videos: [
    { id: 'V1', title: '杭徽高速巡查航拍', date: '2026-08-05', duration: '32:15', size: '1.2GB' },
    { id: 'V2', title: '沪杭甬临平段航拍', date: '2026-08-04', duration: '45:02', size: '1.8GB' },
    { id: 'V3', title: '杭州绕城北段航拍', date: '2026-08-03', duration: '28:30', size: '0.9GB' },
  ],
};

// AI News default config and mock content
interface AINewsConfig {
  keywords: string[];
  outputStyle: 'brief' | 'detailed' | 'bullet';
  pushEnabled: boolean;
  pushTime: string;
  pushFrequency: 'daily' | 'weekly';
}

const DEFAULT_AI_NEWS_CONFIG: AINewsConfig = {
  keywords: ['公路养护', '交通基础设施', '智慧交通'],
  outputStyle: 'brief',
  pushEnabled: true,
  pushTime: '08:00',
  pushFrequency: 'daily',
};

const AI_NEWS_STORAGE_KEY = 'cico-ai-news-config-v1';

const SUGGESTED_KEYWORDS = [
  '公路养护', '交通基础设施', '智慧交通', '桥梁工程', '隧道施工',
  '沥青路面', '高速公路', '工程招标', '安全生产', '绿色建造',
  '数字化转型', '新基建', '乡村振兴', '碳达峰', 'PPP项目'
];

const OUTPUT_STYLE_LABELS: Record<AINewsConfig['outputStyle'], string> = {
  brief: '简报摘要（3条）',
  detailed: '详细分析（5条+解读）',
  bullet: '要点速览（要点列表）',
};

const mockAINewsContent = (config: AINewsConfig): { title: string; summary: string; source: string; time: string; tag: string }[] => {
  const pool: Record<string, { title: string; summary: string; source: string; tag: string }[]> = {
    '公路养护': [
      { title: '交通运输部发布2026年公路养护提质升级指导意见', summary: '重点强调预防性养护与精细化管养，明确各省年度养护投入不得低于上年度通行费收入的15%，推广"四新"技术应用。', source: '交通运输部官网', tag: '政策动态' },
      { title: '浙江省率先完成高速公路智慧养护平台全覆盖', summary: '全省4,200公里高速公路实现AI巡检+自动化病害识别，养护效率提升40%，病害发现率提升至98.5%。', source: '中国交通报', tag: '行业新闻' },
    ],
    '交通基础设施': [
      { title: '国家发改委下达2026年交通基础设施投资计划', summary: '全国交通基础设施投资规模达3.2万亿元，其中公路建设占比42%，重点向中西部及乡村振兴道路倾斜。', source: '国家发改委', tag: '政策动态' },
      { title: '长三角一体化交通走廊建设进入冲刺阶段', summary: '沪苏湖高铁、申苏浙皖高速改扩建等重大项目进度超80%，预计年底前陆续通车。', source: '新华网', tag: '行业新闻' },
    ],
    '智慧交通': [
      { title: '交通运输部联合工信部推进智慧公路试点扩容', summary: '新增12个智慧公路试点省份，重点支持车路协同、数字孪生及全要素感知技术应用。', source: '交通运输部官网', tag: '政策动态' },
      { title: '百度Apollo中标杭州绕城高速智慧化改造项目', summary: '项目总投资1.2亿元，覆盖56公里高速路段，部署AI视频分析、边缘计算及毫米波雷达感知系统。', source: '36氪', tag: '科技前沿' },
    ],
    '桥梁工程': [
      { title: '世界最大跨度悬索桥——张靖皋长江大桥北主塔封顶', summary: '北主塔高350米，为世界最高悬索桥桥塔，项目整体进度达65%，预计2027年建成通车。', source: '央视新闻', tag: '工程聚焦' },
      { title: '交通运输部开展全国公路桥梁安全隐患排查专项行动', summary: '重点排查四、五类桥梁及运行30年以上老旧桥梁，要求年底前完成全部排查并建立"一桥一档"。', source: '交通运输部官网', tag: '政策动态' },
    ],
    '隧道施工': [
      { title: '川藏铁路最难隧道——折多山隧道贯通在即', summary: '隧道全长32.6公里，最大埋深1,825米，克服高地应力岩爆等13项世界级难题，预计9月贯通。', source: '人民日报', tag: '工程聚焦' },
    ],
    '沥青路面': [
      { title: '温拌沥青技术国家标准正式发布实施', summary: 'GB/T 51334-2026于8月1日起实施，较传统热拌节能30%、减排50%，推动绿色养护全面推广。', source: '国家标准委', tag: '政策动态' },
      { title: '废旧沥青路面材料再生利用率突破95%', summary: '交通运输部科学研究院最新成果实现RAP高效再生，成本降低20%，已在浙江、江苏等省规模化应用。', source: '中国公路', tag: '科技前沿' },
    ],
    '高速公路': [
      { title: '全国高速公路通车里程突破19万公里', summary: '2026年上半年新增通车里程3,200公里，其中西部占比58%，稳步推进"县县通高速"目标。', source: '交通运输部官网', tag: '行业新闻' },
    ],
    '工程招标': [
      { title: '浙江交工集团中标G60沪昆高速改扩建项目', summary: '中标金额28.6亿元，路线全长42公里，工期36个月，为浙江年内最大公路改扩建标段。', source: '浙江省公共资源交易中心', tag: '招标信息' },
    ],
    '安全生产': [
      { title: '交通运输部部署夏季公路施工安全专项检查', summary: '针对高温、汛期施工特点，重点检查深基坑、高支模、特种设备等高风险作业环节。', source: '交通运输部官网', tag: '政策动态' },
    ],
    '绿色建造': [
      { title: '住建部发布公路工程绿色建造评价标准', summary: '从节能、节水、节材、环保四大维度建立量化指标体系，推动公路建设向低碳化转型。', source: '住建部官网', tag: '政策动态' },
    ],
    '数字化转型': [
      { title: '浙江交工"BIM+GIS"数字化养护平台获全国推广', summary: '实现养护全生命周期数据贯通，病害从发现到处置平均缩短至4小时，年节约养护成本约3,200万元。', source: '中国交通信息化', tag: '科技前沿' },
    ],
    '新基建': [
      { title: '浙江省新基建三年行动方案发布，交通领域投资超800亿', summary: '重点布局智慧高速、新能源充电网络、交通大数据中心，2026-2028年分步实施。', source: '浙江省发改委', tag: '政策动态' },
    ],
    '乡村振兴': [
      { title: '"四好农村路"全国示范县名单公布，新增48个', summary: '重点支持农村公路提档升级及产业路、旅游路建设，中央财政补助资金同比增长18%。', source: '交通运输部官网', tag: '政策动态' },
    ],
    '碳达峰': [
      { title: '交通领域碳达峰实施方案明确公路养护减排路径', summary: '推广温拌沥青、冷再生技术、光伏路面等低碳养护技术，力争2030年前实现养护环节碳达峰。', source: '生态环境部', tag: '政策动态' },
    ],
    'PPP项目': [
      { title: '财政部规范PPP新机制项目入库标准', summary: '聚焦使用者付费项目，明确公路领域PPP项目最低资本金比例提升至25%，严控地方政府隐性债务。', source: '财政部官网', tag: '政策动态' },
    ],
  };

  const results: { title: string; summary: string; source: string; time: string; tag: string }[] = [];
  config.keywords.forEach(kw => {
    const items = pool[kw] || [];
    items.forEach(item => {
      results.push({
        ...item,
        time: `${item.source.includes('官网') ? '今日' : '昨日'} ${10 + results.length}:${(15 + results.length * 7) % 60 < 10 ? '0' + (15 + results.length * 7) % 60 : (15 + results.length * 7) % 60}`,
      });
    });
  });

  // Add a general item if none matched
  if (results.length === 0) {
    results.push({
      title: '暂无匹配关注点的新闻资讯',
      summary: '请在配置中添加关注关键词后重新生成资讯摘要。',
      source: '系统提示',
      time: '刚刚',
      tag: '系统',
    });
  }

  const limit = config.outputStyle === 'detailed' ? 5 : config.outputStyle === 'brief' ? 3 : 99;
  return results.slice(0, limit);
};

// === Data Broadcast (系统数据播报) ===
interface FieldCondition {
  field: string;
  operator: 'all' | 'eq' | 'lte' | 'gte' | 'lt' | 'gt';
  value: string;
}

interface DataBroadcastConfig {
  fields: string[];
  conditions: FieldCondition[];
  pushEnabled: boolean;
  pushTime: string;
  pushFrequency: 'daily' | 'weekly';
}

const SYSTEM_FIELDS: { key: string; label: string; unit: string; type: 'text' | 'number' | 'percent' }[] = [
  { key: 'region', label: '区域', unit: '', type: 'text' },
  { key: 'outputValue', label: '产值', unit: '万元', type: 'number' },
  { key: 'measurement', label: '计量', unit: '万元', type: 'number' },
  { key: 'measurementRatio', label: '计量形象比', unit: '%', type: 'percent' },
  { key: 'collection', label: '收款', unit: '万元', type: 'number' },
  { key: 'collectionRatio', label: '收款率', unit: '%', type: 'percent' },
  { key: 'cost', label: '成本', unit: '万元', type: 'number' },
  { key: 'progress', label: '施工进度', unit: '%', type: 'percent' },
  { key: 'safetyDays', label: '安全天数', unit: '天', type: 'number' },
  { key: 'projectCount', label: '项目数', unit: '个', type: 'number' },
];

const FIELD_LABELS: Record<string, { label: string; unit: string }> = Object.fromEntries(
  SYSTEM_FIELDS.map(f => [f.key, { label: f.label, unit: f.unit }])
);

const OPERATOR_LABELS: Record<FieldCondition['operator'], string> = {
  all: '全部',
  eq: '等于',
  lte: '小于等于',
  gte: '大于等于',
  lt: '小于',
  gt: '大于',
};

const DEFAULT_DATA_BROADCAST_CONFIG: DataBroadcastConfig = {
  fields: ['region', 'outputValue', 'measurement', 'measurementRatio'],
  conditions: [
    { field: 'region', operator: 'all', value: '' },
    { field: 'measurementRatio', operator: 'lte', value: '80' },
  ],
  pushEnabled: true,
  pushTime: '08:00',
  pushFrequency: 'daily',
};

const DATA_BROADCAST_STORAGE_KEY = 'cico-data-broadcast-config-v1';

// Mock system data for each region
const SYSTEM_DATA_RECORDS: { region: string; outputValue: number; measurement: number; measurementRatio: number; collection: number; collectionRatio: number; cost: number; progress: number; safetyDays: number; projectCount: number }[] = [
  { region: '杭州北区域中心', outputValue: 8420, measurement: 7500, measurementRatio: 89.1, collection: 2170, collectionRatio: 28.9, cost: 7670, progress: 78.4, safetyDays: 1842, projectCount: 12 },
  { region: '宁波区域中心', outputValue: 6250, measurement: 5800, measurementRatio: 92.8, collection: 1850, collectionRatio: 31.9, cost: 5420, progress: 85.2, safetyDays: 1205, projectCount: 8 },
  { region: '温州区域中心', outputValue: 4980, measurement: 4200, measurementRatio: 84.3, collection: 1320, collectionRatio: 31.4, cost: 4350, progress: 72.6, safetyDays: 980, projectCount: 6 },
  { region: '金丽温区域中心', outputValue: 5680, measurement: 4900, measurementRatio: 86.2, collection: 1560, collectionRatio: 31.9, cost: 5100, progress: 76.8, safetyDays: 1530, projectCount: 7 },
  { region: '嘉兴项目部', outputValue: 3520, measurement: 2900, measurementRatio: 82.4, collection: 980, collectionRatio: 33.8, cost: 3180, progress: 68.5, safetyDays: 760, projectCount: 4 },
  { region: '湖州项目部', outputValue: 2980, measurement: 2300, measurementRatio: 77.2, collection: 720, collectionRatio: 31.3, cost: 2680, progress: 65.2, safetyDays: 645, projectCount: 3 },
  { region: '绍兴北项目部', outputValue: 2150, measurement: 1700, measurementRatio: 79.1, collection: 530, collectionRatio: 31.2, cost: 1980, progress: 63.4, safetyDays: 520, projectCount: 3 },
  { region: '台州项目部', outputValue: 3350, measurement: 2700, measurementRatio: 80.6, collection: 860, collectionRatio: 31.9, cost: 2980, progress: 70.1, safetyDays: 830, projectCount: 4 },
];

const querySystemData = (config: DataBroadcastConfig) => {
  let records = [...SYSTEM_DATA_RECORDS];

  config.conditions.forEach(cond => {
    if (cond.operator === 'all') return;
    const numVal = parseFloat(cond.value);
    if (isNaN(numVal)) return;
    records = records.filter(r => {
      const v = (r as Record<string, unknown>)[cond.field] as number;
      switch (cond.operator) {
        case 'eq': return v === numVal;
        case 'lte': return v <= numVal;
        case 'gte': return v >= numVal;
        case 'lt': return v < numVal;
        case 'gt': return v > numVal;
        default: return true;
      }
    });
  });

  return records;
};

const formatFieldValue = (record: Record<string, unknown>, field: string): string => {
  const v = record[field];
  const meta = FIELD_LABELS[field];
  if (!meta) return String(v);
  if (typeof v === 'number') {
    if (meta.unit === '%') return `${v.toFixed(1)}%`;
    return `${v.toLocaleString()} ${meta.unit}`;
  }
  return String(v);
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

// Widget system
const WIDGET_TITLES: Record<string, string> = {
  branding: '组织信息',
  levelWidget: '层级专属面板',
  shortcuts: '常用应用',
  processControl: '项目过程管控',
  todos: '待办事项',
  news: '公告栏',
  weather: '智能天气环境订阅',
  measurement: '年度计量执行',
  cost: '年度工料机及其他成本',
  collection: '收款进度',
  projectShare: '项目产值占比',
  marketNewContract: '市场经营-新签合同额',
  marketProjectContract: '市场经营-在建项目合同额',
  jointVenture: '合资公司情况',
  businessKPI: '经营内参指标',
  projectDistribution: '项目分布',
  dashboardMeasurement: '运营情况-计量支付',
  dashboardProgress: '运营情况-施工进度',
  dashboardCollection: '运营情况-收款进度',
  drone: '无人机巡检',
  aiNews: 'AI新闻资讯',
  dataBroadcast: '系统数据播报',
  feishuDocs: '每日资讯推送',
};

const COLUMN_TITLES: Record<string, string> = {
  left: '左侧栏（3/12）',
  middle: '中间栏（6/12）',
  right: '右侧栏（3/12）',
};

// 组件图标映射 - 用于布局设置弹窗中显示组件样式
const WIDGET_ICONS: Record<string, React.ReactNode> = {
  branding: <Building2 size={16} />,
  levelWidget: <Layers size={16} />,
  shortcuts: <Compass size={16} />,
  processControl: <Activity size={16} />,
  todos: <CheckCircle size={16} />,
  news: <Bell size={16} />,
  weather: <CloudSun size={16} />,
  measurement: <Ruler size={16} />,
  cost: <Wallet size={16} />,
  collection: <HandCoins size={16} />,
  projectShare: <BarChart3 size={16} />,
  marketNewContract: <Briefcase size={16} />,
  marketProjectContract: <FileText size={16} />,
  jointVenture: <Landmark size={16} />,
  businessKPI: <Gauge size={16} />,
  projectDistribution: <MapPin size={16} />,
  dashboardMeasurement: <BarChart3 size={16} />,
  dashboardProgress: <TrendingUp size={16} />,
  dashboardCollection: <Percent size={16} />,
  drone: <Plane size={16} />,
  aiNews: <Bot size={16} />,
  dataBroadcast: <Database size={16} />,
  feishuDocs: <Newspaper size={16} />,
};

// 组件描述映射
const WIDGET_DESCRIPTIONS: Record<string, string> = {
  branding: '当前组织层级与名称',
  levelWidget: '根据层级显示专属内容',
  shortcuts: '常用功能快捷入口',
  processControl: '项目过程管控看板',
  todos: '待办事项列表',
  news: '系统公告与通知',
  weather: '实时天气与环境数据',
  measurement: '年度计量执行情况',
  cost: '工料机及其他成本',
  collection: '收款进度与完成率',
  projectShare: '各项目产值占比',
  marketNewContract: '新签合同额统计',
  marketProjectContract: '在建项目合同额',
  jointVenture: '合资公司运营情况',
  businessKPI: '关键经营指标',
  projectDistribution: '项目地理分布',
  dashboardMeasurement: '计量支付运营数据',
  dashboardProgress: '施工进度运营数据',
  dashboardCollection: '收款进度运营数据',
  drone: '无人机状态与飞行记录',
  aiNews: 'AI汇总的新闻资讯',
  dataBroadcast: '系统内数据播报',
  feishuDocs: '飞书文件夹资讯推送',
};

// 组件主题色映射
const WIDGET_COLORS: Record<string, string> = {
  branding: 'from-blue-500 to-blue-600',
  levelWidget: 'from-indigo-500 to-indigo-600',
  shortcuts: 'from-cyan-500 to-cyan-600',
  processControl: 'from-orange-500 to-orange-600',
  todos: 'from-emerald-500 to-emerald-600',
  news: 'from-amber-500 to-amber-600',
  weather: 'from-sky-500 to-sky-600',
  measurement: 'from-violet-500 to-violet-600',
  cost: 'from-rose-500 to-rose-600',
  collection: 'from-teal-500 to-teal-600',
  projectShare: 'from-purple-500 to-purple-600',
  marketNewContract: 'from-pink-500 to-pink-600',
  marketProjectContract: 'from-fuchsia-500 to-fuchsia-600',
  jointVenture: 'from-lime-500 to-lime-600',
  businessKPI: 'from-red-500 to-red-600',
  projectDistribution: 'from-green-500 to-green-600',
  dashboardMeasurement: 'from-blue-500 to-indigo-600',
  dashboardProgress: 'from-orange-500 to-red-600',
  dashboardCollection: 'from-teal-500 to-cyan-600',
  drone: 'from-slate-600 to-slate-700',
  aiNews: 'from-indigo-500 to-purple-600',
  dataBroadcast: 'from-cyan-500 to-blue-600',
  feishuDocs: 'from-amber-500 to-orange-600',
};

// widget id 到组件类型 code 的映射（用于按组件类型分类）
const WIDGET_TYPE_CODE_MAP: Record<string, string> = {
  branding: 'general',
  levelWidget: 'general',
  shortcuts: 'general',
  processControl: 'eng',
  todos: 'general',
  news: 'general',
  weather: 'general',
  measurement: 'eng',
  cost: 'finance',
  collection: 'finance',
  projectShare: 'eng',
  marketNewContract: 'eng',
  marketProjectContract: 'eng',
  jointVenture: 'finance',
  businessKPI: 'finance',
  projectDistribution: 'eng',
  dashboardMeasurement: 'eng',
  dashboardProgress: 'eng',
  dashboardCollection: 'finance',
  drone: 'safety',
  aiNews: 'eng',
  dataBroadcast: 'finance',
  feishuDocs: 'eng',
};

interface LayoutConfig {
  left: string[];
  middle: string[];
  right: string[];
  hidden: string[];
}

const DEFAULT_LAYOUT: LayoutConfig = {
  left: ['branding', 'levelWidget', 'shortcuts'],
  middle: ['processControl', 'todos', 'news'],
  right: ['weather', 'measurement', 'cost', 'collection'],
  hidden: [
    'projectShare',
    'marketNewContract',
    'marketProjectContract',
    'jointVenture',
    'businessKPI',
    'projectDistribution',
    'dashboardMeasurement',
    'dashboardProgress',
    'dashboardCollection',
    'drone',
    'aiNews',
    'dataBroadcast',
    'feishuDocs',
  ],
};

const STORAGE_KEY = 'cico-workbench-layout-v1';

export default function Workbench() {
  const navigate = useNavigate();
  const [orgLevel, setOrgLevel] = useState<string>(() => localStorage.getItem('cico-org-level') || '集团');
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LayoutConfig;
        const known = new Set(Object.keys(WIDGET_TITLES));
        // Filter out widgets that no longer exist to keep saved layout clean
        const clean = (arr: string[]) => arr.filter(id => known.has(id));
        const merged: LayoutConfig = {
          left: clean(parsed.left),
          middle: clean(parsed.middle),
          right: clean(parsed.right),
          hidden: clean(parsed.hidden),
        };
        const all = new Set([...merged.left, ...merged.middle, ...merged.right, ...merged.hidden]);
        const missing = Object.keys(WIDGET_TITLES).filter(id => !all.has(id));
        if (missing.length === 0) {
          return merged;
        }
        // Newly added widgets are placed into hidden so users can enable them later
        return {
          ...merged,
          hidden: [...merged.hidden, ...missing],
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_LAYOUT;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<LayoutConfig>(layoutConfig);
  // 拖拽目标类型：slotId（框架槽位时） / keyof LayoutConfig（无框架回退/未显示区时）
  type DropTarget = keyof LayoutConfig | string;
  const [dropIndicator, setDropIndicator] = useState<{ column: DropTarget; index: number } | null>(null);
  const dragRef = useRef<{ id: string; source: DropTarget; index: number } | null>(null);

  // 加载门户框架和组件数据
  const [activeFramework, setActiveFramework] = useState<PortalFramework | null>(null);
  const [portalCompTypes, setPortalCompTypes] = useState<ComponentType[]>([]);
  const [portalComponents, setPortalComponents] = useState<PortalComponent[]>([]);

  // 用户门户配置相关状态
  const [currentUser, setCurrentUser] = useState(() => getPortalCurrentUser());
  const [availableTemplates, setAvailableTemplates] = useState<PortalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [userPortalLayout, setUserPortalLayout] = useState<UserPortalLayout | null>(null);
  // 用户在槽位中配置的组件 ID（widgetId）映射
  const [slotDraft, setSlotDraft] = useState<Record<string, string[]>>({});
  // 组件库当前激活的类型 tab
  const [activeCompTypeTab, setActiveCompTypeTab] = useState<string>('');

  useEffect(() => {
    // 加载当前层级的启用框架（默认取项目部层级）
    const frameworks = getFrameworks();
    const projectFw = frameworks.find(f => f.level === 'project' && f.status === 'enabled') || frameworks.find(f => f.status === 'enabled') || null;
    setActiveFramework(projectFw);
    const compTypes = getCompTypes();
    setPortalCompTypes(compTypes);
    setPortalComponents(getComponents());
    // 默认激活第一个组件类型 tab
    if (compTypes.length > 0) setActiveCompTypeTab(compTypes[0].code);

    // 加载当前用户可用的模板
    const user = getPortalCurrentUser();
    setCurrentUser(user);
    const templates = getAvailableTemplatesForUser(user);
    setAvailableTemplates(templates);
    // 加载已保存的用户门户配置
    const saved = getUserPortalLayout(user.id);
    if (saved && saved.frameworkId) {
      setUserPortalLayout(saved);
      setSelectedTemplateId(saved.templateId);
      setSlotDraft(saved.slotAssignments || {});
      // 切换框架到用户配置的框架
      const userFw = frameworks.find(f => f.id === saved.frameworkId) || projectFw;
      setActiveFramework(userFw);
      // 关键：从保存的 slotAssignments 转回三栏 LayoutConfig，让工作台页面按确认的布局渲染
      if (userFw && Object.keys(saved.slotAssignments || {}).length > 0) {
        const converted = portalLayoutToConfig(userFw, saved.slotAssignments || {});
        setLayoutConfig(converted);
        saveLayout(converted);
      }
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, []);

  const saveLayout = (config: LayoutConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  };

  // 保存用户门户配置并更新布局
  const saveUserPortal = (templateId: string, frameworkId: string, assignments: Record<string, string[]>) => {
    const layout: UserPortalLayout = {
      userId: currentUser.id,
      templateId,
      frameworkId,
      slotAssignments: assignments,
      updatedAt: new Date().toISOString(),
    };
    saveUserPortalLayout(layout);
    setUserPortalLayout(layout);
    // 将用户配置的槽位组件转换为 LayoutConfig（映射到三栏布局）
    const fw = getFrameworks().find(f => f.id === frameworkId);
    if (fw) {
      const newConfig = portalLayoutToConfig(fw, assignments);
      setLayoutConfig(newConfig);
      saveLayout(newConfig);
    }
  };

  // 将门户槽位配置转换为 LayoutConfig（三栏布局）
  const portalLayoutToConfig = (fw: PortalFramework, assignments: Record<string, string[]>): LayoutConfig => {
    const left: string[] = [];
    const middle: string[] = [];
    const right: string[] = [];
    const assigned = new Set<string>();
    fw.slots.forEach((slot, idx) => {
      const ids = assignments[slot.id] || [];
      const colKey = idx < fw.slots.length / 3 ? 'left' : idx < fw.slots.length * 2 / 3 ? 'middle' : 'right';
      ids.forEach(id => {
        if (!assigned.has(id)) {
          if (colKey === 'left') left.push(id);
          else if (colKey === 'middle') middle.push(id);
          else right.push(id);
          assigned.add(id);
        }
      });
    });
    // 未分配的组件放入 hidden
    const hidden = Object.values(WIDGET_TITLES).length > 0
      ? Object.keys(WIDGET_TITLES).filter(id => !assigned.has(id))
      : [];
    return { left, middle, right, hidden };
  };

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

  useEffect(() => {
    const handler = () => {
      setDraftConfig(layoutConfig);
      setIsSettingsOpen(true);
    };
    window.addEventListener('cico-workbench-settings-open', handler);
    return () => {
      window.removeEventListener('cico-workbench-settings-open', handler);
    };
  }, [layoutConfig]);

  const [selectedDayObj, setSelectedDayObj] = useState<any>(JUNE_2026_DAYS[13]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTodoTab, setActiveTodoTab] = useState('全部');
  const [todos, setTodos] = useState(() => GET_TODOS(orgLevel));

  useEffect(() => {
    setTodos(GET_TODOS(orgLevel));
  }, [orgLevel]);
  const [activeNewsTab, setActiveNewsTab] = useState('集团新闻');
  const [activeAppTab, setActiveAppTab] = useState<'shortcuts' | 'aiTools'>('shortcuts');
  const [weatherSegment, setWeatherSegment] = useState<'杭徽高速段' | '沪杭甬临平段' | '杭州绕城北段'>('杭徽高速段');
  const [droneTab, setDroneTab] = useState<'status' | 'records' | 'video'>('status');
  const [aiNewsConfig, setAiNewsConfig] = useState<AINewsConfig>(() => {
    try {
      const raw = localStorage.getItem(AI_NEWS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_AI_NEWS_CONFIG, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_AI_NEWS_CONFIG;
  });
  const [showAiNewsConfig, setShowAiNewsConfig] = useState(false);
  const [draftNewsConfig, setDraftNewsConfig] = useState<AINewsConfig>(aiNewsConfig);
  const [newKeyword, setNewKeyword] = useState('');
  const [aiNewsContent, setAiNewsContent] = useState<{ title: string; summary: string; source: string; time: string; tag: string }[]>([]);
  const [aiNewsLoading, setAiNewsLoading] = useState(false);
  const [aiNewsGenerated, setAiNewsGenerated] = useState(false);
  const [dataBroadcastConfig, setDataBroadcastConfig] = useState<DataBroadcastConfig>(() => {
    try {
      const raw = localStorage.getItem(DATA_BROADCAST_STORAGE_KEY);
      if (raw) return { ...DEFAULT_DATA_BROADCAST_CONFIG, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_DATA_BROADCAST_CONFIG;
  });
  const [showDataBroadcastConfig, setShowDataBroadcastConfig] = useState(false);
  const [draftBroadcastConfig, setDraftBroadcastConfig] = useState<DataBroadcastConfig>(dataBroadcastConfig);
  const [broadcastData, setBroadcastData] = useState<Record<string, unknown>[]>([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastGenerated, setBroadcastGenerated] = useState(false);
  const [feishuFiles, setFeishuFiles] = useState<{ name: string; token: string; type: string; url: string; modified_time: string; created_time: string }[]>([]);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [feishuError, setFeishuError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; token: string; modified_time: string; type: string } | null>(null);
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([
    { sender: 'assistant', text: '您好！我是您的智能助理【养乐多】。今天我为您准备了最新的工作排程，您有什么需要协助的吗？' }
  ]);
  const [userInput, setUserInput] = useState('');

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

  // Widget renderers
  const renderBranding = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden group">
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
  );

  const renderLevelWidget = () => {
    if (orgLevel === '集团') {
      return (
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
      );
    }
    if (orgLevel === '区域中心') {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 select-none space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-3.5 bg-blue-600 rounded-full"></span>
              <h3 className="font-bold text-xs text-gray-800 tracking-tight flex items-center gap-1">
                <span>区域项目进度</span>
              </h3>
            </div>
            <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.2 rounded font-bold">杭州北</span>
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
      );
    }
    return (
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
        <div className="flex items-center justify-between px-1">
          <button type="button" className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-black text-gray-800 font-mono">2026年06月</span>
          <button type="button" className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[9px] font-bold text-gray-400">
          {['一', '二', '三', '四', '五', '六', '日'].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
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
    );
  };

  const renderShortcuts = () => (
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
  );

  const renderProcessControl = () => (
    <div className="bg-white rounded-xl border border-blue-200/90 shadow-sm p-4 flex flex-col justify-between">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
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
  );

  const renderTodos = () => (
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
  );

  const renderNews = () => (
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
  );

  const renderWeather = () => (
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
      <div className="space-y-2.5">
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
  );

  const renderMeasurement = () => (
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
  );

  const renderCost = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-violet-600 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">年度工料机及其他成本</span>
        </div>
        <span className="text-[9px] text-slate-400 font-bold">预算控制内</span>
      </div>
      <div className="space-y-2.5">
        <div className="flex flex-col">
          <div className="flex justify-between items-baseline text-[10px] font-bold mb-1">
            <span className="text-slate-500">累计实际成本支出</span>
            <span className="font-mono text-slate-700 text-xs">
              ¥{COST_DATA.actual}万 <span className="text-slate-400 text-[9px] font-normal">/ 预算 {COST_DATA.budget}万</span>
            </span>
          </div>
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
  );

  const renderCollection = () => {
    const rate = COLLECTION_DATA.completionRate;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight">收款进度</span>
          </div>
          <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-black font-mono">
            完成率: {rate}%
          </span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-500">本年收款金额</span>
              <span className="font-mono text-amber-600">¥{COLLECTION_DATA.collected}万 <span className="text-slate-300 font-normal">/ 基数 {COLLECTION_DATA.annualBase}万</span></span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000" 
                style={{ width: `${rate}%` }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-bold">年度考核基数</span>
              <span className="text-[12px] font-black text-slate-700 font-mono mt-0.5">¥{COLLECTION_DATA.annualBase} 万元</span>
            </div>
            <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-2 flex flex-col justify-center">
              <span className="text-[9px] text-amber-700 font-bold">未收款金额</span>
              <span className="text-[12px] font-black text-amber-800 font-mono mt-0.5">¥{COLLECTION_DATA.uncollected} 万元</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-amber-50/50 border border-amber-100 rounded-lg p-2">
            <div className="flex items-center gap-1.5">
              <Wallet size={14} className="text-amber-600" />
              <span className="text-[10px] font-bold text-slate-600">当前项目部年度考核基数</span>
            </div>
            <span className="text-xs font-black text-amber-700 font-mono">¥{COLLECTION_DATA.annualBase}万</span>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectShare = () => (
    <div className="w-full">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full py-4">
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed font-medium">
          💡 <span className="font-bold text-slate-650">多级产值智能分析：</span>
          {orgLevel === '集团' && '当前季度大区核心运营情况中，杭州北中心贡献了35%的体量，宁波中心占比28%。集团总体季度产值指标完成顺畅，暂无高偏离度标段。'}
          {orgLevel === '区域中心' && '区域内生产计划执行分析：下辖杭州北项目部大中修现场产值达1840万，各路段项目均有序抢抓施工黄金节点。'}
          {orgLevel === '项目部' && '项目部日常管养产值分析：本月以道路养护为主导，产值占比45%，其次是桥梁维护25%。全标段总预算执行状态良好，班组效率正常。'}
        </div>
      </div>
    </div>
  );

  const renderMarketNewContract = () => {
    const max = Math.max(...NEW_CONTRACT_DATA.items.map(i => i.value));
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-blue-600 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight">市场经营-新签合同额</span>
          </div>
          <Briefcase size={14} className="text-blue-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800 font-mono">{NEW_CONTRACT_DATA.total.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 font-bold">{NEW_CONTRACT_DATA.unit}</span>
        </div>
        <div className="space-y-2">
          {NEW_CONTRACT_DATA.items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-600">{item.name}</span>
                <span className="font-mono text-slate-700">¥{item.value.toLocaleString()}万</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMarketProjectContract = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-indigo-600 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">市场经营-在建项目合同额</span>
        </div>
        <HandCoins size={14} className="text-indigo-500" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">本年度在建</div>
          <div className="text-[11px] font-black text-indigo-700 font-mono">¥{PROJECT_CONTRACT_DATA.currentYear.toLocaleString()}万</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">目标营收</div>
          <div className="text-[11px] font-black text-slate-700 font-mono">¥{PROJECT_CONTRACT_DATA.targetRevenue.toLocaleString()}万</div>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2">
          <div className="text-[9px] text-indigo-600 font-bold mb-0.5">完成进度</div>
          <div className="text-[11px] font-black text-indigo-800 font-mono">{PROJECT_CONTRACT_DATA.completionRate}%</div>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${PROJECT_CONTRACT_DATA.completionRate}%` }}></div>
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={PROJECT_CONTRACT_DATA.distribution}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {PROJECT_CONTRACT_DATA.distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PROJECT_CONTRACT_DATA.distribution.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></span>
            <span className="text-[9px] text-slate-600 font-bold truncate">{item.name}</span>
            <span className="text-[9px] font-mono text-slate-400 font-bold ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderJointVenture = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-emerald-600 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">合资公司情况</span>
        </div>
        <Landmark size={14} className="text-emerald-500" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">合资公司总数</div>
          <div className="text-sm font-black text-slate-800 font-mono">{JOINT_VENTURE_DATA.total} 家</div>
        </div>
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-2">
          <div className="text-[9px] text-emerald-600 font-bold mb-0.5">交工系</div>
          <div className="text-sm font-black text-emerald-800 font-mono">{JOINT_VENTURE_DATA.jiaogong} 家</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">年度总营收</div>
          <div className="text-sm font-black text-slate-800 font-mono">{JOINT_VENTURE_DATA.annualRevenue} 亿</div>
        </div>
      </div>
      <div className="space-y-2">
        {JOINT_VENTURE_DATA.companies.map((company, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-700 truncate">{company.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-slate-500 font-medium">参股 {company.equity}%</span>
                <span className="text-[9px] text-slate-500 font-medium">派驻 {company.staff} 人</span>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className="text-[10px] font-black text-emerald-700 font-mono">¥{company.revenue.toLocaleString()}万</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBusinessKPI = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-amber-500 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">经营内参指标</span>
        </div>
        <Activity size={14} className="text-amber-500" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BUSINESS_KPI_DATA.profitRates.map((kpi, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
            <div className="text-[9px] text-slate-400 font-bold truncate" title={kpi.label}>{kpi.label}</div>
            <div className="text-[11px] font-black text-slate-800 font-mono mt-0.5">{kpi.value}</div>
            <div className={cn(
              "text-[8px] font-bold mt-0.5 flex items-center justify-center gap-0.5",
              kpi.change.startsWith('+') ? "text-emerald-600" : "text-rose-600"
            )}>
              {kpi.change.startsWith('+') ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
              {kpi.change}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-blue-600" />
            <span className="text-[9px] font-bold text-slate-600">人员情况</span>
          </div>
          <div className="text-sm font-black text-slate-800 font-mono">{BUSINESS_KPI_DATA.personnel.total} 人</div>
          <div className="text-[9px] text-slate-500 font-medium mt-0.5">正式 {BUSINESS_KPI_DATA.personnel.formal} / 外包 {BUSINESS_KPI_DATA.personnel.outsourced}</div>
        </div>
        <div className="bg-violet-50/40 border border-violet-100 rounded-lg p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Truck size={12} className="text-violet-600" />
            <span className="text-[9px] font-bold text-slate-600">设备情况</span>
          </div>
          <div className="text-sm font-black text-slate-800 font-mono">{BUSINESS_KPI_DATA.equipment.total} 辆/台</div>
          <div className="text-[9px] text-slate-500 font-medium mt-0.5">在场 {BUSINESS_KPI_DATA.equipment.onSite} / 租赁 {BUSINESS_KPI_DATA.equipment.rented}</div>
        </div>
      </div>
      <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-emerald-600" />
            <span className="text-[9px] font-bold text-slate-600">养护里程</span>
          </div>
          <span className="text-xs font-black text-emerald-800 font-mono">{BUSINESS_KPI_DATA.maintenance.total} 公里</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_KPI_DATA.maintenance.regions.map((region, idx) => (
            <span key={idx} className="text-[9px] bg-white border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
              {region.name}: {region.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProjectDistribution = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-sky-500 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">项目分布</span>
        </div>
        <MapPin size={14} className="text-sky-500" />
      </div>
      <div className="relative h-[160px] bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold">项目覆盖区域</div>
            <div className="text-2xl font-black text-slate-800 font-mono mt-1">{BUSINESS_KPI_DATA.projectDistribution.reduce((a, b) => a + b.value, 0)}</div>
            <div className="text-[9px] text-slate-500 font-medium">个区域项目点</div>
          </div>
        </div>
        <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full opacity-20">
          <ellipse cx="200" cy="150" rx="160" ry="120" fill="#e2e8f0" />
          <ellipse cx="160" cy="130" rx="40" ry="30" fill="#94a3b8" />
          <ellipse cx="240" cy="140" rx="50" ry="35" fill="#94a3b8" />
          <ellipse cx="200" cy="190" rx="45" ry="25" fill="#94a3b8" />
          <ellipse cx="280" cy="110" rx="30" ry="20" fill="#94a3b8" />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BUSINESS_KPI_DATA.projectDistribution.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span className="text-[9px] font-bold text-slate-600">{item.name}</span>
            <span className="text-[9px] font-mono text-slate-800 font-bold ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboardMeasurement = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-cyan-600 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">运营情况-计量支付</span>
        </div>
        <Gauge size={14} className="text-cyan-600" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">开累产值</div>
          <div className="text-[11px] font-black text-slate-800 font-mono">¥{DASHBOARD_MEASUREMENT_DATA.outputValue.toLocaleString()}万</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">已上报计量</div>
          <div className="text-[11px] font-black text-slate-800 font-mono">¥{DASHBOARD_MEASUREMENT_DATA.reportedMeasurement.toLocaleString()}万</div>
        </div>
        <div className="bg-cyan-50/30 border border-cyan-100 rounded-lg p-2">
          <div className="text-[9px] text-cyan-700 font-bold mb-0.5">已收到回款</div>
          <div className="text-[11px] font-black text-cyan-800 font-mono">¥{DASHBOARD_MEASUREMENT_DATA.receivedPayment.toLocaleString()}万</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">已收计量款</div>
          <div className="text-[11px] font-black text-slate-800 font-mono">¥{DASHBOARD_MEASUREMENT_DATA.measurementReceived.toLocaleString()}万</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-slate-500">计量形象比</span>
            <span className="font-mono text-cyan-600">{DASHBOARD_MEASUREMENT_DATA.measurementRatio}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full" style={{ width: `${DASHBOARD_MEASUREMENT_DATA.measurementRatio}%` }}></div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-slate-500">收款计量比</span>
            <span className="font-mono text-blue-600">{DASHBOARD_MEASUREMENT_DATA.collectionRatio}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${DASHBOARD_MEASUREMENT_DATA.collectionRatio}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardProgress = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-violet-600 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">运营情况-施工进度</span>
        </div>
        <HardHat size={14} className="text-violet-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 font-bold mb-0.5">年度计划产值</div>
          <div className="text-[11px] font-black text-slate-800 font-mono">¥{DASHBOARD_PROGRESS_DATA.annualPlan.toLocaleString()}万</div>
        </div>
        <div className="bg-violet-50/30 border border-violet-100 rounded-lg p-2">
          <div className="text-[9px] text-violet-700 font-bold mb-0.5">年度实际产值</div>
          <div className="text-[11px] font-black text-violet-800 font-mono">¥{DASHBOARD_PROGRESS_DATA.annualActual.toLocaleString()}万</div>
        </div>
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-2">
          <div className="text-[9px] text-emerald-700 font-bold mb-0.5">达成率</div>
          <div className="text-[11px] font-black text-emerald-800 font-mono">{DASHBOARD_PROGRESS_DATA.achievementRate}%</div>
        </div>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={DASHBOARD_PROGRESS_DATA.monthly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: any, name: any) => [`${value}万`, name]}
            />
            <Bar dataKey="planned" name="计划" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
            <Line type="monotone" dataKey="actual" name="实际" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderDashboardCollection = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-rose-500 rounded-full"></span>
          <span className="font-black text-xs text-gray-800 tracking-tight">运营情况-收款进度</span>
        </div>
        <Wallet size={14} className="text-rose-500" />
      </div>
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
        {DASHBOARD_COLLECTION_DATA.regions.map((region, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">{region.name}</span>
                <span className={cn(
                  "text-[9px] font-black px-1 py-0.5 rounded font-mono",
                  region.rate >= 80 ? "bg-emerald-100 text-emerald-700" :
                  region.rate >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                )}>
                  {region.rate}%
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] text-slate-500 font-medium">基数 ¥{region.base.toLocaleString()}万</span>
                <span className="text-[9px] text-slate-500 font-medium">收款 ¥{region.collected.toLocaleString()}万</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDrone = () => {
    const d = DRONE_DATA.status;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-sky-600 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight">无人机巡检</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", d.online ? "bg-emerald-500 animate-pulse" : "bg-gray-300")}></span>
            <span className="text-[9px] font-bold text-slate-500">{d.online ? '在线' : '离线'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { key: 'status' as const, label: '实时状态', icon: <Signal size={10} /> },
            { key: 'records' as const, label: '飞行记录', icon: <Clock size={10} /> },
            { key: 'video' as const, label: '飞行视频', icon: <Video size={10} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setDroneTab(tab.key)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1",
                droneTab === tab.key ? "bg-sky-50 text-sky-600 border border-sky-100" : "text-gray-500 hover:text-sky-500 hover:bg-gray-50 border border-transparent"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status tab */}
        {droneTab === 'status' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
              <div className="p-1.5 bg-white rounded-lg border border-sky-100">
                <Plane size={16} className="text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black text-slate-800 truncate">{d.name}</div>
                <div className="text-[9px] text-slate-400 font-medium">最后更新: {d.lastUpdate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Battery size={11} className="text-emerald-600" />
                  <span className="text-[9px] text-slate-500 font-bold">电池电量</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800 font-mono">{d.battery}%</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", d.battery > 50 ? "bg-emerald-500" : d.battery > 20 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${d.battery}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Signal size={11} className="text-blue-600" />
                  <span className="text-[9px] text-slate-500 font-bold">GPS信号</span>
                </div>
                <div className="text-xs font-black text-slate-800 font-mono">{d.gpsSignal} <span className="text-[9px] text-slate-400 font-normal">({d.satellites}颗)</span></div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Navigation size={11} className="text-violet-600" />
                  <span className="text-[9px] text-slate-500 font-bold">飞行高度</span>
                </div>
                <div className="text-xs font-black text-slate-800 font-mono">{d.altitude} <span className="text-[9px] text-slate-400 font-normal">m</span></div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Wind size={11} className="text-cyan-600" />
                  <span className="text-[9px] text-slate-500 font-bold">飞行速度</span>
                </div>
                <div className="text-xs font-black text-slate-800 font-mono">{d.speed} <span className="text-[9px] text-slate-400 font-normal">m/s</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-sky-50/50 border border-sky-100 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <Radio size={12} className="text-sky-600" />
                <span className="text-[10px] font-bold text-slate-600">飞行模式</span>
              </div>
              <span className="text-[11px] font-black text-sky-700">{d.flightMode}</span>
            </div>
          </div>
        )}

        {/* Flight records tab */}
        {droneTab === 'records' && (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
            {DRONE_DATA.flightRecords.map((record, idx) => (
              <div key={idx} className="p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-700 truncate flex-1">{record.route}</span>
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded font-bold shrink-0 ml-1.5">{record.status}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-slate-500 font-medium">
                  <span className="flex items-center gap-0.5"><Clock size={9} />{record.date}</span>
                  <span>{record.duration}</span>
                  <span className="flex items-center gap-0.5"><Navigation size={9} />{record.distance}</span>
                  <span>覆盖 {record.area}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video tab */}
        {droneTab === 'video' && (
          <div className="space-y-2">
            {DRONE_DATA.videos.map((video, idx) => (
              <div key={idx} className="group cursor-pointer">
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden h-[72px] flex items-center justify-center border border-slate-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 to-slate-900/50"></div>
                  <PlayCircle size={28} className="text-white/80 group-hover:text-white group-hover:scale-110 transition-all relative z-10" />
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-mono font-bold text-white/90 bg-black/50 px-1 py-0.5 rounded">{video.duration}</span>
                  <span className="absolute top-1 left-1.5 text-[8px] font-bold text-white/80 bg-black/40 px-1 py-0.5 rounded">{video.date}</span>
                </div>
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <span className="text-[10px] font-bold text-slate-700 truncate flex-1">{video.title}</span>
                  <span className="text-[9px] font-mono text-slate-400 shrink-0 ml-2">{video.size}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const generateAiNews = useCallback(() => {
    setAiNewsLoading(true);
    setAiNewsGenerated(false);
    // Simulate AI fetching and summarizing news
    setTimeout(() => {
      const content = mockAINewsContent(aiNewsConfig);
      setAiNewsContent(content);
      setAiNewsLoading(false);
      setAiNewsGenerated(true);
    }, 1500);
  }, [aiNewsConfig]);

  const renderAINews = () => {
    const tagColors: Record<string, string> = {
      '政策动态': 'bg-blue-50 text-blue-700 border-blue-100',
      '行业新闻': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      '科技前沿': 'bg-violet-50 text-violet-700 border-violet-100',
      '工程聚焦': 'bg-amber-50 text-amber-700 border-amber-100',
      '招标信息': 'bg-rose-50 text-rose-700 border-rose-100',
      '系统': 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col min-h-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-indigo-600 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight flex items-center gap-1">
              <Newspaper size={13} className="text-indigo-600" />
              AI新闻资讯
            </span>
          </div>
          <button
            onClick={() => { setDraftNewsConfig({ ...aiNewsConfig }); setShowAiNewsConfig(true); }}
            className="p-1 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="配置新闻资讯"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Config summary */}
        <div className="flex flex-wrap items-center gap-1 mb-2.5">
          {aiNewsConfig.keywords.slice(0, 4).map(kw => (
            <span key={kw} className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-bold">
              {kw}
            </span>
          ))}
          {aiNewsConfig.keywords.length > 4 && (
            <span className="text-[9px] text-slate-400 font-bold">+{aiNewsConfig.keywords.length - 4}</span>
          )}
          <span className="text-[9px] text-slate-400 font-medium ml-auto flex items-center gap-0.5">
            <CalendarClock size={9} />
            {aiNewsConfig.pushEnabled ? `${aiNewsConfig.pushFrequency === 'daily' ? '每日' : '每周'} ${aiNewsConfig.pushTime}` : '未启用推送'}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-[160px]">
          {aiNewsLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Loader2 size={24} className="text-indigo-500 animate-spin" />
              <span className="text-[10px] text-slate-500 font-bold">AI 正在检索汇总新闻资讯...</span>
              <span className="text-[9px] text-slate-400">关注点: {aiNewsConfig.keywords.join('、')}</span>
            </div>
          ) : aiNewsContent.length > 0 ? (
            aiNewsContent.map((item, idx) => (
              <div key={idx} className="p-2 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[11px] font-black text-slate-800 leading-snug flex-1">{item.title}</span>
                  <span className={cn("text-[8px] px-1 py-0.5 rounded border font-bold shrink-0", tagColors[item.tag] || tagColors['系统'])}>
                    {item.tag}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed mb-1.5">
                  {aiNewsConfig.outputStyle === 'bullet' ? '• ' : ''}{item.summary}
                </p>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                  <span className="flex items-center gap-0.5"><ExternalLink size={9} />{item.source}</span>
                  <span>·</span>
                  <span>{item.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Sparkle size={24} className="text-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold text-center">
                {aiNewsGenerated ? '暂无匹配资讯' : '点击下方按钮生成资讯'}
              </span>
              <span className="text-[9px] text-slate-400 text-center max-w-[200px]">
                AI 将根据您配置的关注点自动检索并汇总最新新闻资讯
              </span>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={generateAiNews}
          disabled={aiNewsLoading}
          className="mt-3 w-full py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {aiNewsLoading ? (
            <><Loader2 size={12} className="animate-spin" />AI 检索中...</>
          ) : aiNewsContent.length > 0 ? (
            <><RefreshCw size={12} />重新生成资讯</>
          ) : (
            <><Bot size={12} />AI 生成资讯摘要</>
          )}
        </button>

        {/* Config Modal */}
        {showAiNewsConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAiNewsConfig(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Newspaper size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-gray-900">AI 新闻资讯配置</h2>
                    <p className="text-[10px] text-slate-500">设置关注点、输出方式与推送时间</p>
                  </div>
                </div>
                <button onClick={() => setShowAiNewsConfig(false)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-5">
                {/* Keywords section */}
                <div>
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-2">
                    <Sparkle size={12} className="text-indigo-500" />
                    关注关键词
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                    {draftNewsConfig.keywords.length === 0 && (
                      <span className="text-[10px] text-slate-400 self-center">请添加关注关键词...</span>
                    )}
                    {draftNewsConfig.keywords.map(kw => (
                      <span key={kw} className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold">
                        {kw}
                        <button onClick={() => setDraftNewsConfig(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }))} className="hover:text-rose-500">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* Add keyword input */}
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          if (!draftNewsConfig.keywords.includes(newKeyword.trim())) {
                            setDraftNewsConfig(prev => ({ ...prev, keywords: [...prev.keywords, newKeyword.trim()] }));
                          }
                          setNewKeyword('');
                        }
                      }}
                      placeholder="输入关键词后回车添加..."
                      className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                    />
                    <button
                      onClick={() => {
                        if (newKeyword.trim() && !draftNewsConfig.keywords.includes(newKeyword.trim())) {
                          setDraftNewsConfig(prev => ({ ...prev, keywords: [...prev.keywords, newKeyword.trim()] }));
                          setNewKeyword('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-colors flex items-center gap-0.5"
                    >
                      <Plus size={12} />添加
                    </button>
                  </div>
                  {/* Suggested keywords */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold">推荐关键词:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {SUGGESTED_KEYWORDS.filter(k => !draftNewsConfig.keywords.includes(k)).map(kw => (
                        <button
                          key={kw}
                          onClick={() => setDraftNewsConfig(prev => ({ ...prev, keywords: [...prev.keywords, kw] }))}
                          className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-colors"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Output style */}
                <div>
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-2">
                    <FileText size={12} className="text-indigo-500" />
                    输出方式
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['brief', 'detailed', 'bullet'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => setDraftNewsConfig(prev => ({ ...prev, outputStyle: style }))}
                        className={cn(
                          "py-2 px-2 rounded-lg text-[10px] font-bold border transition-all text-center",
                          draftNewsConfig.outputStyle === style
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-100 hover:bg-slate-50"
                        )}
                      >
                        {OUTPUT_STYLE_LABELS[style]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Push schedule */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                      <Bell size={12} className="text-indigo-500" />
                      定时推送
                    </label>
                    <button
                      onClick={() => setDraftNewsConfig(prev => ({ ...prev, pushEnabled: !prev.pushEnabled }))}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors",
                        draftNewsConfig.pushEnabled ? "bg-indigo-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        draftNewsConfig.pushEnabled ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  {draftNewsConfig.pushEnabled && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">推送频率</span>
                        <select
                          value={draftNewsConfig.pushFrequency}
                          onChange={e => setDraftNewsConfig(prev => ({ ...prev, pushFrequency: e.target.value as 'daily' | 'weekly' }))}
                          className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                        >
                          <option value="daily">每日推送</option>
                          <option value="weekly">每周推送</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">推送时间</span>
                        <input
                          type="time"
                          value={draftNewsConfig.pushTime}
                          onChange={e => setDraftNewsConfig(prev => ({ ...prev, pushTime: e.target.value }))}
                          className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info note */}
                <div className="flex items-start gap-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5">
                  <Bot size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    配置保存后，AI 将根据您设置的<strong className="text-indigo-600">关注关键词</strong>自动检索最新新闻资讯，按<strong className="text-indigo-600">{OUTPUT_STYLE_LABELS[draftNewsConfig.outputStyle]}</strong>方式输出摘要，并在设定时间自动推送。
                  </p>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => { setDraftNewsConfig(DEFAULT_AI_NEWS_CONFIG); }}
                  className="text-[11px] text-slate-500 hover:text-rose-500 font-bold transition-colors"
                >
                  恢复默认
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAiNewsConfig(false)}
                    className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setAiNewsConfig(draftNewsConfig);
                      localStorage.setItem(AI_NEWS_STORAGE_KEY, JSON.stringify(draftNewsConfig));
                      setShowAiNewsConfig(false);
                      setAiNewsGenerated(false);
                      setAiNewsContent([]);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateBroadcast = useCallback(() => {
    setBroadcastLoading(true);
    setBroadcastGenerated(false);
    setTimeout(() => {
      const records = querySystemData(dataBroadcastConfig);
      setBroadcastData(records as Record<string, unknown>[]);
      setBroadcastLoading(false);
      setBroadcastGenerated(true);
    }, 1500);
  }, [dataBroadcastConfig]);

  const renderDataBroadcast = () => {
    const queriedRecords = broadcastData;
    const hasAlerts = queriedRecords.some(r => {
      const ratio = r.measurementRatio as number;
      return ratio <= 80;
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col min-h-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-cyan-600 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight flex items-center gap-1">
              <Database size={13} className="text-cyan-600" />
              系统数据播报
            </span>
          </div>
          <button
            onClick={() => { setDraftBroadcastConfig({ ...dataBroadcastConfig, conditions: dataBroadcastConfig.conditions.map(c => ({ ...c })), fields: [...dataBroadcastConfig.fields] }); setShowDataBroadcastConfig(true); }}
            className="p-1 rounded-md hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 transition-colors"
            title="配置数据播报"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Config summary */}
        <div className="flex flex-wrap items-center gap-1 mb-2.5">
          {dataBroadcastConfig.fields.slice(0, 4).map(f => (
            <span key={f} className="text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded font-bold">
              {FIELD_LABELS[f]?.label || f}
            </span>
          ))}
          {dataBroadcastConfig.fields.length > 4 && (
            <span className="text-[9px] text-slate-400 font-bold">+{dataBroadcastConfig.fields.length - 4}</span>
          )}
          <span className="text-[9px] text-slate-400 font-medium ml-auto flex items-center gap-0.5">
            <CalendarClock size={9} />
            {dataBroadcastConfig.pushEnabled ? `${dataBroadcastConfig.pushFrequency === 'daily' ? '每日' : '每周'} ${dataBroadcastConfig.pushTime}` : '未启用推送'}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-[160px]">
          {broadcastLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Loader2 size={24} className="text-cyan-500 animate-spin" />
              <span className="text-[10px] text-slate-500 font-bold">AI 正在查询系统数据...</span>
              <span className="text-[9px] text-slate-400">查询条件: {dataBroadcastConfig.conditions.filter(c => c.operator !== 'all').map(c => `${FIELD_LABELS[c.field]?.label || c.field} ${OPERATOR_LABELS[c.operator]} ${c.value || '全部'}`).join('，')}</span>
            </div>
          ) : queriedRecords.length > 0 ? (
            <>
              {/* Summary bar */}
              <div className={cn(
                "flex items-center gap-1.5 rounded-lg p-2 border text-[10px] font-bold",
                hasAlerts ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
              )}>
                {hasAlerts ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                <span>共查询到 {queriedRecords.length} 条记录{hasAlerts ? `，其中 ${queriedRecords.filter(r => (r.measurementRatio as number) <= 80).length} 条需关注` : '，指标正常'}</span>
              </div>

              {/* Data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {dataBroadcastConfig.fields.map(f => (
                        <th key={f} className="text-left py-1 px-1.5 font-black text-slate-600 whitespace-nowrap">
                          {FIELD_LABELS[f]?.label || f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queriedRecords.map((record, idx) => {
                      const ratio = record.measurementRatio as number;
                      const isAlert = ratio <= 80;
                      return (
                        <tr key={idx} className={cn("border-b border-slate-50 hover:bg-cyan-50/30", isAlert && "bg-amber-50/40")}>
                          {dataBroadcastConfig.fields.map(f => (
                            <td key={f} className="py-1 px-1.5 font-mono text-slate-700 whitespace-nowrap">
                              {formatFieldValue(record, f)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alert list */}
              {hasAlerts && (
                <div className="space-y-1 mt-1">
                  <div className="text-[9px] font-black text-amber-600 flex items-center gap-0.5">
                    <TrendingDown size={10} /> 需关注项
                  </div>
                  {queriedRecords.filter(r => (r.measurementRatio as number) <= 80).map((r, idx) => (
                    <div key={idx} className="text-[9px] text-slate-600 bg-amber-50/60 border border-amber-100 rounded px-1.5 py-0.5">
                      <span className="font-bold text-slate-700">{String(r.region ?? '')}</span> 计量形象比 {(r.measurementRatio as number).toFixed(1)}%{FIELD_LABELS.measurement?.unit ? ` ${FIELD_LABELS.measurement.unit}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Database size={24} className="text-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold text-center">
                {broadcastGenerated ? '暂无匹配数据' : '点击下方按钮查询数据'}
              </span>
              <span className="text-[9px] text-slate-400 text-center max-w-[200px]">
                AI 将根据您配置的关注字段和筛选条件，从系统数据中查询并播报每日进度
              </span>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={generateBroadcast}
          disabled={broadcastLoading}
          className="mt-3 w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {broadcastLoading ? (
            <><Loader2 size={12} className="animate-spin" />查询中...</>
          ) : broadcastData.length > 0 ? (
            <><RefreshCw size={12} />重新查询</>
          ) : (
            <><Database size={12} />查询系统数据</>
          )}
        </button>

        {/* Config Modal */}
        {showDataBroadcastConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDataBroadcastConfig(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-w-[90vw] max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-50 rounded-lg">
                    <Database size={16} className="text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-gray-900">系统数据播报配置</h2>
                    <p className="text-[10px] text-slate-500">选择关注字段、设置筛选条件与推送时间</p>
                  </div>
                </div>
                <button onClick={() => setShowDataBroadcastConfig(false)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-5">
                {/* Field selection */}
                <div>
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-2">
                    <Filter size={12} className="text-cyan-500" />
                    关注字段
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SYSTEM_FIELDS.map(f => {
                      const selected = draftBroadcastConfig.fields.includes(f.key);
                      return (
                        <button
                          key={f.key}
                          onClick={() => {
                            setDraftBroadcastConfig(prev => ({
                              ...prev,
                              fields: selected
                                ? prev.fields.filter(k => k !== f.key)
                                : [...prev.fields, f.key]
                            }));
                          }}
                          className={cn(
                            "py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                            selected
                              ? "bg-cyan-50 text-cyan-700 border-cyan-200 ring-1 ring-cyan-200"
                              : "bg-white text-slate-600 border-slate-200 hover:border-cyan-100 hover:bg-slate-50"
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                  {draftBroadcastConfig.fields.length === 0 && (
                    <p className="text-[9px] text-rose-500 font-bold mt-1">请至少选择一个关注字段</p>
                  )}
                </div>

                {/* Filter conditions */}
                <div>
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1 mb-2">
                    <Filter size={12} className="text-cyan-500" />
                    筛选条件
                  </label>
                  <div className="space-y-2">
                    {draftBroadcastConfig.conditions.map((cond, idx) => {
                      const fieldMeta = SYSTEM_FIELDS.find(f => f.key === cond.field);
                      return (
                        <div key={idx} className="flex items-center gap-1.5">
                          {/* Field select */}
                          <select
                            value={cond.field}
                            onChange={e => {
                              const newField = e.target.value;
                              setDraftBroadcastConfig(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) =>
                                  i === idx ? { ...c, field: newField, operator: newField === 'region' ? 'all' : 'lte', value: '' } : c
                                )
                              }));
                            }}
                            className="flex-1 text-[10px] border border-slate-200 rounded-md px-1.5 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white min-w-0"
                          >
                            {SYSTEM_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                          {/* Operator select */}
                          <select
                            value={cond.operator}
                            onChange={e => {
                              const newOp = e.target.value as FieldCondition['operator'];
                              setDraftBroadcastConfig(prev => ({
                                ...prev,
                                conditions: prev.conditions.map((c, i) =>
                                  i === idx ? { ...c, operator: newOp } : c
                                )
                              }));
                            }}
                            className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
                          >
                            {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          {/* Value input */}
                          {cond.operator !== 'all' ? (
                            <input
                              type={fieldMeta?.type === 'text' ? 'text' : 'number'}
                              value={cond.value}
                              onChange={e => {
                                const val = e.target.value;
                                setDraftBroadcastConfig(prev => ({
                                  ...prev,
                                  conditions: prev.conditions.map((c, i) =>
                                    i === idx ? { ...c, value: val } : c
                                  )
                                }));
                              }}
                              placeholder={fieldMeta?.unit || '数值'}
                              className="w-16 text-[10px] border border-slate-200 rounded-md px-1.5 py-1 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold w-16 text-center">不限</span>
                          )}
                          {/* Delete condition */}
                          <button
                            onClick={() => {
                              setDraftBroadcastConfig(prev => ({
                                ...prev,
                                conditions: prev.conditions.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {/* Add condition */}
                    <button
                      onClick={() => {
                        setDraftBroadcastConfig(prev => ({
                          ...prev,
                          conditions: [...prev.conditions, { field: 'outputValue', operator: 'gte', value: '' }]
                        }));
                      }}
                      className="w-full py-1 border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-500 font-bold hover:border-cyan-300 hover:text-cyan-600 transition-colors flex items-center justify-center gap-0.5"
                    >
                      <Plus size={11} />添加筛选条件
                    </button>
                  </div>
                </div>

                {/* Push schedule */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                      <CalendarClock size={12} className="text-cyan-500" />
                      定时推送
                    </label>
                    <button
                      onClick={() => setDraftBroadcastConfig(prev => ({ ...prev, pushEnabled: !prev.pushEnabled }))}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors",
                        draftBroadcastConfig.pushEnabled ? "bg-cyan-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        draftBroadcastConfig.pushEnabled ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  {draftBroadcastConfig.pushEnabled && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">推送频率</span>
                        <select
                          value={draftBroadcastConfig.pushFrequency}
                          onChange={e => setDraftBroadcastConfig(prev => ({ ...prev, pushFrequency: e.target.value as 'daily' | 'weekly' }))}
                          className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
                        >
                          <option value="daily">每日推送</option>
                          <option value="weekly">每周推送</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block mb-1">推送时间</span>
                        <input
                          type="time"
                          value={draftBroadcastConfig.pushTime}
                          onChange={e => setDraftBroadcastConfig(prev => ({ ...prev, pushTime: e.target.value }))}
                          className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info note */}
                <div className="flex items-start gap-1.5 bg-cyan-50/50 border border-cyan-100 rounded-lg p-2.5">
                  <Database size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    配置保存后，系统将根据您选择的<strong className="text-cyan-600">关注字段</strong>和<strong className="text-cyan-600">筛选条件</strong>从系统数据库中查询数据，生成每日进度播报，并在设定时间自动推送。
                  </p>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => setDraftBroadcastConfig({ ...DEFAULT_DATA_BROADCAST_CONFIG, conditions: DEFAULT_DATA_BROADCAST_CONFIG.conditions.map(c => ({ ...c })), fields: [...DEFAULT_DATA_BROADCAST_CONFIG.fields] })}
                  className="text-[11px] text-slate-500 hover:text-rose-500 font-bold transition-colors"
                >
                  恢复默认
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDataBroadcastConfig(false)}
                    className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setDataBroadcastConfig(draftBroadcastConfig);
                      localStorage.setItem(DATA_BROADCAST_STORAGE_KEY, JSON.stringify(draftBroadcastConfig));
                      setShowDataBroadcastConfig(false);
                      setBroadcastGenerated(false);
                      setBroadcastData([]);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const fetchFeishuDocs = useCallback(async () => {
    setFeishuLoading(true);
    setFeishuError('');
    try {
      const resp = await fetch('/api/feishu-docs');
      const data = await resp.json();
      if (data.ok && data.files) {
        const sorted = [...data.files].sort((a: { modified_time: string }, b: { modified_time: string }) =>
          parseInt(b.modified_time) - parseInt(a.modified_time)
        );
        setFeishuFiles(sorted);
      } else {
        setFeishuError(data.error || '获取文件失败');
      }
    } catch {
      setFeishuError('网络请求失败，请检查服务是否正常运行');
    } finally {
      setFeishuLoading(false);
    }
  }, []);

  const fetchDocContent = useCallback(async (token: string, type?: string) => {
    setDocLoading(true);
    setDocError('');
    setDocContent('');
    try {
      const resp = await fetch(`/api/feishu-docs?token=${token}&type=${type || 'docx'}`);
      const data = await resp.json();
      if (data.ok) {
        setDocContent(data.content || '');
      } else {
        setDocError(data.error || '获取文档内容失败');
      }
    } catch {
      setDocError('网络请求失败');
    } finally {
      setDocLoading(false);
    }
  }, []);

  const openDocModal = (file: { name: string; token: string; modified_time: string; type: string }) => {
    setSelectedDoc(file);
    fetchDocContent(file.token, file.type);
  };

  const closeDocModal = () => {
    setSelectedDoc(null);
    setDocContent('');
    setDocError('');
    setDocLoading(false);
  };

  // Parse markdown or plain text content into structured news items
  const parseDocContent = (content: string) => {
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract date from content
    const dateMatch = content.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    // Extract focus area (markdown or plain text)
    const focusMatchMd = content.match(/\*\*本期聚焦[：:]\*\*(.*?)(?:\n|$)/);
    const focusMatchPlain = content.match(/(?:覆盖|本期聚焦)[：:](.*?)(?:\n|$)/);
    const focus = (focusMatchMd ? focusMatchMd[1] : focusMatchPlain ? focusMatchPlain[1] : '').trim();

    const items: { num: string; title: string; category: string; summary: string; source: string }[] = [];
    let match;

    // Pattern 1: Markdown bold numbered items (e.g., "**1. Title**")
    const itemRegexMd = /\*\*(\d+)\.\s*(.*?)\*\*[\s\S]*?\*\*【分类】\*\*(.*?)\n[\s\S]*?\*\*摘要[：:]\*\*(.*?)\n[\s\S]*?\*\*来源[：:]\*\*(.*?)(?:\n\n|\n(?=\*\*\d+\.))/g;
    while ((match = itemRegexMd.exec(content)) !== null) {
      items.push({
        num: match[1],
        title: match[2].trim(),
        category: match[3].trim(),
        summary: match[4].trim(),
        source: match[5].trim().replace(/\*/g, ''),
      });
    }

    // Pattern 2: Table format (| num | category | content |)
    if (items.length === 0) {
      const tableRowRegex = /\|\s*(\d+)\s*\|\s*\*\*(.*?)\*\*\s*\|\s*\*\*(.*?)\*\*\s*(.*?)(?=\||$)/g;
      while ((match = tableRowRegex.exec(content)) !== null) {
        const cellContent = match[4].trim();
        const sourceMatch = cellContent.match(/来源[：:](.*?)(?:\\?\||$)/);
        const summaryMatch = cellContent.match(/(.*?)(?:<br\/?>|来源)/s);
        items.push({
          num: match[1],
          title: match[3].trim(),
          category: match[2].trim(),
          summary: summaryMatch ? summaryMatch[1].trim().replace(/<br\/?>/g, '\n') : cellContent,
          source: sourceMatch ? sourceMatch[1].trim() : '',
        });
      }
    }

    // Pattern 3: Plain text format (from PDF extraction)
    // Matches: "1. Title\n【摘要】...\n【来源】...\n【分类】..."
    if (items.length === 0) {
      const plainRegex = /(\d+)\.\s*(.+?)\n\s*【摘要】\s*([\s\S]*?)\n\s*【来源】\s*(.*?)\n\s*【分类】\s*(.*?)(?=\n\s*\d+\.|$)/g;
      while ((match = plainRegex.exec(content)) !== null) {
        items.push({
          num: match[1],
          title: match[2].trim(),
          category: match[5].trim(),
          summary: match[3].trim().replace(/\n/g, ' '),
          source: match[4].trim(),
        });
      }
    }

    // Pattern 4: Plain-text table format (from newer PDF extraction)
    // Layout: header row "序号 类别 标题/摘要 信息来源 日期",
    // then per-item rows like:
    //   "<num> <category> <title> <source> <date>\n    <summary line 1>\n    <summary line 2>\n    ..."
    // Items are delimited by the next line starting with a number followed by a category keyword.
    if (items.length === 0) {
      // Pre-process: fix date fragments split across lines (PDF extraction artifact)
      // e.g. "2026-08-\n01" -> "2026-08-01"
      const fixedContent = content
        .replace(/(\d{4})-(\d{2})-\s*\n\s*(\d{2})/g, '$1-$2-$3')
        .replace(/(\d{4})-(\d{2})\s*\n\s*(\d{2})\b/g, (m, y, mo, d) => {
          const day = parseInt(d);
          if (day >= 1 && day <= 31) return `${y}-${mo}-${d}`;
          return m;
        });
      const sectionIdx = fixedContent.search(/一[、.]\s*热点新闻概览|序号\s+类别\s+标题/);
      if (sectionIdx >= 0) {
        const sectionStart = fixedContent.indexOf('序号', sectionIdx);
        const trendIdx = fixedContent.search(/二[、.]\s*重点领域|三[、.]\s*今日趋势点评/);
        const tableText = fixedContent.slice(
          sectionStart >= 0 ? sectionStart : sectionIdx,
          trendIdx > 0 ? trendIdx : fixedContent.length
        );
        // Drop the header line itself
        const tableLines = tableText.split('\n').filter(l => !/^\s*序号/.test(l) && l.trim());
        // Group lines into items: a new item starts when a line begins with a number
        const groups: string[][] = [];
        for (const line of tableLines) {
          if (/^\d+\s/.test(line.trim())) {
            groups.push([line.trim()]);
          } else if (groups.length > 0) {
            groups[groups.length - 1].push(line.trim());
          }
        }
        for (const group of groups) {
          // Rejoin all lines of this item into a single string
          const joined = group.join(' ').replace(/\s+/g, ' ').trim();
          // Find the date (YYYY-MM-DD) in the joined string
          // Everything before date = header (num + category + title + source)
          // Everything after date (and optional "施行") = summary
          const dateMatch = joined.match(/\d{4}-\d{2}-\d{2}/);
          if (!dateMatch) continue;
          const dateIdx = dateMatch.index ?? -1;
          if (dateIdx < 0) continue;
          const header = joined.slice(0, dateIdx).trim();
          const date = dateMatch[0];
          // After date: may start with "施行" or other non-Chinese chars, then source continuation, then summary
          let afterDate = joined.slice(dateIdx + date.length).trim();
          afterDate = afterDate.replace(/^[^\u4e00-\u9fa5]*/, '').trim();
          // Parse header: "<num> <category> <title> <source>"
          const headMatch = header.match(/^(\d+)\s+(\S+)\s+(.+)$/);
          if (!headMatch) continue;
          const num = headMatch[1];
          const category = headMatch[2].trim();
          const titleAndSource = headMatch[3].trim();
          // Source is the trailing Chinese token(s), possibly with "/" separator
          const srcMatch = titleAndSource.match(/^(.+?)\s+([\u4e00-\u9fa5]{2,15}(?:\s*\/\s*[\u4e00-\u9fa5A-Za-z0-9]+)*)\s*$/);
          let title = titleAndSource;
          let source = '';
          if (srcMatch) {
            title = srcMatch[1].trim();
            source = srcMatch[2].trim().replace(/\s*\/\s*/g, '/');
          }
          // Summary: the text after the date
          const summary = afterDate;
          items.push({ num, title, category, summary, source });
        }
      }
    }

    // Extract trend analysis (markdown or plain text)
    let trend = '';
    const trendMatchMd = content.match(/#\s*\*?\*?今日趋势点评\*?\*?[\s\S]*?(?:\n\n(?![\s\S]*#)|$)/);
    if (trendMatchMd) {
      trend = trendMatchMd[0].replace(/#\s*\*?\*?今日趋势点评\*?\*?/, '').replace(/\*/g, '').trim();
    }
    if (!trend) {
      const trendMatchPlain = content.match(/(?:今日趋势点评|趋势点评)[\s\S]*?(?:$)/);
      if (trendMatchPlain) {
        trend = trendMatchPlain[0].replace(/(?:今日趋势点评|趋势点评)/, '').replace(/#/g, '').replace(/\*/g, '').trim();
      }
    }

    return { title, dateStr, focus, items, trend };
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('标准') || category.includes('规范')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    if (category.includes('数智') || category.includes('科技') || category.includes('创新')) return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' };
    if (category.includes('企业') || category.includes('交工') || category.includes('承接')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    if (category.includes('揭榜') || category.includes('课题')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
  };

  const formatFeishuTime = (timestamp: string) => {
    const ts = parseInt(timestamp);
    if (isNaN(ts)) return '';
    const d = new Date(ts * 1000);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'docx': return <FileText size={16} className="text-blue-500" />;
      case 'sheet': return <BarChart3 size={16} className="text-emerald-500" />;
      case 'bitable': return <Database size={16} className="text-violet-500" />;
      case 'slides': return <FileCheck size={16} className="text-amber-500" />;
      case 'folder': return <Building2 size={16} className="text-slate-500" />;
      default: return <FileText size={16} className="text-slate-500" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      docx: '文档', sheet: '表格', bitable: '多维表格', slides: '幻灯片', folder: '文件夹', file: '文件'
    };
    return labels[type] || type;
  };

  const renderFeishuDocs = () => {
    const parsed = selectedDoc && docContent ? parseDocContent(docContent) : null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col min-h-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-teal-600 rounded-full"></span>
            <span className="font-black text-xs text-gray-800 tracking-tight flex items-center gap-1">
              <FileSearch size={13} className="text-teal-600" />
              每日资讯推送
            </span>
          </div>
          <button
            onClick={fetchFeishuDocs}
            disabled={feishuLoading}
            className="p-1 rounded-md hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50"
            title="刷新文件列表"
          >
            <RefreshCw size={14} className={feishuLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Source info */}
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded font-bold">
            飞书文档
          </span>
          <span className="text-[9px] text-slate-400 font-medium ml-auto flex items-center gap-0.5">
            <Clock3 size={9} />
            按修改时间排序
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 min-h-[160px]">
          {feishuLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Loader2 size={24} className="text-teal-500 animate-spin" />
              <span className="text-[10px] text-slate-500 font-bold">正在从飞书获取文档...</span>
            </div>
          ) : feishuError ? (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <AlertTriangle size={24} className="text-amber-400" />
              <span className="text-[10px] text-slate-500 font-bold text-center max-w-[200px]">{feishuError}</span>
              <button
                onClick={fetchFeishuDocs}
                className="mt-1 px-3 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                重试
              </button>
            </div>
          ) : feishuFiles.length > 0 ? (
            feishuFiles.map((file, idx) => (
              <button
                key={file.token}
                onClick={() => openDocModal(file)}
                className="w-full text-left block p-2 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    {getFileTypeIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-black text-slate-800 leading-snug group-hover:text-teal-700 transition-colors line-clamp-2">
                        {file.name}
                      </span>
                      <Eye size={11} className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-medium">
                      <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-bold">{getFileTypeLabel(file.type)}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock3 size={9} />
                        {formatFeishuTime(file.modified_time)}
                      </span>
                      {idx === 0 && (
                        <span className="flex items-center gap-0.5 text-teal-600 font-bold">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                          最新
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <FileSearch size={24} className="text-slate-300" />
              <span className="text-[10px] text-slate-500 font-bold text-center">点击刷新获取飞书文档</span>
              <span className="text-[9px] text-slate-400 text-center max-w-[200px]">
                从飞书云空间文件夹获取最新资讯文档，按修改时间降序排列
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] text-slate-400 font-medium">
          <span>共 {feishuFiles.length} 篇文档</span>
          <a
            href="https://lkr9mkpon3.feishu.cn/drive/folder/HZ9AfYDoulSZ1MdvyB7cDCH1nWg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 hover:text-teal-600 transition-colors"
          >
            <Eye size={10} />
            查看文件夹
          </a>
        </div>

        {/* Document Content Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeDocModal}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-[720px] max-w-[92vw] max-h-[88vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-teal-50/50 to-white">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-teal-50 rounded-lg shrink-0">
                    <FileSearch size={18} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-gray-900 truncate">{selectedDoc.name}</h2>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock3 size={9} />
                      修改时间: {formatFeishuTime(selectedDoc.modified_time)}
                    </p>
                  </div>
                </div>
                <button onClick={closeDocModal} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
                {docLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                    <Loader2 size={32} className="text-teal-500 animate-spin" />
                    <span className="text-xs text-slate-500 font-bold">正在获取文档内容...</span>
                  </div>
                ) : docError ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                    <AlertTriangle size={32} className="text-amber-400" />
                    <span className="text-xs text-slate-500 font-bold text-center max-w-[300px]">{docError}</span>
                    <button
                      onClick={() => fetchDocContent(selectedDoc.token, selectedDoc.type)}
                      className="mt-1 px-4 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      重试
                    </button>
                  </div>
                ) : parsed ? (
                  <div className="space-y-4">
                    {/* Date & focus banner */}
                    {parsed.dateStr && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                        <Calendar size={12} className="text-teal-500" />
                        {parsed.dateStr}
                      </div>
                    )}
                    {parsed.focus && (
                      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-lg p-3">
                        <span className="text-[10px] font-black text-teal-700 flex items-center gap-1 mb-1">
                          <Sparkles size={11} />
                          本期聚焦
                        </span>
                        <p className="text-[11px] text-slate-700 leading-relaxed">{parsed.focus}</p>
                      </div>
                    )}

                    {/* News items */}
                    {parsed.items.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 pb-1 border-b border-slate-100">
                          <BarChart3 size={13} className="text-teal-500" />
                          热点新闻（共 {parsed.items.length} 条）
                        </div>
                        {parsed.items.map((item, idx) => {
                          const colors = getCategoryColor(item.category);
                          return (
                            <div key={idx} className={cn("rounded-lg border p-3 transition-all hover:shadow-sm", colors.bg, colors.border)}>
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className={cn("shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white", colors.dot)}>
                                  {item.num}
                                </span>
                                <span className="text-[12px] font-black text-slate-800 leading-snug flex-1">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-7 mb-1.5">
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold border", colors.bg, colors.text, colors.border)}>
                                  {item.category}
                                </span>
                              </div>
                              <div className="ml-7 text-[11px] text-slate-600 leading-relaxed mb-1.5">
                                <span className="font-bold text-slate-700">摘要：</span>
                                {item.summary}
                              </div>
                              {item.source && (
                                <div className="ml-7 text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                  <ExternalLink size={9} />
                                  来源：{item.source}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Trend analysis */}
                    {parsed.trend && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <TrendingUp size={14} className="text-amber-600" />
                          <span className="text-[11px] font-black text-amber-700">今日趋势点评</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">{parsed.trend}</p>
                      </div>
                    )}

                    {/* Fallback: raw content if parsing didn't yield structured data */}
                    {parsed.items.length === 0 && !parsed.trend && !parsed.focus && (
                      <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {docContent.replace(/<title>.*?<\/title>/, '').replace(/[#*]/g, '').trim()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 gap-2">
                    <FileText size={32} className="text-slate-300" />
                    <span className="text-xs text-slate-500 font-bold">暂无内容</span>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">内容来源：飞书云文档</span>
                <button
                  onClick={closeDocModal}
                  className="px-4 py-1.5 text-[11px] font-bold text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const WIDGET_RENDERERS: Record<string, () => React.ReactNode> = {
    branding: renderBranding,
    levelWidget: renderLevelWidget,
    shortcuts: renderShortcuts,
    processControl: renderProcessControl,
    todos: renderTodos,
    news: renderNews,
    weather: renderWeather,
    measurement: renderMeasurement,
    cost: renderCost,
    collection: renderCollection,
    projectShare: renderProjectShare,
    marketNewContract: renderMarketNewContract,
    marketProjectContract: renderMarketProjectContract,
    jointVenture: renderJointVenture,
    businessKPI: renderBusinessKPI,
    projectDistribution: renderProjectDistribution,
    dashboardMeasurement: renderDashboardMeasurement,
    dashboardProgress: renderDashboardProgress,
    dashboardCollection: renderDashboardCollection,
    drone: renderDrone,
    aiNews: renderAINews,
    dataBroadcast: renderDataBroadcast,
    feishuDocs: renderFeishuDocs,
  };

  const renderWidget = (id: string) => {
    const renderer = WIDGET_RENDERERS[id];
    if (!renderer) return null;
    return <div key={id} className="w-full">{renderer()}</div>;
  };

  // Drag and drop handlers for settings modal
  const handleDragStart = (e: React.DragEvent, id: string, source: DropTarget, index: number) => {
    dragRef.current = { id, source, index };
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const moveWidget = useCallback((targetColumn: keyof LayoutConfig, targetIndex: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { id, source, index } = drag;
    if (source === targetColumn && index === targetIndex) return;

    setDraftConfig(prev => {
      const next: LayoutConfig = {
        left: [...prev.left],
        middle: [...prev.middle],
        right: [...prev.right],
        hidden: [...prev.hidden],
      };
      // 唯一性约束：组件只能存在于一处，先从所有栏位移除
      next.left = next.left.filter(x => x !== id);
      next.middle = next.middle.filter(x => x !== id);
      next.right = next.right.filter(x => x !== id);
      next.hidden = next.hidden.filter(x => x !== id);
      // 插入到目标位置
      if (targetColumn === 'hidden') {
        const adjustedIndex = Math.max(0, Math.min(targetIndex, next.hidden.length));
        next.hidden.splice(adjustedIndex, 0, id);
      } else {
        const adjustedIndex = source === targetColumn && index < targetIndex
          ? Math.max(0, targetIndex - 1)
          : Math.max(0, Math.min(targetIndex, next[targetColumn].length));
        next[targetColumn].splice(adjustedIndex, 0, id);
      }
      return next;
    });
  }, []);

  const resetLayout = () => {
    setDraftConfig(DEFAULT_LAYOUT);
  };

  const confirmLayout = () => {
    setLayoutConfig(draftConfig);
    saveLayout(draftConfig);
    setIsSettingsOpen(false);
  };

  const closeModal = () => {
    setIsSettingsOpen(false);
    setDraftConfig(layoutConfig);
  };

  // ——— 基于 slotId 的布局操作（框架模式下使用，避免同列多槽位共享同一组件列表） ———
  // 从 slotDraft 中取出某组件当前所在的 slotId 或 'hidden'（如未找到则返回 null）
  const locateWidgetInSlotDraft = useCallback((widgetId: string, sd: Record<string, string[]>): { target: DropTarget; index: number } | null => {
    for (const slotId of Object.keys(sd)) {
      const i = sd[slotId].indexOf(widgetId);
      if (i >= 0) return { target: slotId, index: i };
    }
    return null;
  }, []);

  // 把 slotDraft 转换为 hidden 组件列表（全量组件 - 已分配组件）
  const deriveHiddenFromSlotDraft = useCallback((sd: Record<string, string[]>): string[] => {
    const assigned = new Set<string>();
    Object.values(sd).forEach(ids => ids.forEach(i => assigned.add(i)));
    return Object.keys(WIDGET_TITLES).filter(id => !assigned.has(id));
  }, []);

  // 框架模式下：移动组件到指定 slotId 或 'hidden'，自动清除其他位置以保证唯一性
  const moveWidgetBySlot = useCallback((target: DropTarget, targetIndex: number) => {
    const drag = dragRef.current;
    if (!drag || !activeFramework) return;
    const { id, source } = drag;
    if (source === target && drag.index === targetIndex) return;

    setSlotDraft(prev => {
      const next: Record<string, string[]> = {};
      for (const k of Object.keys(prev)) next[k] = [...prev[k]];
      // 从所有槽位移除（唯一性）
      for (const k of Object.keys(next)) {
        next[k] = next[k].filter(x => x !== id);
      }
      // 插入到目标
      if (target === 'hidden') {
        // 放回 hidden 通过 draftConfig.hidden 实现
      } else if (activeFramework.slots.some(s => s.id === target)) {
        if (!next[target]) next[target] = [];
        const adjustedIndex = Math.max(0, Math.min(targetIndex, next[target].length));
        next[target].splice(adjustedIndex, 0, id);
      }
      return next;
    });
    // 同步 draftConfig.hidden：组件被移动到 hidden 时加入，其他移除
    if (target === 'hidden') {
      setDraftConfig(prev => {
        if (prev.hidden.includes(id)) return prev;
        const adjustedIndex = Math.max(0, Math.min(targetIndex, prev.hidden.length));
        const h = [...prev.hidden];
        h.splice(adjustedIndex, 0, id);
        return { ...prev, hidden: h };
      });
    } else {
      setDraftConfig(prev => ({ ...prev, hidden: prev.hidden.filter(x => x !== id) }));
    }
  }, [activeFramework]);

  // 打开弹窗时：初始化 slotDraft（从已保存的 slotAssignments 或回退到 layoutConfig 三栏映射），并计算 hidden
  useEffect(() => {
    if (!isSettingsOpen) return;
    if (!activeFramework) return; // 无框架时走原 draftConfig 三栏模式

    const allWidgets = Object.keys(WIDGET_TITLES);
    const assignedSet = new Set<string>();
    const nextSlotDraft: Record<string, string[]> = {};
    activeFramework.slots.forEach(s => { nextSlotDraft[s.id] = []; });

    // 优先使用已保存的用户门户配置中的 slotAssignments
    if (userPortalLayout && userPortalLayout.frameworkId === activeFramework.id && Object.keys(userPortalLayout.slotAssignments || {}).length > 0) {
      Object.entries(userPortalLayout.slotAssignments || {}).forEach(([slotId, ids]) => {
        if (nextSlotDraft[slotId]) {
          (Array.isArray(ids) ? (ids as string[]) : []).forEach(wid => {
            if (!assignedSet.has(wid) && allWidgets.includes(wid)) {
              nextSlotDraft[slotId].push(wid);
              assignedSet.add(wid);
            }
          });
        }
      });
    } else {
      // 回退：把当前 layoutConfig 按列顺序分配到槽位
      const colSlots: Record<keyof Omit<LayoutConfig, 'hidden'>, string[]> = { left: [], middle: [], right: [] };
      activeFramework.slots.forEach((slot, idx) => {
        const colKey = idx < activeFramework.slots.length / 3 ? 'left' : idx < activeFramework.slots.length * 2 / 3 ? 'middle' : 'right';
        colSlots[colKey].push(slot.id);
      });
      (['left', 'middle', 'right'] as const).forEach(col => {
        const slots = colSlots[col];
        if (slots.length === 0) return;
        const ids = layoutConfig[col].filter(wid => allWidgets.includes(wid) && !assignedSet.has(wid));
        // 按顺序平摊到该列的所有槽位（第一个槽位放第一个组件；简单策略）
        ids.forEach((wid, i) => {
          const targetSlot = slots[i % slots.length];
          nextSlotDraft[targetSlot].push(wid);
          assignedSet.add(wid);
        });
      });
    }

    // 设置 slotDraft
    setSlotDraft(nextSlotDraft);

    // 计算 hidden（所有组件 - 已分配）
    const hidden = allWidgets.filter(wid => !assignedSet.has(wid));
    setDraftConfig(prev => ({ ...prev, hidden }));
  }, [isSettingsOpen, activeFramework, userPortalLayout, layoutConfig]);

  const computeColumnInsertIndex = (container: HTMLElement, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const y = clientY - rect.top;
    const childElements = Array.from(container.querySelectorAll('[data-widget-id]')) as HTMLElement[];
    let targetIndex = childElements.length;
    for (let i = 0; i < childElements.length; i++) {
      const childRect = childElements[i].getBoundingClientRect();
      const childCenterY = childRect.top - rect.top + childRect.height / 2;
      if (y < childCenterY) {
        targetIndex = i;
        break;
      }
    }
    return targetIndex;
  };

  const computeHiddenInsertIndex = (container: HTMLElement, clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const childElements = Array.from(container.querySelectorAll('[data-widget-id]')) as HTMLElement[];
    if (childElements.length === 0) return 0;
    let closestIndex = 0;
    let minDist = Infinity;
    childElements.forEach((child, i) => {
      const childRect = child.getBoundingClientRect();
      const centerX = childRect.left - rect.left + childRect.width / 2;
      const centerY = childRect.top - rect.top + childRect.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = x > centerX ? i + 1 : i;
      }
    });
    return closestIndex;
  };

  // 渲染组件卡片（带图标、描述、主题色）
  const renderWidgetCard = (id: string, source: DropTarget, idx: number, showHideBtn = true) => {
    const title = WIDGET_TITLES[id] || id;
    const icon = WIDGET_ICONS[id] || <Settings2 size={16} />;
    const desc = WIDGET_DESCRIPTIONS[id] || '';
    const colorClass = WIDGET_COLORS[id] || 'from-slate-400 to-slate-500';
    const isFixed = activeFramework?.slots.some(s => s.isFixed && s.name === title) ?? false;

    // 判断 source 是否为框架槽位 slotId
    const isSlotSource = !!activeFramework && activeFramework.slots.some(s => s.id === source);

    return (
      <div
        data-widget-id={id}
        draggable
        onDragStart={(e) => handleDragStart(e, id, source, idx)}
        className="group relative flex items-start gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm cursor-move hover:border-cyan-300 hover:shadow-md transition-all"
      >
        {/* 左侧主题色条 */}
        <div className={cn('w-1 self-stretch rounded-full bg-gradient-to-b', colorClass)} />

        {/* 图标 */}
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shadow-sm', colorClass)}>
          {icon}
        </div>

        {/* 标题与描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 truncate">{title}</span>
            {isFixed && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">固定</span>
            )}
          </div>
          {desc && <p className="text-[10px] text-slate-400 truncate mt-0.5">{desc}</p>}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={13} className="text-slate-300" />
          {showHideBtn && (
            <button
              type="button"
              onClick={() => {
                if (isSlotSource) {
                  // 框架模式：从所有槽位移除，放回组件库（hidden）
                  setSlotDraft(prev => {
                    const next: Record<string, string[]> = {};
                    for (const k of Object.keys(prev)) next[k] = prev[k].filter(x => x !== id);
                    return next;
                  });
                  setDraftConfig(prev => {
                    if (prev.hidden.includes(id)) return prev;
                    return { ...prev, hidden: [id, ...prev.hidden] };
                  });
                } else {
                  // 无框架三栏模式：从三栏移除，放回 hidden
                  setDraftConfig(prev => {
                    const next: LayoutConfig = {
                      left: prev.left.filter(x => x !== id),
                      middle: prev.middle.filter(x => x !== id),
                      right: prev.right.filter(x => x !== id),
                      hidden: [...prev.hidden],
                    };
                    if (!next.hidden.includes(id)) {
                      next.hidden.unshift(id);
                    }
                    return next;
                  });
                }
              }}
              className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
              title="移除"
            >
              <EyeOff size={13} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // 渲染按框架槽位显示的操作栏
  const renderFrameworkSlots = () => {
    if (!activeFramework) {
      // 无框架时回退到三栏布局
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['left', 'middle', 'right'] as const).map((col) => (
            <div key={col} className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-col">
              <div className="text-[11px] font-black text-slate-600 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-cyan-500 rounded-full"></span>
                {COLUMN_TITLES[col]}
                <span className="ml-auto text-[9px] font-mono text-slate-400">{draftConfig[col].length} 个</span>
              </div>
              {renderColumnDropZone(col)}
            </div>
          ))}
        </div>
      );
    }

    const { columns, slots, rowHeight } = activeFramework;

    return (
      <div>
        {/* 框架信息 */}
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200">
              {activeFramework.name}
            </span>
            <span className="text-[10px] text-slate-500">
              {columns}列 · 行高{rowHeight}px · {slots.length}个槽位
            </span>
          </div>
        </div>

        {/* 网格画布 - 行高自适应内容，避免组件被截断；每个槽位独立使用 slotDraft[slot.id] */}
        <div
          className="grid gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridAutoRows: 'minmax(var(--slot-min-h), auto)', gridAutoFlow: 'dense' }}
        >
          {slots.map((slot, slotIdx) => {
            // 使用 slotId 作为每槽位独立的数据源（不再按列共享）
            const slotId = slot.id;
            const items = slotDraft[slotId] || [];
            const isActive = dropIndicator?.column === slotId;
            const isSlotFixed = slot.isFixed;

            return (
              <div
                key={slot.id}
                data-column={slotId}
                onDragOver={(e) => {
                  e.preventDefault();
                  const index = computeColumnInsertIndex(e.currentTarget, e.clientY);
                  setDropIndicator({ column: slotId, index });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropIndicator(prev => (prev?.column === slotId ? null : prev));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragRef.current) return;
                  const index = computeColumnInsertIndex(e.currentTarget, e.clientY);
                  moveWidgetBySlot(slotId, index);
                  dragRef.current = null;
                  setDropIndicator(null);
                }}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border-2 border-dashed p-1.5 transition-colors',
                  isSlotFixed ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200/60 bg-slate-50/50',
                  isActive ? 'border-cyan-400 bg-cyan-50/50' : ''
                )}
                style={{
                  gridColumn: `span ${Math.min(slot.colSpan, columns)}`,
                  gridRow: `span ${slot.rowSpan}`,
                  ['--slot-min-h' as string]: `${rowHeight}px`,
                }}
              >
                {/* 槽位标题 */}
                <div className="flex items-center gap-1 px-1 pb-0.5 border-b border-slate-200/60">
                  <span className="text-[9px] font-bold text-slate-500 truncate flex-1">{slot.name}</span>
                  {isSlotFixed && (
                    <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600">固定</span>
                  )}
                  <span className="text-[8px] font-mono text-slate-400 ml-auto bg-slate-100 px-1.5 py-0.5 rounded">{items.length} 个</span>
                </div>

                {/* 已添加组件 */}
                {items.length === 0 && (
                  <div className="text-[10px] text-slate-400 text-center py-2 font-medium flex-1 flex items-center justify-center" style={{ minHeight: `${rowHeight - 24}px` }}>
                    空槽位
                  </div>
                )}
                {items.map((id, idx) => (
                  <React.Fragment key={id}>
                    {isActive && dropIndicator.index === idx && (
                      <div className="h-0.5 bg-cyan-500 rounded-full" />
                    )}
                    {renderWidgetCard(id, slotId, idx)}
                  </React.Fragment>
                ))}
                {isActive && dropIndicator.index === items.length && (
                  <div className="h-0.5 bg-cyan-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染单栏 drop zone（用于无框架回退）
  const renderColumnDropZone = (column: keyof Omit<LayoutConfig, 'hidden'>) => {
    const items = draftConfig[column];
    const isActive = dropIndicator?.column === column;

    return (
      <div
        data-column={column}
        onDragOver={(e) => {
          e.preventDefault();
          const index = computeColumnInsertIndex(e.currentTarget, e.clientY);
          setDropIndicator({ column, index });
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropIndicator(prev => (prev?.column === column ? null : prev));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!dragRef.current) return;
          const index = computeColumnInsertIndex(e.currentTarget, e.clientY);
          moveWidget(column, index);
          dragRef.current = null;
          setDropIndicator(null);
        }}
        className={cn(
          'flex flex-col gap-1 min-h-[120px] rounded-lg border-2 border-dashed p-2 transition-colors',
          isActive ? 'border-cyan-400 bg-cyan-50/50' : 'border-slate-200/60 bg-slate-50/50'
        )}
      >
        {items.length === 0 && (
          <div className="text-[11px] text-slate-400 text-center py-8 font-medium">拖拽组件到此处</div>
        )}
        {items.map((id, idx) => (
          <React.Fragment key={id}>
            {isActive && dropIndicator.index === idx && (
              <div className="h-0.5 bg-cyan-500 rounded-full my-0.5" />
            )}
            {renderWidgetCard(id, column, idx)}
          </React.Fragment>
        ))}
        {isActive && dropIndicator.index === items.length && (
          <div className="h-0.5 bg-cyan-500 rounded-full my-0.5" />
        )}
      </div>
    );
  };

  // 渲染按组件类型分类的可选组件
  const renderCategorizedComponents = () => {
    // 按 WIDGET_TYPE_CODE_MAP 分组（仅未显示区中的组件）
    const groups: Record<string, string[]> = {};
    for (const id of draftConfig.hidden) {
      const typeCode = WIDGET_TYPE_CODE_MAP[id] || 'general';
      if (!groups[typeCode]) groups[typeCode] = [];
      groups[typeCode].push(id);
    }
    const activeComps = groups[activeCompTypeTab] || [];

    return (
      <div className="flex flex-col h-full">
        {/* Tab 栏 */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-200 bg-slate-50/80 overflow-x-auto flex-shrink-0">
          {portalCompTypes.map((ct) => {
            const count = (groups[ct.code] || []).length;
            const isActive = activeCompTypeTab === ct.code;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => setActiveCompTypeTab(ct.code)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer',
                  isActive
                    ? 'bg-white text-cyan-700 shadow-sm border border-cyan-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60 border border-transparent'
                )}
              >
                <span className="w-4 h-4 rounded bg-gradient-to-br from-slate-500 to-slate-600 text-white flex items-center justify-center text-[8px] font-bold">
                  {ct.name.charAt(0)}
                </span>
                {ct.name}
                <span className={cn(
                  'text-[9px] font-mono px-1 py-0.5 rounded',
                  isActive ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-200 text-slate-500'
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 组件列表区（同时作为 drop zone） */}
        <div
          data-column="hidden"
          onDragOver={(e) => {
            e.preventDefault();
            const index = computeHiddenInsertIndex(e.currentTarget, e.clientX, e.clientY);
            setDropIndicator({ column: 'hidden', index });
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropIndicator(prev => (prev?.column === 'hidden' ? null : prev));
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragRef.current) return;
            const index = computeHiddenInsertIndex(e.currentTarget, e.clientX, e.clientY);
            // 框架模式下如果 source 是 slotId，走 moveWidgetBySlot；否则走 moveWidget（无框架三栏模式）
            const sourceIsSlot = !!activeFramework && activeFramework.slots.some(s => s.id === dragRef.current!.source);
            if (sourceIsSlot) {
              moveWidgetBySlot('hidden', index);
            } else {
              moveWidget('hidden', index);
            }
            dragRef.current = null;
            setDropIndicator(null);
          }}
          className={cn(
            'flex-1 overflow-y-auto p-3 transition-colors',
            dropIndicator?.column === 'hidden' ? 'bg-cyan-50/50' : 'bg-white'
          )}
        >
          {activeComps.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <PackageOpen size={28} className="mb-2 text-slate-300" />
              <span className="text-[11px] font-medium">当前分类无可选组件</span>
              <span className="text-[10px] text-slate-400 mt-0.5">所有组件已配置到画布中</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {activeComps.map((id, idx) => (
              <React.Fragment key={id}>
                {dropIndicator?.column === 'hidden' && dropIndicator.index === idx && (
                  <div className="h-0.5 bg-cyan-500 rounded-full col-span-2 my-0.5" />
                )}
                {renderWidgetCard(id, 'hidden', idx, false)}
              </React.Fragment>
            ))}
          </div>

          {dropIndicator?.column === 'hidden' && dropIndicator.index === activeComps.length && (
            <div className="h-0.5 bg-cyan-500 rounded-full col-span-2 my-0.5" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 select-none text-gray-800 pb-12">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-3 flex flex-col gap-5 w-full">
          {layoutConfig.left.map(renderWidget)}
        </div>
        <div className="xl:col-span-6 flex flex-col gap-5 w-full">
          {layoutConfig.middle.map(renderWidget)}
        </div>
        <div className="xl:col-span-3 flex flex-col gap-5 w-full">
          {layoutConfig.right.map(renderWidget)}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-[80vw] h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-cyan-600" />
                  <h3 className="text-sm font-black text-slate-800">工作台布局设置</h3>
                  {activeFramework && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200">
                      框架：{activeFramework.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">
                    当前用户：<span className="font-bold text-slate-700">{currentUser.name}</span>
                  </span>
                  <button
                    onClick={closeModal}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* 左侧：画布区（工作台框架） */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* 模板选择条 */}
                  <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50/50 to-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={13} className="text-cyan-600" />
                      <span className="text-[11px] font-black text-slate-700">门户模板</span>
                      <span className="text-[9px] text-slate-400">（根据组织自动匹配）</span>
                      {activeFramework && (
                        <span className="ml-auto text-[9px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {activeFramework.name} · {activeFramework.columns}列 · {activeFramework.slots.length}槽位
                        </span>
                      )}
                    </div>
                    {availableTemplates.length === 0 ? (
                      <div className="text-[11px] text-slate-400 py-1.5">
                        您当前所属组织未匹配到可用模板，请联系管理员配置模板
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {availableTemplates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={cn(
                              'flex-shrink-0 px-3 py-2 rounded-lg border-2 text-left transition-all cursor-pointer',
                              selectedTemplateId === tpl.id
                                ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-cyan-300'
                            )}
                          >
                            <div className="text-[11px] font-bold text-slate-800 whitespace-nowrap">{tpl.name}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">关联 {tpl.typeIds.length} 个类型</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 画布标题 + 操作说明 */}
                  <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-1.5">
                      <LayoutDashboard size={13} className="text-cyan-600" />
                      <span className="text-[11px] font-black text-slate-700">画布（框架槽位）</span>
                      <span className="text-[9px] text-slate-400 ml-1">从右侧组件库拖拽到下方槽位</span>
                    </div>
                    <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      💡 组件仅可放置于一处
                    </span>
                  </div>

                  {/* 画布主体（可滚动） */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {renderFrameworkSlots()}
                  </div>
                </div>

                {/* 右侧：组件库区 */}
                <div className="w-80 flex flex-col overflow-hidden bg-white border-l border-slate-200">
                  <div className="flex-shrink-0 px-3 py-2.5 border-b border-slate-100 flex items-center gap-1.5 bg-gradient-to-r from-slate-50 to-white">
                    <PackageOpen size={13} className="text-slate-500" />
                    <span className="text-[11px] font-black text-slate-700">组件库</span>
                    <span className="text-[9px] text-slate-400 ml-1">按类型 Tab 切换</span>
                  </div>
                  {renderCategorizedComponents()}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={resetLayout}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  恢复默认
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedTemplateId || !activeFramework) {
                      alert('请先选择模板和框架');
                      return;
                    }
                    // 框架模式下：使用 slotDraft 直接作为 assignments（每个slot独立，保证组件唯一性）
                    // 无框架模式时：从 draftConfig 生成 assignments
                    const assignments: Record<string, string[]> = {};
                    const fw = activeFramework;
                    fw.slots.forEach(slot => { assignments[slot.id] = []; });
                    const assigned = new Set<string>();
                    if (Object.keys(slotDraft).length > 0) {
                      fw.slots.forEach(slot => {
                        const ids = (slotDraft[slot.id] || []).filter(wid => {
                          if (!WIDGET_TITLES[wid] || assigned.has(wid)) return false;
                          assigned.add(wid);
                          return true;
                        });
                        assignments[slot.id] = ids;
                      });
                    } else {
                      // 回退：从 draftConfig 三栏分配
                      fw.slots.forEach((slot, idx) => {
                        const colKey = idx < fw.slots.length / 3 ? 'left' : idx < fw.slots.length * 2 / 3 ? 'middle' : 'right';
                        const ids = (draftConfig[colKey] || []).filter(wid => {
                          if (!WIDGET_TITLES[wid] || assigned.has(wid)) return false;
                          assigned.add(wid);
                          return true;
                        });
                        assignments[slot.id] = ids;
                      });
                    }
                    saveUserPortal(selectedTemplateId, fw.id, assignments);
                    closeModal();
                  }}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all shadow-sm cursor-pointer"
                >
                  确认布局
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= FLOATING MASCOT COMPANION ================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.div 
          animate={isChatOpen ? "open" : "closed"}
          className="relative"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-white relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="flex flex-col items-center justify-center">
              <div className="w-9 h-3.5 bg-yellow-400 rounded-t-full border border-yellow-500 flex items-center justify-center -mb-0.5 z-10">
                <span className="text-[6px] font-bold text-gray-800 scale-75">养护</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#ffedd5] border border-blue-400 overflow-hidden flex items-center justify-center text-lg shadow-inner">
                🧑‍🔧
              </div>
            </div>
            <span className="absolute top-1 right-1 bg-red-500 w-2.5 h-2.5 rounded-full ring-2 ring-white"></span>
          </motion.button>

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

          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="absolute bottom-20 right-0 w-[380px] bg-white border border-gray-150 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50"
            >
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


