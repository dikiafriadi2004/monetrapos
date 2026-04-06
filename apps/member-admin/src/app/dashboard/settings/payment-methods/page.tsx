'use client';

import { useState, useEffect } from 'react';
import { paymentMethodsService, PaymentMethod, PaymentMethodType, CreatePaymentMethodDto } from '@/services/payment-methods.service';
import { CreditCard, Wallet, Banknote, QrCode, Building2, Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, X, Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { getImageUrl } from '@/lib/date';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui';

const TYPE_ICONS: Record<string, any> = {
  [PaymentMethodType.CASH]: Banknote,
  [PaymentMethodType.CARD]: CreditCard,
  [PaymentMethodType.EWALLET]: Wallet,
  [PaymentMethodType.QRIS]: QrCode,
  [PaymentMethodType.BANK_TRANSFER]: Building2,
};

const emptyForm = { name: '', code: '', type: PaymentMethodType.CASH, color: '#6366f1', description: '', requiresReference: false, sortOrder: 0 };

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: PaymentMethod | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [qrisUploading, setQrisUploading] = useState<string | null>(null);
  const [qrisStringModal, setQrisStringModal] = useState<{ open: boolean; methodId: string | null }>({ open: false, methodId: null });
  const [qrisStringInput, setQrisStringInput] = useState('');
  const [qrisStringSaving, setQrisStringSaving] = useState(false);
  const [qrisConfigStatus, setQrisConfigStatus] = useState<{ exists: boolean; merchantName?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; method: PaymentMethod | null }>({ open: false, method: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { load(); loadQrisStatus(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await paymentMethodsService.getAll();
      const sorted = data.sort((a, b) => a.sortOrder - b.sortOrder);
      setMethods(sorted);
      // Auto-decode QRIS dari gambar yang sudah ada
      await autoDecodeQrisFromExistingImage(sorted);
    } catch { toast.error('Gagal memuat metode pembayaran'); }
    finally { setLoading(false); }
  };

  const loadQrisStatus = async () => {
    try {
      const res = await apiClient.get('/qris/config/company/status');
      setQrisConfigStatus(res.data);
    } catch {
      setQrisConfigStatus({ exists: false });
    }
  };

  // Auto-decode QRIS dari gambar yang sudah ada jika config belum ada
  const autoDecodeQrisFromExistingImage = async (methods: PaymentMethod[]) => {
    const qrisMethod = methods.find(m => m.type === PaymentMethodType.QRIS && m.isActive && m.iconUrl);
    if (!qrisMethod?.iconUrl) return;

    try {
      const statusRes = await apiClient.get('/qris/config/company/status');
      if (statusRes.data?.exists) {
        setQrisConfigStatus(statusRes.data);
        return; // sudah ada, skip
      }

      // Coba decode dari gambar yang sudah ada di server
      const res = await apiClient.post('/qris/decode-from-image', { iconUrl: qrisMethod.iconUrl });
      const data = res.data as any;
      if (data.success) {
        toast.success('✅ QRIS Dinamis otomatis aktif dari gambar yang sudah diupload!');
        setQrisConfigStatus({ exists: true });
      } else {
        setQrisConfigStatus({ exists: false });
      }
    } catch {
      setQrisConfigStatus({ exists: false });
    }
  };

  const openModal = (m?: PaymentMethod) => {
    setForm(m ? { name: m.name, code: m.code, type: m.type, color: m.color || '#6366f1', description: m.description || '', requiresReference: m.requiresReference, sortOrder: m.sortOrder } : emptyForm);
    setModal({ open: true, editing: m || null });
  };

  const save = async () => {
    if (!form.name || !form.code) { toast.error('Nama dan kode wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        await paymentMethodsService.update(modal.editing.id, { name: form.name, color: form.color, description: form.description, requiresReference: form.requiresReference, sortOrder: form.sortOrder });
        toast.success('Berhasil diperbarui');
      } else {
        await paymentMethodsService.create(form as CreatePaymentMethodDto);
        toast.success('Berhasil dibuat');
      }
      await load();
      setModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (m: PaymentMethod) => {
    try {
      await paymentMethodsService.toggle(m.id);
      toast.success(`${m.name} ${m.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      await load();
    } catch { toast.error('Gagal mengubah status'); }
  };

  const handleDelete = async (m: PaymentMethod) => {
    setDeleteConfirm({ open: true, method: m });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.method) return;
    setDeleteLoading(true);
    try {
      await paymentMethodsService.delete(deleteConfirm.method.id);
      toast.success('Berhasil dihapus');
      setMethods(prev => prev.filter(x => x.id !== deleteConfirm.method!.id));
      setDeleteConfirm({ open: false, method: null });
    } catch { toast.error('Gagal menghapus'); }
    finally { setDeleteLoading(false); }
  };

  const handleQrisUpload = async (methodId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Gambar maksimal 5MB'); return; }
    setQrisUploading(methodId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(`/payment-methods/${methodId}/qris-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data as any;

      // Backend sudah auto-decode, tampilkan hasilnya
      if (data.qrisDecoded) {
        toast.success(data.message);
      } else {
        toast(data.message, { icon: '⚠️' });
        // Buka modal input manual sebagai fallback
        setQrisStringInput('');
        setQrisStringModal({ open: true, methodId });
      }

      await load();
      await loadQrisStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal upload QRIS');
    } finally {
      setQrisUploading(null);
    }
  };

  const saveQrisString = async (qrisString: string) => {
    await apiClient.post('/qris/config/company', {
      parsedData: qrisString.trim(),
      originalImage: qrisString.trim(),
    });
  };

  const handleDecodeFromServer = async (iconUrl: string) => {
    try {
      const res = await apiClient.post('/qris/decode-from-image', { iconUrl });
      const data = res.data as any;
      if (data.success) {
        toast.success(data.message);
        await loadQrisStatus();
      } else {
        toast.error(data.message);
        setQrisStringInput('');
        setQrisStringModal({ open: true, methodId: null });
      }
    } catch (err: any) {
      toast.error('Gagal decode dari server');
    }
  };

  const handleSaveQrisString = async () => {
    if (!qrisStringInput.trim()) { toast.error('Masukkan QRIS string'); return; }
    if (!qrisStringInput.trim().startsWith('000201')) {
      toast.error('Format QRIS string tidak valid. Harus dimulai dengan "000201"');
      return;
    }
    setQrisStringSaving(true);
    try {
      await saveQrisString(qrisStringInput);
      toast.success('✅ QRIS string berhasil disimpan! QRIS Dinamis aktif.');
      setQrisStringModal({ open: false, methodId: null });
      setQrisStringInput('');
      await loadQrisStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan QRIS string');
    } finally {
      setQrisStringSaving(false);
    }
  };

  const decodeQrFromImage = (file: File): Promise<string | null> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            import('jsqr').then(({ default: jsQR }) => {
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              resolve(code?.data || null);
            }).catch(() => resolve(null));
          } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  const hasQris = methods.some(m => m.type === PaymentMethodType.QRIS && m.isActive);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Metode Pembayaran</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Kelola metode pembayaran yang tersedia di POS</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Metode</button>
      </div>

      {/* QRIS Dinamis Status Banner */}
      {hasQris && (
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          marginBottom: 'var(--space-lg)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${qrisConfigStatus?.exists ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          background: qrisConfigStatus?.exists ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {qrisConfigStatus?.exists
              ? <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              : <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            }
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: qrisConfigStatus?.exists ? '#065f46' : '#92400e' }}>
                {qrisConfigStatus?.exists
                  ? `QRIS Dinamis Aktif${qrisConfigStatus.merchantName ? ` — ${qrisConfigStatus.merchantName}` : ''}`
                  : 'QRIS Dinamis Belum Dikonfigurasi'
                }
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {qrisConfigStatus?.exists
                  ? 'QR code akan otomatis include nominal tagihan saat checkout'
                  : 'Upload gambar QRIS atau input QRIS string untuk mengaktifkan QRIS Dinamis'
                }
              </div>
            </div>
          </div>
          {!qrisConfigStatus?.exists && (
            <button
              onClick={() => setQrisStringModal({ open: true, methodId: null })}
              className="btn btn-outline"
              style={{ flexShrink: 0, fontSize: '0.85rem' }}
            >
              <QrCode size={14} /> Input QRIS String
            </button>
          )}
        </div>
      )}

      {methods.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <CreditCard size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Belum ada metode pembayaran</p>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Pertama</button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['', 'Metode', 'Tipe', 'QRIS', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {methods.map(m => {
                  const Icon = TYPE_ICONS[m.type] || CreditCard;
                  const isQris = m.type === PaymentMethodType.QRIS;
                  const qrisImageUrl = getImageUrl(m.iconUrl);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-tertiary)' }}><GripVertical size={16} /></td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: m.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{m.code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{m.type.replace('_', ' ')}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        {isQris ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {/* Gambar QRIS */}
                            {qrisImageUrl ? (
                              <img src={qrisImageUrl} alt="QRIS" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ width: 40, height: 40, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)' }}>
                                <QrCode size={16} style={{ color: 'var(--text-tertiary)' }} />
                              </div>
                            )}
                            {/* Upload gambar */}
                            <label style={{ cursor: 'pointer' }}>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleQrisUpload(m.id, f); e.target.value = ''; }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {qrisUploading === m.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                                {qrisImageUrl ? 'Ganti' : 'Upload'}
                              </span>
                            </label>
                            {/* Decode otomatis dari gambar yang sudah ada */}
                            {qrisImageUrl && !qrisConfigStatus?.exists && (
                              <button
                                onClick={() => handleDecodeFromServer(m.iconUrl!)}
                                style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}
                              >
                                <QrCode size={11} /> Decode Otomatis
                              </button>
                            )}
                            {/* Input string manual */}
                            <button
                              onClick={() => { setQrisStringInput(''); setQrisStringModal({ open: true, methodId: m.id }); }}
                              style={{ fontSize: '0.75rem', color: qrisConfigStatus?.exists ? '#10b981' : '#6366f1', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                            >
                              <QrCode size={12} />
                              {qrisConfigStatus?.exists ? '✓ Aktif' : 'Input Manual'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <button onClick={() => handleToggle(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, background: m.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: m.isActive ? 'var(--success)' : '#6b7280', border: 'none', cursor: 'pointer' }}>
                          {m.isActive ? <><Eye size={12} /> Aktif</> : <><EyeOff size={12} /> Nonaktif</>}
                        </button>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openModal(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Input QRIS String Manual */}
      {qrisStringModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setQrisStringModal({ open: false, methodId: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 560, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 201, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Input QRIS String</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Untuk mengaktifkan QRIS Dinamis dengan nominal otomatis</p>
              </div>
              <button onClick={() => setQrisStringModal({ open: false, methodId: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            {/* Cara mendapatkan QRIS string */}
            <div style={{ padding: 'var(--space-md)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.82rem', color: '#1e40af' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>📋 Cara mendapatkan QRIS String:</div>
              <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Buka aplikasi bank/e-wallet Anda (BCA, Mandiri, GoPay, dll)</li>
                <li>Buka menu <strong>Terima Pembayaran / Receive Payment / QRIS Merchant</strong></li>
                <li>Scan QR code QRIS Anda menggunakan aplikasi QR scanner (misal: Google Lens, QR Scanner app)</li>
                <li>Copy teks yang muncul — dimulai dengan <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: 3 }}>000201</code></li>
                <li>Paste di kolom di bawah ini</li>
              </ol>
            </div>

            <div className="form-group">
              <label className="form-label">QRIS String (EMV Format) *</label>
              <textarea
                className="form-input"
                rows={5}
                value={qrisStringInput}
                onChange={e => setQrisStringInput(e.target.value)}
                placeholder="000201010211..."
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
              />
              {qrisStringInput && !qrisStringInput.trim().startsWith('000201') && (
                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                  ⚠️ Format tidak valid. QRIS string harus dimulai dengan "000201"
                </p>
              )}
              {qrisStringInput && qrisStringInput.trim().startsWith('000201') && (
                <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>
                  ✓ Format valid ({qrisStringInput.trim().length} karakter)
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setQrisStringModal({ open: false, methodId: null })} className="btn btn-outline">Batal</button>
              <button
                onClick={handleSaveQrisString}
                className="btn btn-primary"
                disabled={qrisStringSaving || !qrisStringInput.trim().startsWith('000201')}
              >
                {qrisStringSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : '✓ Simpan QRIS String'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Metode */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 480, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{modal.editing ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</h3>
              <button onClick={() => setModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nama *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Cash, GoPay, Transfer BCA" />
              </div>
              {!modal.editing && (
                <div className="form-group">
                  <label className="form-label">Kode *</label>
                  <input className="form-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Contoh: CASH, GOPAY" />
                </div>
              )}
              {!modal.editing && (
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as PaymentMethodType }))}>
                    <option value="cash">Cash (Tunai)</option>
                    <option value="card">Card (Kartu)</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="qris">QRIS</option>
                    <option value="bank_transfer">Transfer Bank</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Warna</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 36, padding: 2, border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer' }} />
                  <input className="form-input" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ flex: 1 }} placeholder="#6366f1" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Urutan Tampil</label>
                <input type="number" className="form-input" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Deskripsi</label>
                <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Contoh: Pembayaran tunai di kasir" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={form.requiresReference} onChange={e => setForm(p => ({ ...p, requiresReference: e.target.checked }))} />
                  Butuh nomor referensi (contoh: bukti transfer)
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Batal</button>
              <button onClick={save} className="btn btn-primary" disabled={saving || !form.name || !form.code}>
                {saving ? 'Menyimpan...' : modal.editing ? 'Perbarui' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      <ConfirmModal
        open={deleteConfirm.open}
        title="Hapus Metode Pembayaran"
        description={`Hapus metode pembayaran "${deleteConfirm.method?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm({ open: false, method: null })}
      />
    </div>
  );
}
