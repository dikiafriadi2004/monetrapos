'use client';

import { useState, useEffect } from 'react';
import { Clock, X, FileText, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { shiftService } from '@/services/shift.service';
import { Shift } from '@/types';
import toast from 'react-hot-toast';
import { Modal, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => new Date(d).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });

export default function ShiftsPage() {
  const { company } = useAuth();
  const { storeId } = useStore();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [shiftReport, setShiftReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (storeId) loadShifts(); }, [storeId]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [active, history] = await Promise.all([
        shiftService.getActiveShift(storeId!).catch(() => null),
        shiftService.getShifts(storeId!),
      ]);
      setActiveShift(active);
      setShifts(Array.isArray(history) ? history : (history as any)?.data || []);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
      toast.error(err?.response?.data?.message || 'Failed to load shifts');
    } finally { setLoading(false); }
  };

  const handleOpenShift = async () => {
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid opening cash amount'); return; }
    setSaving(true);
    try {
      await shiftService.openShift({ storeId: storeId!, openingAmount: amount });
      setOpenModal(false); setOpeningCash('');
      loadShifts(); toast.success('Shift opened');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to open shift'); }
    finally { setSaving(false); }
  };

  const handleCloseShift = async () => {
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) { toast.error('Masukkan jumlah kas penutup yang valid'); return; }
    setSaving(true);
    try {
      await shiftService.closeShift(activeShift!.id, { shiftId: activeShift!.id, closingCash: amount });
      setCloseModal(false); setClosingCash('');
      loadShifts(); toast.success('Shift ditutup');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menutup shift'); }
    finally { setSaving(false); }
  };

  const handleViewReport = async (shiftId: string) => {
    setReportLoading(true);
    try {
      const report = await shiftService.getShiftReport(shiftId);
      setShiftReport(report);
    } catch { toast.error('Failed to load shift report'); }
    finally { setReportLoading(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Shift Management" description="Manage cashier shifts and cash declarations"
        action={!activeShift ? <button onClick={() => setOpenModal(true)} className="btn btn-success"><Plus size={16} /> Open New Shift</button> : undefined} />

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Clock size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Active Shift</p>
              <p className="text-sm text-emerald-600">Started: {fmtDate(activeShift.startTime)} • Opening: {fmt(activeShift.startingCash)}</p>
            </div>
          </div>
          <button onClick={() => setCloseModal(true)} className="btn btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-100">Close Shift</button>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Shift History</h3></div>
        {shifts.length === 0 ? (
          <div className="card-body"><EmptyState icon={Clock} title="No shift history" /></div>
        ) : (
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Shift ID</th><th>Start</th><th>End</th><th>Opening</th><th>Closing</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {shifts.map(shift => (
                  <tr key={shift.id}>
                    <td className="font-mono text-xs text-gray-500">#{shift.id.slice(0,8)}</td>
                    <td className="text-sm text-gray-600 whitespace-nowrap">{fmtDate(shift.startTime)}</td>
                    <td className="text-sm text-gray-600 whitespace-nowrap">{shift.endTime ? fmtDate(shift.endTime) : '—'}</td>
                    <td>{fmt(shift.startingCash)}</td>
                    <td>{shift.endingCash ? fmt(shift.endingCash) : '—'}</td>
                    <td><StatusBadge status={shift.status} /></td>
                    <td>
                      <div className="flex justify-end">
                        {shift.status === 'closed' && (
                          <button onClick={() => handleViewReport(shift.id)} className="btn btn-ghost btn-sm" disabled={reportLoading}>
                            {reportLoading ? <Loader2 size={13} className="animate-spin"/> : <FileText size={13}/>} Report
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Open New Shift"
        footer={<><button onClick={() => setOpenModal(false)} className="btn btn-outline">Cancel</button><button onClick={handleOpenShift} className="btn btn-success" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Open Shift</button></>}>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Opening Cash Amount (IDR)</label>
            <input type="number" className="form-input" value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="Enter opening cash..." autoFocus />
          </div>
          <p className="text-sm text-gray-500">Count all cash in the register before starting your shift.</p>
        </div>
      </Modal>

      {/* Close Shift Modal */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Shift"
        footer={<><button onClick={() => setCloseModal(false)} className="btn btn-outline">Cancel</button><button onClick={handleCloseShift} className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Close Shift</button></>}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Opening Cash</p>
            <p className="text-lg font-bold">{fmt(activeShift?.startingCash || 0)}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Closing Cash Amount (IDR)</label>
            <input type="number" className="form-input" value={closingCash} onChange={e => setClosingCash(e.target.value)} placeholder="Enter closing cash..." autoFocus />
          </div>
          <p className="text-sm text-gray-500">Count all cash in the register. The system will calculate variance.</p>
        </div>
      </Modal>

      {/* Shift Report Modal */}
      <Modal open={!!shiftReport} onClose={() => setShiftReport(null)} title="Shift Report" size="sm">
        {shiftReport && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Opening Cash', fmt(shiftReport.openingCash || shiftReport.startingCash)],
                ['Closing Cash', fmt(shiftReport.closingCash || shiftReport.endingCash)],
                ['Total Sales', fmt(shiftReport.totalSales)],
                ['Transactions', String(shiftReport.totalTransactions || 0)],
                ['Cash Sales', fmt(shiftReport.cashSales)],
                ['Non-Cash', fmt(shiftReport.nonCashSales)],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {shiftReport.variance !== undefined && (
              <div className={`rounded-lg p-3 ${shiftReport.variance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className="text-xs text-gray-500">Cash Variance</p>
                <p className={`text-xl font-bold ${shiftReport.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {shiftReport.variance >= 0 ? '+' : ''}{fmt(shiftReport.variance)}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
