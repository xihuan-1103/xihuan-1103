/**
 * 系统管理 - 组织管理
 * 参照集团组织管理原型（扁平树表）：
 *  - 顶部：部门名称搜索 + 查询/重置；「+ 新建」按钮
 *  - 表格列：部门名称（树形缩进 + 展开/收起）、部门编码、是否签约组织、是否核算机构、排序、
 *           操作（添加下级 / 编辑 / 删除）
 *  - 删除前校验：存在下级部门或部门内有人员时不可删除
 */

import { useState, useMemo } from 'react';
import { Search, RotateCcw, Plus, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOrgs, saveOrgs, buildOrgPath, genId, getUsers,
} from './systemStore';
import type { SysOrg } from './types';

interface OrganizationManagerProps {
  onRefresh?: () => void;
}

interface FormErrors {
  name?: string;
}

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

// 关键字过滤：保留命中节点与祖先链
const filterTree = (nodes: TreeNode[], kw: string): TreeNode[] => {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const kids = filterTree(n.children, kw);
    if (n.name.includes(kw) || n.code?.toLowerCase().includes(kw) || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
};

// 树 → 扁平行（仅保留展开的子节点）
const flattenVisible = (nodes: TreeNode[], expanded: Set<string>, kw: string, depth = 0): { node: TreeNode; depth: number }[] =>
  nodes.flatMap(n => {
    const rows: { node: TreeNode; depth: number }[] = [{ node: n, depth }];
    if (n.children.length > 0 && (kw ? true : expanded.has(n.id))) {
      rows.push(...flattenVisible(n.children, expanded, kw, depth + 1));
    }
    return rows;
  });

// 弹窗草稿
interface OrgDraft {
  id?: string;          // 有值 = 编辑
  parentId?: string;    // 上级（新建根级时为空）
  parentLocked: boolean;// 上级是否锁定（添加下级场景）
  name: string;
  code: string;
  isContract: boolean;
  isAccounting: boolean;
  sort: string;
}

const OrganizationManager = ({ onRefresh }: OrganizationManagerProps) => {
  const [orgs, setOrgs] = useState<SysOrg[]>(() => getOrgs());
  const [kwInput, setKwInput] = useState('');
  const [appliedKw, setAppliedKw] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['org-jt']));
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<OrgDraft | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const orgTree = useMemo(() => buildTree(orgs), [orgs]);
  const kw = appliedKw.trim().toLowerCase();
  const filteredTree = useMemo(
    () => (kw ? filterTree(orgTree, kw) : orgTree),
    [orgTree, kw],
  );
  const visibleRows = useMemo(
    () => flattenVisible(filteredTree, expanded, kw),
    [filteredTree, expanded, kw],
  );

  const reload = () => {
    setOrgs(getOrgs());
    onRefresh?.();
  };

  const parentName = (parentId?: string) =>
    parentId ? orgs.find(o => o.id === parentId)?.name ?? '—' : '—';

  // 展开链（编辑/添加下级后自动展开父级）
  const expandWith = (ids: string[]) => {
    setExpanded(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.add(id));
      return n;
    });
  };

  // 打开新建（默认挂到根组织下，可选上级）
  const openCreate = () => {
    setDraft({
      parentId: orgs.find(o => !o.parentId)?.id,
      parentLocked: false,
      name: '',
      code: '',
      isContract: false,
      isAccounting: false,
      sort: '0',
    });
    setErrors({});
    setModalOpen(true);
  };

  // 打开添加下级
  const openAddChild = (parent: SysOrg) => {
    setDraft({
      parentId: parent.id,
      parentLocked: true,
      name: '',
      code: '',
      isContract: false,
      isAccounting: false,
      sort: '0',
    });
    setErrors({});
    setModalOpen(true);
  };

  // 打开编辑
  const openEdit = (o: SysOrg) => {
    setDraft({
      id: o.id,
      parentId: o.parentId,
      parentLocked: true,
      name: o.name,
      code: o.code ?? '',
      isContract: !!o.isContract,
      isAccounting: !!o.isAccounting,
      sort: String(o.sort ?? 0),
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (name.length < 2 || name.length > 30) {
      setErrors({ name: '部门名称需 2-30 个字' });
      return;
    }
    // 同级重名校验
    const dup = orgs.find(o =>
      o.id !== draft.id && o.name === name && o.parentId === draft.parentId);
    if (dup) {
      setErrors({ name: '同级下已存在同名部门' });
      return;
    }

    const now = new Date().toISOString();
    if (draft.id) {
      // 编辑
      const next = orgs.map(o => {
        if (o.id !== draft.id) return o;
        const updated: SysOrg = {
          ...o,
          name,
          code: draft.code.trim() || undefined,
          isContract: draft.isContract,
          isAccounting: draft.isAccounting,
          sort: Number(draft.sort) || 0,
          updatedAt: now,
        };
        return { ...updated, path: buildOrgPath(updated, orgs) };
      });
      // 名称变更后刷新所有后代 path
      const byId = new Map(next.map(o => [o.id, o]));
      next.forEach(o => {
        if (o.parentId && byId.get(o.parentId)) {
          o.path = buildOrgPath(o, next);
        }
      });
      saveOrgs(next);
      setOrgs(next);
      showToast('success', '部门信息已保存');
    } else {
      // 新建
      const parent = orgs.find(o => o.id === draft.parentId);
      const created: SysOrg = {
        id: genId('org'),
        name,
        level: parent ? (parent.level === 'group' ? 'region' : 'project') : 'group',
        parentId: draft.parentId,
        path: parent ? `${parent.path}/${name}` : name,
        code: draft.code.trim() || undefined,
        isContract: draft.isContract,
        isAccounting: draft.isAccounting,
        sort: Number(draft.sort) || 0,
        createdAt: now,
        updatedAt: now,
      };
      const next = [...orgs, created];
      saveOrgs(next);
      setOrgs(next);
      if (created.parentId) expandWith([created.parentId]);
      showToast('success', `部门「${name}」已创建`);
    }
    setModalOpen(false);
    setDraft(null);
    reload();
  };

  // 删除：有下级或有人员时拦截
  const handleDelete = (o: SysOrg) => {
    const hasChildren = orgs.some(x => x.parentId === o.id);
    const hasUsers = getUsers().some(u => u.orgId === o.id);
    if (hasChildren) {
      showToast('error', `部门「${o.name}」存在下级部门，无法删除`);
      return;
    }
    if (hasUsers) {
      showToast('error', `部门「${o.name}」下存在人员，无法删除`);
      return;
    }
    if (!window.confirm(`确定删除部门「${o.name}」吗？删除后不可恢复。`)) return;
    const next = orgs.filter(x => x.id !== o.id);
    saveOrgs(next);
    setOrgs(next);
    showToast('success', `部门「${o.name}」已删除`);
    reload();
  };

  const handleSearch = () => setAppliedKw(kwInput);
  const handleReset = () => {
    setKwInput('');
    setAppliedKw('');
  };

  const selectedParent = draft?.parentId ? orgs.find(o => o.id === draft.parentId) : undefined;

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={cn(
              'px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white',
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600',
            )}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-3">
        <span className="text-sm text-slate-600">部门名称:</span>
        <input
          type="text"
          value={kwInput}
          onChange={e => setKwInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="请输入部门名称"
          className="w-56 px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
        >
          <Search size={14} />
          查询
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      {/* 新建按钮 */}
      <div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
        >
          <Plus size={14} />
          新建
        </button>
      </div>

      {/* 组织树表 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 min-w-[220px]">部门名称</th>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">部门编码</th>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">是否签约组织</th>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">是否核算机构</th>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">排序</th>
                <th className="px-4 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {orgs.length === 0 ? '暂无部门，点击「新建」开始创建' : '没有匹配的部门'}
                  </td>
                </tr>
              )}
              {visibleRows.map(({ node, depth }) => {
                const hasChildren = node.children.length > 0;
                const isOpen = kw ? true : expanded.has(node.id);
                return (
                  <tr key={node.id} className="border-b border-slate-100 hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 24}px` }}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => setExpanded(prev => {
                              const n = new Set(prev);
                              if (n.has(node.id)) n.delete(node.id);
                              else n.add(node.id);
                              return n;
                            })}
                            className="w-4 h-4 flex items-center justify-center text-[11px] font-bold text-slate-500 border border-slate-300 rounded-sm hover:bg-slate-100"
                            title={isOpen ? '收起' : '展开'}
                          >
                            {isOpen ? '−' : '+'}
                          </button>
                        ) : (
                          <span className="w-4" />
                        )}
                        <Building2 size={13} className="text-orange-500 shrink-0" />
                        <span className="text-slate-800">{node.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-600">{node.code || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {node.isContract === undefined ? '—' : node.isContract ? '是' : '否'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {node.isAccounting === undefined ? '—' : node.isAccounting ? '是' : '否'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 tabular-nums">{node.sort ?? '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => openAddChild(node)}
                          className="text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          添加下级
                        </button>
                        <span className="w-px h-3 bg-slate-200" />
                        <button
                          onClick={() => openEdit(node)}
                          className="text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          编辑
                        </button>
                        <span className="w-px h-3 bg-slate-200" />
                        <button
                          onClick={() => handleDelete(node)}
                          className="text-rose-500 hover:text-rose-600 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          共 {orgs.length} 个部门
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm">
                  <Building2 size={18} />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  {draft.id ? '编辑部门' : draft.parentLocked ? `添加下级 — ${parentName(draft.parentId)}` : '新建部门'}
                </h3>
              </div>
              <button
                onClick={() => { setModalOpen(false); setDraft(null); }}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
              {/* 上级部门 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  上级部门 <span className="text-slate-400 font-normal">（新建根级时可为空）</span>
                </label>
                {draft.parentLocked ? (
                  <div className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-2">
                    <Building2 size={14} className="text-orange-400 shrink-0" />
                    {selectedParent ? selectedParent.path : '（无 — 顶级部门）'}
                  </div>
                ) : (
                  <select
                    value={draft.parentId ?? ''}
                    onChange={e => setDraft(p => (p ? { ...p, parentId: e.target.value || undefined } : p))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">（无 — 顶级部门）</option>
                    {orgs.map(o => (
                      <option key={o.id} value={o.id}>{o.path}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 部门名称 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    部门名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => {
                      setDraft(p => (p ? { ...p, name: e.target.value } : p));
                      if (errors.name) setErrors({});
                    }}
                    placeholder="如：杭州区域中心"
                    maxLength={30}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                      errors.name
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                    )}
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* 部门编码 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">部门编码</label>
                  <input
                    type="text"
                    value={draft.code}
                    onChange={e => setDraft(p => (p ? { ...p, code: e.target.value } : p))}
                    placeholder="如：YHORG53"
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 font-mono focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 是否签约组织 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">是否签约组织</label>
                  <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
                    {[['是', true], ['否', false]].map(([label, val], i) => (
                      <button
                        key={String(label)}
                        type="button"
                        onClick={() => setDraft(p => (p ? { ...p, isContract: val as boolean } : p))}
                        className={cn(
                          'px-4 py-1.5 text-sm font-medium transition-colors',
                          i > 0 && 'border-l border-slate-300',
                          draft.isContract === val ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 是否核算机构 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">是否核算机构</label>
                  <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
                    {[['是', true], ['否', false]].map(([label, val], i) => (
                      <button
                        key={String(label)}
                        type="button"
                        onClick={() => setDraft(p => (p ? { ...p, isAccounting: val as boolean } : p))}
                        className={cn(
                          'px-4 py-1.5 text-sm font-medium transition-colors',
                          i > 0 && 'border-l border-slate-300',
                          draft.isAccounting === val ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 排序 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">排序</label>
                <input
                  type="text"
                  value={draft.sort}
                  onChange={e => setDraft(p => (p ? { ...p, sort: e.target.value.replace(/[^\d]/g, '') } : p))}
                  placeholder="数字越小越靠前"
                  className="w-40 px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                onClick={() => { setModalOpen(false); setDraft(null); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm"
              >
                {draft.id ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationManager;
