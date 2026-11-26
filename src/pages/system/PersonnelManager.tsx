/**
 * 系统管理 - 人员管理模块
 * 参照集团人事系统原型：
 *  - 左侧：部门组织树（支持部门名称搜索、展开/收起、点击过滤）
 *  - 右侧：人员列表（状态页签 全部/启用/停用、姓名/手机号/登录名搜索 + 查询/重置、
 *          创建员工、添加员工（从已有员工）、批量删除、复选框多选、分页器）
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Search, X, ChevronRight, ChevronDown, CheckCircle2, XCircle,
  Mail, Phone, Briefcase, Building2, User, IdCard, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getUsers, saveUsers, getOrgs, getOrgById, genId,
} from './systemStore';
import type { SysUser, SysOrg, EduRecord } from './types';

interface PersonnelManagerProps {
  onRefresh?: () => void;
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

// 关键字过滤组织树：保留命中节点与其祖先链
const filterTree = (nodes: OrgTreeNode[], kw: string): OrgTreeNode[] => {
  const out: OrgTreeNode[] = [];
  for (const n of nodes) {
    const kids = filterTree(n.children, kw);
    if (n.name.includes(kw) || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
};

// 收集某节点及其全部后代组织 ID
const collectSubTreeIds = (rootId: string, all: SysOrg[]): Set<string> => {
  const set = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const o of all) {
      if (o.parentId && set.has(o.parentId) && !set.has(o.id)) {
        set.add(o.id);
        changed = true;
      }
    }
  }
  return set;
};

// 教育经历表单小块（学历 / 毕业院校及专业 / 毕业时间）
const miniInput = 'w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
const EduBlock = ({ label, value, onChange }: {
  label: string;
  value?: EduRecord;
  onChange: (v: EduRecord) => void;
}) => (
  <div className="border border-slate-200 rounded-md p-3 space-y-2">
    <p className="text-xs font-medium text-slate-600">{label}</p>
    <div className="grid grid-cols-3 gap-2">
      <input
        type="text"
        value={value?.degree ?? ''}
        onChange={e => onChange({ ...value, degree: e.target.value })}
        placeholder="学历"
        className={miniInput}
      />
      <input
        type="text"
        value={value?.school ?? ''}
        onChange={e => onChange({ ...value, school: e.target.value })}
        placeholder="毕业院校及专业"
        className={miniInput}
      />
      <input
        type="text"
        value={value?.date ?? ''}
        onChange={e => onChange({ ...value, date: e.target.value })}
        placeholder="毕业时间"
        className={miniInput}
      />
    </div>
  </div>
);

// 详情弹窗只读字段行
const DetailRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
    <span className="w-32 shrink-0 text-xs text-slate-500 pt-0.5">{label}</span>
    <span className="flex-1 text-sm text-slate-800 break-all">{value || '—'}</span>
  </div>
);

// 教育经历详情展示（学历 / 毕业院校及专业 / 毕业时间）
const EduDetail = ({ label, edu }: { label: string; edu?: EduRecord }) => (
  <div className="py-2 border-b border-slate-50 last:border-0">
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <div className="grid grid-cols-3 gap-2">
      {([
        ['学历', edu?.degree],
        ['毕业院校及专业', edu?.school],
        ['毕业时间', edu?.date],
      ] as [string, string | undefined][]).map(([l, v]) => (
        <div key={l}>
          <span className="block text-xs text-slate-400">{l}</span>
          <span className="text-sm text-slate-800">{v || '—'}</span>
        </div>
      ))}
    </div>
  </div>
);

// 新建人员默认值
const createDefaultUser = (orgId: string): SysUser => {
  const now = new Date().toISOString();
  return {
    id: genId('user'),
    name: '',
    username: '',
    orgId,
    position: '',
    phone: '',
    email: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
};

// 分页页码序列（含省略号）
const pageItems = (current: number, total: number): (number | '…')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

// 左侧部门树
const OrgTreePanel = ({
  nodes, selectedId, expanded, kw,
  onToggle, onSelect, depth = 0,
}: {
  nodes: OrgTreeNode[];
  selectedId: string | null;
  expanded: Set<string>;
  kw: string;
  onToggle: (id: string) => void;
  onSelect: (org: SysOrg) => void;
  depth?: number;
}) => (
  <div className="space-y-0.5">
    {nodes.map(node => {
      const hasChildren = node.children.length > 0;
      // 搜索时全部展开，便于查看命中链路
      const isOpen = kw ? true : expanded.has(node.id);
      const isSelected = node.id === selectedId;
      return (
        <div key={node.id}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(node);
              }
            }}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer select-none',
              isSelected
                ? 'bg-orange-50 text-orange-700 font-medium'
                : 'text-slate-700 hover:bg-slate-50',
            )}
            style={{ paddingLeft: `${depth * 16 + 6}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onToggle(node.id); }}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="inline-block w-[14px] shrink-0" />
            )}
            <Building2 size={13} className={cn('shrink-0', isSelected ? 'text-orange-600' : 'text-slate-400')} />
            <span className="truncate">{node.name}</span>
          </div>
          {hasChildren && isOpen && (
            <OrgTreePanel
              nodes={node.children}
              selectedId={selectedId}
              expanded={expanded}
              kw={kw}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </div>
      );
    })}
  </div>
);

const PersonnelManager = ({ onRefresh }: PersonnelManagerProps) => {
  const [users, setUsers] = useState<SysUser[]>(() => getUsers());
  const [orgs, setOrgs] = useState<SysOrg[]>(() => getOrgs());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 左侧部门树
  const [orgKeyword, setOrgKeyword] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(new Set());

  // 右侧筛选 / 搜索
  const [statusTab, setStatusTab] = useState<'all' | SysUser['status']>('all');
  const [kwInput, setKwInput] = useState('');
  const [appliedKw, setAppliedKw] = useState('');

  // 表格选择 / 分页
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpInput, setJumpInput] = useState('');

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<SysUser | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  // 添加员工（从已有员工）弹窗
  const [addOpen, setAddOpen] = useState(false);
  const [addChecked, setAddChecked] = useState<Set<string>>(new Set());

  // 详情弹窗（展示人员完整信息）
  const [detailUser, setDetailUser] = useState<SysUser | null>(null);
  // 编辑弹窗中「扩展信息」折叠开关
  const [showMore, setShowMore] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

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
  const filteredOrgTree = useMemo(
    () => (orgKeyword.trim() ? filterTree(orgTree, orgKeyword.trim()) : orgTree),
    [orgTree, orgKeyword],
  );

  // 区域选项：根组织（集团）的直接子节点名称
  const regionOptions = useMemo(() => {
    const root = orgs.find(o => !o.parentId);
    return root ? orgs.filter(o => o.parentId === root.id).map(o => o.name) : [];
  }, [orgs]);

  // 默认选中根组织
  useEffect(() => {
    if (selectedOrgId === null && orgs.length > 0) {
      const root = orgs.find(o => !o.parentId);
      if (root) setSelectedOrgId(root.id);
    }
  }, [orgs, selectedOrgId]);

  const selectedOrg = selectedOrgId ? getOrgById(selectedOrgId) : undefined;
  // 选中组织及其子树 ID 集合
  const selectedSubIds = useMemo(
    () => (selectedOrgId ? collectSubTreeIds(selectedOrgId, orgs) : null),
    [selectedOrgId, orgs],
  );

  const reload = () => {
    setUsers(getUsers());
    setOrgs(getOrgs());
    onRefresh?.();
  };

  const orgName = (orgId: string) => {
    if (!orgId) return '—';
    const o = getOrgById(orgId);
    return o ? o.path : '—';
  };

  // 过滤：组织子树 + 状态页签 + 关键字（姓名/手机号/登录名）
  const filteredUsers = useMemo(() => {
    const kw = appliedKw.trim().toLowerCase();
    return users
      .filter(u => {
        if (selectedSubIds && !selectedSubIds.has(u.orgId)) return false;
        if (statusTab !== 'all' && u.status !== statusTab) return false;
        if (!kw) return true;
        return (
          u.name.toLowerCase().includes(kw)
          || u.username.toLowerCase().includes(kw)
          || (u.phone ?? '').toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users, selectedSubIds, statusTab, appliedKw]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = useMemo(
    () => filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredUsers, safePage, pageSize],
  );

  // 筛选条件变化时回到第 1 页
  useEffect(() => { setPage(1); }, [selectedOrgId, statusTab, appliedKw, pageSize]);

  // 当页复选框
  const pageAllChecked = pagedUsers.length > 0 && pagedUsers.every(u => checkedIds.has(u.id));
  const togglePageAll = () => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (pageAllChecked) pagedUsers.forEach(u => next.delete(u.id));
      else pagedUsers.forEach(u => next.add(u.id));
      return next;
    });
  };
  const toggleRow = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      const dup = users.find(u => u.id !== data.id && u.username.toLowerCase() === username.toLowerCase());
      if (dup) {
        errs.username = '登录账号已被使用，请更换';
      }
    }
    if (!data.orgId || !getOrgById(data.orgId)) {
      errs.orgId = '请选择所属部门';
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

  // 创建员工（默认归属当前选中部门）
  const handleCreate = () => {
    setDraft(createDefaultUser(selectedOrgId || ''));
    setIsEdit(false);
    setErrors({});
    setShowMore(false);
    setModalOpen(true);
  };

  const handleEdit = (u: SysUser) => {
    setDraft({ ...u });
    setIsEdit(true);
    setErrors({});
    setShowMore(false);
    setModalOpen(true);
  };

  // 查看详情
  const handleDetail = (u: SysUser) => {
    setDetailUser(u);
  };

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
    onRefresh?.();
  };

  const handleDelete = (u: SysUser) => {
    if (!window.confirm(`确定删除人员「${u.name}」吗？删除后不可恢复。`)) return;
    const next = users.filter(it => it.id !== u.id);
    saveUsers(next);
    setUsers(next);
    setCheckedIds(prev => { const n = new Set(prev); n.delete(u.id); return n; });
    showToast('success', `人员「${u.name}」已删除`);
    onRefresh?.();
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (checkedIds.size === 0) return;
    if (!window.confirm(`确定删除选中的 ${checkedIds.size} 名人员吗？删除后不可恢复。`)) return;
    const next = users.filter(it => !checkedIds.has(it.id));
    saveUsers(next);
    setUsers(next);
    showToast('success', `已删除 ${checkedIds.size} 名人员`);
    setCheckedIds(new Set());
    onRefresh?.();
  };

  // 添加员工（从已有员工）：把已存在的人员归入当前选中部门
  const addCandidates = useMemo(() => {
    if (!selectedSubIds) return [];
    return users.filter(u => !selectedSubIds.has(u.orgId));
  }, [users, selectedSubIds]);

  const openAddExisting = () => {
    if (!selectedOrgId) {
      showToast('error', '请先在左侧选择部门');
      return;
    }
    setAddChecked(new Set());
    setAddOpen(true);
  };

  const handleAddExisting = () => {
    if (addChecked.size === 0) return;
    const now = new Date().toISOString();
    const next = users.map(u =>
      addChecked.has(u.id) ? { ...u, orgId: selectedOrgId!, updatedAt: now } : u,
    );
    saveUsers(next);
    setUsers(next);
    showToast('success', `已将 ${addChecked.size} 名员工添加到「${selectedOrg?.name ?? ''}」`);
    setAddOpen(false);
    setAddChecked(new Set());
    onRefresh?.();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setDraft(null);
    setErrors({});
    setOrgDropdownOpen(false);
  };

  // 查询 / 重置
  const handleSearch = () => setAppliedKw(kwInput);
  const handleReset = () => {
    setKwInput('');
    setAppliedKw('');
    setStatusTab('all');
  };

  // 弹窗内组织树：所有节点均可选，默认全展开
  const ModalOrgTree = ({ nodes, depth = 0 }: { nodes: OrgTreeNode[]; depth?: number }) => (
    <div className="space-y-0.5">
      {nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const isSel = draft?.orgId === node.id;
        return (
          <div key={node.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                updateDraft({ orgId: node.id });
                if (errors.orgId) setErrors(p => ({ ...p, orgId: undefined }));
                setOrgDropdownOpen(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateDraft({ orgId: node.id });
                  setOrgDropdownOpen(false);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer',
                isSel
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-50',
              )}
              style={{ paddingLeft: `${depth * 18 + 8}px` }}
            >
              {hasChildren ? (
                <span className="shrink-0 text-slate-300">
                  <ChevronDown size={14} />
                </span>
              ) : (
                <span className="inline-block w-[14px] shrink-0" />
              )}
              <Building2 size={13} className={cn('shrink-0', isSel ? 'text-orange-600' : 'text-slate-400')} />
              <span className="truncate">{node.name}</span>
            </div>
            {hasChildren && (
              <ModalOrgTree nodes={node.children} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );

  const selectedFormOrg = draft?.orgId ? getOrgById(draft.orgId) : undefined;

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

      <div className="flex gap-4 items-start">
        {/* 左侧：部门树 */}
        <div className="w-60 shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={orgKeyword}
                onChange={e => setOrgKeyword(e.target.value)}
                placeholder="请输入部门名称"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="p-2 max-h-[560px] overflow-y-auto">
            {filteredOrgTree.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400">未找到匹配部门</p>
            ) : (
              <OrgTreePanel
                nodes={filteredOrgTree}
                selectedId={selectedOrgId}
                expanded={treeExpanded}
                kw={orgKeyword.trim()}
                onToggle={id => setTreeExpanded(prev => {
                  const n = new Set(prev);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })}
                onSelect={org => setSelectedOrgId(org.id)}
              />
            )}
          </div>
        </div>

        {/* 右侧：人员列表 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 标题 + 状态页签 + 搜索 */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800 mr-2 truncate">
              {selectedOrg?.name ?? '全部人员'}
            </h3>
            <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
              {([
                ['all', '全部'],
                ['active', '启用'],
                ['disabled', '停用'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatusTab(val)}
                  className={cn(
                    'px-3.5 py-1.5 text-sm font-medium transition-colors',
                    val !== 'all' && 'border-l border-slate-200',
                    statusTab === val
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-56">
              <input
                type="text"
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="姓名/手机号/登录名"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
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

          {/* 操作按钮行 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
            >
              <User size={14} />
              创建员工
            </button>
            <button
              onClick={openAddExisting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-orange-600 bg-white border border-orange-300 hover:bg-orange-50 rounded-md transition-colors"
            >
              添加员工（从已有员工）
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={checkedIds.size === 0}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors border',
                checkedIds.size > 0
                  ? 'text-rose-600 bg-white border-rose-300 hover:bg-rose-50'
                  : 'text-slate-300 bg-white border-slate-200 cursor-not-allowed',
              )}
            >
              批量删除
            </button>
          </div>

          {/* 人员表格 */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 w-10">
                      <input
                        type="checkbox"
                        checked={pageAllChecked}
                        onChange={togglePageAll}
                        className="w-3.5 h-3.5 accent-orange-500"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">姓名</th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">区域</th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">所在部门</th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">岗位</th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">手机号</th>
                    <th className="px-3 py-2.5 font-medium border-b border-slate-200 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-slate-400 text-sm">
                        {users.length === 0 ? '暂无人员，点击「创建员工」开始创建' : '没有匹配的人员'}
                      </td>
                    </tr>
                  )}
                  {pagedUsers.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-orange-50/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(u.id)}
                          onChange={() => toggleRow(u.id)}
                          className="w-3.5 h-3.5 accent-orange-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{u.name}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{u.region || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        <span className="truncate block max-w-[280px]" title={orgName(u.orgId)}>{orgName(u.orgId)}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{u.position}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{u.phone || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDetail(u)}
                            className="text-orange-600 hover:text-orange-700 hover:underline text-sm"
                          >
                            详情
                          </button>
                          <span className="w-px h-3 bg-slate-200" />
                          <button
                            onClick={() => handleEdit(u)}
                            className="text-slate-600 hover:text-slate-800 hover:underline text-sm"
                          >
                            编辑
                          </button>
                          <span className="w-px h-3 bg-slate-200" />
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-rose-500 hover:text-rose-600 hover:underline text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页器 */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600">
              <span>共{filteredUsers.length}条</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className={cn(
                    'px-2 py-1 rounded border border-slate-200 bg-white',
                    safePage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-50',
                  )}
                >
                  ‹
                </button>
                {pageItems(safePage, totalPages).map((it, i) =>
                  it === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400">…</span>
                  ) : (
                    <button
                      key={`p-${it}`}
                      type="button"
                      onClick={() => setPage(it)}
                      className={cn(
                        'min-w-[26px] px-1.5 py-1 rounded border transition-colors',
                        it === safePage
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      {it}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className={cn(
                    'px-2 py-1 rounded border border-slate-200 bg-white',
                    safePage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-50',
                  )}
                >
                  ›
                </button>
              </div>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                {[10, 20, 50].map(n => (
                  <option key={n} value={n}>{n}条/页</option>
                ))}
              </select>
              <span className="flex items-center gap-1">
                跳至
                <input
                  type="text"
                  value={jumpInput}
                  onChange={e => setJumpInput(e.target.value.replace(/[^\d]/g, ''))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const n = Number(jumpInput);
                      if (n >= 1 && n <= totalPages) setPage(n);
                      setJumpInput('');
                    }
                  }}
                  className="w-12 px-1.5 py-1 text-xs border border-slate-200 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                页
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 创建/编辑员工弹窗 */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* 弹窗头 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {isEdit ? '编辑员工' : '创建员工'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEdit ? `账号：${draft.username}` : '填写员工基本信息，带 * 为必填'}
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
                          : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                      )}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                {/* 登录账号 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    账户账号 <span className="text-rose-500">*</span>
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
                          : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
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

              {/* 手机号 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  手机号 <span className="text-slate-400 font-normal">（可选）</span>
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
                        : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                    )}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
              </div>

              {/* 所属部门 - 树形下拉（所有节点可选） */}
              <div className="relative" ref={orgDropdownRef}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  部门 <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOrgDropdownOpen(o => !o)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors',
                    errors.orgId
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                    orgDropdownOpen && !errors.orgId && 'border-orange-500 ring-2 ring-orange-100',
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Building2 size={14} className="text-orange-500 shrink-0" />
                    {selectedFormOrg ? (
                      <span className="truncate text-slate-700">{selectedFormOrg.path}</span>
                    ) : (
                      <span className="text-slate-400">请选择部门...</span>
                    )}
                  </span>
                  <ChevronDown size={14} className={cn('text-slate-400 shrink-0 transition-transform', orgDropdownOpen && 'rotate-180')} />
                </button>
                {orgDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg p-1.5">
                    {orgTree.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-slate-400">暂无组织数据</p>
                    ) : (
                      <ModalOrgTree nodes={orgTree} />
                    )}
                  </div>
                )}
                {errors.orgId && <p className="mt-1 text-xs text-rose-500">{errors.orgId}</p>}
              </div>

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
                        : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                    )}
                  />
                </div>
                {errors.position && <p className="mt-1 text-xs text-rose-500">{errors.position}</p>}
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
                        : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100',
                    )}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
              </div>

              {/* 扩展信息（选填，折叠） */}
              <div className="border border-slate-200 rounded-md">
                <button
                  type="button"
                  onClick={() => setShowMore(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-t-md transition-colors"
                >
                  <span>扩展信息（区域 / 合同归属 / 个人信息 / 职称持证 / 教育经历，选填）</span>
                  <ChevronDown size={14} className={cn('text-slate-400 transition-transform', showMore && 'rotate-180')} />
                </button>
                {showMore && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* 区域 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">区域</label>
                        <select
                          value={draft.region ?? ''}
                          onChange={e => updateDraft({ region: e.target.value || undefined })}
                          className={miniInput}
                        >
                          <option value="">请选择区域</option>
                          {regionOptions.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      {/* 所在单位 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">所在单位</label>
                        <input
                          type="text"
                          value={draft.unit ?? ''}
                          onChange={e => updateDraft({ unit: e.target.value || undefined })}
                          placeholder="如：交科养护集团"
                          className={miniInput}
                        />
                      </div>
                      {/* 合同归属 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">合同归属</label>
                        <input
                          type="text"
                          value={draft.contractOwner ?? ''}
                          onChange={e => updateDraft({ contractOwner: e.target.value || undefined })}
                          placeholder="如：交科养护集团"
                          className={miniInput}
                        />
                      </div>
                      {/* 性别 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">性别</label>
                        <select
                          value={draft.gender ?? ''}
                          onChange={e => updateDraft({ gender: e.target.value || undefined })}
                          className={miniInput}
                        >
                          <option value="">请选择</option>
                          <option value="男">男</option>
                          <option value="女">女</option>
                        </select>
                      </div>
                      {/* 年龄 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">年龄</label>
                        <input
                          type="text"
                          value={draft.age ?? ''}
                          onChange={e => updateDraft({ age: e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : undefined })}
                          placeholder="如：35"
                          className={miniInput}
                        />
                      </div>
                      {/* 工龄 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">工龄</label>
                        <input
                          type="text"
                          value={draft.workYears ?? ''}
                          onChange={e => updateDraft({ workYears: e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : undefined })}
                          placeholder="如：10"
                          className={miniInput}
                        />
                      </div>
                      {/* 民族 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">民族</label>
                        <input
                          type="text"
                          value={draft.ethnicity ?? ''}
                          onChange={e => updateDraft({ ethnicity: e.target.value || undefined })}
                          placeholder="如：汉族"
                          className={miniInput}
                        />
                      </div>
                      {/* 籍贯 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">籍贯</label>
                        <input
                          type="text"
                          value={draft.nativePlace ?? ''}
                          onChange={e => updateDraft({ nativePlace: e.target.value || undefined })}
                          placeholder="如：浙江杭州"
                          className={miniInput}
                        />
                      </div>
                      {/* 政治面貌 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">政治面貌</label>
                        <select
                          value={draft.politicalStatus ?? ''}
                          onChange={e => updateDraft({ politicalStatus: e.target.value || undefined })}
                          className={miniInput}
                        >
                          <option value="">请选择</option>
                          {['群众', '中共党员', '中共预备党员', '共青团员', '民主党派人士', '无党派人士'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      {/* 职称 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">职称</label>
                        <input
                          type="text"
                          value={draft.title ?? ''}
                          onChange={e => updateDraft({ title: e.target.value || undefined })}
                          placeholder="如：高级工程师"
                          className={miniInput}
                        />
                      </div>
                      {/* 职业/执业资格等级 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">职业/执业资格等级</label>
                        <input
                          type="text"
                          value={draft.qualificationLevel ?? ''}
                          onChange={e => updateDraft({ qualificationLevel: e.target.value || undefined })}
                          placeholder="如：一级建造师"
                          className={miniInput}
                        />
                      </div>
                      {/* 持证（工程、试验类） */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">持证（工程、试验类）</label>
                        <input
                          type="text"
                          value={draft.certEng ?? ''}
                          onChange={e => updateDraft({ certEng: e.target.value || undefined })}
                          placeholder="多项用顿号分隔"
                          className={miniInput}
                        />
                      </div>
                      {/* 持证（其他） */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">持证（其他）</label>
                        <input
                          type="text"
                          value={draft.certOther ?? ''}
                          onChange={e => updateDraft({ certOther: e.target.value || undefined })}
                          placeholder="多项用顿号分隔"
                          className={miniInput}
                        />
                      </div>
                    </div>
                    {/* 教育经历 */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">教育经历</p>
                      <EduBlock
                        label="全日制教育1"
                        value={draft.fullTimeEdu1}
                        onChange={v => updateDraft({ fullTimeEdu1: v })}
                      />
                      <EduBlock
                        label="全日制教育2"
                        value={draft.fullTimeEdu2}
                        onChange={v => updateDraft({ fullTimeEdu2: v })}
                      />
                      <EduBlock
                        label="在职（非全日制）教育"
                        value={draft.inServiceEdu}
                        onChange={v => updateDraft({ inServiceEdu: v })}
                      />
                    </div>
                  </div>
                )}
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
                        draft.status === 'active' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      启用
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft({ status: 'disabled' })}
                      className={cn(
                        'px-4 py-1.5 text-sm font-medium transition-colors border-l border-slate-300',
                        draft.status === 'disabled' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
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
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm"
              >
                {isEdit ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 人员详情弹窗（完整信息） */}
      {detailUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">人员详情 — {detailUser.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">完整人员信息</p>
                </div>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              {/* 基本信息 */}
              <section>
                <p className="text-xs font-bold text-orange-600 mb-1">基本信息</p>
                <DetailRow label="姓名" value={detailUser.name} />
                <DetailRow label="区域" value={detailUser.region} />
                <DetailRow label="所在单位" value={detailUser.unit} />
                <DetailRow label="所在部门" value={orgName(detailUser.orgId)} />
                <DetailRow label="岗位" value={detailUser.position} />
                <DetailRow label="合同归属" value={detailUser.contractOwner} />
              </section>

              {/* 个人信息 */}
              <section>
                <p className="text-xs font-bold text-orange-600 mb-1">个人信息</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <DetailRow label="性别" value={detailUser.gender} />
                  <DetailRow label="年龄" value={detailUser.age} />
                  <DetailRow label="工龄" value={detailUser.workYears} />
                  <DetailRow label="民族" value={detailUser.ethnicity} />
                  <DetailRow label="籍贯" value={detailUser.nativePlace} />
                  <DetailRow label="政治面貌" value={detailUser.politicalStatus} />
                </div>
              </section>

              {/* 职称与持证 */}
              <section>
                <p className="text-xs font-bold text-orange-600 mb-1">职称与持证</p>
                <DetailRow
                  label="职称/技术等级"
                  value={[detailUser.title, detailUser.qualificationLevel].filter(Boolean).join(' / ')}
                />
                <DetailRow label="持证（工程、试验类）" value={detailUser.certEng} />
                <DetailRow label="持证（其他）" value={detailUser.certOther} />
              </section>

              {/* 教育经历 */}
              <section>
                <p className="text-xs font-bold text-orange-600 mb-1">教育经历</p>
                <EduDetail label="全日制教育1" edu={detailUser.fullTimeEdu1} />
                <EduDetail label="全日制教育2" edu={detailUser.fullTimeEdu2} />
                <EduDetail label="在职（非全日制）教育" edu={detailUser.inServiceEdu} />
              </section>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                onClick={() => { setDetailUser(null); handleEdit(detailUser); }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm"
              >
                编辑
              </button>
              <button
                onClick={() => setDetailUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加员工（从已有员工）弹窗 */}
      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">
                添加员工到「{selectedOrg?.name ?? ''}」
              </h3>
              <button
                onClick={() => setAddOpen(false)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {addCandidates.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">没有可添加的员工（全部已在该部门或其子部门下）</p>
              ) : (
                <div className="space-y-1">
                  {addCandidates.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-slate-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={addChecked.has(u.id)}
                        onChange={() => setAddChecked(prev => {
                          const n = new Set(prev);
                          if (n.has(u.id)) n.delete(u.id);
                          else n.add(u.id);
                          return n;
                        })}
                        className="w-3.5 h-3.5 accent-orange-500"
                      />
                      <span className="font-medium text-slate-800 w-20 truncate">{u.name}</span>
                      <span className="font-mono text-slate-500 w-24 truncate">{u.username}</span>
                      <span className="text-slate-400 truncate flex-1" title={orgName(u.orgId)}>{orgName(u.orgId)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">已选 {addChecked.size} 人</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddExisting}
                  disabled={addChecked.size === 0}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    addChecked.size > 0
                      ? 'text-white bg-orange-500 hover:bg-orange-600'
                      : 'text-slate-400 bg-slate-100 cursor-not-allowed',
                  )}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelManager;
