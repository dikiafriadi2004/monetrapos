"use client";

import { useEffect, useRef, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatRupiah } from '@/lib/date';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Array<{ id: string; name: string; sku?: string; barcode?: string; price?: number }>;
}

// Simple Code128-like barcode renderer using canvas
function drawBarcode(canvas: HTMLCanvasElement, text: string, label: string, price: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);

  // Draw simple barcode pattern (visual representation)
  const barZone = { x: 8, y: 8, w: W - 16, h: H - 36 };
  const chars = text.split('').map(c => c.charCodeAt(0));
  const totalBars = chars.reduce((s, c) => s + (c % 7) + 3, 0) + 20;
  let x = barZone.x;
  const barW = barZone.w / totalBars;

  ctx.fillStyle = '#000';
  // Start bars
  for (let i = 0; i < 3; i++) {
    if (i % 2 === 0) ctx.fillRect(x, barZone.y, barW, barZone.h);
    x += barW;
  }
  // Data bars
  chars.forEach(code => {
    const bars = (code % 7) + 3;
    for (let i = 0; i < bars; i++) {
      if (i % 2 === 0) ctx.fillRect(x, barZone.y, barW * 0.9, barZone.h);
      x += barW;
    }
    x += barW * 0.5; // gap between chars
  });
  // End bars
  for (let i = 0; i < 3; i++) {
    if (i % 2 === 0) ctx.fillRect(x, barZone.y, barW, barZone.h);
    x += barW;
  }

  // Text below barcode
  ctx.fillStyle = '#000';
  ctx.font = `bold 9px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H - 22);

  // Product name
  ctx.font = `8px sans-serif`;
  const maxLen = 22;
  const displayName = label.length > maxLen ? label.substring(0, maxLen) + '…' : label;
  ctx.fillText(displayName, W / 2, H - 12);

  // Price
  if (price > 0) {
    ctx.font = `bold 8px sans-serif`;
    ctx.fillText(`Rp ${formatRupiah(price)}`, W / 2, H - 2);
  }
}

export function BarcodePrintModal({ isOpen, onClose, products }: BarcodePrintModalProps) {
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const sizeMap = { small: { w: 120, h: 60 }, medium: { w: 160, h: 80 }, large: { w: 200, h: 100 } };

  useEffect(() => {
    if (!isOpen) return;
    // Draw barcodes after render
    setTimeout(() => {
      products.forEach(p => {
        const canvas = canvasRefs.current.get(p.id);
        if (canvas) {
          const code = p.barcode || p.sku || p.id.slice(0, 12);
          drawBarcode(canvas, code, p.name, p.price || 0);
        }
      });
    }, 100);
  }, [isOpen, products, labelSize]);

  const handlePrint = () => {
    const { w, h } = sizeMap[labelSize];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = products.flatMap(p => {
      const canvas = canvasRefs.current.get(p.id);
      const dataUrl = canvas?.toDataURL('image/png') || '';
      return Array.from({ length: copies }, () =>
        `<div class="label"><img src="${dataUrl}" width="${w}" height="${h}" /></div>`
      );
    }).join('');

    printWindow.document.write(`
      <html><head><title>Print Barcode Labels</title>
      <style>
        body { margin: 0; padding: 8px; }
        .grid { display: flex; flex-wrap: wrap; gap: 4px; }
        .label { border: 1px solid #ddd; display: inline-block; }
        @media print { body { padding: 0; } .label { border: none; } }
      </style></head>
      <body><div class="grid">${labelsHtml}</div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    products.forEach(p => {
      const canvas = canvasRefs.current.get(p.id);
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `barcode-${p.sku || p.id.slice(0, 8)}.png`;
      a.click();
    });
  };

  if (!isOpen) return null;

  const { w, h } = sizeMap[labelSize];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 600, padding: 24, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={22} />
        </button>

        <h2 style={{ marginBottom: 4, fontSize: '1.3rem' }}>Print Label Barcode</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
          {products.length} produk dipilih
        </p>

        {/* Settings */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 120 }}>
            <label className="form-label">Ukuran Label</label>
            <select className="form-input" value={labelSize} onChange={e => setLabelSize(e.target.value as any)}>
              <option value="small">Kecil (120×60)</option>
              <option value="medium">Sedang (160×80)</option>
              <option value="large">Besar (200×100)</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 100 }}>
            <label className="form-label">Jumlah Salinan</label>
            <input type="number" className="form-input" min={1} max={10} value={copies}
              onChange={e => setCopies(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
          </div>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>Preview:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {products.map(p => (
              <div key={p.id} style={{ border: '1px solid #ddd', background: 'white', borderRadius: 4 }}>
                <canvas
                  ref={el => { if (el) canvasRefs.current.set(p.id, el); }}
                  width={w} height={h}
                  style={{ display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
          <button onClick={handleDownload} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Download size={15} /> Download PNG
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Printer size={15} /> Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
