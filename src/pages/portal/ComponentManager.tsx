/**
 * 门户管理中心 - 组件管理
 * 维护门户内容单元，支持新增/编辑/删除，状态转换（开发中→上架→下架→上架）
 */

import { useState, useEffect, useMemo } from 'react';
import { getComponents, saveComponents, getCompTypes, MOCK_ORG_TREE, genId } from './portalStore';
import type { PortalComponent, ComponentStatus, OrgNode, ComponentType } from './types';

interface ComponentManagerProps {
  onRefresh: () => void;
}

interface FormErrors {
  name?: string;
  typeId?: string;
  contentUrl?: string;
  target?: string;
  sortWeight?: string;
}

const STATUS_LABEL: Record<ComponentStatus, string> = {
  dev: '开发中',
  online: '上架',
  offline: '下架',
};

const STATUS_STYLE: Record<ComponentStatus, string> = {
  dev: 'bg-amber-50 text-amber-700 border-amber-200',
  online: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offline: 'bg-slate-100 text-slate-500 border-slate-200',
};

// 带子节点的组织节点
interface OrgTreeNode extends OrgNode {
  children: OrgTreeNode[];
}

// 由扁平数组构建组织树
const buildOrgTree = (nodes: OrgNode[]): OrgTreeNode[] => {
  const map = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }));
  nodes.forEach(n => {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const ORG_TREE = buildOrgTree(MOCK_ORG_TREE);

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

// 新建组件默认值（状态为"开发中"）
const createDefaultComponent = (typeId: string): PortalComponent => {
  const now = new Date().toISOString();
  return {
    id: genId('comp'),
    name: '新组件',
    typeId,
    contentUrl: '',
    isUniversal: true,
    isFixed: false,
    sortWeight: 100,
    status: 'dev',
    createdAt: now,
    updatedAt: now,
  };
};

// 组织树选择器（递归渲染）
const OrgTreeSelector = ({
  nodes,
  selected,
  onChange,
  depth = 0,
}: {
  nodes: OrgTreeNode[];
  selected: string[];
  onChange: (ids: string[]) => void;
  depth?: number;
}) => {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(i => i !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <>
      {nodes.map(node => (
        <div key={node.id}>
          <label
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-cyan-50 cursor-pointer text-sm"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <input
              type="checkbox"
              checked={selected.includes(node.id)}
              onChange={() => toggle(node.id)}
              className="w-3.5 h-3.5 accent-cyan-600"
            />
            <span className="text-slate-700">{node.name}</span>
            {node.deptType && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500">
                {node.deptType}
              </span>
            )}
          </label>
          {node.children.length > 0 && (
            <OrgTreeSelector
              nodes={node.children}
              selected={selected}
              onChange={onChange}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
};

const ComponentManager = ({ onRefresh }: ComponentManagerProps) => {
  const [components, setComponents] = useState<PortalComponent[]>(() => getComponents());
  const [compTypes] = useState<ComponentType[]>(() => getCompTypes());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PortalComponent | null>(null);
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [userInput, setUserInput] = useState('');

  // 按类型筛选 + 按名称搜索
  const filteredComponents = useMemo(() => {
    return components
      .filter(c => {
        if (filterTypeId !== 'all' && c.typeId !== filterTypeId) return false;
        if (searchKeyword.trim()) {
          return c.name.toLowerCase().includes(searchKeyword.trim().toLowerCase());
        }
        return true;
      })
      .sort((a, b) => b.sortWeight - a.sortWeight);
  }, [components, filterTypeId, searchKeyword]);

  // 选中组件时同步到 draft
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const comp = components.find(c => c.id === selectedId);
    if (comp) {
      setDraft({ ...comp });
      setUserInput((comp.targetUsers ?? []).join(', '));
      setErrors({});
    } else {
      setDraft(null);
    }
  }, [selectedId, components]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const typeName = (typeId: string) => compTypes.find(t => t.id === typeId)?.name ?? '未分类';

  const updateDraft = (patch: Partial<PortalComponent>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const validate = (data: PortalComponent): FormErrors => {
    const errs: FormErrors = {};
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
      errs.name = '名称需 2-20 个字';
    }
    if (!data.typeId) {
      errs.typeId = '请选择组件类型';
    }
    if (!data.contentUrl.trim()) {
      errs.contentUrl = '请填写组件内容/URL';
    }
    if (!data.isUniversal) {
      const hasOrgs = (data.targetOrgs ?? []).length > 0;
      const users = userInput.split(',').map(s => s.trim()).filter(Boolean);
      if (!hasOrgs && users.length === 0) {
        errs.target = '非通用组件需指定目标用户或组织';
      }
    }
    if (data.sortWeight < 0 || data.sortWeight > 999) {
      errs.sortWeight = '排序权重需在 0-999 之间';
    }
    return errs;
  };

  // 新增组件（默认"开发中"状态）
  const handleAdd = () => {
    if (compTypes.length === 0) {
      showToast('error', '请先创建组件类型');
      return;
    }
    const comp = createDefaultComponent(compTypes[0].id);
    const next = [...components, comp];
    saveComponents(next);
    setComponents(next);
    setSelectedId(comp.id);
    onRefresh();
  };

  // 保存编辑
  const handleSave = () => {
    if (!draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const users = userInput.split(',').map(s => s.trim()).filter(Boolean);
    const now = new Date().toISOString();
    const updated: PortalComponent = {
      ...draft,
      name: draft.name.trim(),
      contentUrl: draft.contentUrl.trim(),
      targetUsers: !draft.isUniversal && users.length > 0 ? users : undefined,
      targetOrgs: !draft.isUniversal && (draft.targetOrgs ?? []).length > 0 ? draft.targetOrgs : undefined,
      updatedAt: now,
    };
    const next = components.map(c => (c.id === updated.id ? updated : c));
    saveComponents(next);
    setComponents(next);
    showToast('success', '组件已保存');
    onRefresh();
  };

  // 删除组件
  const handleDelete = (comp: PortalComponent) => {
    if (!window.confirm(`确认删除组件「${comp.name}」？此操作不可撤销。`)) return;
    const next = components.filter(c => c.id !== comp.id);
    saveComponents(next);
    setComponents(next);
    if (selectedId === comp.id) setSelectedId(null);
    showToast('success', '组件已删除');
    onRefresh();
  };

  // 状态转换：开发中→上架、上架→下架、下架→上架
  const canTransitionTo = (status: ComponentStatus, target: ComponentStatus): boolean => {
    if (status === 'dev' && target === 'online') return true;
    if (status === 'online' && target === 'offline') return true;
    if (status === 'offline' && target === 'online') return true;
    return false;
  };

  const handleStatusTransition = (comp: PortalComponent, target: ComponentStatus) => {
    const now = new Date().toISOString();
    const next = components.map(c =>
      c.id === comp.id ? { ...c, status: target, updatedAt: now } : c,
    );
    saveComponents(next);
    setComponents(next);
    showToast('success', `组件已${target === 'online' ? '上架' : '下架'}`);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={toast.type === 'success' ? 'M5 13l4 4L19 7' : 'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z'}
              />
            </svg>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：组件列表 */}
        <div className="col-span-5 xl:col-span-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* 列表头 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">组件列表</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  共 {components.length} 个组件 · 显示 {filteredComponents.length} 个
                </p>
              </div>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                新增组件
              </button>
            </div>

            {/* 筛选栏：类型 + 搜索 */}
            <div className="px-4 py-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
              <select
                value={filterTypeId}
                onChange={e => setFilterTypeId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
              >
                <option value="all">全部类型</option>
                {compTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="搜索组件名称..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                />
              </div>
            </div>

            {/* 列表项 */}
            <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
              {filteredComponents.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  {components.length === 0 ? '暂无组件，点击「新增组件」开始创建' : '没有匹配的组件'}
                </div>
              )}
              {filteredComponents.map(comp => {
                const active = comp.id === selectedId;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedId(comp.id)}
                    className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${
                      active ? 'bg-cyan-50 border-l-4 border-l-cyan-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium truncate ${active ? 'text-cyan-700' : 'text-slate-800'}`}>
                        {comp.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                        {typeName(comp.typeId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        comp.isUniversal
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          : 'bg-violet-50 text-violet-700 border-violet-200'
                      }`}>
                        {comp.isUniversal ? '通用' : '非通用'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        comp.isFixed
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {comp.isFixed ? '固定' : '非固定'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[comp.status]}`}>
                        {STATUS_LABEL[comp.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧：组件配置表单 */}
        <div className="col-span-7 xl:col-span-8">
          {!draft ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <p className="text-sm text-slate-400 mt-2">请从左侧选择或新增一个组件进行编辑</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* 表单头 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">组件配置</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ID: <code className="text-cyan-700 font-mono">{draft.id}</code>
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${STATUS_STYLE[draft.status]}`}>
                  {STATUS_LABEL[draft.status]}
                </span>
              </div>

              {/* 表单内容 */}
              <div className="px-5 py-4 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto">
                {/* 组件名称 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    组件名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => {
                      updateDraft({ name: e.target.value });
                      if (errors.name) setErrors(p => ({ ...p, name: undefined }));
                    }}
                    placeholder="如：待办事项"
                    className={`w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors ${
                      errors.name
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* 归属组件类型（单选） */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    归属组件类型 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {compTypes.map(t => {
                      const checked = draft.typeId === t.id;
                      return (
                        <label
                          key={t.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-cyan-50 border-cyan-500 text-cyan-700'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-cyan-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="compType"
                            checked={checked}
                            onChange={() => {
                              updateDraft({ typeId: t.id });
                              if (errors.typeId) setErrors(p => ({ ...p, typeId: undefined }));
                            }}
                            className="w-3.5 h-3.5 accent-cyan-600"
                          />
                          {t.name}
                        </label>
                      );
                    })}
                  </div>
                  {errors.typeId && <p className="mt-1 text-xs text-rose-500">{errors.typeId}</p>}
                </div>

                {/* 组件内容/URL */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    组件内容/URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.contentUrl}
                    onChange={e => {
                      updateDraft({ contentUrl: e.target.value });
                      if (errors.contentUrl) setErrors(p => ({ ...p, contentUrl: undefined }));
                    }}
                    placeholder="如：widget:todos 或 https://..."
                    className={`w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors font-mono ${
                      errors.contentUrl
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                    }`}
                  />
                  {errors.contentUrl ? (
                    <p className="mt-1 text-xs text-rose-500">{errors.contentUrl}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">支持 widget: 协议或外部 URL</p>
                  )}
                </div>

                {/* 是否通用 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">是否通用</label>
                  <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
                    <button
                      onClick={() => updateDraft({ isUniversal: true })}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        draft.isUniversal ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      通用
                    </button>
                    <button
                      onClick={() => updateDraft({ isUniversal: false })}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-slate-300 ${
                        !draft.isUniversal ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      非通用
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {draft.isUniversal ? '通用组件对所有用户可见' : '非通用组件仅对指定用户/组织可见'}
                  </p>
                </div>

                {/* 目标用户/组织选择器（非通用时展开） */}
                {!draft.isUniversal && (
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50/30 p-4 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.127-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.127-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs font-medium text-cyan-800">目标用户/组织</span>
                      <span className="text-rose-500 text-xs">*</span>
                    </div>

                    {/* 组织树选择 */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">选择目标组织</p>
                      <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5">
                        <OrgTreeSelector
                          nodes={ORG_TREE}
                          selected={draft.targetOrgs ?? []}
                          onChange={ids => {
                            updateDraft({ targetOrgs: ids });
                            if (errors.target) setErrors(p => ({ ...p, target: undefined }));
                          }}
                        />
                      </div>
                      {(draft.targetOrgs ?? []).length > 0 && (
                        <p className="mt-1 text-xs text-cyan-600">已选择 {draft.targetOrgs!.length} 个组织</p>
                      )}
                    </div>

                    {/* 用户ID输入 */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">目标用户ID（逗号分隔）</p>
                      <input
                        type="text"
                        value={userInput}
                        onChange={e => {
                          setUserInput(e.target.value);
                          if (errors.target) setErrors(p => ({ ...p, target: undefined }));
                        }}
                        placeholder="如：user-001, user-002"
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 font-mono"
                      />
                    </div>

                    {errors.target && <p className="text-xs text-rose-500">{errors.target}</p>}
                  </div>
                )}

                {/* 是否固定 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">是否固定</label>
                  <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
                    <button
                      onClick={() => updateDraft({ isFixed: true })}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        draft.isFixed ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      固定
                    </button>
                    <button
                      onClick={() => updateDraft({ isFixed: false })}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-slate-300 ${
                        !draft.isFixed ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      非固定
                    </button>
                  </div>
                </div>

                {/* 固定组件说明（固定时展示） */}
                {draft.isFixed && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-amber-800">固定组件说明</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        固定组件将始终显示在门户的固定槽位中，用户无法自行移除或调整其位置。适用于待办事项、系统公告等核心功能组件。
                      </p>
                    </div>
                  </div>
                )}

                {/* 排序权重 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    排序权重 <span className="text-slate-400">（0-999，数值越大越靠前）</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={draft.sortWeight}
                      onChange={e => {
                        updateDraft({ sortWeight: Number(e.target.value) });
                        if (errors.sortWeight) setErrors(p => ({ ...p, sortWeight: undefined }));
                      }}
                      className={`w-24 px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors ${
                        errors.sortWeight
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                      }`}
                    />
                    <input
                      type="range"
                      min={0}
                      max={999}
                      value={draft.sortWeight}
                      onChange={e => updateDraft({ sortWeight: Number(e.target.value) })}
                      className="flex-1 accent-cyan-600"
                    />
                    <span className="text-sm font-semibold text-cyan-600 w-12 text-right">{draft.sortWeight}</span>
                  </div>
                  {errors.sortWeight && <p className="mt-1 text-xs text-rose-500">{errors.sortWeight}</p>}
                </div>

                {/* 状态 + 状态转换 */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-600 mb-2">组件状态</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm px-3 py-1.5 rounded-md border font-medium ${STATUS_STYLE[draft.status]}`}>
                      {STATUS_LABEL[draft.status]}
                    </span>
                    {canTransitionTo(draft.status, 'online') && (
                      <button
                        onClick={() => handleStatusTransition(draft, 'online')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        上架
                      </button>
                    )}
                    {canTransitionTo(draft.status, 'offline') && (
                      <button
                        onClick={() => handleStatusTransition(draft, 'offline')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        下架
                      </button>
                    )}
                    {!canTransitionTo(draft.status, 'online') && !canTransitionTo(draft.status, 'offline') && (
                      <span className="text-xs text-slate-400">当前状态无可用操作</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    状态流转：开发中 → 上架（手动）→ 下架（手动）→ 上架（手动）
                  </p>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="text-xs text-slate-400">
                  创建：{formatDate(draft.createdAt)} · 更新：{formatDate(draft.updatedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(draft)}
                    className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                  >
                    删除组件
                  </button>
                  <button
                    onClick={handleSave}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentManager;
