/**
 * 系统管理 - 人员管理模块
 * 维护系统人员：新增/编辑/启停用，登录账号唯一校验，所属组织仅限科室节点
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserPlus, Search, Edit2, Trash2, Power, X, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, Mail, Phone, Briefcase, Building2, User, IdCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getUsers, saveUsers, getOrgs, getDeptOrgs, getOrgById, genId,
} from './systemStore';
import type { SysUser, SysOrg } from './types';

interface PersonnelManagerProps {
  onRefresh: () => void;
}

interface FormErrors {
  name?: string;
  username?: string;
  orgId?: string;
  position?: string;
  phone?: string;
  email?: string;
}

// 组织树节点（带 children）
interface OrgTreeNode extends SysOrg {
  children: OrgTreeNode[];
}

// 由扁平组织数组构建树
const buildOrgTree = (nodes: SysOrg[]): OrgTreeNode[] => {
  const map = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];
  nodes.forEach(n => map.set(n.id, { ...n, children: [] }));
  // 排序：保证父节点先于子节点处理路径
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

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

const STATUS_LABEL: Record<SysUser['status'], string> = {
  active: '启用',
  disabled: '停用',
};

const STATUS_STYLE: Record<SysUser['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disabled: 'bg-slate-100 text-slate-500 border-slate-200',
};

// 新建人员默认值
const createDefaultUser = (): SysUser => {
  const now = new Date().toISOString();
  return {
    id: genId('user'),
    name: '',
    username: '',
    orgId: '',
    position: '',
    phone: '',
    email: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
};

// 组织树选择器：非科室节点仅展开，科室节点可选
const OrgTreeSelect = ({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: OrgTreeNode[];
  selectedId: string;
  onSelect: (org: SysOrg) => void;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // 默认展开所有非科室节点，便于浏览
    const s = new Set<string>();
    const walk = (list: OrgTreeNode[]) => {
      list.forEach(n => {
        if (!n.deptType && n.children.length > 0) {
          s.add(n.id);
          walk(n.children);
        }
      });
    };
    walk(nodes);
    return s;
  });

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {nodes.map(node => {
        const isDept = !!node.deptType;
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(node.id);
        const isSelected = node.id === selectedId;
        return (
          <div key={node.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isDept) onSelect(node);
                else if (hasChildren) toggle(node.id);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (isDept) onSelect(node);
                  else if (hasChildren) toggle(node.id);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer',
                isSelected
                  ? 'bg-cyan-100 text-cyan-700 font-medium ring-1 ring-cyan-300'
                  : isDept
                    ? 'hover:bg-cyan-50 text-slate-700'
                    : 'hover:bg-slate-50 text-slate-600 font-medium',
              )}
              style={{ paddingLeft: `${depth * 18 + 8}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggle(node.id);
                  }}
                  className="shrink-0 text-slate-400 hover:text-slate-600"
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="inline-block w-[14px] shrink-0" />
              )}
              <Building2 size={13} className={cn('shrink-0', isDept ? 'text-cyan-600' : 'text-slate-400')} />
              <span className="truncate">{node.name}</span>
              {isDept && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-50 text-cyan-600 border border-cyan-100 ml-auto shrink-0">
                  可选
                </span>
              )}
            </div>
            {hasChildren && isOpen && (
              <OrgTreeSelect
                nodes={node.children}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const PersonnelManager = ({ onRefresh }: PersonnelManagerProps) => {
  const [users, setUsers] = useState<SysUser[]>(() => getUsers());
  const [orgs, setOrgs] = useState<SysOrg[]>(() => getOrgs());
  const [deptOrgs, setDeptOrgs] = useState<SysOrg[]>(() => getDeptOrgs());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SysUser['status']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<SysUser | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭组织下拉
  useEffect(() => {
    if (!orgDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [orgDropdownOpen]);

  const orgTree = useMemo(() => buildOrgTree(orgs), [orgs]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  // 按姓名/账号/组织搜索
  const filteredUsers = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return users
      .filter(u => {
        if (statusFilter !== 'all' && u.status !== statusFilter) return false;
        if (!kw) return true;
        const org = getOrgById(u.orgId);
        const orgPath = org?.path ?? '';
        return (
          u.name.toLowerCase().includes(kw)
          || u.username.toLowerCase().includes(kw)
          || orgPath.toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users, searchKeyword, statusFilter]);

  // 刷新本地数据
  const reload = () => {
    setUsers(getUsers());
    setOrgs(getOrgs());
    setDeptOrgs(getDeptOrgs());
    onRefresh();
  };

  const orgName = (orgId: string) => {
    if (!orgId) return '—';
    const o = getOrgById(orgId);
    return o ? o.path : '—';
  };

  const updateDraft = (patch: Partial<SysUser>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const validate = (data: SysUser): FormErrors => {
    const errs: FormErrors = {};
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
      errs.name = '姓名需 2-20 个字';
    }
    const username = data.username.trim();
    if (username.length < 2 || username.length > 20) {
      errs.username = '登录账号需 2-20 个字符';
    } else {
      // 唯一性校验（编辑时排除自身）
      const dup = users.find(u => u.id !== data.id && u.username.toLowerCase() === username.toLowerCase());
      if (dup) {
        errs.username = '登录账号已被使用，请更换';
      }
    }
    if (!data.orgId) {
      errs.orgId = '请选择所属组织（仅科室节点）';
    } else {
      // 必须是科室节点
      const o = getOrgById(data.orgId);
      if (!o || !o.deptType) {
        errs.orgId = '所属组织必须是科室节点';
      }
    }
    if (!data.position.trim()) {
      errs.position = '请填写职位';
    }
    if (data.phone && data.phone.trim()) {
      if (!/^1\d{10}$/.test(data.phone.trim()) && !/^[\d\-+\s]{7,20}$/.test(data.phone.trim())) {
        errs.phone = '联系电话格式不正确';
      }
    }
    if (data.email && data.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errs.email = '邮箱格式不正确';
      }
    }
    return errs;
  };

  // 打开新增
  const handleAdd = () => {
    const u = createDefaultUser();
    setDraft(u);
    setIsEdit(false);
    setErrors({});
    setModalOpen(true);
  };

  // 打开编辑
  const handleEdit = (u: SysUser) => {
    setDraft({ ...u });
    setIsEdit(true);
    setErrors({});
    setModalOpen(true);
  };

  // 保存（新增/编辑）
  const handleSave = () => {
    if (!draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const now = new Date().toISOString();
    const cleaned: SysUser = {
      ...draft,
      name: draft.name.trim(),
      username: draft.username.trim(),
      position: draft.position.trim(),
      phone: draft.phone?.trim() || undefined,
      email: draft.email?.trim() || undefined,
      updatedAt: now,
    };

    if (isEdit) {
      const next = users.map(u => (u.id === cleaned.id ? cleaned : u));
      saveUsers(next);
      setUsers(next);
      showToast('success', '人员信息已保存');
    } else {
      const next = [cleaned, ...users];
      saveUsers(next);
      setUsers(next);
      showToast('success', '人员已新增');
    }
    setModalOpen(false);
    setDraft(null);
    onRefresh();
  };

  // 启用/停用
  const handleToggleStatus = (u: SysUser) => {
    const nextStatus: SysUser['status'] = u.status === 'active' ? 'disabled' : 'active';
    const now = new Date().toISOString();
    const next = users.map(it => (it.id === u.id ? { ...it, status: nextStatus, updatedAt: now } : it));
    saveUsers(next);
    setUsers(next);
    showToast('success', `人员已${nextStatus === 'active' ? '启用' : '停用'}`);
    onRefresh();
  };

  // 删除：不允许删除，直接拒绝
  const handleDelete = (u: SysUser) => {
    showToast('error', `人员「${u.name}」不允许删除，如需停用请使用「停用」功能`);
  };

  // 表单关闭
  const handleCloseModal = () => {
    setModalOpen(false);
    setDraft(null);
    setErrors({});
    setOrgDropdownOpen(false);
  };

  // 选中组织
  const handleSelectOrg = (org: SysOrg) => {
    updateDraft({ orgId: org.id });
    if (errors.orgId) setErrors(p => ({ ...p, orgId: undefined }));
    setOrgDropdownOpen(false);
  };

  const selectedOrg = draft?.orgId ? getOrgById(draft.orgId) : undefined;

  return (
    <div className="space-y-4">
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={cn(
              'px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2',
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600',
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            新增人员
          </button>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | SysUser['status'])}
            className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
          >
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="按姓名 / 账号 / 组织搜索..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gradient-to-r from-cyan-50 to-blue-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">姓名</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">登录账号</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">所属组织</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">职位</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">联系电话</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap">状态</th>
                <th className="px-4 py-3 font-medium border-b border-slate-200 whitespace-nowrap text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {users.length === 0 ? '暂无人员，点击「新增人员」开始创建' : '没有匹配的人员'}
                  </td>
                </tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-cyan-50/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs flex items-center justify-center shrink-0">
                        {u.name.slice(0, 1) || '?'}
                      </span>
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">{u.username}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Building2 size={12} className="text-cyan-500 shrink-0" />
                      <span className="truncate" title={orgName(u.orgId)}>{orgName(u.orgId)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{u.position || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border', STATUS_STYLE[u.status])}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 rounded text-cyan-600 hover:bg-cyan-50 transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          u.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50',
                        )}
                        title={u.status === 'active' ? '停用' : '启用'}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 表格底部统计 */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
          <span>共 {users.length} 人 · 显示 {filteredUsers.length} 人</span>
          <span className="text-slate-400">科室节点可选：{deptOrgs.length} 个</span>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* 弹窗头 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {isEdit ? '编辑人员' : '新增人员'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEdit ? `ID: ${draft.id}` : '填写人员基本信息，带 * 为必填'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* 姓名 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    姓名 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={draft.name}
                      onChange={e => {
                        updateDraft({ name: e.target.value });
                        if (errors.name) setErrors(p => ({ ...p, name: undefined }));
                      }}
                      placeholder="2-20 个字"
                      maxLength={20}
                      className={cn(
                        'w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                        errors.name
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                      )}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* 登录账号 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    登录账号 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <IdCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={draft.username}
                      onChange={e => {
                        updateDraft({ username: e.target.value });
                        if (errors.username) setErrors(p => ({ ...p, username: undefined }));
                      }}
                      placeholder="2-20 个字符，系统内唯一"
                      maxLength={20}
                      className={cn(
                        'w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors font-mono',
                        errors.username
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                      )}
                    />
                  </div>
                  {errors.username ? (
                    <p className="mt-1 text-xs text-rose-500">{errors.username}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">用于系统登录，创建后不建议修改</p>
                  )}
                </div>
              </div>

              {/* 所属组织 - 树形下拉 */}
              <div className="relative" ref={orgDropdownRef}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  所属组织 <span className="text-rose-500">*</span>
                  <span className="ml-1 text-slate-400 font-normal">（仅科室节点可选）</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOrgDropdownOpen(o => !o)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                    errors.orgId
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                    orgDropdownOpen && !errors.orgId && 'border-cyan-500 ring-2 ring-cyan-100',
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Building2 size={14} className="text-cyan-500 shrink-0" />
                    {selectedOrg ? (
                      <span className="truncate text-slate-700">{selectedOrg.path}</span>
                    ) : (
                      <span className="text-slate-400">请选择科室节点...</span>
                    )}
                  </span>
                  <ChevronDown size={14} className={cn('text-slate-400 shrink-0 transition-transform', orgDropdownOpen && 'rotate-180')} />
                </button>
                {orgDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg p-1.5">
                    {orgTree.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-slate-400">暂无组织数据</p>
                    ) : (
                      <OrgTreeSelect
                        nodes={orgTree}
                        selectedId={draft.orgId}
                        onSelect={handleSelectOrg}
                      />
                    )}
                  </div>
                )}
                {errors.orgId && <p className="mt-1 text-xs text-rose-500">{errors.orgId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 职位 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    职位 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={draft.position}
                      onChange={e => {
                        updateDraft({ position: e.target.value });
                        if (errors.position) setErrors(p => ({ ...p, position: undefined }));
                      }}
                      placeholder="如：工程科长"
                      className={cn(
                        'w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                        errors.position
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                      )}
                    />
                  </div>
                  {errors.position && <p className="mt-1 text-xs text-rose-500">{errors.position}</p>}
                </div>

                {/* 联系电话 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    联系电话 <span className="text-slate-400 font-normal">（可选）</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={draft.phone ?? ''}
                      onChange={e => {
                        updateDraft({ phone: e.target.value });
                        if (errors.phone) setErrors(p => ({ ...p, phone: undefined }));
                      }}
                      placeholder="如：13800138000"
                      className={cn(
                        'w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                        errors.phone
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                          : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                      )}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
                </div>
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  邮箱 <span className="text-slate-400 font-normal">（可选）</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={draft.email ?? ''}
                    onChange={e => {
                      updateDraft({ email: e.target.value });
                      if (errors.email) setErrors(p => ({ ...p, email: undefined }));
                    }}
                    placeholder="如：name@example.com"
                    className={cn(
                      'w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                      errors.email
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100',
                      )}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
              </div>

              {/* 状态（仅编辑显示，新增默认启用） */}
              {isEdit && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">账号状态</label>
                  <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateDraft({ status: 'active' })}
                      className={cn(
                        'px-4 py-1.5 text-sm font-medium transition-colors',
                        draft.status === 'active' ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      启用
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft({ status: 'disabled' })}
                      className={cn(
                        'px-4 py-1.5 text-sm font-medium transition-colors border-l border-slate-300',
                        draft.status === 'disabled' ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      停用
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部操作 */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors shadow-sm"
              >
                {isEdit ? '保存' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelManager;
