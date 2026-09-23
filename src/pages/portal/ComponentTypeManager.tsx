/**
 * 门户管理中心 - 组件类型管理
 * 维护组件分类标签，支持新增 / 编辑 / 删除，删除前校验已上架组件
 */

import { Fragment, useState, useMemo } from 'react';
import { getCompTypes, saveCompTypes, getComponents, genId } from './portalStore';
import type { ComponentType } from './types';

interface ComponentTypeManagerProps {
  onRefresh: () => void;
}

interface FormData {
  name: string;
  code: string;
  description: string;
}

interface FormErrors {
  name?: string;
  code?: string;
  description?: string;
}

type FormMode = 'closed' | 'add' | 'edit';

const EMPTY_FORM: FormData = { name: '', code: '', description: '' };

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

const ComponentTypeManager = ({ onRefresh }: ComponentTypeManagerProps) => {
  const [compTypes, setCompTypes] = useState<ComponentType[]>(() => getCompTypes());
  const [components] = useState(() => getComponents());
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 各类型关联组件数量
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    components.forEach(c => m.set(c.typeId, (m.get(c.typeId) ?? 0) + 1));
    return m;
  }, [components]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const validate = (data: FormData, excludeId?: string): FormErrors => {
    const errs: FormErrors = {};
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
      errs.name = '类型名称需 2-20 个字';
    }
    const code = data.code.trim();
    if (!/^[a-zA-Z0-9]{2,20}$/.test(code)) {
      errs.code = '编码需 2-20 位字母或数字';
    } else {
      const dup = compTypes.find(ct => ct.code === code && ct.id !== excludeId);
      if (dup) errs.code = '该编码已存在，需系统内唯一';
    }
    const desc = data.description.trim();
    if (desc.length > 100) {
      errs.description = '描述最多 100 个字';
    }
    return errs;
  };

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setEditId(null);
    setFormMode('add');
  };

  const openEdit = (ct: ComponentType) => {
    setFormData({ name: ct.name, code: ct.code, description: ct.description ?? '' });
    setErrors({});
    setEditId(ct.id);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditId(null);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const handleSubmit = () => {
    const errs = validate(formData, editId ?? undefined);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (formMode === 'add') {
      const newType: ComponentType = {
        id: genId('ct'),
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      const next = [newType, ...compTypes];
      saveCompTypes(next);
      setCompTypes(next);
      showToast('success', '组件类型已新增');
      closeForm();
      onRefresh();
    } else if (formMode === 'edit' && editId) {
      const next = compTypes.map(ct =>
        ct.id === editId
          ? {
              ...ct,
              name: formData.name.trim(),
              code: formData.code.trim(),
              description: formData.description.trim() || undefined,
            }
          : ct,
      );
      saveCompTypes(next);
      setCompTypes(next);
      showToast('success', '组件类型已更新');
      closeForm();
      onRefresh();
    }
  };

  const handleDelete = (ct: ComponentType) => {
    const onlineComps = components.filter(c => c.typeId === ct.id && c.status === 'online');
    if (onlineComps.length > 0) {
      showToast('error', `该类型下存在 ${onlineComps.length} 个已上架组件，不允许删除`);
      return;
    }
    if (!window.confirm(`确认删除组件类型「${ct.name}」？`)) return;
    const next = compTypes.filter(t => t.id !== ct.id);
    saveCompTypes(next);
    setCompTypes(next);
    if (editId === ct.id) closeForm();
    showToast('success', '组件类型已删除');
    onRefresh();
  };

  const updateField = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // 行内表单（新增 / 编辑共用）
  const renderFormRow = () => {
    const isEdit = formMode === 'edit';
    return (
      <tr>
        <td colSpan={5} className="px-5 py-4 bg-cyan-50/50">
          <div className="rounded-lg border border-cyan-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  类型名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="如：工程科"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors ${
                    errors.name
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                  }`}
                />
                {errors.name ? (
                  <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">2-20 个字</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  类型编码 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => updateField('code', e.target.value)}
                  placeholder="如：eng"
                  disabled={isEdit}
                  className={`w-full px-3 py-2 text-sm rounded-md border outline-none transition-colors font-mono ${
                    isEdit
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : errors.code
                        ? 'bg-white border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'bg-white border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                  }`}
                />
                {errors.code ? (
                  <p className="mt-1 text-xs text-rose-500">{errors.code}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">字母 + 数字，2-20 位，系统内唯一{isEdit ? '（编辑不可改）' : ''}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">描述（选填）</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="对该组件类型的补充说明"
                className={`w-full px-3 py-2 text-sm rounded-md border bg-white outline-none transition-colors resize-none ${
                  errors.description
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                }`}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className={errors.description ? 'text-rose-500' : 'text-slate-400'}>
                  {errors.description ?? '最多 100 个字'}
                </span>
                <span className="text-slate-400">{formData.description.trim().length}/100</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={closeForm}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm font-medium text-white rounded-md bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
              >
                {isEdit ? '保存修改' : '确认新增'}
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* 区域头 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v10H7zM3 3h4v4H3zm14 0h4v4h-4zM3 17h4v4H3zm14 0h4v4h-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">组件类型管理</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                共 {compTypes.length} 个类型 · 组件需归属于某一类型
              </p>
            </div>
          </div>
          <button
            onClick={openAdd}
            disabled={formMode === 'add'}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新增组件类型
          </button>
        </div>

        {/* 列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-medium">类型名称</th>
                <th className="px-5 py-3 text-left font-medium">类型编码</th>
                <th className="px-5 py-3 text-center font-medium">关联组件</th>
                <th className="px-5 py-3 text-left font-medium">创建时间</th>
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formMode === 'add' && renderFormRow()}

              {compTypes.length === 0 && formMode !== 'add' && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-sm">暂无组件类型</p>
                      <button onClick={openAdd} className="mt-1 text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                        点击新增第一个类型
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {compTypes.map(ct => {
                const count = countMap.get(ct.id) ?? 0;
                const isEditing = formMode === 'edit' && editId === ct.id;
                return (
                  <Fragment key={ct.id}>
                    <tr className={`transition-colors ${isEditing ? 'bg-cyan-50/40' : 'hover:bg-slate-50/70'}`}>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{ct.name}</span>
                        {ct.description && (
                          <span className="block text-xs text-slate-400 mt-0.5 truncate max-w-xs">{ct.description}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="px-2 py-0.5 rounded bg-slate-100 text-cyan-700 text-xs font-mono">{ct.code}</code>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium ${
                            count > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(ct.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(ct)}
                            disabled={isEditing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-700 rounded hover:bg-cyan-50 disabled:opacity-40 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(ct)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && renderFormRow()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 底部说明 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          类型下存在已上架组件时不允许删除，请先下架或迁移相关组件。
        </div>
      </div>
    </div>
  );
};

export default ComponentTypeManager;
