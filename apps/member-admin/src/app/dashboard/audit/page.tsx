'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { auditService, AuditLog } from '@/services/audit.service';
import toast from 'react-hot-toast';
import { PageHeader, SearchInput, LoadingSpinner, Pagination } from '@/components/ui';

const ACTION_COLORS: Record<string, string> = {
  create: 'badge-success', update: 'badge-warning', delete: 'badge-danger',
  login: 'badge-primary', logout: 'badge-gray', view: 'badge-info',
};

const getActionBadge = (action: string) => {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : 'badge-gray';
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [filters, setFilters] = useState({ action: '', entityType: '', dateFrom: '', dateTo: '' });
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditService.getAll({ page, limit, action: filters.action || undefined, entityType: filters.entityType || undefined, startDate: filters.dateFrom || undefined, endDate: filters.dateTo || undefined });
      const data = res as any;
      setLogs(data.data || data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally { setLoading(false); }
  };

  const fmtDate = (d: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

  return (
    <div>
      <PageHeader title="Audit Logs" description="Track all system activity and changes"
        action={<button onClick={() => { setPage(1); load(); }} className="btn btn-outline btn-sm"><RefreshCcw size={14} /> Refresh</button>} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input className="form-input w-40" placeholder="Filter action..." value={filters.action} onChange={e => setFilters(p=>({...p,action:e.target.value}))} />
        <input className="form-input w-40" placeholder="Entity type..." value={filters.entityType} onChange={e => setFilters(p=>({...p,entityType:e.target.value}))} />
        <input type="date" className="form-input w-40" value={filters.dateFrom} onChange={e => setFilters(p=>({...p,dateFrom:e.target.value}))} />
        <input type="date" className="form-input w-40" value={filters.dateTo} onChange={e => setFilters(p=>({...p,dateTo:e.target.value}))} />
        <button onClick={() => { setPage(1); load(); }} className="btn btn-primary btn-sm">Apply</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Action</th><th>Entity</th><th>User</th><th>IP</th><th>Date</th></tr></thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit events found</td></tr>
                ) : logs.map((log, idx) => (
                  <tr key={log.id || idx} className="cursor-pointer" onClick={() => setSelected(log)}>
                    <td><span className={`badge ${getActionBadge(log.action)}`}>{log.action}</span></td>
                    <td><span className="font-medium">{log.entityType}</span><span className="text-gray-400 text-xs ml-1">#{log.entityId?.substring(0,8)}</span></td>
                    <td className="text-gray-600 text-sm">{log.userEmail || 'System'}</td>
                    <td className="text-gray-400 text-xs font-mono">{log.ipAddress || '—'}</td>
                    <td className="text-gray-500 text-sm whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination page={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} totalItems={total} />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setSelected(null)} />
          <div className="modal-panel max-w-lg w-full animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Audit Log Detail</h3>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon text-gray-400"><Shield size={18}/></button>
            </div>
            <div className="modal-body space-y-3">
              {[
                ['Action', <span className={`badge ${getActionBadge(selected.action)}`}>{selected.action}</span>],
                ['Entity', `${selected.entityType} #${selected.entityId}`],
                ['User', selected.userEmail || 'System'],
                ['IP', selected.ipAddress || '—'],
                ['Date', fmtDate(selected.createdAt)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-start gap-4">
                  <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">{value as any}</span>
                </div>
              ))}
              {selected.changes && Object.keys(selected.changes).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Changes</p>
                  <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 text-gray-700">{JSON.stringify(selected.changes, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="modal-footer"><button onClick={() => setSelected(null)} className="btn btn-outline">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
