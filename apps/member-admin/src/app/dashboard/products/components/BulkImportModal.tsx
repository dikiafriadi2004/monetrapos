"use client";

import { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parsePreview = async (f: File) => {
    const text = await f.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1, 6).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
    setPreview(rows);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      setFile(f); parsePreview(f);
    } else { toast.error('Upload file CSV saja'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); parsePreview(f); }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await onImport(file);
      setFile(null); setPreview([]);
    } catch (error) {
      console.error('Import failed:', error);
    } finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const template = [
      'Name,SKU,Barcode,Category,Base Price,Cost Price,Unit,Stock,Min Stock,Track Inventory,Active',
      'Nasi Goreng,PROD-001,1234567890,Makanan,25000,15000,pcs,100,10,Yes,Yes',
      'Es Teh Manis,PROD-002,0987654321,Minuman,8000,3000,cup,50,5,Yes,Yes',
      'Ayam Bakar,PROD-003,,Makanan,35000,20000,pcs,30,5,Yes,Yes',
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([template], { type: 'text/csv' }));
    a.download = 'template-import-produk.csv';
    a.click();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 640, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={22} />
        </button>

        <h2 style={{ marginBottom: 6, fontSize: '1.4rem' }}>Import Produk dari CSV</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
          Upload file CSV untuk mengimpor banyak produk sekaligus
        </p>

        {/* Info */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Kolom yang diperlukan:</strong> Name, Base Price<br />
              <strong>Kolom opsional:</strong> SKU, Barcode, Category, Cost Price, Unit, Stock, Min Stock, Track Inventory, Active
            </div>
          </div>
        </div>

        {/* Download Template */}
        <button onClick={downloadTemplate} className="btn btn-outline" style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Download size={16} /> Download Template CSV
        </button>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 8, padding: 28, textAlign: 'center', cursor: 'pointer',
            background: dragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-tertiary)',
            transition: 'all 0.2s', marginBottom: 16,
          }}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          {file ? (
            <div>
              <FileText size={40} style={{ margin: '0 auto 10px', color: 'var(--success)' }} />
              <p style={{ fontWeight: 600 }}>{file.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={e => { e.stopPropagation(); setFile(null); setPreview([]); }}
                className="btn btn-outline" style={{ marginTop: 10, padding: '4px 12px', fontSize: '0.8rem' }}>
                Ganti File
              </button>
            </div>
          ) : (
            <div>
              <Upload size={40} style={{ margin: '0 auto 10px', color: 'var(--text-tertiary)' }} />
              <p style={{ fontWeight: 600 }}>Drop file CSV di sini atau klik untuk pilih</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Hanya file .csv</p>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle size={14} style={{ color: 'var(--success)' }} /> Preview (5 baris pertama)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    {Object.keys(preview[0]).map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} style={{ padding: '5px 10px', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }} disabled={loading}>Batal</button>
          <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 2 }} disabled={!file || loading}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Mengimpor...</> : 'Import Produk'}
          </button>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}
