'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, DollarSign, RefreshCcw, Download } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'sewa', label: '🏠 Sewa' },
  { value: 'listrik', label: '⚡ Listrik' },
  { value: 'air', label: '💧 Air' },
  { value: 'gaji', label: '👥 Gaji Karyawan' },
  { value: 'bahan_baku', label: '📦 Bahan Baku' },
  { value: 'peralatan', label: '🔧 Peralatan' },
  { value: 'marketing', label: '📢 Marketing' },
  { value: 'transportasi', label: '🚗 Transportasi' },
  { value: 'pajak', label: '📋 Pajak' },
  { value: 'lainnya', label: '📌 Lainnya' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const EMPTY_FORM = {
  category: 'lainnya',
  description: '',
  amount: '',
  expenseDate: format(new Date(), 'yyyy-MM-dd'),
  referenceNumber: '',
  notes: '',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchExpenses();
  }, [filterMonth]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [year, month] = filterMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;
      const res = await apiClient.get(`/expenses?startDate=${startDate}&endDate=${endDate}`);
      setExpenses(res.data.data || []);
      setTotalAmount(res.data.totalAmount || 0);
    } catch {
      toast.error('Gagal memuat data biaya');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.expenseDate) {
      toast.error('Isi semua field yang wajib');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
      };
      if (editId) {
        await apiClient.patch(`/expenses/${editId}`, payload);
        toast.success('Biaya berhasil diupdate');
      } else {
        await apiClient.post('/expenses', payload);
        toast.success('Biaya berhasil ditambahkan');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchExpenses();
    } catch {
      toast.error('Gagal menyimpan biaya');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setForm({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.split('T')[0],
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
    });
    setEditId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus biaya ini?')) return;
    try {
      await apiClient.delete(`/expenses/${id}`);
      toast.success('Biaya dihapus');
      fetchExpenses();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const exportCSV = () => {
    const headers = ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'No. Referensi', 'Catatan'];
    const rows = expenses.map(e => [
      e.expenseDate.split('T')[0],
      CATEGORIES.find(c => c.value === e.category)?.label || e.category,
      e.description,
      e.amount,
      e.referenceNumber || '',
      e.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biaya-operasional-${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group by category
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={28} className="text-red-500" />
            Biaya Operasional
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catat semua pengeluaran bisnis untuk laporan keuangan yang akurat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="form-input text-sm py-1.5"
          />
          <button onClick={fetchExpenses} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="btn btn-outline btn-sm" disabled={!expenses.length}>
            <Download size={14} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            Tambah Biaya
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card col-span-2 lg:col-span-1">
          <div className="stat-icon bg-red-100">
            <DollarSign size={20} className="text-red-600" />
          </div>
          <div className="stat-value">{fmt(totalAmount)}</div>
          <div className="stat-label">Total Biaya Bulan Ini</div>
          <div className="stat-sub">{expenses.length} transaksi</div>
        </div>
        {Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amount]) => (
            <div key={cat} className="stat-card">
              <div className="stat-value text-lg">{fmt(amount)}</div>
              <div className="stat-label">{CATEGORIES.find(c => c.value === cat)?.label || cat}</div>
              <div className="stat-sub">{((amount / totalAmount) * 100).toFixed(1)}% dari total</div>
            </div>
          ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">
                {editId ? 'Edit Biaya' : 'Tambah Biaya Operasional'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Kategori *</label>
                    <select
                      className="form-input"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.expenseDate}
                      onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Bayar listrik bulan April"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Jumlah (Rp) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="500000"
                      min="0"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Referensi</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="INV-001 (opsional)"
                      value={form.referenceNumber}
                      onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Catatan tambahan (opsional)"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditId(null); }}
                    className="btn btn-outline"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Menyimpan...' : editId ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-700">
            Daftar Biaya — {format(new Date(filterMonth + '-01'), 'MMMM yyyy', { locale: id })}
          </h3>
          <span className="text-sm font-bold text-red-600">{fmt(totalAmount)}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Belum ada biaya bulan ini</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary btn-sm mt-3"
            >
              <Plus size={14} /> Tambah Biaya
            </button>
          </div>
        ) : (
          <div className="table-container rounded-none rounded-b-xl border-0 border-t border-gray-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Deskripsi</th>
                  <th className="text-right">Jumlah</th>
                  <th>Referensi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="text-gray-500 text-sm">
                      {format(new Date(e.expenseDate), 'dd MMM', { locale: id })}
                    </td>
                    <td>
                      <span className="badge badge-gray text-xs">
                        {CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                      </span>
                    </td>
                    <td className="font-medium">{e.description}</td>
                    <td className="text-right font-semibold text-red-600">{fmt(Number(e.amount))}</td>
                    <td className="text-gray-400 text-sm">{e.referenceNumber || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(e)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3}>Total</td>
                  <td className="text-right text-red-600">{fmt(totalAmount)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
