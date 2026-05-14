"use client";

import { useState, useEffect } from 'react';
import { Webhook, RefreshCcw, Search, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';

interface WebhookLog {
  id: string;
  event: string;
  source: string;
  status: 'success' | 'failed' | 'pending';
  payload?: any;
  response?: any;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  failed:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: XCircle },
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
};

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/admin/webhook-logs');
      setLogs(Array.isArray(data) ? data : (data?.data || []));
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return d; }
  };

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.event?.toLowerCase().includes(search.toLowerCase()) || l.source?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Webhook size={24} color="var(--accent-base)" /> Webhook Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log webhook dari payment gateway (Xendit) dan event lainnya.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-outline btn-sm"><RefreshCcw size={14} /> Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--accent-base)' },
          { label: 'Sukses', value: stats.success, color: '#10b981' },
          { label: 'Gagal', value: stats.failed, color: '#ef4444' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Cari event atau source..." className="form-input" style={{ paddingLeft: 36, height: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'success', 'failed', 'pending'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: 36, padding: '0 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {s === 'all' ? 'Semua' : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <Webhook size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-md)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Tidak ada webhook log</p>
          </div>
        ) : (
          <div>
            {filtered.map(log => {
              const cfg = statusConfig[log.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const isExpanded = expanded === log.id;
              return (
                <div key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12 }}
                  >
                    <StatusIcon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.event}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 500 }}>{log.status}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 10 }}>{log.source}</span>
                      </div>
                      {log.errorMessage && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: 2 }}>{log.errorMessage}</div>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{fmtDate(log.createdAt)}</div>
                    {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', background: 'var(--bg-tertiary)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        {log.payload && (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Payload</div>
                            <pre style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 200, margin: 0 }}>
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.response && (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Response</div>
                            <pre style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 200, margin: 0 }}>
                              {JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
