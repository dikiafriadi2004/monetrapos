'use client';

import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-panel ${sizeMap[size]} w-full animate-fade-in`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function DeleteModal({ open, onClose, onConfirm, title = 'Delete Item', description = 'Are you sure? This action cannot be undone.', loading }: DeleteModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel max-w-sm w-full animate-fade-in">
        <div className="modal-body pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn btn-danger" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Universal Confirm Modal ──────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantConfig = {
  danger:  { bg: 'bg-red-100',    icon: 'text-red-600',    btn: 'btn-danger'   },
  warning: { bg: 'bg-yellow-100', icon: 'text-yellow-600', btn: 'btn-warning'  },
  info:    { bg: 'bg-blue-100',   icon: 'text-blue-600',   btn: 'btn-primary'  },
};

export function ConfirmModal({
  open, onClose, onConfirm,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin?',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  loading,
}: ConfirmModalProps) {
  if (!open) return null;
  const cfg = variantConfig[variant];
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel max-w-sm w-full animate-fade-in">
        <div className="modal-body pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 rounded-full ${cfg.bg} flex items-center justify-center`}>
              <AlertTriangle size={24} className={cfg.icon} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>{cancelLabel}</button>
          <button onClick={onConfirm} className={`btn ${cfg.btn}`} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  sub?: string;
}

export function StatsCard({ label, value, icon: Icon, color = 'indigo', sub }: StatsCardProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.indigo}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" />
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 size={size} className="animate-spin text-indigo-600" />
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-9"
      />
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
  map?: Record<string, { label: string; className: string }>;
}

const defaultStatusMap: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'badge-success' },
  inactive:  { label: 'Inactive',  className: 'badge-gray' },
  pending:   { label: 'Pending',   className: 'badge-warning' },
  completed: { label: 'Completed', className: 'badge-success' },
  cancelled: { label: 'Cancelled', className: 'badge-danger' },
  voided:    { label: 'Voided',    className: 'badge-gray' },
  refunded:  { label: 'Refunded',  className: 'badge-primary' },
  paid:      { label: 'Paid',      className: 'badge-success' },
  overdue:   { label: 'Overdue',   className: 'badge-danger' },
  open:      { label: 'Open',      className: 'badge-success' },
  closed:    { label: 'Closed',    className: 'badge-gray' },
};

export function StatusBadge({ status, map }: StatusBadgeProps) {
  const m = { ...defaultStatusMap, ...map };
  const cfg = m[status?.toLowerCase()] || { label: status, className: 'badge-gray' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

// ─── Table ────────────────────────────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  loading?: boolean;
  emptyIcon?: React.ElementType;
  emptyText?: string;
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, keyField = 'id', loading, emptyIcon, emptyText = 'No data found' }: DataTableProps<T>) {
  if (loading) return <LoadingSpinner />;
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">
                {emptyText}
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={String(row[keyField] ?? i)}>
              {columns.map(col => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-sm text-gray-500">
        {totalItems !== undefined ? `${totalItems} items` : `Page ${page} of ${totalPages}`}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="btn btn-outline btn-sm">Previous</button>
        <span className="text-sm font-medium text-gray-700">{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn btn-outline btn-sm">Next</button>
      </div>
    </div>
  );
}
