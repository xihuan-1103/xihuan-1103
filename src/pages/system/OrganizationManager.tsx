/**
 * 系统管理 - 组织管理
 * 左侧组织架构树 + 右侧组织详情编辑
 * 支持：新增（指定上级）/编辑/删除，删除前校验子组织与人员
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, Save, ChevronRight, ChevronDown, Building2,
  Network, AlertCircle, X, FolderTree,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOrgs, saveOrgs, buildOrgPath, SYS_DEPT_TYPES,
  getDeptTypeName, genId, getUsers,
} from './systemStore';
import type { SysOrg, SysOrgLevel, SysDeptTypeCode } from './types';

interface OrganizationManagerProps {
  onRefresh: () => void;
}

interface FormErrors {
  name?: string;
  parentId?: string;
  level?: string;
  deptType?: string;
}

const LEVEL_LABEL: Record<SysOrgLevel, string> = {
  group: '集团',
  region: '区域',
  project: '项目部',
};

const LEVEL_STYLE: Record<SysOrgLevel, string> = {
  group: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  region: 'bg-blue-50 text-blue-700 border-blue-200',
  project: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

// 带子节点的树节点
interface TreeNode extends SysOrg {
  children: TreeNode[];
}

// 由扁平数组构建组织树（保持原始顺序）
const buildTree = (orgs: SysOrg[]): TreeNode[] => {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  orgs.forEach(o => map.set(o.id, { ...o, children: [] }));
  orgs.forEach(o => {
    const node = map.get(o.id)!;
    if (o.parentId && map.has(o.parentId)) {
      map.get(o.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

// 给定父节点，返回可选层级（约束规则）
//   无父级：仅 group（顶层集团）
//   父=集团：region（子组织）/ group（集团科室）
//   父=区域：project（子组织）/ region（区域科室）
//   父=项目部：仅 project（项目部科室）
//   父=科室节点：不允许（科室为叶子）
const getValidLevelsForParent = (parent: SysOrg | undefined): SysOrgLevel[] => {
  if (!parent) return ['group'];
  if (parent.deptType) return [];
  if (parent.level === 'group') return ['region', 'group'];
  if (parent.level === 'region') return ['project', 'region'];
  if (parent.level === 'project') return ['project'];
  return [];
};

const getValidLevels = (parentId: string | undefined, orgs: SysOrg[]): SysOrgLevel[] => {
  const parent = parentId ? orgs.find(o => o.id === parentId) : undefined;
  return getValidLevelsForParent(parent);
};

// 当前节点是否为科室节点（层级等于父级层级，且存在父级）
const isDeptLevel = (
  level: SysOrgLevel,
  parentId: string | undefined,
  orgs: SysOrg[],
): boolean => {
  if (!parentId) return false;
  const parent = orgs.find(o => o.id === parentId);
  return !!parent && !parent.deptType && parent.level === level;
};

// 获取自身及所有后代 ID
const getDescendantIds = (id: string, orgs: SysOrg[]): string[] => {
  const result = [id];
  const children = orgs.filter(o => o.parentId === id);
  for (const c of children) {
    result.push(...getDescendantIds(c.id, orgs));
  }
  return result;
};

// 重建所有组织 path（父级在前，自上而下计算）
const rebuildPaths = (orgs: SysOrg[]): SysOrg[] => {
  const map = new Map(orgs.map(o => [o.id, { ...o }]));
  const resolved = new Set<string>();
  const resolve = (id: string) => {
    if (resolved.has(id)) return;
    const org = map.get(id);
    if (!org) return;
    if (org.parentId) {
      const parent = map.get(org.parentId);
      if (parent && !resolved.has(parent.id)) {
        resolve(parent.id);
      }
      const p = map.get(org.parentId);
      org.path = p?.path ? `${p.path}/${org.name}` : org.name;
    } else {
      org.path = org.name;
    }
    resolved.add(id);
  };
  for (const id of map.keys()) resolve(id);
  return Array.from(map.values());
};

// ========== 递归树视图 ==========
const OrgTreeView = ({
  nodes,
  depth,
  selectedId,
  onSelect,
  expanded,
  onToggle,
  onAddChild,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) => {
  return (
    <>
      {nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded.has(node.id);
        const active = node.id === selectedId;
        const canAddChild = !node.deptType; // 科室节点为叶子，不可加子节点
        return (
          <div key={node.id}>
            <div
              onClick={() => onSelect(node.id)}
              className={cn(
                'group flex items-center gap-1 pr-2 py-1.5 cursor-pointer rounded text-sm transition-colors',
                active
                  ? 'bg-cyan-50 text-cyan-700 font-medium border-l-2 border-l-cyan-500'
                  : 'hover:bg-slate-50 border-l-2 border-l-transparent',
              )}
              style={{ paddingLeft: `${depth * 18 + 8}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={e => { e.stopPropagation(); onToggle(node.id); }}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-[14px] shrink-0" />
              )}
              <span className="truncate">{node.name || '(未命名)'}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                  LEVEL_STYLE[node.level],
                )}
              >
                {LEVEL_LABEL[node.level]}
              </span>
              {node.deptType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  {getDeptTypeName(node.deptType)}
                </span>
              )}
              {canAddChild && (
                <button
                  onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                  title="新增子组织"
                  className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-cyan-600 hover:text-cyan-800 transition-opacity"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            {hasChildren && isExpanded && (
              <OrgTreeView
                nodes={node.children}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
                onAddChild={onAddChild}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

// ========== 上级组织选择器（递归单选树） ==========
const ParentTreeSelect = ({
  nodes,
  depth,
  selected,
  onSelect,
  excludeIds,
}: {
  nodes: TreeNode[];
  depth: number;
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
  excludeIds: string[];
}) => {
  return (
    <>
      {nodes.map(node => {
        const isExcluded = excludeIds.includes(node.id);
        const isDept = !!node.deptType;
        const disabled = isExcluded || isDept;
        return (
          <div key={node.id}>
            <label
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors',
                selected === node.id
                  ? 'bg-cyan-100 text-cyan-700'
                  : disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-cyan-50 cursor-pointer',
              )}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <input
                type="radio"
                name="parentOrg"
                checked={selected === node.id}
                disabled={disabled}
                onChange={() => !disabled && onSelect(node.id)}
                className="w-3.5 h-3.5 accent-cyan-600"
              />
              <span className="truncate">{node.name}</span>
              <span className="text-[10px] text-slate-400">{LEVEL_LABEL[node.level]}</span>
              {isDept && (
                <span className="text-[10px] text-amber-600">{getDeptTypeName(node.deptType!)}</span>
              )}
            </label>
            {node.children.length > 0 && (
              <ParentTreeSelect
                nodes={node.children}
                depth={depth + 1}
                selected={selected}
                onSelect={onSelect}
                excludeIds={excludeIds}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

// ========== 主组件 ==========
const OrganizationManager = ({ onRefresh }: OrganizationManagerProps) => {
  const [orgs, setOrgs] = useState<SysOrg[]>(() => getOrgs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SysOrg | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(getOrgs().map(o => o.id)));
  const [showParentSelect, setShowParentSelect] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const tree = useMemo(() => buildTree(orgs), [orgs]);

  const validLevels = draft ? getValidLevels(draft.parentId, orgs) : [];
  const deptMode = draft ? isDeptLevel(draft.level, draft.parentId, orgs) : false;

  // 选中节点时同步 draft
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      setIsNew(false);
      return;
    }
    const org = orgs.find(o => o.id === selectedId);
    if (org) {
      setDraft({ ...org });
      setIsNew(false);
      setErrors({});
      setShowParentSelect(false);
    } else {
      setDraft(null);
    }
  }, [selectedId, orgs]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const updateDraft = (patch: Partial<SysOrg>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  // 顶层新增
  const handleAddRoot = () => {
    const now = new Date().toISOString();
    setDraft({
      id: genId('org'),
      name: '',
      level: 'group',
      parentId: undefined,
      path: '',
      createdAt: now,
      updatedAt: now,
    });
    setSelectedId(null);
    setIsNew(true);
    setErrors({});
    setShowParentSelect(false);
  };

  // 在指定上级下新增
  const handleAddChild = (parentId: string) => {
    const parent = orgs.find(o => o.id === parentId);
    if (!parent || parent.deptType) return;
    const levels = getValidLevels(parentId, orgs);
    const now = new Date().toISOString();
    setDraft({
      id: genId('org'),
      name: '',
      level: levels[0] ?? 'group',
      parentId,
      path: '',
      createdAt: now,
      updatedAt: now,
    });
    setSelectedId(null);
    setIsNew(true);
    setErrors({});
    setShowParentSelect(false);
    setExpanded(prev => new Set(prev).add(parentId));
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 校验
  const validate = (data: SysOrg): FormErrors => {
    const errs: FormErrors = {};
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
      errs.name = '组织名称需 2-20 个字';
    }
    // 上级校验
    if (data.parentId) {
      const parent = orgs.find(o => o.id === data.parentId);
      if (!parent) {
        errs.parentId = '上级组织不存在';
      } else if (parent.deptType) {
        errs.parentId = '科室节点不能作为上级组织';
      }
    }
    // 层级校验
    if (!validLevels.includes(data.level)) {
      errs.level = '当前层级与上级组织不匹配';
    }
    // 科室节点必须选择部门类型
    if (deptMode && !data.deptType) {
      errs.deptType = '科室节点必须选择部门类型';
    }
    // 若为组织节点，不应保留 deptType（双重保险）
    if (!deptMode && data.deptType) {
      // 静默清除，不报错
    }
    // 子组织兼容性校验（编辑移动时，子节点层级可能失效）
    const children = orgs.filter(o => o.parentId === data.id);
    if (children.length > 0) {
      const draftAsParent: SysOrg = { ...data, deptType: deptMode ? data.deptType : undefined };
      for (const child of children) {
        if (!getValidLevelsForParent(draftAsParent).includes(child.level)) {
          errs.level = `子组织「${child.name || '(未命名)'}」的层级在当前配置下不合法，请先调整子组织`;
          break;
        }
      }
    }
    return errs;
  };

  // 保存
  const handleSave = () => {
    if (!draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const name = draft.name.trim();
    const now = new Date().toISOString();
    const finalOrg: SysOrg = {
      ...draft,
      name,
      deptType: deptMode ? draft.deptType : undefined,
      updatedAt: now,
    };
    finalOrg.path = buildOrgPath({ parentId: finalOrg.parentId, name }, orgs);

    let next: SysOrg[];
    if (isNew) {
      next = [...orgs, finalOrg];
    } else {
      next = orgs.map(o => (o.id === finalOrg.id ? finalOrg : o));
    }
    // 重建所有 path（名称/上级变更时级联更新）
    next = rebuildPaths(next);
    saveOrgs(next);
    setOrgs(next);
    setSelectedId(finalOrg.id);
    setIsNew(false);
    setExpanded(prev => new Set(prev).add(finalOrg.id));
    showToast('success', isNew ? '组织已创建' : '组织已保存');
    onRefresh();
  };

  // 删除（带子组织/人员校验）
  const handleDelete = (org: SysOrg) => {
    const hasChildren = orgs.some(o => o.parentId === org.id);
    if (hasChildren) {
      showToast('error', '该组织下存在子组织，不允许删除');
      return;
    }
    const descendantIds = getDescendantIds(org.id, orgs);
    const allUsers = getUsers();
    const hasUsers = allUsers.some(u => descendantIds.includes(u.orgId));
    if (hasUsers) {
      showToast('error', '该组织下存在人员，不允许删除');
      return;
    }
    if (!window.confirm(`确认删除组织「${org.name}」？此操作不可撤销。`)) return;
    const next = orgs.filter(o => o.id !== org.id);
    saveOrgs(next);
    setOrgs(next);
    if (selectedId === org.id) {
      setSelectedId(null);
      setDraft(null);
    }
    showToast('success', '组织已删除');
    onRefresh();
  };

  // 切换上级：自动调整层级
  const handleParentChange = (parentId: string | undefined) => {
    if (!draft) return;
    const parent = parentId ? orgs.find(o => o.id === parentId) : undefined;
    const levels = getValidLevelsForParent(parent);
    let newLevel = draft.level;
    if (!levels.includes(newLevel)) newLevel = levels[0] ?? 'group';
    const willBeDept = isDeptLevel(newLevel, parentId, orgs);
    updateDraft({
      parentId,
      level: newLevel,
      deptType: willBeDept ? draft.deptType : undefined,
    });
    setErrors(prev => ({ ...prev, parentId: undefined, level: undefined }));
    setShowParentSelect(false);
  };

  // 切换层级：科室层级需 deptType
  const handleLevelChange = (level: SysOrgLevel) => {
    if (!draft) return;
    const willBeDept = isDeptLevel(level, draft.parentId, orgs);
    updateDraft({
      level,
      deptType: willBeDept ? draft.deptType : undefined,
    });
    setErrors(prev => ({ ...prev, level: undefined, deptType: undefined }));
  };

  // 父级展示名
  const parentLabel = (() => {
    if (!draft) return '';
    if (!draft.parentId) return '无（顶层集团）';
    const p = orgs.find(o => o.id === draft.parentId);
    return p ? `${p.name}（${LEVEL_LABEL[p.level]}）` : '无（顶层集团）';
  })();

  // 父级选择树排除：自身 + 所有后代（防止环路）
  const parentExcludeIds = useMemo(() => {
    if (!draft) return [];
    return getDescendantIds(draft.id, orgs);
  }, [draft, orgs]);

  const parentTree = useMemo(() => buildTree(orgs), [orgs]);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-6 z-50">
          <div
            className={cn(
              'px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2',
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600',
            )}
          >
            {toast.type === 'success' ? <Save size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：组织架构树 */}
        <div className="col-span-5 xl:col-span-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* 树头 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-cyan-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">组织架构</h3>
                  <p className="text-xs text-slate-500 mt-0.5">共 {orgs.length} 个节点</p>
                </div>
              </div>
              <button
                onClick={handleAddRoot}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
              >
                <Plus size={14} />
                新增顶层
              </button>
            </div>

            {/* 树体 */}
            <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {tree.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  暂无组织，点击「新增顶层」开始创建
                </div>
              ) : (
                <OrgTreeView
                  nodes={tree}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onAddChild={handleAddChild}
                />
              )}
            </div>
          </div>
        </div>

        {/* 右侧：详情编辑 */}
        <div className="col-span-7 xl:col-span-8">
          {!draft ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Network size={48} className="mx-auto text-slate-300" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 mt-3">请从左侧选择组织节点，或点击「新增顶层」创建</p>
                <p className="text-xs text-slate-400 mt-1">悬停节点可快速新增子组织</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* 表单头 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {isNew ? '新增组织' : '编辑组织'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ID: <code className="text-cyan-700 font-mono">{draft.id}</code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs px-2 py-1 rounded border', LEVEL_STYLE[draft.level])}>
                    {LEVEL_LABEL[draft.level]}
                  </span>
                  {draft.deptType && (
                    <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-700 border-amber-200">
                      {getDeptTypeName(draft.deptType)}
                    </span>
                  )}
                </div>
              </div>

              {/* 表单内容 */}
              <div className="px-5 py-4 space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                {/* 组织名称 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    组织名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => {
                      updateDraft({ name: e.target.value });
                      if (errors.name) setErrors(p => ({ ...p, name: undefined }));
                    }}
                    placeholder="如：养护集团 / 区域A / 项目部1 / 工程科"
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                      errors.name
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                    )}
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* 上级组织 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    上级组织 <span className="text-slate-400">（顶层集团无需选择）</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowParentSelect(v => !v)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border bg-white transition-colors',
                      errors.parentId
                        ? 'border-rose-400'
                        : 'border-slate-300 hover:border-cyan-400',
                    )}
                  >
                    <span className={draft.parentId ? 'text-slate-700' : 'text-slate-400'}>
                      {parentLabel}
                    </span>
                    {showParentSelect ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {errors.parentId && <p className="mt-1 text-xs text-rose-500">{errors.parentId}</p>}

                  {/* 上级选择树 */}
                  {showParentSelect && (
                    <div className="mt-2 rounded-md border border-slate-200 bg-white p-1.5 max-h-64 overflow-y-auto">
                      <label
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer',
                          !draft.parentId ? 'bg-cyan-100 text-cyan-700' : 'hover:bg-cyan-50',
                        )}
                      >
                        <input
                          type="radio"
                          name="parentOrg"
                          checked={!draft.parentId}
                          onChange={() => handleParentChange(undefined)}
                          className="w-3.5 h-3.5 accent-cyan-600"
                        />
                        <span>无（顶层集团）</span>
                        <span className="text-[10px] text-slate-400">集团</span>
                      </label>
                      <ParentTreeSelect
                        nodes={parentTree}
                        depth={0}
                        selected={draft.parentId}
                        onSelect={handleParentChange}
                        excludeIds={parentExcludeIds}
                      />
                    </div>
                  )}
                </div>

                {/* 组织层级 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    组织层级 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {validLevels.length === 0 && (
                      <span className="text-xs text-rose-500">当前上级下无可选层级</span>
                    )}
                    {validLevels.map(lv => {
                      const checked = draft.level === lv;
                      const willBeDept = isDeptLevel(lv, draft.parentId, orgs);
                      return (
                        <label
                          key={lv}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border cursor-pointer transition-colors',
                            checked
                              ? 'bg-cyan-50 border-cyan-500 text-cyan-700'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-cyan-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="orgLevel"
                            checked={checked}
                            onChange={() => handleLevelChange(lv)}
                            className="w-3.5 h-3.5 accent-cyan-600"
                          />
                          {LEVEL_LABEL[lv]}
                          <span className="text-[10px] text-slate-400">
                            ({willBeDept ? '科室' : '组织'})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.level && <p className="mt-1 text-xs text-rose-500">{errors.level}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {deptMode
                      ? '当前为科室节点，层级与上级一致，作为该层级部门'
                      : '层级规则：集团（顶层）→ 区域 → 项目部，逐级递进'}
                  </p>
                </div>

                {/* 部门类型（仅科室节点） */}
                {deptMode && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                    <label className="block text-xs font-medium text-amber-800 mb-1.5">
                      部门类型 <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SYS_DEPT_TYPES.map(d => {
                        const checked = draft.deptType === d.code;
                        return (
                          <label
                            key={d.code}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border cursor-pointer transition-colors',
                              checked
                                ? 'bg-amber-100 border-amber-500 text-amber-800'
                                : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300',
                            )}
                          >
                            <input
                              type="radio"
                              name="deptType"
                              checked={checked}
                              onChange={() => {
                                updateDraft({ deptType: d.code as SysDeptTypeCode });
                                if (errors.deptType) setErrors(p => ({ ...p, deptType: undefined }));
                              }}
                              className="w-3.5 h-3.5 accent-amber-600"
                            />
                            {d.name}
                          </label>
                        );
                      })}
                    </div>
                    {errors.deptType && <p className="text-xs text-rose-500">{errors.deptType}</p>}
                  </div>
                )}

                {/* 路径预览（只读） */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    组织路径 <span className="text-slate-400">（自动生成）</span>
                  </label>
                  <div className="px-3 py-2 text-sm rounded-md border border-slate-200 bg-slate-50 font-mono text-slate-600 break-all">
                    {draft.parentId
                      ? `${orgs.find(o => o.id === draft.parentId)?.path ?? ''}/${draft.name.trim() || '(名称)'}`
                      : (draft.name.trim() || '(名称)')}
                  </div>
                </div>

                {/* 层级规则说明 */}
                <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-cyan-800 space-y-0.5">
                    <p className="font-medium">层级规则</p>
                    <p>· 集团（group）为顶层节点，无上级</p>
                    <p>· 区域（region）的上级必须是集团节点</p>
                    <p>· 项目部（project）的上级必须是区域节点</p>
                    <p>· 科室节点可挂在集团/区域/项目部下，作为该层级部门</p>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="text-xs text-slate-400">
                  {isNew ? '新建组织' : `创建：${formatDate(draft.createdAt)} · 更新：${formatDate(draft.updatedAt)}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(draft)}
                    disabled={isNew}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
                      isNew
                        ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200',
                    )}
                  >
                    <Trash2 size={14} />
                    删除组织
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded transition-colors shadow-sm"
                  >
                    <Save size={14} />
                    保存
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

export default OrganizationManager;
