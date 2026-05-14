'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Delete } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { formatRupiah } from '@/lib/date';

interface ClockResult {
  action: 'clock-in' | 'clock-out';
  employee: { id: string; name: string; employeeNumber: string; position?: string };
  attendance: { clockInAt?: string; clockOutAt?: string; workDurationMinutes?: number };
}

const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (min?: number) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} jam ${m} menit`;
};

export default function AttendancePage() {
  const { storeId, stores } = useStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClockResult | null>(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update jam setiap detik
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto reset setelah 5 detik tampil hasil
  useEffect(() => {
    if (result || error) {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setResult(null);
        setError('');
        setPin('');
      }, 5000);
    }
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, [result, error]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('PIN minimal 4 digit'); return; }
    if (!storeId) { setError('Pilih toko terlebih dahulu'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res: any = await apiClient.post('/employees/self-clock', { pin, storeId });
      setResult(res.data);
      setPin('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'PIN tidak ditemukan';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Submit otomatis saat PIN 6 digit
  useEffect(() => {
    if (pin.length === 6) handleSubmit();
  }, [pin]);

  const storeName = stores.find(s => s.id === storeId)?.name || 'Toko';

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🕐</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Absensi Karyawan</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🏪 {storeName}</p>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          {currentTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
          {currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Result / Error */}
      {result && (
        <div style={{
          width: '100%', maxWidth: 360, marginBottom: 'var(--space-lg)',
          padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', textAlign: 'center',
          background: result.action === 'clock-in' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
          border: `2px solid ${result.action === 'clock-in' ? 'var(--success)' : 'var(--warning)'}`,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
            {result.action === 'clock-in' ? '✅' : '👋'}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 4 }}>{result.employee.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            {result.employee.employeeNumber} {result.employee.position ? `· ${result.employee.position}` : ''}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: result.action === 'clock-in' ? 'var(--success)' : 'var(--warning)' }}>
            {result.action === 'clock-in' ? '🟢 Clock In Berhasil' : '🟡 Clock Out Berhasil'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {result.action === 'clock-in'
              ? `Jam masuk: ${fmtTime(result.attendance.clockInAt)}`
              : `Jam keluar: ${fmtTime(result.attendance.clockOutAt)} · Durasi: ${fmtDuration(result.attendance.workDurationMinutes)}`
            }
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
            Layar akan reset dalam 5 detik...
          </div>
        </div>
      )}

      {error && (
        <div style={{
          width: '100%', maxWidth: 360, marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', border: '2px solid var(--danger)',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>❌</div>
          <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{error}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Layar akan reset dalam 5 detik...</div>
        </div>
      )}

      {/* PIN Display */}
      {!result && !error && (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
            Masukkan PIN Anda untuk absen
          </p>

          {/* PIN dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 'var(--space-lg)' }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: i < pin.length ? 'var(--primary)' : 'var(--border-subtle)',
                border: `2px solid ${i < pin.length ? 'var(--primary)' : 'var(--border-base)'}`,
                transition: 'all 0.15s ease',
              }} />
            ))}
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button key={d} onClick={() => handlePinInput(d)}
                style={{
                  height: 64, fontSize: '1.5rem', fontWeight: 700, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {d}
              </button>
            ))}
            {/* Bottom row: empty, 0, delete */}
            <div />
            <button onClick={() => handlePinInput('0')}
              style={{ height: 64, fontSize: '1.5rem', fontWeight: 700, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
              0
            </button>
            <button onClick={handleDelete}
              style={{ height: 64, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Delete size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16, height: 52, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={20} />}
            {loading ? 'Memproses...' : 'Absen Sekarang'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 12 }}>
            PIN 6 digit akan otomatis diproses · Sistem mendeteksi clock in/out otomatis
          </p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
}
