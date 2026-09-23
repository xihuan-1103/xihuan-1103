/**
 * 百日攻坚模块 - 共享 UI 组件 & 样式常量（橙色主题）
 */

import React, { useRef } from 'react';

export const M = {
  sectionTitle: 'text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5',
  input: 'w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white',
  label: 'text-xs font-medium text-slate-600 mb-1 block',
  button: {
    primary: 'px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition',
    danger:  'px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50',
    tiny: 'px-2 py-1 rounded text-[12px] border border-slate-300 text-slate-600 hover:bg-slate-50 transition',
    tinyOrange: 'px-2 py-1 rounded text-[12px] border border-orange-300 text-orange-700 hover:bg-orange-50 transition',
  },
  pill: 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
  table: 'w-full text-sm text-left border-collapse',
  th: 'px-3 py-2 bg-slate-50 text-slate-600 font-medium text-[12px] border-b border-slate-200 whitespace-nowrap',
  td: 'px-3 py-2 border-b border-slate-100 text-slate-700 align-top',
};

/* ==================== Modal ==================== */
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

/* ==================== 输入组件 ==================== */
export function Input({ value, onChange, placeholder, className = '', type = 'text', step, min, readOnly }: {
  value: string | number | undefined; onChange?: (v: string) => void;
  placeholder?: string; className?: string; type?: string;
  step?: string | number; min?: string | number; readOnly?: boolean;
}) {
  return (
    <input
      type={type} step={step as any} min={min as any}
      value={value === undefined || value === null ? '' : value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      className={`${M.input} ${readOnly ? 'bg-slate-50 text-slate-500' : ''} ${className}`}
    />
  );
}

export function Select({ value, onChange, options, placeholder, className = '', disabled }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; className?: string;
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className={`${M.input} ${className} ${disabled ? 'opacity-60 cursor-not-allowed !bg-slate-100' : ''}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
      placeholder={placeholder} className={M.input} />
  );
}

/* ==================== Pill ==================== */

export function TypePill({ text, tone = 'slate' }: { text: string; tone?: 'slate' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'sky' | 'orange' }) {
  const tones: Record<string, string> = {
    slate:   `${M.pill} bg-slate-100 text-slate-700`,
    violet:  `${M.pill} bg-violet-50 text-violet-700`,
    emerald: `${M.pill} bg-emerald-50 text-emerald-700`,
    rose:    `${M.pill} bg-rose-50 text-rose-700`,
    amber:   `${M.pill} bg-amber-50 text-amber-700`,
    cyan:    `${M.pill} bg-cyan-50 text-cyan-700`,
    sky:     `${M.pill} bg-sky-50 text-sky-700`,
    orange:  `${M.pill} bg-orange-50 text-orange-700`,
  };
  return <span className={tones[tone]}>{text}</span>;
}

/* ==================== 搜索区 ==================== */
export function SearchBar({ children, onAdd, addLabel = '+ 新增' }: {
  children: React.ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl mb-4">
      {children}
      <div className="ml-auto flex items-center gap-2">
        {onAdd && <button className={M.button.primary} onClick={onAdd}>{addLabel}</button>}
      </div>
    </div>
  );
}

/* ==================== Toast ==================== */
export function useToast() {
  const ref = useRef<HTMLDivElement | null>(null);
  if (typeof window !== 'undefined' && !document.getElementById('__cmp_toasts')) {
    const host = document.createElement('div');
    host.id = '__cmp_toasts';
    host.className = 'fixed top-20 right-4 z-[100] space-y-2';
    document.body.appendChild(host);
  }
  return (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const host = document.getElementById('__cmp_toasts');
    if (!host) return;
    const el = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-700';
    el.className = `${bg} text-white px-4 py-2 rounded-lg shadow-lg text-sm`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };
}

/* ==================== 金额/数字格式化 ==================== */
export const fmtMoney = (n: number | undefined) =>
  `¥${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtNum = (n: number | undefined) =>
  (n === undefined || n === null) ? '—' : n.toLocaleString();
