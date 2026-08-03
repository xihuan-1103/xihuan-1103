import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper,
  BellRing,
  ExternalLink,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Percent,
  Calendar,
  AlertTriangle,
  Layers,
  Search,
  CheckCircle,
  Check,
  ChevronLeft,
  Settings,
  Grid,
  Bot,
  MessageSquare,
  Send,
  X,
  Play,
  Hammer,
  DollarSign,
  CloudRain,
  CloudSun,
  ShieldCheck,
  Truck,
  Wrench,
  Activity,
  BarChart3,
  Flame,
  ArrowUpRight,
  Clock,
  MapPin,
  ListFilter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Legend, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ScatterChart, 
  Scatter, 
  ZAxis 
} from 'recharts';

// Carousel News data
const NEWS_CAROUSEL = [
  {
    id: 1,
    title: '推进数智养护改革 提升通道运行质效',
    source: '浙江交工集团',
    date: '2026-07-08',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop',
    tag: '重大新闻'
  },
  {
    id: 2,
    title: '公路养护公司启动2026年度“安全生产月”专项行动',
    source: '养护公司工会',
    date: '2026-07-01',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=1200&auto=format&fit=crop',
    tag: '管理制度'
  },
  {
    id: 3,
    title: '杭徽高速大中修工程标段顺利完成首阶段沥青路面摊铺',
    source: '项目建设指挥部',
    date: '2026-06-28',
    image: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=1200&auto=format&fit=crop',
    tag: '工程简报'
  }
];

const GENERAL_NEWS_LIST = [
  { id: 1, title: '公司关于2026年下半年高速专项养护项目复核的通知', date: '07-06', category: '公告' },
  { id: 2, title: '【大中修规范】沥青路面就地热再生施工关键控制指标解读', date: '07-04', category: '规章' },
  { id: 3, title: '集团2026半年度“绿化景观路”优胜标段候选名单公示', date: '06-30', category: '公示' },
  { id: 4, title: '关于开展全标段雨季汛期桥面排水专项清淤工作的紧急通知', date: '06-25', category: '通知' }
];

// Initial Shortcuts
const INITIAL_SHORTCUTS = [
  { id: 'app-1', name: '日常养护巡查', desc: '巡查日志与病害填报', color: 'from-blue-500 to-indigo-600', icon: '🛣️' },
  { id: 'app-2', name: '安全管理系统', desc: '现场隐患排查与红线预警', color: 'from-red-500 to-orange-600', icon: '⚠️' },
  { id: 'app-3', name: '资产管理系统', desc: '路段资产与机械状态', color: 'from-emerald-500 to-teal-600', icon: '🚜' },
  { id: 'app-4', name: '财务结算审批', desc: '期中支付计量与应收回款', color: 'from-amber-500 to-yellow-600', icon: '💳' },
  { id: 'app-5', name: '合同台账审核', desc: '收入合同确认与清单审核', color: 'from-violet-500 to-purple-600', icon: '📝' },
  { id: 'app-6', name: '工程变更报批', desc: '设计变更与新增单价申报', color: 'from-sky-500 to-blue-600', icon: '📐' }
];

// Active To-do approvals list
const INITIAL_TODOS = [
  { id: 'todo-wc-1', type: '合同审批', title: '【绍兴段】路面大中修专项施工合同（分包）审批申请', sender: '张正清', date: '10分钟前', amount: '¥342.5 万' },
  { id: 'todo-wc-2', type: '付款确认', title: '【杭州北】2026年6月份日常养护油料及沥青采购付款单', sender: '况怡蒙', date: '35分钟前', amount: '¥18.4 万' },
  { id: 'todo-wc-3', type: '日志审批', title: '【临平段】施工负责人刘勇提交的夜间防台防汛应急巡查日志', sender: '刘勇', date: '1小时前', amount: '--' }
];

// Warn Alerts depending on Level
const WARNING_ALERTS_MAP: Record<string, { title: string; level: 'critical' | 'warning' | 'info'; desc: string }[]> = {
  '集团': [
    { title: '产值严重滞后预警', level: 'critical', desc: '【丽水中心】由于拆迁迟滞，义龙庆高速标段季度产值目标偏离度达 -35%，已触发红色预警！' },
    { title: '回款周期偏离警告', level: 'warning', desc: '【温州中心】下辖两个标段平均应收回款超期天数达到 58 天，超过 45 天预警阈值。' }
  ],
  '区域中心': [
    { title: '下辖项目回款超期预警', level: 'critical', desc: '【杭州北项目部】日常养护一期计量审批已超期 14 天未结，累计金额 120 万元。' },
    { title: '专项进度偏离警戒', level: 'warning', desc: '【绕城北段】大修标段沥青摊铺工期进度相比于计划滞后 5.5 天。' }
  ],
  '项目部': [
    { title: '连续雨天施工预警', level: 'critical', desc: '气象预报未来 3 天暴雨，自动触发“禁止沥青摊铺面层施工”提示，建议加强防汛巡查。' },
    { title: '特种设备年检过期超期', level: 'warning', desc: '3号铣刨机（牌照：浙A88390）液压马达系统点检超期，需立即线上日志补齐。' }
  ]
};

