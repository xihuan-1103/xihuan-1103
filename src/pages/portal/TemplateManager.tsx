/**
 * 门户管理中心 - 模板管理
 * 维护"组件类型 + 组织绑定"组合模板，支持千人千面门户配置下发
 * 左侧模板列表 + 右侧配置面板（组件类型关联 / 组织绑定 双模式）
 */

import { useState, useEffect, useMemo } from 'react';
import {
  getTemplates,
  saveTemplates,
  getCompTypes,
  MOCK_ORG_TREE,
  DEPT_TYPES,
  genId,
} from './portalStore';
import type { PortalTemplate, TemplateStatus, OrgNode } from './types';

interface TemplateManagerProps {
  onRefresh: () => void;
}

// 组织树节点（带 children 用于递归渲染）
interface OrgTreeNode extends OrgNode {
  children: OrgTreeNode[];
}

type BindingTab = 'specifiedOrgs' | 'byDeptTypes';

const STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: '草稿',
  enabled: '启用',
  disabled: '停用',
};

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  enabled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disabled: 'bg-rose-50 text-rose-600 border-rose-200',
};

const LEVEL_LABEL: Record<OrgNode['level'], string> = {
  group: '集团',
  region: '区域',
  project: '项目部',
};

// 由扁平列表构建嵌套组织树
const buildOrgTree = (nodes: OrgNode[]): OrgTreeNode[] => {
  const map = new Map<string, OrgTreeNode>();
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }));
  const roots: OrgTreeNode[] = [];
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

// 计算模板最终绑定组织 ID（specifiedOrgs ∪ byDeptTypes 匹配项）
const computeBoundOrgIds = (tpl: PortalTemplate): string[] => {
  const fromSpecified = tpl.binding.specifiedOrgs;
  const fromByDeptTypes = MOCK_ORG_TREE
    .filter(n => n.deptType && tpl.binding.byDeptTypes.includes(n.deptType))
    .map(n => n.id);
  return Array.from(new Set([...fromSpecified, ...fromByDeptTypes]));
};

