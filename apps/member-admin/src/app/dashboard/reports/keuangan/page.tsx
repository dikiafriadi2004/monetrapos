'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Download, RefreshCcw, BarChart3 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface BulanData {
  bulan: number;
  namaBulan: string;
  tahun: number;
  periode: string;
  totalTransaksi: number;
  pendapatanKotor: number;
  totalDiskon: number;
  totalPajak: number;
  pendapatanBersih: number;
  hpp: number;
  labaKotor: number;
  biayaOperasional: number;
  labaBersih: number;
  marginLabaKotor: number;
  marginLabaBersih: number;
}

interface LaporanKeuangan {
  tahun: number;
  bulanTerbaik: BulanData | null;
  ringkasanTahunan: BulanData & { marginLabaKotor: number; marginLabaBersih: number };
  perBulan: BulanData[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}Rb`;
  return `Rp ${n}`;
};

export default function LaporanKeuanganPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<LaporanKeuangan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/reports/advanced/monthly-finance?year=${year}`);
      setData(res.data);
    } catch (err: any) {
      toast.error('Gagal memuat laporan keuangan');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = [
      'Bulan', 'Total Transaksi', 'Pendapatan Kotor', 'Total Diskon',
      'Total Pajak', 'Pendapatan Bersih', 'HPP', 'Laba Kotor',
      'Biaya Operasional', 'Laba Bersih', 'Margin Laba Kotor (%)', 'Margin Laba Bersih (%)',
    ];
    const rows = data.perBulan.map(m => [
      m.periode, m.totalTransaksi, m.pendapatanKotor, m.totalDiskon,
      m.totalPajak, m.pendapatanBersih, m.hpp, m.labaKotor,
      m.biayaOperasional, m.labaBersih, m.marginLabaKotor, m.marginLabaBersih,
    ]);
    // Add total row
    const t = data.ringkasanTahunan;
    rows.push([
      `TOTAL ${year}`, t.totalTransaksi, t.pendapatanKotor, t.totalDiskon,
      t.totalPajak, t.pendapatanBersih, t.hpp, t.labaKotor,
      t.biayaOperasional, t.labaBersih, t.marginLabaKotor, t.marginLabaBersih,
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Laporan berhasil diunduh');
  };

  const maxPendapatan = data
    ? Math.max(...data.perBulan.map(m => m.pendapatanBersih), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-indigo-600" />
            Laporan Keuangan Bulanan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pendapatan kotor, bersih, HPP, dan keuntungan per bulan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="form-input text-sm py-1.5"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={fetchData} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="btn btn-primary btn-sm" disabled={!data}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Ringkasan Tahunan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Pendapatan Kotor',
                value: fmtShort(data.ringkasanTahunan.pendapatanKotor),
                sub: `${data.ringkasanTahunan.totalTransaksi} transaksi`,
                icon: DollarSign,
                color: 'blue',
              },
              {
                label: 'Pendapatan Bersih',
                value: fmtShort(data.ringkasanTahunan.pendapatanBersih),
                sub: `Diskon: ${fmtShort(data.ringkasanTahunan.totalDiskon)}`,
                icon: TrendingUp,
                color: 'green',
              },
              {
                label: 'Laba Kotor',
                value: fmtShort(data.ringkasanTahunan.labaKotor),
                sub: `Margin: ${data.ringkasanTahunan.marginLabaKotor.toFixed(1)}%`,
                icon: TrendingUp,
                color: 'indigo',
              },
              {
                label: 'Laba Bersih',
                value: fmtShort(data.ringkasanTahunan.labaBersih),
                sub: `Margin: ${data.ringkasanTahunan.marginLabaBersih.toFixed(1)}%`,
                icon: data.ringkasanTahunan.labaBersih >= 0 ? TrendingUp : TrendingDown,
                color: data.ringkasanTahunan.labaBersih >= 0 ? 'green' : 'red',
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div className={`stat-icon bg-${color}-100`}>
                  <Icon size={20} className={`text-${color}-600`} />
                </div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
                <div className="stat-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* Bulan Terbaik */}
          {data.bulanTerbaik && data.bulanTerbaik.labaBersih > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 4 }}>🏆 Bulan Terbaik {year}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.bulanTerbaik.namaBulan} {year}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {data.bulanTerbaik.totalTransaksi} transaksi · Margin {data.bulanTerbaik.marginLabaBersih.toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Laba Bersih</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{fmtShort(data.bulanTerbaik.labaBersih)}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Pendapatan: {fmtShort(data.bulanTerbaik.pendapatanBersih)}
                </div>
              </div>
            </div>
          )}

          {/* Chart Pendapatan, Biaya & Laba */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Grafik Pendapatan, Biaya & Laba {year}</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 8px' }}>
                {data.perBulan.map((m) => {
                  const heightPendapatan = maxPendapatan > 0 ? (m.pendapatanBersih / maxPendapatan) * 140 : 0;
                  const heightBiaya = maxPendapatan > 0 ? ((m.hpp + m.biayaOperasional) / maxPendapatan) * 140 : 0;
                  const heightLaba = maxPendapatan > 0 ? (Math.max(0, m.labaBersih) / maxPendapatan) * 140 : 0;
                  return (
                    <div key={m.bulan} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 140 }}>
                        <div
                          title={`Pendapatan: ${fmt(m.pendapatanBersih)}`}
                          style={{ width: 10, height: Math.max(2, heightPendapatan), background: '#6366f1', borderRadius: '2px 2px 0 0', opacity: m.totalTransaksi === 0 ? 0.2 : 1 }}
                        />
                        <div
                          title={`Biaya (HPP+Ops): ${fmt(m.hpp + m.biayaOperasional)}`}
                          style={{ width: 10, height: Math.max(2, heightBiaya), background: '#f59e0b', borderRadius: '2px 2px 0 0', opacity: m.totalTransaksi === 0 ? 0.2 : 1 }}
                        />
                        <div
                          title={`Laba Bersih: ${fmt(m.labaBersih)}`}
                          style={{ width: 10, height: Math.max(2, heightLaba), background: m.labaBersih >= 0 ? '#10b981' : '#ef4444', borderRadius: '2px 2px 0 0', opacity: m.totalTransaksi === 0 ? 0.2 : 1 }}
                        />
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#9ca3af' }}>
                        {m.namaBulan.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.75rem', color: '#6b7280', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#6366f1', borderRadius: 2 }} />
                  Pendapatan Bersih
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} />
                  Total Biaya (HPP + Ops)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} />
                  Laba Bersih
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Detail Per Bulan */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Detail Per Bulan {year}</h3>
            </div>
            <div className="table-container rounded-none rounded-b-xl border-0 border-t border-gray-100">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th className="text-right">Transaksi</th>
                    <th className="text-right">Pendapatan Kotor</th>
                    <th className="text-right">Diskon</th>
                    <th className="text-right">Pendapatan Bersih</th>
                    <th className="text-right">HPP</th>
                    <th className="text-right">Laba Kotor</th>
                    <th className="text-right">Laba Bersih</th>
                    <th className="text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perBulan.map((m) => (
                    <tr key={m.bulan} style={{ opacity: m.totalTransaksi === 0 ? 0.5 : 1 }}>
                      <td className="font-medium">{m.namaBulan}</td>
                      <td className="text-right text-gray-600">{m.totalTransaksi.toLocaleString('id-ID')}</td>
                      <td className="text-right">{fmtShort(m.pendapatanKotor)}</td>
                      <td className="text-right text-red-500">
                        {m.totalDiskon > 0 ? `-${fmtShort(m.totalDiskon)}` : '-'}
                      </td>
                      <td className="text-right font-medium">{fmtShort(m.pendapatanBersih)}</td>
                      <td className="text-right text-gray-500">{fmtShort(m.hpp)}</td>
                      <td className="text-right text-indigo-600">{fmtShort(m.labaKotor)}</td>
                      <td className="text-right">
                        <span style={{ color: m.labaBersih >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {fmtShort(m.labaBersih)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: m.marginLabaBersih >= 20 ? '#d1fae5' : m.marginLabaBersih >= 10 ? '#fef9c3' : '#fee2e2',
                          color: m.marginLabaBersih >= 20 ? '#065f46' : m.marginLabaBersih >= 10 ? '#854d0e' : '#991b1b',
                        }}>
                          {m.marginLabaBersih.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                    <td>TOTAL {year}</td>
                    <td className="text-right">{data.ringkasanTahunan.totalTransaksi.toLocaleString('id-ID')}</td>
                    <td className="text-right">{fmtShort(data.ringkasanTahunan.pendapatanKotor)}</td>
                    <td className="text-right text-red-500">
                      {data.ringkasanTahunan.totalDiskon > 0 ? `-${fmtShort(data.ringkasanTahunan.totalDiskon)}` : '-'}
                    </td>
                    <td className="text-right">{fmtShort(data.ringkasanTahunan.pendapatanBersih)}</td>
                    <td className="text-right text-gray-500">{fmtShort(data.ringkasanTahunan.hpp)}</td>
                    <td className="text-right text-indigo-600">{fmtShort(data.ringkasanTahunan.labaKotor)}</td>
                    <td className="text-right">
                      <span style={{ color: data.ringkasanTahunan.labaBersih >= 0 ? '#10b981' : '#ef4444' }}>
                        {fmtShort(data.ringkasanTahunan.labaBersih)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#e0e7ff',
                        color: '#3730a3',
                      }}>
                        {data.ringkasanTahunan.marginLabaBersih.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Penjelasan Komponen */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📖 Keterangan Komponen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              {[
                { term: 'Pendapatan Kotor', def: 'Total nilai transaksi sebelum dikurangi diskon' },
                { term: 'Pendapatan Bersih', def: 'Pendapatan Kotor dikurangi total diskon yang diberikan' },
                { term: 'HPP (Harga Pokok Penjualan)', def: 'Estimasi biaya modal produk yang terjual (60% dari harga jual jika tidak ada data cost)' },
                { term: 'Laba Kotor', def: 'Pendapatan Bersih dikurangi HPP' },
                { term: 'Biaya Operasional', def: 'Estimasi 10% dari pendapatan bersih (sewa, listrik, gaji, dll)' },
                { term: 'Laba Bersih', def: 'Laba Kotor dikurangi Biaya Operasional' },
                { term: 'Margin Laba Bersih', def: 'Persentase laba bersih terhadap pendapatan bersih' },
              ].map(({ term, def }) => (
                <div key={term} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#374151', minWidth: 200 }}>{term}:</span>
                  <span>{def}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * HPP dan Biaya Operasional adalah estimasi. Untuk akurasi lebih tinggi, masukkan harga modal produk di menu Produk.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