export default function WorkCenter() {
  const [orgLevel, setOrgLevel] = useState<string>(() => localStorage.getItem('cico-org-level') || '集团');
  
  // State variables for interactive page parts
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [shortcuts, setShortcuts] = useState(INITIAL_SHORTCUTS);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState<{ sender: 'user' | 'ai'; text: string; attachment?: any }[]>([
    { sender: 'ai', text: '你好！我是您的公路养护AI小助手“养乐多” 🍊。您可以向我咨询指标定义、生成报表，或是检索国家及浙江省养护标准规章。' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to organization level change
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

  // News Carousel automatic sliding
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % NEWS_CAROUSEL.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApproveTodo = (id: string, title: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    showToast(`✅ 已成功审批处理：“${title}”`);
  };

  const handleDragApp = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === shortcuts.length - 1) return;
    
    const nextList = [...shortcuts];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setShortcuts(nextList);
    showToast('🔄 已更新快捷工作流布局排序！');
  };

  const handleAiQuestion = (q: string) => {
    setAiHistory(prev => [...prev, { sender: 'user', text: q }]);
    
    setTimeout(() => {
      let aiResponseText = '';
      let attachment: any = null;

      if (q.includes('年产值') || q.includes('怎么算') || q.includes('产值口径')) {
        aiResponseText = '根据《公路养护工程形象进度产值编制指引(2026版)》，年度累计完成产值的计算公式为：\n\n年度完成产值 = 批复日常养护综合单价 × 实际现场巡查核销工程量 + 专项大中修已批复完工签认金额 + 零星应急养护定额申报。\n\n需要注意的是，未签署监理签认单的现场完工段，仅可按70%估算进行报送，待计量确认后再行调增。';
      } else if (q.includes('生成') || q.includes('报表') || q.includes('导出')) {
        aiResponseText = '已为您智能检索并自动汇总生成《2026年浙江交工大中修专项投资与进度对比看板报表.xlsx》。包含当前各大标段累计形象进度、预算执行率、回款周期偏离度等关键指标，请查阅附件！';
        attachment = {
          fileName: '2026年大中修专项进度对比表.xlsx',
          size: '124.5 KB',
          rows: [
            { item: '杭徽高速改造段', plan: '3,200万', actual: '2,950万', rate: '92.1%' },
            { item: '沪杭甬临平段', plan: '1,800万', actual: '1,680万', rate: '93.3%' },
            { item: '大桥钢箱梁加固', plan: '1,500万', actual: '1,120万', rate: '74.6%' }
          ]
        };
      } else if (q.includes('规范') || q.includes('标准') || q.includes('检索')) {
        aiResponseText = '已为您查到浙江省地方标准《DB33/T 2196-2026 高速公路改扩建期间养护施工安全规程》：\n\n1. 沥青玛蹄脂碎石混合料(SMA)摊铺时，摊铺温度不得低于160℃，若遇连续降雨(降水量>2mm/h)必须立即停止，已摊铺段在初压后必须盖膜防雨。\n\n2. 裂缝灌缝要求槽深1.5-2.0cm，缝宽1.0-1.2cm，灌缝胶加热温度必须恒定在185℃-195℃之间，保证饱满饱封。';
      } else {
        aiResponseText = `收到您的提问：“${q}”。针对【浙江交工 ${orgLevel}层级】的综合场景，我建议您查阅大屏中的核心KPI指标，并结合“日常养护巡查”应用进一步确认。若需要导出相关统计，请直接回复“生成并导出报表”。`;
      }

      setAiHistory(prev => [...prev, { sender: 'ai', text: aiResponseText, attachment }]);
    }, 800);
  };

  // Helper render for Weather icon in Project Level
  const renderWeatherIcon = (weatherName: string) => {
    if (weatherName.includes('雨')) {
      return <CloudRain className="text-sky-500 animate-pulse" size={32} />;
    }
    return <CloudSun className="text-amber-500" size={32} />;
  };

  return (
    <div className="space-y-6 select-none text-slate-800 pb-12 relative">
      
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#133c8b] border border-blue-400 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-xl flex items-center gap-2"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info Section */}
      <div className="bg-gradient-to-r from-[#133c8b] to-[#1d52b0] rounded-2xl p-6 text-white shadow-sm border border-blue-900/40 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-blue-400/5 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black border border-white/10 uppercase tracking-wider">
                Operating Hub
              </span>
              <span className="text-blue-200 text-xs font-mono">ID: {orgLevel === '集团' ? 'CICO-HQ-01' : orgLevel === '区域中心' ? 'CICO-REG-HN' : 'CICO-PRJ-08'}</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Layers className="text-blue-300" size={22} />
              <span>浙江交工工作中心 — {orgLevel === '集团' ? '公司级 (总部)' : orgLevel === '区域中心' ? '区域中心级 (杭州北)' : '项目部级 (杭徽标段)'}</span>
            </h1>
            <p className="text-xs text-blue-100 max-w-2xl font-medium">
              根据您的登录层级权限，系统已智能装载相应的养护生产、合同计量、现场施工及成本监控模块。通用基础服务已固定锚定于左侧。
            </p>
          </div>
          
          {/* Stats quick pill */}
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 p-3 rounded-xl backdrop-blur-3xs shrink-0 sm:self-center">
            <Clock size={16} className="text-blue-200" />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-200 font-bold leading-none">当前报送统计截止</span>
              <span className="text-xs font-black font-mono mt-1 text-white">2026-07-08 18:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-column Grid (Perfect bottom alignment, standard layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ================= LEFT COLUMN (Lg: col-span-5) ================= */}
        {/* Fixed Standard Base Components across all levels */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 1. News & Announcements Module */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-3xs flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-[#133c8b] rounded-lg">
                    <Newspaper size={16} />
                  </span>
                  <span className="font-extrabold text-sm text-slate-800">新闻及通知公告栏</span>
                </div>
                <button className="text-xs text-[#133c8b] hover:underline flex items-center gap-0.5 font-bold">
                  更多新闻 <ChevronRight size={14} />
                </button>
              </div>

              {/* Slider Banner Component */}
              <div className="relative rounded-xl overflow-hidden h-40 group mb-4 shadow-3xs border border-slate-100">
                <img 
                  src={NEWS_CAROUSEL[carouselIndex].image} 
                  alt="news" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                
                {/* Image slide Tag badge */}
                <span className="absolute top-3 left-3 bg-red-600 border border-red-500 text-white text-[9px] px-2 py-0.5 rounded font-black">
                  {NEWS_CAROUSEL[carouselIndex].tag}
                </span>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] text-slate-300 font-bold tracking-wide">{NEWS_CAROUSEL[carouselIndex].source}</span>
                  <h3 className="text-xs font-black leading-tight mt-1 truncate group-hover:text-blue-200 transition-colors">
                    {NEWS_CAROUSEL[carouselIndex].title}
                  </h3>
                </div>

                {/* Dots navigators */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {NEWS_CAROUSEL.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        carouselIndex === idx ? "bg-white w-3" : "bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* General list */}
              <div className="space-y-2">
                {GENERAL_NEWS_LIST.map((news) => (
                  <div 
                    key={news.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 text-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-4">
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded shrink-0",
                        news.category === '通知' ? 'bg-red-50 text-red-600 border border-red-100' :
                        news.category === '规章' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                        'bg-blue-50 text-[#133c8b] border border-blue-100'
                      )}>
                        {news.category}
                      </span>
                      <span className="text-slate-700 font-bold group-hover:text-[#133c8b] truncate">
                        {news.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500 shrink-0">
                      {news.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-[10px] text-slate-400 font-medium">
              <span>💡 新闻公告采用统一数据层隔离权限</span>
              <span>版本: 2026.1</span>
            </div>
          </div>

          {/* 2. Shortcuts SSO Launcher Module */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Grid size={16} />
                  </span>
                  <span className="font-extrabold text-sm text-slate-800">快捷工作流（单点登录 SSO）</span>
                </div>
                <button 
                  onClick={() => showToast('⚙️ 已开启单点登录模块自定义配置模式')}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Settings size={12} /> 自定义配置
                </button>
              </div>

              {/* Grid lists with drag-order interactive elements */}
              <div className="grid grid-cols-2 gap-3">
                {shortcuts.map((app, index) => (
                  <div 
                    key={app.id} 
                    className="group relative bg-slate-50/50 border border-slate-150 hover:border-indigo-200 rounded-xl p-3 hover:bg-indigo-50/10 transition-all cursor-pointer flex flex-col justify-between h-20"
                    onClick={() => {
                      setSelectedApp(app);
                      showToast(`🚀 正在通过单点登录（SSO）安全通道对接跳转至：${app.name}...`);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{app.icon}</span>
                        <span className="font-black text-xs text-slate-800 group-hover:text-indigo-900 leading-none">{app.name}</span>
                      </div>
                      <ExternalLink size={10} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-tight group-hover:text-slate-500 font-medium line-clamp-1">
                      {app.desc}
                    </p>

                    {/* Sorting re-order small indicators */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-white border border-slate-200 rounded px-1 py-0.2 shadow-2xs transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDragApp(index, 'up')}
                        disabled={index === 0}
                        className="text-[9px] hover:text-indigo-600 disabled:opacity-20 font-black text-slate-500"
                        title="上移"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => handleDragApp(index, 'down')}
                        disabled={index === shortcuts.length - 1}
                        className="text-[9px] hover:text-indigo-600 disabled:opacity-20 font-black text-slate-500"
                        title="下移"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal mt-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
              💡 <span className="font-bold text-slate-600">SSO集成说明：</span>
              已配置统一身份核验（JWT/SSO），点击相应卡片即可免密穿透进入第三方子系统，数据自动同步关联。
            </p>
          </div>

          {/* 3. Unified Message Center (Approvals & Dynamic warning notifications) */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-3xs flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-50 text-red-500 rounded-lg animate-pulse">
                    <BellRing size={16} />
                  </span>
                  <span className="font-extrabold text-sm text-slate-800">统一消息审批与预警中心</span>
                </div>
                <span className="text-[10px] text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-black font-mono">
                  待批: {todos.length} | 预警: {WARNING_ALERTS_MAP[orgLevel]?.length || 0}
                </span>
              </div>

              {/* Segment 1: To-do Approvals List */}
              <div className="space-y-2.5 mb-4">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">● 待办穿透审批</span>
                
                <AnimatePresence mode="popLayout">
                  {todos.map((todo) => (
                    <motion.div 
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -80 }}
                      className="bg-slate-50/60 border border-slate-100 hover:border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3 group transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-600 border border-blue-100 rounded font-black shrink-0">
                            {todo.type}
                          </span>
                          <span className="text-[11px] text-slate-700 font-extrabold truncate block">
                            {todo.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-medium">
                          <span>申请人: <strong className="text-slate-600">{todo.sender}</strong></span>
                          <span>金额: <strong className="text-red-500 font-mono">{todo.amount}</strong></span>
                          <span>⏱️ {todo.date}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleApproveTodo(todo.id, todo.title)}
                        className="px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg text-[10px] font-extrabold text-blue-600 transition-all shrink-0 flex items-center gap-0.5 shadow-2xs"
                      >
                        <Check size={10} /> 审批
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {todos.length === 0 && (
                  <div className="py-4 text-center text-slate-400 flex flex-col items-center justify-center space-y-1">
                    <span className="text-xl">🎉</span>
                    <span className="font-bold text-[10px] text-slate-500">所有审批待办已处理结案！</span>
                  </div>
                )}
              </div>

              {/* Segment 2: Dynamic Warn alerts based on level */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">● 动态超期与红线预警</span>
                
                <div className="space-y-2">
                  {WARNING_ALERTS_MAP[orgLevel]?.map((alert, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-2.5 rounded-xl border flex items-start gap-2.5 transition-all",
                        alert.level === 'critical' 
                          ? 'bg-red-50/50 border-red-100 hover:bg-red-50' 
                          : 'bg-amber-50/40 border-amber-100 hover:bg-amber-50'
                      )}
                    >
                      <AlertTriangle size={15} className={alert.level === 'critical' ? 'text-red-500 shrink-0 mt-0.5 animate-bounce' : 'text-amber-500 shrink-0 mt-0.5'} />
                      <div className="flex-1">
                        <span className={cn(
                          "text-xs font-black block leading-none",
                          alert.level === 'critical' ? 'text-red-800' : 'text-amber-800'
                        )}>
                          {alert.title}
                        </span>
                        <p className="text-[10px] text-slate-500 leading-normal mt-1 font-medium">
                          {alert.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 text-[9px] text-slate-400 text-center">
              * 数据隔离规则：当前用户仅对授权范围内的资产及项目拥有审批和提醒权限。
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN (Lg: col-span-7) ================= */}
        {/* Differentiated Dashboard (差异化数据看板) based on current orgLevel */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* ================= CASE A: 公司级 (总部) 看板 ================= */}
          {orgLevel === '集团' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* 1. KPI 磁贴 Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">年度业务承接总额</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">8.24</span>
                      <span className="text-[10px] font-bold">亿</span>
                    </div>
                  </div>
                  {/* Progress bar representing target达成率 */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                      <span>目标 10.0 亿</span>
                      <span className="text-blue-600">82.4%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '82.4%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">年度累计完成产值</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">7.42</span>
                      <span className="text-[10px] font-bold">亿</span>
                    </div>
                  </div>
                  {/* YoY % */}
                  <div className="mt-3 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400 font-bold">同比增幅</span>
                    <span className="text-emerald-600 font-extrabold flex items-center leading-none">
                      +12.4% ▲
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">综合营业收入</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">6.85</span>
                      <span className="text-[10px] font-bold">亿</span>
                    </div>
                  </div>
                  {/* Overall collection return rate */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                      <span>整体回款率</span>
                      <span className="text-emerald-600">92.4%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92.4%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs hover:border-blue-200 transition-all flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-4 -mt-4 group-hover:scale-125 transition-transform"></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">安全生产累计天数</span>
                    <div className="flex items-baseline gap-1 text-red-600">
                      <span className="text-xl font-black font-mono">1,856</span>
                      <span className="text-[10px] font-bold">天</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] text-slate-400 font-bold">集团安全运行无大事故</span>
                  </div>
                </div>

              </div>

              {/* 2. Visual Graphs Panel 1: 业务版图 (Pie) & 营收产值趋势 (Grouped) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* (1) Business distributions */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">集团主营业务分布与构成占比</span>
                    <span className="text-[9px] text-slate-400">环形图比对</span>
                  </div>
                  
                  <div className="h-44 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: '日常养护', value: 45, color: '#133c8b' },
                            { name: '大中修专项', value: 30, color: '#1d52b0' },
                            { name: '绿化养护', value: 15, color: '#10b981' },
                            { name: '交安设施', value: 10, color: '#f59e0b' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#133c8b" />
                          <Cell fill="#1d52b0" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] text-slate-400 font-bold">日常养护</span>
                      <span className="text-sm font-black text-slate-700 font-mono">45%</span>
                    </div>
                  </div>

                  {/* Legends */}
                  <div className="grid grid-cols-4 gap-1 text-center pt-2 text-[9px] font-bold text-slate-500">
                    <div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#133c8b] inline-block mr-1"></span>
                      日常养护(45%)
                    </div>
                    <div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d52b0] inline-block mr-1"></span>
                      大中修(30%)
                    </div>
                    <div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block mr-1"></span>
                      绿化养护(15%)
                    </div>
                    <div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block mr-1"></span>
                      交安设施(10%)
                    </div>
                  </div>
                </div>

                {/* (2) Monthly Revenue vs Output value trend */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">月度完成产值与营收趋势对比</span>
                    <span className="text-[9px] text-[#133c8b] font-mono">单位: 万元</span>
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: '3月', 产值: 4500, 营收: 4200, 毛利率: 14.5 },
                          { name: '4月', 产值: 5800, 营收: 5100, 毛利率: 15.2 },
                          { name: '5月', 产值: 7200, 营收: 6400, 毛利率: 16.0 },
                          { name: '6月', 产值: 8800, 营收: 7900, 毛利率: 16.5 }
                        ]}
                        margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Bar dataKey="产值" fill="#1d52b0" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="营收" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* 3. Visual Graphs Panel 2: 专项大中修进度 & 区域红黑榜 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* (1) Funnel Investment progress for Special Projects */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">重大专项养护投资完成进度</span>
                    <span className="text-[9px] text-slate-400">形象进度 vs 投资额</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">杭徽高速面层白改黑改造标段</span>
                        <span className="text-blue-600 font-mono">¥2,950万 / 3,200万 (92.1%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: '92.1%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">沪杭甬大桥悬索加固及阻尼器更换</span>
                        <span className="text-emerald-600 font-mono">¥1,680万 / 1,800万 (93.3%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: '93.3%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">杭州绕城北段护栏升级阻隔墙工程</span>
                        <span className="text-amber-600 font-mono">¥1,120万 / 1,500万 (74.6%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full" style={{ width: '74.6%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* (2) Regional red/black榜 */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">各区域公司运营红黑榜</span>
                    <span className="text-[9px] text-slate-400">按产值及回款率综合排名</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Red list */}
                    <div className="space-y-2 bg-emerald-50/20 border border-emerald-100 p-2.5 rounded-xl">
                      <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                        🔴 红榜 (前二)
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>1. 杭州北中心</span>
                          <span className="text-emerald-600 font-mono">96.8%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>2. 宁波分中心</span>
                          <span className="text-emerald-600 font-mono">94.2%</span>
                        </div>
                      </div>
                    </div>

                    {/* Black list */}
                    <div className="space-y-2 bg-red-50/20 border border-red-100 p-2.5 rounded-xl">
                      <span className="text-[10px] font-black text-red-700 flex items-center gap-1">
                        ⚫ 黑榜 (预警)
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>1. 温州运营中心</span>
                          <span className="text-red-500 font-mono">72.4%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>2. 绍兴管养处</span>
                          <span className="text-red-500 font-mono">78.1%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= CASE B: 区域级 看板 ================= */}
          {orgLevel === '区域中心' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* 1. KPI 磁贴 Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">区域承接业务总额</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">3.12</span>
                      <span className="text-[10px] font-bold">亿</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>新签合同额</span>
                    <span className="text-blue-600 font-mono">¥1.85 亿</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">区域产值完成度</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">1.95</span>
                      <span className="text-[10px] font-bold">亿</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                      <span>年度计划 2.80 亿</span>
                      <span className="text-[#133c8b]">69.6%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#133c8b] rounded-full" style={{ width: '69.6%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">所辖运行项目部</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">12</span>
                      <span className="text-[10px] font-bold">个</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400 font-bold">处于在施状态</span>
                    <span className="text-[#10b981] font-black">100%</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">区域平均回款周期</span>
                    <div className="flex items-baseline gap-1 text-slate-850">
                      <span className="text-xl font-black font-mono">42.5</span>
                      <span className="text-[10px] font-bold">天</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400 font-bold">管控红线天数</span>
                    <span className="text-red-500 font-mono font-bold">45.0 天</span>
                  </div>
                </div>

              </div>

              {/* 2. Visual Charts Row 1: 下属项目部产值对比 & 优良率 (MQI/PQI) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Stacked project output comparison */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">各项目部累计完成产值对比</span>
                    <span className="text-[9px] text-slate-400">日常 vs 专项大修</span>
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: '杭州北段', 日常: 1200, 专项: 1840 },
                          { name: '临平段', 日常: 850, 专项: 1200 },
                          { name: '绕城北段', 日常: 640, 专项: 980 },
                          { name: '绍兴段', 日常: 780, 专项: 600 }
                        ]}
                        margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Bar dataKey="日常" stackId="a" fill="#133c8b" />
                        <Bar dataKey="专项" stackId="a" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Road Service Excellence Rate progress bar list */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">日常养护路面服务优良率指标 (MQI/PQI)</span>
                    <span className="text-[9px] text-slate-400">标段抽检达标率</span>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <div className="flex justify-between items-baseline text-[10px] font-bold mb-1">
                        <span className="text-slate-600">杭州北项目部 (MQI: 95.8)</span>
                        <span className="text-emerald-600 font-mono">98.2% 达标</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.2%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline text-[10px] font-bold mb-1">
                        <span className="text-slate-600">临平路段项目部 (MQI: 94.2)</span>
                        <span className="text-emerald-600 font-mono">95.4% 达标</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95.4%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline text-[10px] font-bold mb-1">
                        <span className="text-slate-600">绕城北路段项目部 (MQI: 91.8)</span>
                        <span className="text-amber-500 font-mono">89.6% 达标</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '89.6%' }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Visual Charts Row 2: 项目状态矩阵 & 区域物资流转 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Quadrant matrix of project state */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">项目状态预警矩阵（四象限图）</span>
                    <span className="text-[9px] text-slate-400">横轴：进度偏差 | 纵轴：成本偏差</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-1 relative border border-slate-200/60 rounded-xl bg-slate-50/50">
                    <div className="border-r border-b border-dashed border-slate-300 p-2.5 h-18 relative">
                      <span className="text-[8px] text-amber-600 font-bold block">进度偏慢 / 成本节约</span>
                      {/* Dots indicating dummy project dots */}
                      <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-amber-500 border border-white cursor-pointer" title="绍兴标段段"></div>
                    </div>
                    <div className="border-b border-dashed border-slate-300 p-2.5 h-18 relative bg-red-50/20">
                      <span className="text-[8px] text-red-600 font-black block">🚨 双重风险区 (超支+滞后)</span>
                      <div className="absolute bottom-3 left-4 w-3 h-3 rounded-full bg-red-600 border border-white cursor-pointer animate-pulse" title="金华东中心标段"></div>
                    </div>
                    <div className="border-r border-dashed border-slate-300 p-2.5 h-18 relative bg-emerald-50/20">
                      <span className="text-[8px] text-emerald-700 font-black block">✅ 正常绿灯区</span>
                      <div className="absolute top-2 right-4 w-3 h-3 rounded-full bg-emerald-500 border border-white cursor-pointer" title="杭州北日常管养标段"></div>
                    </div>
                    <div className="p-2.5 h-18 relative">
                      <span className="text-[8px] text-orange-600 font-bold block">超支 / 进度超前</span>
                      <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-orange-400 border border-white cursor-pointer" title="临平日常项目部"></div>
                    </div>
                  </div>
                </div>

                {/* Area machinery / equipment dispatch tracking lists */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">区域重型机械及设备调度动态</span>
                    <span className="text-[9px] text-slate-400">在用/闲置/流转</span>
                  </div>

                  <div className="space-y-2 text-[11px] font-bold">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚜</span>
                        <span className="text-slate-700 font-extrabold">1号铣刨机(浙A3302)</span>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.2 rounded font-black">
                        施工中-杭徽段
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚚</span>
                        <span className="text-slate-700 font-extrabold">2号超薄摊铺机(浙A8829)</span>
                      </div>
                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.2 rounded font-black animate-pulse">
                        闲置待转-临平段
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚛</span>
                        <span className="text-slate-700 font-extrabold">3号路面沥青洒布车</span>
                      </div>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-150 px-1.5 py-0.2 rounded font-black">
                        跨省调拨流转中
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= CASE C: 项目部级 看板 ================= */}
          {orgLevel === '项目部' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* 1. KPI 磁贴 Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">本月新增产值 (累计已确)</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">¥3,380</span>
                      <span className="text-[10px] font-bold">万</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400 font-bold">本月新增</span>
                    <span className="text-emerald-600 font-extrabold font-mono">+¥380万</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">计量未支付 (回款进度)</span>
                    <div className="flex items-baseline gap-1 text-slate-850">
                      <span className="text-xl font-black font-mono">¥1,200</span>
                      <span className="text-[10px] font-bold">万</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                      <span>累计已回 2180万</span>
                      <span className="text-red-500 font-bold">需催款!</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#133c8b] rounded-full" style={{ width: '64.5%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">当前累计实际成本</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">¥2,840</span>
                      <span className="text-[10px] font-bold">万</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>责任预算目标</span>
                    <span className="text-emerald-600 font-mono">¥3,100万</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">现场人员与机械在位率</span>
                    <div className="flex items-baseline gap-1 text-slate-800">
                      <span className="text-xl font-black font-mono">78</span>
                      <span className="text-[10px] font-bold">人活跃</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>机械开工利用率</span>
                    <span className="text-blue-600">85.2%</span>
                  </div>
                </div>

              </div>

              {/* 2. Enhanced Weather & Construction environment alert */}
              <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <span className="font-extrabold text-xs text-slate-700">天气施工工艺联动气象预警</span>
                  <span className="text-[9px] text-slate-400">精细化气象订阅</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl shadow-3xs">
                      {renderWeatherIcon('雨')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-800">大雨转中雨</span>
                        <span className="text-[10px] bg-red-100 border border-red-200 text-red-600 px-1.5 py-0.2 rounded font-black">
                          暴雨防汛等级：II 级
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">
                        范围：杭徽高速标段现场 | 湿度：92% | 风向：东南风 4-5级
                      </p>
                    </div>
                  </div>
                  
                  {/* Technology Alarm Prompt */}
                  <div className="flex-1 max-w-sm bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-start gap-1.5 animate-pulse">
                    <span className="text-sm">⚠️</span>
                    <div className="text-[10px] text-amber-800 font-bold leading-normal">
                      <span className="font-extrabold">工艺管控提示：</span>
                      未来3天中雨。系统已自动触发“禁止沥青摊铺及封水层施工”提示！请项目负责人做好防汛与开挖边坡加固。
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Visual Charts Row: 动态成本 (Radar) & 现场计量进度 (Funnel) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 5 core costs radar chart */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-slate-700">五大核心成本实际 vs 责任预算对比</span>
                    <span className="text-[9px] text-slate-400">雷达图分析</span>
                  </div>

                  <div className="h-44 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart 
                        cx="50%" 
                        cy="50%" 
                        outerRadius="70%" 
                        data={[
                          { subject: '人工费', 实际: 120, 预算: 110 },
                          { subject: '材料费', 实际: 240, 预算: 250 },
                          { subject: '机械费', 实际: 95, 预算: 90 },
                          { subject: '分包费', 实际: 180, 预算: 200 },
                          { subject: '间接费', 实际: 50, 预算: 45 }
                        ]}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 250]} tick={{ fontSize: 8 }} />
                        <Radar name="实际支出" dataKey="实际" stroke="#1d52b0" fill="#1d52b0" fillOpacity={0.4} />
                        <Radar name="责任预算" dataKey="预算" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Field measurement and settlement milestone progress funnel */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                      <span className="font-extrabold text-xs text-slate-700">现场计量与结算审批流转进度</span>
                      <span className="text-[9px] text-slate-400">审批流转流效</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 bg-blue-100 text-blue-700 border border-blue-200 rounded-full flex items-center justify-center text-[9px] font-black font-mono">1</span>
                        <div className="flex-1 flex justify-between font-bold text-slate-700">
                          <span>已完工未申报</span>
                          <span className="text-slate-500 font-mono">¥450万</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full flex items-center justify-center text-[9px] font-black font-mono">2</span>
                        <div className="flex-1 flex justify-between font-bold text-slate-700">
                          <span>监理确认签认段</span>
                          <span className="text-slate-500 font-mono">¥380万</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '84.4%' }} />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center justify-center text-[9px] font-black font-mono">3</span>
                        <div className="flex-1 flex justify-between font-bold text-slate-700">
                          <span>业主计量已审计</span>
                          <span className="text-slate-500 font-mono">¥310万</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68.8%' }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2 leading-normal">
                    * 现场流效：计量通过率 84.4%，剩余 70 万由于现场取样报告复核滞后暂处于申核挂起阶段。
                  </p>
                </div>

              </div>

              {/* 4. Daily Inspection Distress repair Kanban */}
              <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-3xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <span className="font-extrabold text-xs text-slate-700">日常养护路面病害及工单流转异常看板</span>
                  <span className="text-[9px] text-red-600 font-black animate-pulse">24H超期修复红字提醒</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">今日发现路面病害 (坑槽裂缝)</span>
                    <span className="text-base font-black text-slate-700 font-mono">18 <span className="text-[9px] font-medium text-slate-400">个</span></span>
                  </div>

                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-2.5">
                    <span className="text-[9px] text-emerald-700 font-bold block mb-1">已完工并修复消单</span>
                    <span className="text-base font-black text-emerald-600 font-mono">14 <span className="text-[9px] font-medium text-slate-400">个</span></span>
                  </div>

                  <div className="bg-red-50/20 border border-red-150 rounded-xl p-2.5 animate-pulse">
                    <span className="text-[9px] text-red-600 font-black block mb-1">⏰ 超期未修复红警工单</span>
                    <span className="text-base font-black text-red-600 font-mono">4 <span className="text-[9px] font-medium text-red-500">个</span></span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ================= FLOATING AI ASSISTANT "养乐多" ================= */}
      {/* Absolute fixed icon/widget on the bottom-right corner */}
      <div className="fixed bottom-6 right-6 z-40">
        
        {/* Toggle badge */}
        <AnimatePresence>
          {!isAiOpen && (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setIsAiOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white p-3 rounded-full shadow-2xl flex items-center justify-center relative group border border-blue-400"
            >
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
              <Bot size={24} className="group-hover:rotate-12 transition-transform" />
              
              {/* Tooltip bubble prompt */}
              <div className="absolute right-14 bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <span>AI 助手 <strong>“养乐多”</strong> 已就绪</span>
                <span className="text-yellow-400">⚡</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Floating Chat Modal Panel */}
        <AnimatePresence>
          {isAiOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col h-[450px]"
            >
              {/* Chat Header banner */}
              <div className="bg-[#133c8b] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/25 border border-blue-400/30 rounded-lg">
                    <Bot size={18} className="text-blue-100" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-tight flex items-center gap-1">
                      <span>数智养护 AI 助手</span>
                      <span className="text-yellow-400 font-normal">“养乐多”</span>
                    </h4>
                    <span className="text-[9px] text-blue-200 block">基于大语言模型的工程管养大脑</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsAiOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Chat Messages Log Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {aiHistory.map((chat, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%] text-xs",
                      chat.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-2xl shadow-3xs leading-relaxed font-medium",
                      chat.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-150 text-slate-700 rounded-tl-none'
                    )}>
                      {chat.text.split('\n').map((para, pIdx) => (
                        <p key={pIdx} className={pIdx > 0 ? "mt-1.5" : ""}>{para}</p>
                      ))}
                    </div>

                    {/* XLSX or report file attachment preview */}
                    {chat.attachment && (
                      <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl w-full text-[11px] font-bold shadow-3xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-600 text-sm">📁</span>
                            <span className="truncate max-w-[140px]">{chat.attachment.fileName}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">{chat.attachment.size}</span>
                        </div>
                        <div className="space-y-1 text-[10px] text-slate-500">
                          {chat.attachment.rows.map((row: any, rIdx: number) => (
                            <div key={rIdx} className="flex justify-between items-center bg-slate-50 p-1 rounded">
                              <span className="text-slate-600 truncate max-w-[90px]">{row.item}</span>
                              <span className="font-mono">{row.actual} ({row.rate})</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => showToast(`📥 已成功下载报表：${chat.attachment.fileName}`)}
                          className="w-full mt-2 text-center py-1 border border-slate-200 hover:border-[#133c8b] hover:bg-blue-50/20 text-[#133c8b] rounded text-[10px] font-extrabold transition-all"
                        >
                          下载 Excel 数据表
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sample Quick Questions list */}
              <div className="p-2 border-t border-slate-150 bg-white">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide px-1.5 block mb-1">
                  💡 常用管养问题快捷提问
                </span>
                <div className="flex gap-1 overflow-x-auto scrollbar-none py-1 px-1.5">
                  <button 
                    onClick={() => handleAiQuestion('怎么算今年产值的口径规定？')}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 rounded-lg text-[10px] font-extrabold text-slate-600 whitespace-nowrap transition-all"
                  >
                    📈 怎么算今年产值？
                  </button>
                  <button 
                    onClick={() => handleAiQuestion('给我生成大中修季度形象进度Excel报表。')}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 rounded-lg text-[10px] font-extrabold text-slate-600 whitespace-nowrap transition-all"
                  >
                    📊 生成大中修报表
                  </button>
                  <button 
                    onClick={() => handleAiQuestion('检索大中修雨天沥青路面施工规范。')}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 rounded-lg text-[10px] font-extrabold text-slate-600 whitespace-nowrap transition-all"
                  >
                    📖 检索施工规范
                  </button>
                </div>
              </div>

              {/* Chat Input form container */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aiInput.trim()) return;
                  handleAiQuestion(aiInput);
                  setAiInput('');
                }}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-1.5 shrink-0"
              >
                <input 
                  type="text"
                  placeholder="请输入您的提问..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#133c8b] text-slate-800 font-bold"
                />
                <button 
                  type="submit"
                  className="p-1.5 bg-[#133c8b] text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
