'use client';

import { useState, useEffect } from 'react';
import { fnbService, FnbTable, TableStatus } from '@/services/fnb.service';
import { useStore } from '@/hooks/useStore';
import { Grid3x3, Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string }> = {
  [TableStatus.AVAILABLE]: { label: 'Tersedia', color: 'var(--success)' },
  [TableStatus.OCCUPIED]: { label: 'Terisi', color: 'var(--danger)' },
  [TableStatus.RESERVED]: { label: 'Dipesan', color: 'var(--warning)' },
  [TableStatus.CLEANING]: { label: 'Dibersihkan', color: 'var(--info, #3b82f6)' },
};

export default function FnbTablesPage() {
  const { storeId, stores } = useStore();
  const [tables, setTables] = useState<FnbTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: FnbTable | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ tableNumber: '', capacity: 4, floor: '', status: TableStatus.AVAILABLE });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (storeId) loadTables(); }, [storeId]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await fnbService.getTables(storeId);
      setTables(Array.isArray(res) ? res : []);
    } catch { toast.error('Gagal memuat data meja'); }
    finally { setLoading(false); }
  };

  const openModal = (table?: FnbTable) => {
    setForm(table
      ? { tableNumber: table.tableNumber, capacity: table.capacity, floor: table.floor || '', status: table.status }
      : { tableNumber: '', capacity: 4, floor: '', status: TableStatus.AVAILABLE }
    );
    setModal({ open: true, editing: table || null });
  };

  const save = async () => {
    if (!form.tableNumber) { toast.error('Nomor meja wajib diisi'); return; }
    if (!storeId) { toast.error('Tidak ada toko aktif'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        await fnbService.updateTable(modal.editing.id, { tableNumber: form.tableNumber, capacity: form.capacity, floor: form.floor || undefined, status: form.status });
        toast.success('Meja berhasil diperbarui');
      } else {
        await fnbService.createTable({ storeId, tableNumber: form.tableNumber, capacity: form.capacity, floor: form.floor || undefined });
        toast.success('Meja berhasil ditambahkan');
      }
      await loadTables();
      setModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menyimpan meja'); }
    finally { setSaving(false); }
  };

  const remove = async (table: FnbTable) => {
    if (!confirm(`Hapus meja ${table.tableNumber}?`)) return;
    try {
      await fnbService.deleteTable(table.id);
      toast.success('Meja berhasil dihapus');
      setTables(prev => prev.filter(t => t.id !== table.id));
    } catch { toast.error('Gagal menghapus meja'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Manajemen Meja</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Toko aktif: <strong>{stores.find(s => s.id === storeId)?.name || 'Toko Utama'}</strong>
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Meja</button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {tables.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Grid3x3 size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Belum ada meja. Tambahkan meja pertama Anda.</p>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Meja</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
          {tables.map(table => {
            const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG[TableStatus.AVAILABLE];
            return (
              <div key={table.id} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-md)', textAlign: 'center', borderTop: `3px solid ${cfg.color}` }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>{table.tableNumber}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Kapasitas: {table.capacity}</div>
                {table.floor && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Lantai: {table.floor}</div>}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color, marginBottom: 'var(--space-sm)' }}>{cfg.label}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button onClick={() => openModal(table)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><Edit2 size={14} /></button>
                  <button onClick={() => remove(table)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 440, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{modal.editing ? 'Edit Meja' : 'Tambah Meja'}</h3>
              <button onClick={() => setModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            {/* Info toko otomatis */}
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              🏪 Toko: <strong>{stores.find(s => s.id === storeId)?.name || 'Toko Utama'}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>(otomatis dari toko aktif)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nomor Meja *</label>
                <input className="form-input" value={form.tableNumber}
                  onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))}
                  placeholder="Contoh: T1, A3, Meja-01" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Nomor unik untuk identifikasi meja</p>
              </div>
              <div className="form-group">
                <label className="form-label">Kapasitas (orang)</label>
                <input type="number" className="form-input" value={form.capacity}
                  onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                  min="1" max="50" placeholder="Contoh: 4" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Jumlah kursi di meja ini</p>
              </div>
              <div className="form-group">
                <label className="form-label">Lantai / Area</label>
                <input className="form-input" value={form.floor}
                  onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                  placeholder="Contoh: Lantai 1, Outdoor, VIP" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Lokasi meja di restoran (opsional)</p>
              </div>
              {modal.editing && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TableStatus }))}>
                    {Object.entries(STATUS_CONFIG).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Batal</button>
              <button onClick={save} className="btn btn-primary" disabled={saving || !form.tableNumber}>
                {saving ? 'Menyimpan...' : modal.editing ? 'Perbarui' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
