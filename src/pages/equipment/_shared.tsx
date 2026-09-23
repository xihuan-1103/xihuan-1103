/**
 * 设备管理 - 共享 UI 组件 & 常量
 */

import React from 'react';

export const EC = {
  sectionTitle: 'text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5',
  input: 'w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white',
  label: 'text-xs font-medium text-slate-600 mb-1 block',
  button: {
    primary: 'px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition',
    success: 'px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50',
    danger:  'px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50',
    amber:   'px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition',
    tiny: 'px-2 py-1 rounded text-[12px] border border-slate-300 text-slate-600 hover:bg-slate-50 transition',
  },
  pill: 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
  table: 'w-full text-sm text-left border-collapse',
  th: 'px-3 py-2 bg-slate-50 text-slate-600 font-medium text-[12px] border-b border-slate-200',
  td: 'px-3 py-2 border-b border-slate-100 text-slate-700 align-top',
};

export function Modal({
  title, open, onClose, children, width = 'max-w-4xl', footer,
}: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode;
  width?: string; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', className = '', readOnly = false }: {
  value: string | number; onChange?: (v: string) => void; placeholder?: string;
  type?: string; className?: string; readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`${EC.input} ${readOnly ? 'bg-slate-50 text-slate-500' : ''} ${className}`}
    />
  );
}

export function Select({ value, onChange, options, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`${EC.input} ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    '草稿': 'bg-slate-100 text-slate-600',
    '已提交': 'bg-blue-100 text-blue-700',
    '已审核': 'bg-emerald-100 text-emerald-700',
    '闲置': 'bg-slate-100 text-slate-600',
    '使用中': 'bg-emerald-100 text-emerald-700',
    '维保中': 'bg-amber-100 text-amber-700',
    '已报废': 'bg-rose-100 text-rose-700',
    '自有': 'bg-indigo-100 text-indigo-700',
    '租赁': 'bg-cyan-100 text-cyan-700',
    '故障维修': 'bg-rose-100 text-rose-700',
    '定期保养': 'bg-amber-100 text-amber-700',
    '日常维保': 'bg-slate-100 text-slate-700',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600';
  return <span className={`${EC.pill} ${cls}`}>{status}</span>;
}

export function TypePill({ text, tone = 'cyan' }: { text: string; tone?: 'cyan' | 'emerald' | 'amber' | 'slate' | 'rose' | 'indigo' }) {
  const tones: Record<string, string> = {
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tones[tone]}`}>
      {text}
    </span>
  );
}

export function SearchBar({ children, onAdd, addLabel }: {
  children: React.ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">{children}</div>
      {onAdd && (
        <button onClick={onAdd} className={EC.button.primary}>
          {addLabel || '+ 新建'}
        </button>
      )}
    </div>
  );
}

let toastTimer: number | null = null;
const toastSetters: Array<(m: { msg: string; type: string } | null) => void> = [];
export function toast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
  for (const s of toastSetters) s({ msg, type });
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    for (const s of toastSetters) s(null);
  }, 2500);
}

export function useToast() {
  const [msg, setMsg] = React.useState<{ msg: string; type: string } | null>(null);
  React.useEffect(() => {
    toastSetters.push(setMsg);
    return () => {
      const i = toastSetters.indexOf(setMsg);
      if (i >= 0) toastSetters.splice(i, 1);
    };
  }, []);
  const ToastView = () => {
    if (!msg) return null;
    const cls = msg.type === 'success' ? 'bg-emerald-600' : msg.type === 'error' ? 'bg-rose-600' : 'bg-slate-700';
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999]">
        <div className={`${cls} text-white px-4 py-2 rounded-lg shadow-lg text-sm`}>{msg.msg}</div>
      </div>
    );
  };
  return { ToastView };
}
