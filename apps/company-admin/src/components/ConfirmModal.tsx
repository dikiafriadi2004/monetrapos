"use client";

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open, title, description,
  confirmLabel = 'Hapus', cancelLabel = 'Batal',
  variant = 'danger', loading = false,
  onConfirm, onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  const iconColor = variant === 'danger' ? '#ef4444' : '#f59e0b';
  const iconBg = variant === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';
  const btnClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-warning';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 10000,
        background: '#fff', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: '420px',
        padding: '1.75rem',
        animation: 'fadeIn 0.15s ease-out',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.25rem',
        }}>
          <AlertTriangle size={26} color={iconColor} />
        </div>

        {/* Content */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          {description}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={btnClass} disabled={loading}>
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
