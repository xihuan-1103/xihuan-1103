import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText,
  Settings, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Menu,
  Bell,
  User,
  LogOut,
  Search,
  Plus,
  RotateCcw,
  Home,
  TrendingUp,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  path: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

const MENU_DATA: MenuItem[] = [
  {
    title: '工作台',
    path: '/workbench',
    icon: <Home size={18} />,
    children: []
  },
  {
    title: '工作中心',
    path: '/workcenter',
    icon: <Layers size={18} />,
    children: []
  },
  {
    title: '项目管理',
    path: '/project',
    icon: <LayoutDashboard size={18} />,
    children: [
      {
        title: '项目管理',
        path: '/project/list',
        children: [
          { title: '项目立项', path: '/project/list' },
          { title: '项目变更', path: '/project/change' },
        ]
      },
      {
        title: '项目清单',
        path: '/project/inventory',
        children: [
          { title: '项目清单', path: '/project/inventory/list' },
        ]
      },
      {
        title: '基础信息设置',
        path: '/settings',
        children: [
          { title: '高速主线', path: '/settings/main-line' },
        ]
      },
      {
        title: '班组管理',
        path: '/teams',
        children: [
          { title: '班组维护', path: '/teams/list' },
        ]
      }
    ]
  },
  {
    title: '合同管理',
    path: '/contract',
    icon: <FileText size={18} />,
    children: [
      {
        title: '收入合同',
        path: '/contract/income',
        children: [
          { title: '合同确认池', path: '/contract/income/confirmation' },
          { title: '合同台账', path: '/contract/income/ledger' },
          { title: '合同清单', path: '/contract/income/inventory' },
        ]
      },
      {
        title: '合同清单',
        path: '/contract/list',
        children: [
          { title: '合同列表', path: '/contract/list' },
        ]
      }
    ]
  },
  {
    title: '进度管理',
    path: '/progress/construction/log',
    icon: <TrendingUp size={18} />,
    children: [
      {
        title: '养护施工',
        path: '/progress/construction',
        children: [
          { title: '施工日志填报', path: '/progress/construction/log' },
          { title: '施工日志', path: '/progress/construction/daily-log' },
        ]
      },
      {
        title: '产值管理',
        path: '/progress/value',
        children: [
          { title: '产值日报', path: '/progress/value/daily' },
        ]
      }
    ]
  }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTopMenu, setActiveTopMenu] = useState(MENU_DATA[0]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['项目管理', '基础信息设置', '班组管理', '合同管理', '养护施工', '产值管理']);

  React.useEffect(() => {
    const matched = MENU_DATA.find(menu => {
      if (location.pathname === menu.path) return true;
      return menu.children?.some(c => {
        if (location.pathname === c.path) return true;
        return c.children?.some(cc => location.pathname === cc.path || location.pathname.startsWith(cc.path));
      });
    });
    if (matched) {
      setActiveTopMenu(matched);
    }
  }, [location.pathname]);

  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [orgLevel, setOrgLevel] = useState<string>(() => localStorage.getItem('cico-org-level') || '集团');

  React.useEffect(() => {
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

  const handleOrgChange = (level: string) => {
    localStorage.setItem('cico-org-level', level);
    setOrgLevel(level);
    setShowOrgDropdown(false);
    window.dispatchEvent(new CustomEvent('cico-org-level-change', { detail: level }));
  };

  const toggleExpand = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f9] font-sans text-slate-800">
      {/* Top Navigation Bar - Deep Navy Enterprise Style matching CICO */}
      <header className="h-13 bg-[#133c8b] text-white flex items-center px-5 shrink-0 z-20 shadow-sm select-none">
        <div className="flex items-center gap-3 mr-8 shrink-0">
          <div className="flex items-center font-black tracking-wider text-base">
            <span className="italic text-white mr-1.5 font-serif text-lg tracking-tight">CICO</span>
            <span className="text-white text-sm font-bold tracking-normal">浙江交通集团</span>
          </div>
          <span className="text-white/30 text-lg font-light">|</span>
          <span className="font-bold text-base tracking-wide text-white/95">养护工程协作管理系统</span>
        </div>
        
        <nav className="flex h-full items-center gap-1.5 overflow-x-auto no-scrollbar">
          {MENU_DATA.map((menu) => {
            const isActive = activeTopMenu.title === menu.title;
            return (
              <button
                key={menu.title}
                onClick={() => {
                  setActiveTopMenu(menu);
                  if (menu.path) {
                    navigate(menu.path);
                  } else if (menu.children?.[0]?.path) {
                    navigate(menu.children[0].path);
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded transition-all text-xs flex items-center gap-1.5 font-medium cursor-pointer shrink-0",
                  isActive 
                    ? "bg-[#1d52b0] border border-blue-400/30 text-white font-bold shadow-3xs" 
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                {menu.icon}
                {menu.title}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-xs shrink-0 pl-4">
          <button className="p-1.5 hover:bg-white/10 rounded-full relative transition-colors cursor-pointer text-white/80 hover:text-white">
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#133c8b]"></span>
          </button>
          
          <div className="flex items-center gap-3 border-l border-white/20 pl-4 text-white/90 font-medium">
            <div className="relative">
              <span 
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded text-white/95 cursor-pointer transition-colors text-xs font-bold"
              >
                <span>浙江交工</span>
                <span className="text-blue-200 ml-0.5">【{orgLevel}】</span>
                <ChevronDown size={11} className="opacity-85 ml-0.5" />
              </span>
              
              {showOrgDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                  <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-md shadow-lg border border-gray-150 py-1 z-50 text-slate-800">
                    <button 
                      onClick={() => handleOrgChange('集团')}
                      className={cn(
                        "w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer",
                        orgLevel === '集团' ? "text-[#165dff] bg-blue-50/50" : "text-slate-700"
                      )}
                    >
                      <span className="text-sm">🏢</span> 集团层级
                    </button>
                    <button 
                      onClick={() => handleOrgChange('区域中心')}
                      className={cn(
                        "w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer",
                        orgLevel === '区域中心' ? "text-[#165dff] bg-blue-50/50" : "text-slate-700"
                      )}
                    >
                      <span className="text-sm">🗺️</span> 区域中心层级
                    </button>
                    <button 
                      onClick={() => handleOrgChange('项目部')}
                      className={cn(
                        "w-full text-left px-3.5 py-2 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer",
                        orgLevel === '项目部' ? "text-[#165dff] bg-blue-50/50" : "text-slate-700"
                      )}
                    >
                      <span className="text-sm">🏗️</span> 项目部层级
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full bg-blue-500 border border-blue-300/40 flex items-center justify-center text-[11px] font-bold">
                周
              </div>
              <span className="font-bold">周末</span>
              <ChevronDown size={12} className="text-white/60" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Clean Light Style matching screenshot */}
        {activeTopMenu.children && activeTopMenu.children.length > 0 && (
          <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto select-none shadow-2xs">
            <div className="py-3 px-2 space-y-2">
              {activeTopMenu.children?.map((secondLevel) => (
                <div key={secondLevel.title} className="space-y-1">
                  <button
                    onClick={() => toggleExpand(secondLevel.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {expandedMenus.includes(secondLevel.title) ? (
                        <ChevronDown size={14} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-400" />
                      )}
                      <span>{secondLevel.title}</span>
                    </div>
                  </button>
                  
                  {expandedMenus.includes(secondLevel.title) && secondLevel.children && (
                    <div className="mt-0.5 space-y-0.5">
                      {secondLevel.children.map((thirdLevel) => {
                        const isCurrent = location.pathname === thirdLevel.path || location.pathname.startsWith(thirdLevel.path + '/');
                        return (
                          <Link
                            key={thirdLevel.title}
                            to={thirdLevel.path}
                            className={cn(
                              "block pl-8 pr-3 py-2 text-xs transition-all rounded-r-md font-medium",
                              isCurrent 
                                ? "text-[#165dff] bg-[#ebf3ff] font-bold border-l-3 border-[#165dff]" 
                                : "text-slate-600 hover:text-[#165dff] hover:bg-slate-50/80 border-l-3 border-transparent"
                            )}
                          >
                            {thirdLevel.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main Workspace Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Breadcrumbs Sub-Bar matching screenshot */}
          <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 select-none shadow-3xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link to="/" className="hover:text-[#165dff] transition-colors">首页</Link>
              <ChevronRight size={12} className="text-slate-300" />
              <span>{activeTopMenu.title}</span>
              {location.pathname !== '/' && location.pathname !== '/workbench' && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-800 font-bold">
                    {activeTopMenu.children?.flatMap(c => c.children || [c]).find(c => c.path === location.pathname)?.title || '详情页'}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
              <span>单位: <strong className="text-slate-700 font-mono">万元 / 人民币</strong></span>
            </div>
          </div>

          <div className="p-5 flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
