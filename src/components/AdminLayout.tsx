/**
 * 管理中心统一布局组件
 * 左侧二级菜单 + 右侧内容区，保持门户管理和系统管理的视觉与交互一致
 */

import { useState, useCallback, type ReactNode } from 'react';

export interface AdminMenuItem {
  key: string;
  label: string;
  icon: string;       // lucide SVG path d 属性
  desc: string;        // 菜单项描述
  badge?: string;      // 可选徽章文本
}

export interface AdminLayoutProps {
  /** 模块标题（如"门户管理中心"） */
  title: string;
  /** 模块副标题 */
  subtitle: string;
  /** 顶部右侧信息 */
  rightInfo?: { label: string; value: string };
  /** 主题色配置 */
  theme: 'cyan' | 'slate';
  /** 菜单项 */
  menuItems: AdminMenuItem[];
  /** 默认激活的菜单 key */
  defaultActive?: string;
  /** 受控模式：当前激活的菜单 key（传入后由外部控制激活项） */
  activeKey?: string;
  /** 激活菜单变化时的回调（用于外部同步，如 URL 参数） */
  onActiveChange?: (key: string) => void;
  /** 渲染内容区的函数，参数为当前激活的 key */
  renderContent: (activeKey: string) => ReactNode;
}

const THEME_CONFIG = {
  cyan: {
    headerBg: 'from-cyan-600 to-blue-700',
    headerText: 'text-cyan-100',
    headerSub: 'text-cyan-100',
    headerRightLabel: 'text-cyan-100',
    menuActiveBg: 'bg-cyan-50 border-cyan-500',
    menuActiveText: 'text-cyan-700',
    menuActiveIcon: 'text-cyan-600',
    menuActiveBar: 'bg-cyan-500',
    menuHoverBg: 'hover:bg-slate-50',
    contentBorder: 'border-cyan-100',
    iconBg: 'from-cyan-500 to-blue-600',
  },
  slate: {
    headerBg: 'from-slate-700 to-slate-800',
    headerText: 'text-slate-300',
    headerSub: 'text-slate-300',
    headerRightLabel: 'text-slate-400',
    menuActiveBg: 'bg-slate-50 border-slate-600',
    menuActiveText: 'text-slate-800',
    menuActiveIcon: 'text-slate-700',
    menuActiveBar: 'bg-slate-600',
    menuHoverBg: 'hover:bg-slate-50',
    contentBorder: 'border-slate-200',
    iconBg: 'from-slate-600 to-slate-700',
  },
};

export default function AdminLayout({
  title,
  subtitle,
  rightInfo,
  theme,
  menuItems,
  defaultActive,
  activeKey: activeKeyProp,
  onActiveChange,
  renderContent,
}: AdminLayoutProps) {
  const [innerKey, setInnerKey] = useState(defaultActive || menuItems[0]?.key || '');
  // 受控模式：外部传入 activeKey 时以外部为准，否则走内部 state
  const activeKey = activeKeyProp ?? innerKey;
  const setActiveKey = (key: string) => {
    setInnerKey(key);
    onActiveChange?.(key);
  };
  const cfg = THEME_CONFIG[theme];
  const activeItem = menuItems.find(m => m.key === activeKey);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* 左侧二级菜单 */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* 模块标题区 */}
        <div className={`bg-gradient-to-br ${cfg.headerBg} text-white px-4 py-4 flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center shadow-sm`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">{title}</h1>
              <p className={`text-[10px] ${cfg.headerSub} truncate`}>{subtitle}</p>
            </div>
          </div>
        </div>

        {/* 菜单列表 */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuItems.map((item, idx) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => setActiveKey(item.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all border-l-2 ${
                  isActive
                    ? `${cfg.menuActiveBg} ${cfg.menuActiveText} border-l-2 ${cfg.menuActiveBar.replace('bg-', 'border-')}`
                    : `${cfg.menuHoverBg} text-slate-600 border-transparent hover:border-slate-300`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? cfg.menuActiveIcon : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-medium truncate ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-200 text-slate-600">{item.badge}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>
                {/* 序号 */}
                <span className={`text-[9px] font-mono ml-1 ${isActive ? cfg.menuActiveIcon : 'text-slate-300'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 底部信息 */}
        {rightInfo && (
          <div className="flex-shrink-0 px-3 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className={`text-[9px] ${cfg.headerRightLabel} opacity-60`}>{rightInfo.label}</div>
            <div className="text-[11px] font-medium text-slate-600 mt-0.5">{rightInfo.value}</div>
          </div>
        )}
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 内容区头部 */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-5 rounded-full ${cfg.menuActiveBar}`} />
            <h2 className="text-base font-bold text-slate-800">{activeItem?.label}</h2>
            <span className="text-[11px] text-slate-400">/</span>
            <span className="text-[11px] text-slate-500">{activeItem?.desc}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-100">{title}</span>
            <span>›</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-600">{activeItem?.label}</span>
          </div>
        </div>

        {/* 内容主体 */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent(activeKey)}
        </div>
      </main>
    </div>
  );
}
