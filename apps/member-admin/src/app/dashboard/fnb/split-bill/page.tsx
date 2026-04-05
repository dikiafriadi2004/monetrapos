'use client';

import { useState } from 'react';
import { Search, SplitSquareHorizontal, Users, DollarSign, Loader2, Plus, Trash2, Receipt } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface SplitResult {
  label: string;
  items?: TransactionItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  amount?: number;
}

interface TransactionLoadResponse {
  items: TransactionItem[];
  total: number;
  transactionNumber?: string;
}

interface SplitApiResponse {
  splits?: SplitResult[];
  data?: SplitResult[];
}

export default function SplitBillPage() {
  const [transactionId, setTransactionId] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<'items' | 'amount'>('items');
  const [splits, setSplits] = useState<Array<{ label: string; item_ids?: string[]; amount?: number }>>([
    { label: 'Person 1', item_ids: [] },
    { label: 'Person 2', item_ids: [] },
  ]);
  const [result, setResult] = useState<SplitResult[] | null>(null);
  const [calculating, setCalculating] = useState(false);

  const loadTransaction = async () => {
    if (!transactionId.trim()) { toast.error('Enter a transaction ID'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.get<{ data: TransactionLoadResponse }>(`/fnb/split-bill/transactions/${transactionId}/items`);
      const data = (res as any).data as TransactionLoadResponse;
      setItems(data?.items || []);
      setOriginalTotal(data?.total || 0);
      setTransactionNumber(data?.transactionNumber || transactionId);
      setSplits([{ label: 'Person 1', item_ids: [] }, { label: 'Person 2', item_ids: [] }]);
      toast.success('Transaction loaded');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Transaction not found');
    } finally {
      setLoading(false);
    }
  };

  const addSplit = () => {
    setSplits(prev => [...prev, { label: `Person ${prev.length + 1}`, item_ids: [], amount: 0 }]);
  };

  const removeSplit = (idx: number) => {
    if (splits.length <= 2) { toast.error('Minimum 2 splits'); return; }
    setSplits(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleItemInSplit = (splitIdx: number, itemId: string) => {
    setSplits(prev => prev.map((s, i) => {
      if (i !== splitIdx) return s;
      const ids = s.item_ids || [];
      return { ...s, item_ids: ids.includes(itemId) ? ids.filter(id => id !== itemId) : [...ids, itemId] };
    }));
  };

  const calculate = async () => {
    if (!transactionId) { toast.error('Load a transaction first'); return; }
    setCalculating(true);
    try {
      if (splitMode === 'items') {
        const allAssigned = items.every(item => splits.some(s => s.item_ids?.includes(item.id)));
        if (!allAssigned) { toast.error('All items must be assigned to a split'); setCalculating(false); return; }
        const res = await apiClient.post(`/fnb/split-bill/transactions/${transactionId}/by-items`, { splits: splits.map(s => ({ label: s.label, item_ids: s.item_ids })) });
        setResult((res as any).data?.splits || (res as any).data);
      } else {
        const totalAssigned = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
        if (Math.abs(totalAssigned - originalTotal) > 1) { toast.error(`Total must equal Rp ${originalTotal.toLocaleString('id-ID')}`); setCalculating(false); return; }
        const res = await apiClient.post(`/fnb/split-bill/transactions/${transactionId}/by-amount`, { splits: splits.map(s => ({ label: s.label, amount: s.amount || 0 })) });
        setResult((res as any).data?.splits || (res as any).data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to calculate split');
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Split Bill</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Split a transaction between multiple people</p>
      </div>

      {/* Load Transaction */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Load Transaction</h3>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter Transaction ID..."
            value={transactionId}
            onChange={e => setTransactionId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadTransaction()}
          />
          <button onClick={loadTransaction} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            Load
          </button>
        </div>
        {transactionNumber && (
          <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Transaction: <strong>{transactionNumber}</strong> — Total: <strong style={{ color: 'var(--success)' }}>{formatCurrency(originalTotal)}</strong>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <>
          {/* Split Mode */}
          <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                { key: 'items', label: 'Split by Items', icon: SplitSquareHorizontal },
                { key: 'amount', label: 'Split by Amount', icon: DollarSign },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { setSplitMode(key as any); setResult(null); }} style={{
                  flex: 1, padding: 'var(--space-md)', background: splitMode === key ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: 'none', borderBottom: splitMode === key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: splitMode === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Splits Configuration */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Configure Splits ({splits.length} people)</h3>
              <button onClick={addSplit} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.85rem' }}>
                <Plus size={14} /> Add Person
              </button>
            </div>

            {splitMode === 'items' ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(splits.length, 3)}, 1fr)`, gap: 'var(--space-md)' }}>
                {splits.map((split, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                      <input
                        className="form-input"
                        style={{ flex: 1, height: 32, fontSize: '0.9rem' }}
                        value={split.label}
                        onChange={e => setSplits(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                      />
                      <button onClick={() => removeSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', marginLeft: 8 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>Select items:</div>
                    {items.map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={split.item_ids?.includes(item.id) || false} onChange={() => toggleItemInSplit(idx, item.id)} />
                        <span style={{ flex: 1 }}>{item.name} x{item.quantity}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(item.subtotal)}</span>
                      </label>
                    ))}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {formatCurrency(items.filter(i => split.item_ids?.includes(i.id)).reduce((sum, i) => sum + i.subtotal, 0))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {splits.map((split, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <input className="form-input" style={{ flex: 1, height: 36 }} value={split.label} onChange={e => setSplits(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))} />
                    <input type="number" className="form-input" style={{ width: 160, height: 36 }} value={split.amount || ''} onChange={e => setSplits(prev => prev.map((s, i) => i === idx ? { ...s, amount: Number(e.target.value) } : s))} placeholder="Amount (IDR)" min="0" />
                    <button onClick={() => removeSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                  </div>
                ))}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Assigned: {formatCurrency(splits.reduce((sum, s) => sum + (s.amount || 0), 0))} / {formatCurrency(originalTotal)}
                </div>
              </div>
            )}

            <button onClick={calculate} disabled={calculating} className="btn btn-primary" style={{ marginTop: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {calculating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Receipt size={16} />}
              Calculate Split
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Split Result</h3>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(result.length, 3)}, 1fr)`, gap: 'var(--space-md)' }}>
                {result.map((split, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-sm)', color: 'var(--primary)' }}>{split.label}</div>
                    {split.items && split.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                        <span>Total</span>
                        <span>{formatCurrency(split.total || split.amount || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