// 新建模板（默认草稿）
const createDefaultTemplate = (): PortalTemplate => {
  const now = new Date().toISOString();
  return {
    id: genId('tpl'),
    name: '新模板',
    typeIds: [],
    binding: { specifiedOrgs: [], byDeptTypes: [] },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
};

const TemplateManager = ({ onRefresh }: TemplateManagerProps) => {
  const [templates, setTemplates] = useState<PortalTemplate[]>([]);
  const [compTypes] = useState(() => getCompTypes());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PortalTemplate | null>(null);
  const [bindingTab, setBindingTab] = useState<BindingTab>('specifiedOrgs');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const orgTree = useMemo(() => buildOrgTree(MOCK_ORG_TREE), []);

  // 初始化加载
  useEffect(() => {
    const list = getTemplates();
    setTemplates(list);
    if (list.length > 0 && selectedId === null) {
      setSelectedId(list[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 选中模板同步到 draft
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const tpl = templates.find(t => t.id === selectedId);
    setDraft(tpl ? (JSON.parse(JSON.stringify(tpl)) as PortalTemplate) : null);
  }, [selectedId, templates]);

  // 当前选中模板（只读引用）
  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  // draft 绑定的组织 ID 列表
  const boundOrgIds = useMemo(() => {
    if (!draft) return [] as string[];
    return computeBoundOrgIds(draft);
  }, [draft]);

  // 绑定组织节点详情
  const boundOrgNodes = useMemo(
    () => MOCK_ORG_TREE.filter(n => boundOrgIds.includes(n.id)),
    [boundOrgIds],
  );

  // 各模板绑定组织数量（列表显示用）
  const boundCountMap = useMemo(() => {
    const m = new Map<string, number>();
    templates.forEach(t => m.set(t.id, computeBoundOrgIds(t).length));
    return m;
  }, [templates]);

  // 组件类型 id → name
  const compTypeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    compTypes.forEach(ct => m.set(ct.id, ct.name));
    return m;
  }, [compTypes]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const persist = (list: PortalTemplate[]) => {
    saveTemplates(list);
    setTemplates(list);
    onRefresh();
  };

  // 新增
  const handleAdd = () => {
    const tpl = createDefaultTemplate();
    const next = [...templates, tpl];
    persist(next);
    setSelectedId(tpl.id);
    showToast('success', '已新增模板（草稿状态）');
  };

  // 复制（强制草稿）
  const handleCopy = (tpl: PortalTemplate) => {
    const now = new Date().toISOString();
    const cloned: PortalTemplate = {
      ...(JSON.parse(JSON.stringify(tpl)) as PortalTemplate),
      id: genId('tpl'),
      name: `${tpl.name} 副本`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    const next = [...templates, cloned];
    persist(next);
    setSelectedId(cloned.id);
    showToast('success', '已复制为草稿模板');
  };

  // 删除（启用中禁止）
  const handleDelete = (tpl: PortalTemplate) => {
    if (tpl.status === 'enabled') {
      showToast('error', '启用中的模板不允许删除，请先停用');
      return;
    }
    if (!window.confirm(`确认删除模板「${tpl.name}」？此操作不可撤销。`)) return;
    const next = templates.filter(t => t.id !== tpl.id);
    persist(next);
    if (selectedId === tpl.id) {
      setSelectedId(next.length > 0 ? next[0].id : null);
    }
    showToast('success', '模板已删除');
  };

  // 保存草稿（仅保存配置，不改状态）
  const handleSaveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      showToast('error', '模板名称不能为空');
      return;
    }
    const now = new Date().toISOString();
    const updated: PortalTemplate = { ...draft, name: draft.name.trim(), updatedAt: now };
    const next = templates.map(t => (t.id === updated.id ? updated : t));
    persist(next);
    showToast('success', '模板配置已保存');
  };

  // 切换状态（启用前校验）
  const handleToggleStatus = (target: TemplateStatus) => {
    if (!draft) return;
    if (!draft.name.trim()) {
      showToast('error', '模板名称不能为空');
      return;
    }
    if (target === 'enabled') {
      if (draft.typeIds.length === 0) {
        showToast('error', '启用失败：需关联至少 1 个组件类型');
        return;
      }
      const boundCount = computeBoundOrgIds(draft).length;
      if (boundCount === 0) {
        showToast('error', '启用失败：需绑定至少 1 个组织节点');
        return;
      }
    }
    const now = new Date().toISOString();
    const updated: PortalTemplate = {
      ...draft,
      name: draft.name.trim(),
      status: target,
      updatedAt: now,
    };
    const next = templates.map(t => (t.id === updated.id ? updated : t));
    persist(next);
    const labelMap: Record<TemplateStatus, string> = {
      draft: '设为草稿',
      enabled: '启用',
      disabled: '停用',
    };
    showToast('success', `模板已${labelMap[target]}`);
  };

  const updateDraft = (patch: Partial<PortalTemplate>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const updateBinding = (patch: Partial<PortalTemplate['binding']>) => {
    setDraft(prev =>
      prev ? { ...prev, binding: { ...prev.binding, ...patch } } : prev,
    );
  };

  const toggleCompType = (typeId: string) => {
    if (!draft) return;
    const has = draft.typeIds.includes(typeId);
    updateDraft({
      typeIds: has ? draft.typeIds.filter(id => id !== typeId) : [...draft.typeIds, typeId],
    });
  };

  const toggleSpecifiedOrg = (orgId: string) => {
    if (!draft) return;
    const has = draft.binding.specifiedOrgs.includes(orgId);
    updateBinding({
      specifiedOrgs: has
        ? draft.binding.specifiedOrgs.filter(id => id !== orgId)
        : [...draft.binding.specifiedOrgs, orgId],
    });
  };

  const toggleDeptType = (code: string) => {
    if (!draft) return;
    const has = draft.binding.byDeptTypes.includes(code);
    updateBinding({
      byDeptTypes: has
        ? draft.binding.byDeptTypes.filter(c => c !== code)
        : [...draft.binding.byDeptTypes, code],
    });
  };

  // 递归渲染组织节点（仅科室节点可勾选）
  const renderOrgNode = (node: OrgTreeNode, depth: number) => {
    const isDept = !!node.deptType;
    const checked = draft?.binding.specifiedOrgs.includes(node.id) ?? false;
    const matchedByType =
      isDept && !!draft?.binding.byDeptTypes.includes(node.deptType!);
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-1.5 px-1 rounded transition-colors ${
            isDept ? 'hover:bg-cyan-50' : 'hover:bg-slate-50'
          }`}
          style={{ paddingLeft: depth * 18 + 4 }}
        >
          {isDept ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleSpecifiedOrg(node.id)}
              className="w-3.5 h-3.5 accent-cyan-600 shrink-0"
            />
          ) : (
            <svg
              className="w-3.5 h-3.5 text-slate-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          )}
          <span
            className={`text-sm truncate ${isDept ? 'text-slate-700' : 'text-slate-800 font-medium'}`}
          >
            {node.name}
          </span>
          {!isDept && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
              {LEVEL_LABEL[node.level]}
            </span>
          )}
          {matchedByType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600 border border-cyan-100">
              按类型匹配
            </span>
          )}
        </div>
        {node.children.length > 0 && (
          <div>{node.children.map(child => renderOrgNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  toast.type === 'success'
                    ? 'M5 13l4 4L19 7'
                    : 'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z'
                }
              />
            </svg>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：模板列表 */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">模板列表</h3>
                <p className="text-xs text-slate-500 mt-0.5">共 {templates.length} 个模板</p>
              </div>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                新增模板
              </button>
            </div>

            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {templates.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  暂无模板，点击右上角「新增模板」开始创建
                </div>
              )}
              {templates.map(tpl => {
                const active = tpl.id === selectedId;
                const boundCount = boundCountMap.get(tpl.id) ?? 0;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
                    className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors border-l-4 ${
                      active
                        ? 'bg-cyan-50 border-l-cyan-500'
                        : 'hover:bg-slate-50 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium truncate ${
                              active ? 'text-cyan-700' : 'text-slate-800'
                            }`}
                          >
                            {tpl.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[tpl.status]}`}
                          >
                            {STATUS_LABEL[tpl.status]}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <span>组件类型 {tpl.typeIds.length}</span>
                          <span className="text-slate-200">·</span>
                          <span>绑定组织 {boundCount}</span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleCopy(tpl)}
                          title="复制"
                          className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(tpl)}
                          title="删除"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部说明 */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              模板用于将组件类型下发到匹配的组织节点
            </div>
          </div>
        </div>

        {/* 右侧：配置面板 */}
        <div className="col-span-8">
          {!draft ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-slate-400 mt-2">请从左侧选择或新增一个模板进行配置</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* 顶部：基本信息 */}
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-cyan-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    模板配置
                  </h3>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded border ${STATUS_STYLE[draft.status]}`}
                  >
                    {STATUS_LABEL[draft.status]}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">模板名称</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={e => updateDraft({ name: e.target.value })}
                      placeholder="请输入模板名称"
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">匹配结果预览</label>
                    <div className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded flex items-center gap-2">
                      <span className="text-cyan-600 font-semibold">{draft.typeIds.length}</span>
                      <span className="text-slate-400 text-xs">组件类型</span>
                      <span className="text-slate-200 mx-1">|</span>
                      <span className="text-cyan-600 font-semibold">{boundOrgIds.length}</span>
                      <span className="text-slate-400 text-xs">组织节点</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 中间：两栏配置 */}
              <div className="grid grid-cols-12 gap-0 border-b border-slate-100">
                {/* 左栏：组件类型关联 */}
                <div className="col-span-5 border-r border-slate-100">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <svg
                        className="w-3.5 h-3.5 text-cyan-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 7h10v10H7zM3 3h4v4H3zm14 0h4v4h-4zM3 17h4v4H3zm14 0h4v4h-4z"
                        />
                      </svg>
                      组件类型关联
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      已勾选
                      <span className="text-cyan-600 font-medium mx-0.5">{draft.typeIds.length}</span>
                      / {compTypes.length} 个
                    </p>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {compTypes.length === 0 && (
                      <div className="px-3 py-6 text-center text-xs text-slate-400">
                        暂无组件类型，请先在「组件类型管理」中创建
                      </div>
                    )}
                    {compTypes.map(ct => {
                      const checked = draft.typeIds.includes(ct.id);
                      return (
                        <label
                          key={ct.id}
                          className={`flex items-start gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                            checked ? 'bg-cyan-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCompType(ct.id)}
                            className="mt-0.5 w-3.5 h-3.5 accent-cyan-600 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-sm font-medium ${
                                  checked ? 'text-cyan-700' : 'text-slate-700'
                                }`}
                              >
                                {ct.name}
                              </span>
                              <code className="px-1.5 py-0 rounded bg-slate-100 text-cyan-700 text-[10px] font-mono">
                                {ct.code}
                              </code>
                            </div>
                            {ct.description && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {ct.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 右栏：组织绑定 */}
                <div className="col-span-7">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-cyan-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-2m-4 0V9a1 1 0 00-1-1h-2a1 1 0 00-1 1v12m-4 0V13a1 1 0 00-1-1H5a1 1 0 00-1 1v8"
                          />
                        </svg>
                        组织绑定
                      </h4>
                      <div className="text-xs text-slate-400">
                        最终匹配：
                        <span className="text-cyan-600 font-medium ml-0.5">{boundOrgIds.length}</span> 个
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => setBindingTab('specifiedOrgs')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          bindingTab === 'specifiedOrgs'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        指定组织节点
                        <span
                          className={`ml-1 px-1.5 py-0 rounded-full text-[10px] ${
                            bindingTab === 'specifiedOrgs'
                              ? 'bg-white/20'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {draft.binding.specifiedOrgs.length}
                        </span>
                      </button>
                      <button
                        onClick={() => setBindingTab('byDeptTypes')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          bindingTab === 'byDeptTypes'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        按科室类型
                        <span
                          className={`ml-1 px-1.5 py-0 rounded-full text-[10px] ${
                            bindingTab === 'byDeptTypes'
                              ? 'bg-white/20'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {draft.binding.byDeptTypes.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {bindingTab === 'specifiedOrgs' ? (
                      <div>
                        <p className="text-xs text-slate-400 px-2 py-1">
                          勾选具体科室节点（带科室类型的叶子节点），与「按科室类型」结果取并集
                        </p>
                        {orgTree.map(node => renderOrgNode(node, 0))}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-400 px-2 py-1">
                          勾选科室类型后，将自动匹配组织树中所有该类型的科室节点
                        </p>
                        <div className="space-y-1">
                          {DEPT_TYPES.map(dt => {
                            const checked = draft.binding.byDeptTypes.includes(dt.code);
                            const matchedCount = MOCK_ORG_TREE.filter(
                              n => n.deptType === dt.code,
                            ).length;
                            return (
                              <label
                                key={dt.code}
                                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                                  checked ? 'bg-cyan-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleDeptType(dt.code)}
                                  className="w-3.5 h-3.5 accent-cyan-600 shrink-0"
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    checked ? 'text-cyan-700' : 'text-slate-700'
                                  }`}
                                >
                                  {dt.name}
                                </span>
                                <code className="px-1.5 py-0 rounded bg-slate-100 text-cyan-700 text-[10px] font-mono">
                                  {dt.code}
                                </code>
                                <span className="ml-auto text-xs text-slate-400">
                                  匹配 {matchedCount} 个节点
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 匹配结果预览 */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-medium text-slate-600">匹配组织节点预览（两种模式取并集）</h4>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                    共 {boundOrgNodes.length} 个
                  </span>
                </div>
                {boundOrgNodes.length === 0 ? (
                  <p className="text-xs text-slate-400">尚未绑定任何组织节点</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {boundOrgNodes.map(n => (
                      <span
                        key={n.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs"
                        title={n.path}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"
                          />
                        </svg>
                        {n.path}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部操作 */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="text-xs text-slate-400">
                  创建：{new Date(draft.createdAt).toLocaleString('zh-CN')}
                  <span className="mx-2">|</span>
                  更新：{new Date(draft.updatedAt).toLocaleString('zh-CN')}
                </div>
                <div className="flex items-center gap-2">
                  {selectedTemplate?.status === 'enabled' ? (
                    <button
                      onClick={() => handleToggleStatus('disabled')}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                    >
                      停用模板
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus('enabled')}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                    >
                      启用模板
                    </button>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded transition-colors shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    保存配置
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

export default TemplateManager;
