/**
 * 门户框架管理模块
 * 左侧框架列表 + 右侧槽位编辑器（网格画布）
 */

import { useState, useEffect, useMemo } from 'react';
import { getFrameworks, saveFrameworks, genId } from './portalStore';
import type { PortalFramework, Slot, OrgLevel, FrameworkStatus } from './types';

interface FrameworkManagerProps {
  onRefresh: () => void;
}

// 层级标签
const LEVEL_LABEL: Record<OrgLevel, string> = {
  group: '集团',
  region: '区域',
  project: '项目部',
};

// 状态标签
const STATUS_LABEL: Record<FrameworkStatus, string> = {
  draft: '草稿',
  enabled: '启用',
  disabled: '停用',
};

// 状态样式
const STATUS_STYLE: Record<FrameworkStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  enabled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disabled: 'bg-rose-50 text-rose-600 border-rose-200',
};

const LEVEL_OPTIONS: OrgLevel[] = ['group', 'region', 'project'];

// 默认框架
const createDefaultFramework = (): PortalFramework => {
  const now = new Date().toISOString();
  return {
    id: genId('fw'),
    name: '新框架',
    level: 'project',
    columns: 3,
    rowHeight: 120,
    slots: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
};

// 默认槽位
const createDefaultSlot = (): Slot => ({
  id: genId('slot'),
  name: '新槽位',
  colSpan: 1,
  rowSpan: 1,
  isFixed: false,
});

const FrameworkManager = ({ onRefresh }: FrameworkManagerProps) => {
  const [frameworks, setFrameworks] = useState<PortalFramework[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 编辑态：本地草稿，保存时再写回
  const [draft, setDraft] = useState<PortalFramework | null>(null);

  // 初始化加载
  useEffect(() => {
    const list = getFrameworks();
    setFrameworks(list);
    if (list.length > 0 && selectedId === null) {
      setSelectedId(list[0].id);
    }
  }, []);

  // 选中框架时同步到 draft
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const fw = frameworks.find(f => f.id === selectedId);
    setDraft(fw ? JSON.parse(JSON.stringify(fw)) as PortalFramework : null);
  }, [selectedId, frameworks]);

  // 当前选中框架（只读引用）
  const selectedFramework = useMemo(
    () => frameworks.find(f => f.id === selectedId) ?? null,
    [frameworks, selectedId],
  );

  // 持久化
  const persist = (list: PortalFramework[]) => {
    saveFrameworks(list);
    setFrameworks(list);
    onRefresh();
  };

  // 新增框架
  const handleAdd = () => {
    const fw = createDefaultFramework();
    const next = [...frameworks, fw];
    persist(next);
    setSelectedId(fw.id);
  };

  // 复制框架
  const handleCopy = (fw: PortalFramework) => {
    const now = new Date().toISOString();
    const cloned: PortalFramework = {
      ...JSON.parse(JSON.stringify(fw)) as PortalFramework,
      id: genId('fw'),
      name: `${fw.name} 副本`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      slots: fw.slots.map(s => ({ ...s, id: genId('slot') })),
    };
    const next = [...frameworks, cloned];
    persist(next);
    setSelectedId(cloned.id);
  };

  // 删除框架
  const handleDelete = (fw: PortalFramework) => {
    if (!window.confirm(`确认删除框架「${fw.name}」？此操作不可撤销。`)) return;
    const next = frameworks.filter(f => f.id !== fw.id);
    persist(next);
    if (selectedId === fw.id) {
      setSelectedId(next.length > 0 ? next[0].id : null);
    }
  };

  // 启用/停用
  const handleToggleStatus = (fw: PortalFramework) => {
    // 启用：检查同层级是否已有启用框架
    if (fw.status !== 'enabled') {
      const conflict = frameworks.find(
        f => f.id !== fw.id && f.level === fw.level && f.status === 'enabled',
      );
      if (conflict) {
        const ok = window.confirm(
          `层级「${LEVEL_LABEL[fw.level]}」已存在启用的框架「${conflict.name}」。\n同一层级同时只能有一个启用的框架，是否停用「${conflict.name}」并启用当前框架？`,
        );
        if (!ok) return;
        // 自动停用冲突框架
        const now = new Date().toISOString();
        const next = frameworks.map(f => {
          if (f.id === fw.id) return { ...f, status: 'enabled' as FrameworkStatus, updatedAt: now };
          if (f.id === conflict.id) return { ...f, status: 'disabled' as FrameworkStatus, updatedAt: now };
          return f;
        });
        persist(next);
        return;
      }
      const now = new Date().toISOString();
      const next = frameworks.map(f =>
        f.id === fw.id ? { ...f, status: 'enabled' as FrameworkStatus, updatedAt: now } : f,
      );
      persist(next);
    } else {
      // 当前为启用 → 停用
      const now = new Date().toISOString();
      const next = frameworks.map(f =>
        f.id === fw.id ? { ...f, status: 'disabled' as FrameworkStatus, updatedAt: now } : f,
      );
      persist(next);
    }
  };

  // 保存编辑（写回 draft）
  const handleSaveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      window.alert('框架名称不能为空');
      return;
    }
    // 校验列跨度不超出画布列数
    for (const s of draft.slots) {
      if (s.colSpan > draft.columns) {
        window.alert(`槽位「${s.name}」的列跨度(${s.colSpan})超出画布列数(${draft.columns})`);
        return;
      }
    }
    const now = new Date().toISOString();
    const updated: PortalFramework = { ...draft, updatedAt: now };
    const next = frameworks.map(f => (f.id === updated.id ? updated : f));
    persist(next);
  };

  // 修改 draft 字段
  const updateDraft = (patch: Partial<PortalFramework>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  // 槽位操作
  const handleAddSlot = () => {
    if (!draft) return;
    const slot = createDefaultSlot();
    updateDraft({ slots: [...draft.slots, slot] });
  };

  const handleUpdateSlot = (slotId: string, patch: Partial<Slot>) => {
    if (!draft) return;
    updateDraft({
      slots: draft.slots.map(s => (s.id === slotId ? { ...s, ...patch } : s)),
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!draft) return;
    updateDraft({ slots: draft.slots.filter(s => s.id !== slotId) });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 左侧：框架列表 */}
      <div className="col-span-5 xl:col-span-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">框架列表</h3>
              <p className="text-xs text-slate-500 mt-0.5">共 {frameworks.length} 个框架</p>
            </div>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              新增框架
            </button>
          </div>

          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {frameworks.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                暂无框架，点击右上角「新增框架」开始创建
              </div>
            )}
            {frameworks.map(fw => {
              const active = fw.id === selectedId;
              return (
                <div
                  key={fw.id}
                  onClick={() => setSelectedId(fw.id)}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${
                    active ? 'bg-cyan-50 border-l-4 border-l-cyan-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium truncate ${active ? 'text-cyan-700' : 'text-slate-800'}`}>
                          {fw.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                          {LEVEL_LABEL[fw.level]}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[fw.status]}`}>
                          {STATUS_LABEL[fw.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {fw.columns}列 · {fw.rowHeight}px · {fw.slots.length}槽位
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleCopy(fw)}
                        title="复制"
                        className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(fw)}
                        title="删除"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {fw.status !== 'enabled' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleStatus(fw); }}
                      className="mt-2 text-[11px] px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      启用
                    </button>
                  )}
                  {fw.status === 'enabled' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleStatus(fw); }}
                      className="mt-2 text-[11px] px-2 py-0.5 rounded text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      停用
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧：槽位编辑器 */}
      <div className="col-span-7 xl:col-span-8">
        {!draft ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4zm4 0v16M4 8h16" />
              </svg>
              <p className="text-sm text-slate-400 mt-2">请从左侧选择或新增一个框架进行编辑</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* 顶部：框架基本信息 */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  框架编辑
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${STATUS_STYLE[draft.status]}`}>
                    {STATUS_LABEL[draft.status]}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 名称 */}
                <div className="col-span-2 lg:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">框架名称</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => updateDraft({ name: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="请输入框架名称"
                  />
                </div>
                {/* 适用层级 */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">适用层级</label>
                  <select
                    value={draft.level}
                    onChange={e => updateDraft({ level: e.target.value as OrgLevel })}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                  >
                    {LEVEL_OPTIONS.map(lv => (
                      <option key={lv} value={lv}>{LEVEL_LABEL[lv]}</option>
                    ))}
                  </select>
                </div>
                {/* 画布列数 */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    画布列数：<span className="text-cyan-600 font-semibold">{draft.columns}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={4}
                    step={1}
                    value={draft.columns}
                    onChange={e => {
                      const cols = Number(e.target.value);
                      // 同步收敛超出的槽位列跨度
                      const slots = draft.slots.map(s => ({ ...s, colSpan: Math.min(s.colSpan, cols) }));
                      updateDraft({ columns: cols, slots });
                    }}
                    className="w-full accent-cyan-600"
                  />
                </div>
                {/* 行高 */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    行高(px)：<span className="text-cyan-600 font-semibold">{draft.rowHeight}</span>
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={200}
                    step={10}
                    value={draft.rowHeight}
                    onChange={e => updateDraft({ rowHeight: Number(e.target.value) })}
                    className="w-full accent-cyan-600"
                  />
                </div>
              </div>
            </div>

            {/* 网格画布 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-700">槽位画布</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    共 {draft.slots.length} 个槽位 · {draft.columns}列网格 · 行高 {draft.rowHeight}px
                  </p>
                </div>
                <button
                  onClick={handleAddSlot}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  添加槽位
                </button>
              </div>

              {/* 画布预览 */}
              <div
                className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 min-h-[200px]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),' +
                    'linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)',
                }}
              >
                {draft.slots.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-sm text-slate-400">
                    画布为空，点击「添加槽位」开始布局
                  </div>
                ) : (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${draft.columns}, 1fr)`,
                      gridAutoRows: `${draft.rowHeight}px`,
                      gridAutoFlow: 'dense',
                    }}
                  >
                    {draft.slots.map((slot, idx) => (
                      <div
                        key={slot.id}
                        style={{
                          gridColumn: `span ${Math.min(slot.colSpan, draft.columns)}`,
                          gridRow: `span ${slot.rowSpan}`,
                        }}
                        className={`relative rounded-md border-2 flex flex-col items-center justify-center text-center px-2 py-1 transition-all ${
                          slot.isFixed
                            ? 'bg-amber-50 border-amber-300 hover:border-amber-400'
                            : 'bg-cyan-50 border-cyan-300 hover:border-cyan-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                            {slot.name || `槽位${idx + 1}`}
                          </span>
                          {slot.isFixed && (
                            <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-6-3-6 3V5z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {slot.colSpan}×{slot.rowSpan}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 槽位列表编辑 */}
              {draft.slots.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">槽位列表</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">名称</th>
                          <th className="px-3 py-2 text-left font-medium w-28">列跨度</th>
                          <th className="px-3 py-2 text-left font-medium w-24">行跨度</th>
                          <th className="px-3 py-2 text-left font-medium w-20">固定</th>
                          <th className="px-3 py-2 text-right font-medium w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.slots.map((slot, idx) => (
                          <tr key={slot.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={slot.name}
                                onChange={e => handleUpdateSlot(slot.id, { name: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder={`槽位${idx + 1}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={slot.colSpan}
                                onChange={e => handleUpdateSlot(slot.id, { colSpan: Number(e.target.value) })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                              >
                                {Array.from({ length: draft.columns }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={slot.rowSpan}
                                onChange={e => handleUpdateSlot(slot.id, { rowSpan: Number(e.target.value) })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                              >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={slot.isFixed}
                                  onChange={e => handleUpdateSlot(slot.id, { isFixed: e.target.checked })}
                                  className="w-3.5 h-3.5 accent-cyan-600"
                                />
                                <span className="text-xs text-slate-500">{slot.isFixed ? '是' : '否'}</span>
                              </label>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                title="删除槽位"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  创建时间：{new Date(draft.createdAt).toLocaleString('zh-CN')}
                  <span className="mx-2">|</span>
                  更新时间：{new Date(draft.updatedAt).toLocaleString('zh-CN')}
                </div>
                <div className="flex items-center gap-2">
                  {selectedFramework && selectedFramework.status === 'enabled' && (
                    <button
                      onClick={() => handleToggleStatus(selectedFramework)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                    >
                      停用此框架
                    </button>
                  )}
                  {selectedFramework && selectedFramework.status !== 'enabled' && (
                    <button
                      onClick={() => handleToggleStatus(selectedFramework)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                    >
                      启用此框架
                    </button>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameworkManager;
