'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { employeesService, Employee, AttendanceRecord } from '@/services/employees.service';
import { ArrowLeft, Download, Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { formatRupiah } from '@/lib/date';
import toast from 'react-hot-toast';

interface AttendanceSummary {
  employee: Employee;
  records: AttendanceRecord[];
  totalDays: number;
  totalMinutes: number;
  avgMinutesPerDay: number;
  presentDays: number;
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (min?: number) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}j ${m}m`;
};

export default function AttendanceReportPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [exportLoading, setExportLoading] = useState(false);

  // Load employees
  useEffect(() => {
    employeesService.getAll().then(data => {
      setEmployees(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoadingEmployees(false));
  }, []);

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month
  const workingDays = getWorkingDays(year, month);

  const loadAttendance = useCallback(async () => {
    if (employees.length === 0) return;
    setLoading(true);
    try {
      const targets = selectedEmployee === 'all' ? employees : employees.filter(e => e.id === selectedEmployee);
      const results = await Promise.all(
        targets.map(async emp => {
          try {
            const records = await employeesService.getAttendance(emp.id, {
              startDate: monthStart,
              endDate: monthEnd,
              limit: 200,
            });
            const validRecords = records.filter(r => r.clockInAt || r.clockInTime);
            const totalMinutes = validRecords.reduce((s, r) => s + (r.workDurationMinutes || 0), 0);
            const presentDays = new Set(validRecords.map(r => {
              const d = r.clockInAt || r.clockInTime || '';
              return d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) : '';
            }).filter(Boolean)).size;
            return {
              employee: emp,
              records: validRecords,
              totalDays: workingDays,
              totalMinutes,
              avgMinutesPerDay: presentDays > 0 ? Math.round(totalMinutes / presentDays) : 0,
              presentDays,
            } as AttendanceSummary;
          } catch {
            return { employee: emp, records: [], totalDays: workingDays, totalMinutes: 0, avgMinutesPerDay: 0, presentDays: 0 } as AttendanceSummary;
          }
        })
      );
      setSummaries(results);
    } catch { toast.error('Gagal memuat data absensi'); }
    finally { setLoading(false); }
  }, [employees, selectedEmployee, monthStart, monthEnd, workingDays]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleExportCSV = async () => {
    if (summaries.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    setExportLoading(true);
    try {
      const SEP = ';';
      const monthLabel = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      // Summary sheet
      const summaryHeaders = ['Nama Karyawan', 'No. Karyawan', 'Hari Hadir', 'Hari Kerja', 'Total Jam Kerja', 'Rata-rata/Hari', 'Kehadiran (%)'];
      const summaryRows = summaries.map(s => [
        s.employee.name,
        s.employee.employeeNumber,
        s.presentDays,
        s.totalDays,
        fmtDuration(s.totalMinutes),
        fmtDuration(s.avgMinutesPerDay),
        s.totalDays > 0 ? `${Math.round((s.presentDays / s.totalDays) * 100)}%` : '0%',
      ].map(v => String(v ?? '')).join(SEP));

      // Detail rows
      const detailHeaders = ['Nama Karyawan', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Istirahat (mnt)', 'Jam Kerja', 'Toko', 'Catatan'];
      const detailRows: string[] = [];
      for (const s of summaries) {
        for (const r of s.records) {
          const clockIn = r.clockInAt || r.clockInTime || '';
          const clockOut = r.clockOutAt || r.clockOutTime || '';
          detailRows.push([
            s.employee.name,
            clockIn ? new Date(clockIn).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
            clockIn ? fmtTime(clockIn) : '',
            clockOut ? fmtTime(clockOut) : 'Belum Clock Out',
            r.breakDurationMinutes || 0,
            fmtDuration(r.workDurationMinutes),
            r.store?.name || '',
            r.notes || '',
          ].map(v => {
            const s = String(v ?? '');
            return s.includes(SEP) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(SEP));
        }
      }

      const csv = [
        `sep=${SEP}`,
        `Laporan Absensi Karyawan - ${monthLabel}`,
        '',
        '=== RINGKASAN ===',
        summaryHeaders.join(SEP),
        ...summaryRows,
        '',
        '=== DETAIL ABSENSI ===',
        detailHeaders.join(SEP),
        ...detailRows,
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `absensi_${year}_${String(month).padStart(2, '0')}.csv`;
      a.click();
      toast.success('Laporan berhasil diekspor');
    } catch { toast.error('Gagal export CSV'); }
    finally { setExportLoading(false); }
  };

  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: 'var(--space-sm)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 2 }}>Laporan Absensi</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rekap kehadiran karyawan per bulan</p>
          </div>
        </div>
        <button onClick={handleExportCSV} disabled={exportLoading || summaries.length === 0} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={16} /> {exportLoading ? 'Mengekspor...' : 'Export CSV'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="glass-panel" style={{ padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} className="btn btn-outline" style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
          <div style={{ minWidth: 160, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button onClick={nextMonth} className="btn btn-outline" style={{ padding: '6px 10px' }} disabled={year === today.getFullYear() && month === today.getMonth() + 1}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Employee filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} style={{ color: 'var(--text-tertiary)' }} />
          <select className="form-input" style={{ height: 36, minWidth: 200 }} value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
            <option value="all">Semua Karyawan</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
          {workingDays} hari kerja bulan ini
        </div>
      </div>

      {/* Summary cards */}
      {!loading && summaries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {[
            { label: 'Total Karyawan', value: summaries.length, icon: '👥', color: 'var(--primary)' },
            { label: 'Rata-rata Kehadiran', value: `${Math.round(summaries.reduce((s, x) => s + (x.totalDays > 0 ? (x.presentDays / x.totalDays) * 100 : 0), 0) / Math.max(summaries.length, 1))}%`, icon: '📊', color: 'var(--success)' },
            { label: 'Total Jam Kerja', value: fmtDuration(summaries.reduce((s, x) => s + x.totalMinutes, 0)), icon: '⏱️', color: 'var(--warning)' },
            { label: 'Karyawan Hadir Penuh', value: summaries.filter(s => s.presentDays >= s.totalDays).length, icon: '✅', color: 'var(--success)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="glass-panel" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      {loadingEmployees || loading ? <LoadingSpinner /> : summaries.length === 0 ? (
        <EmptyState icon={Calendar} title="Tidak ada data absensi" description={`Belum ada data absensi untuk ${MONTH_NAMES[month - 1]} ${year}`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {summaries.map(({ employee: emp, records, presentDays, totalMinutes, avgMinutesPerDay }) => {
            const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
            const pctColor = attendancePct >= 90 ? 'var(--success)' : attendancePct >= 70 ? 'var(--warning)' : 'var(--danger)';

            return (
              <div key={emp.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Employee header */}
                <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{emp.employeeNumber} {emp.position ? `· ${emp.position}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: pctColor }}>{attendancePct}%</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>Kehadiran</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{presentDays}/{workingDays}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>Hari Hadir</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>{fmtDuration(totalMinutes)}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>Total Jam</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmtDuration(avgMinutesPerDay)}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>Rata-rata/Hari</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: 'var(--border-subtle)' }}>
                  <div style={{ height: '100%', width: `${attendancePct}%`, background: pctColor, transition: 'width 0.5s ease' }} />
                </div>

                {/* Records table */}
                {records.length === 0 ? (
                  <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    Tidak ada catatan absensi bulan ini
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {['Tanggal', 'Jam Masuk', 'Jam Keluar', 'Istirahat', 'Jam Kerja', 'Toko', 'Catatan'].map(h => (
                            <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(r => {
                          const clockIn = r.clockInAt || r.clockInTime || '';
                          const clockOut = r.clockOutAt || r.clockOutTime || '';
                          const isActive = !clockOut;
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isActive ? 'rgba(16,185,129,0.03)' : undefined }}>
                              <td style={{ padding: '8px 16px', fontWeight: 500, whiteSpace: 'nowrap' }}>{clockIn ? fmtDate(clockIn) : '—'}</td>
                              <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{clockIn ? fmtTime(clockIn) : '—'}</td>
                              <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                                {clockOut ? (
                                  <span style={{ color: 'var(--text-secondary)' }}>{fmtTime(clockOut)}</span>
                                ) : (
                                  <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.78rem' }}>● Aktif</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 16px', color: 'var(--text-tertiary)' }}>{r.breakDurationMinutes ? `${r.breakDurationMinutes} mnt` : '—'}</td>
                              <td style={{ padding: '8px 16px', fontWeight: 600, color: r.workDurationMinutes ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                {fmtDuration(r.workDurationMinutes)}
                              </td>
                              <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>{r.store?.name || '—'}</td>
                              <td style={{ padding: '8px 16px', color: 'var(--text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Hitung jumlah hari kerja (Senin-Sabtu) dalam sebulan */
function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) count++; // 0 = Minggu
  }
  return count;
}
