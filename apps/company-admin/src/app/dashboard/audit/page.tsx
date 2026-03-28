"use client";

import { useState, useEffect } from 'react';
import { Shield, Search, Filter, User, Clock, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../../../lib/api';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'var(--success)',
  UPDATE: 'var(--warning)',
  DELETE: 'var(--danger)',
  LOGIN: '#38bdf8',
  LOGOUT: 'var(--text-tertiary)',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/audit');
      setLogs(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredLogs = logs.filter(log =>
    (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.entityType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.performedBy || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="var(--accent-base)" /> Platform Audit Trail
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Complete activity log of all platform-wide operations for compliance and security review.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by action, entity, or user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.03)' }}
          />
        </div>
        <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
          {filteredLogs.length} events
        </div>
      </div>

      {/* Log Feed */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No audit events found.</div>
          ) : (
            filteredLogs.map((log, idx) => {
              const actionColor = ACTION_COLORS[log.action] || 'var(--text-secondary)';
              return (
                <div key={log.id || idx} className="animate-fade-in" style={{ display: 'flex', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'flex-start' }}>
                  {/* Timeline Dot */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${actionColor}15`, color: actionColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {log.action === 'CREATE' && <CheckCircle size={16} />}
                    {log.action === 'UPDATE' && <Activity size={16} />}
                    {log.action === 'DELETE' && <AlertTriangle size={16} />}
                    {log.action === 'LOGIN' && <User size={16} />}
                    {!['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].includes(log.action) && <Activity size={16} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge" style={{ background: `${actionColor}20`, color: actionColor, fontSize: '0.75rem' }}>{log.action}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{log.entityType}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {log.description || `${log.action} operation on ${log.entityType} (ID: ${log.entityId?.substring(0, 8)}...)`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', gap: 'var(--space-md)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {log.performedBy || 'System'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
