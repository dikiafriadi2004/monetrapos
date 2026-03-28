"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { api } from '../../../lib/api';

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBilling(); }, []);

  const fetchBilling = async () => {
    try {
      // Simulate fetching billing data
      // In production this calls /subscriptions/my and /invoices
      setSubscription({
        plan: 'Premium',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        price: 299000,
        features: ['Unlimited Products', 'Multi-Store', 'KDS Access', 'Priority Support', 'Advanced Reports']
      });
      setInvoices([
        { id: 'INV-2026-001', date: '2026-01-01', amount: 299000, status: 'PAID', method: 'Bank Transfer' },
        { id: 'INV-2026-002', date: '2026-02-01', amount: 299000, status: 'PAID', method: 'QRIS' },
        { id: 'INV-2026-003', date: '2026-03-01', amount: 299000, status: 'PAID', method: 'Virtual Account' },
        { id: 'INV-2026-004', date: '2026-04-01', amount: 299000, status: 'PENDING', method: '-' },
      ]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading billing...</div>;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Billing & Subscription</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active plan, view invoices, and payment history.</p>
        </div>
      </div>

      {/* Active Plan Card */}
      {subscription && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(56, 189, 248, 0.05))', borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-md)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{subscription.plan} Plan</h2>
                  <span className="badge badge-success">
                    <CheckCircle size={12} style={{ marginRight: '4px' }} /> {subscription.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xl)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Started: {new Date(subscription.startDate).toLocaleDateString()}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Renews: {new Date(subscription.endDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Monthly Fee</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>Rp {subscription.price.toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Plan Features */}
          <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {subscription.features.map((f: string) => (
              <span key={f} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px' }}>
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} color="var(--text-tertiary)" /> Invoice History
      </h2>
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
          <div>Invoice #</div><div>Date</div><div>Amount</div><div>Method</div><div style={{ textAlign: 'right' }}>Status</div>
        </div>
        {invoices.map(inv => (
          <div key={inv.id} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{inv.id}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{new Date(inv.date).toLocaleDateString()}</div>
            <div style={{ fontWeight: 500 }}>Rp {inv.amount.toLocaleString('id-ID')}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{inv.method}</div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                {inv.status === 'PAID' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <AlertCircle size={12} style={{ marginRight: '4px' }} />}
                {inv.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Notice for Pending */}
      {invoices.some(i => i.status === 'PENDING') && (
        <div className="glass-panel" style={{ marginTop: 'var(--space-lg)', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'var(--warning)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-sm)', color: 'var(--warning)' }}>
            <AlertCircle size={18} /> Payment Instructions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>
            To pay your pending invoice, please transfer to the following virtual account:
          </p>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            <div>Bank: BCA Virtual Account</div>
            <div>VA Number: <strong>8800 1234 5678 9012</strong></div>
            <div>Amount: <strong>Rp 299.000</strong></div>
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Your subscription will be auto-activated upon successful payment confirmation.</div>
          </div>
        </div>
      )}
    </div>
  );
}
