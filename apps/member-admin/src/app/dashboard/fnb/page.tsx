'use client';

import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Grid3x3, ChefHat, Sliders, SplitSquareHorizontal, ArrowRight } from 'lucide-react';

const FNB_MENU = [
  {
    href: '/dashboard/fnb/orders',
    icon: UtensilsCrossed,
    title: 'FnB Orders',
    desc: 'Kelola pesanan masuk, status masak, dan riwayat order',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    href: '/dashboard/fnb/tables',
    icon: Grid3x3,
    title: 'Manajemen Meja',
    desc: 'Atur layout meja, status tersedia/terisi, dan reservasi',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  {
    href: '/dashboard/kds',
    icon: ChefHat,
    title: 'Kitchen Display (KDS)',
    desc: 'Tampilan dapur real-time untuk tim masak',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    href: '/dashboard/fnb/modifiers',
    icon: Sliders,
    title: 'Modifiers',
    desc: 'Kelola pilihan tambahan menu (level pedas, topping, dll)',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
  },
  {
    href: '/dashboard/fnb/split-bill',
    icon: SplitSquareHorizontal,
    title: 'Split Bill',
    desc: 'Bagi tagihan ke beberapa orang per item atau nominal',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
  },
];

export default function FnBPage() {
  const router = useRouter();

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UtensilsCrossed size={24} style={{ color: 'var(--primary)' }} />
          Food & Beverage
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Kelola semua operasional restoran — pesanan, meja, dapur, dan tagihan
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        {FNB_MENU.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.href}
              className="glass-panel animate-fade-in"
              onClick={() => router.push(item.href)}
              style={{
                padding: 'var(--space-lg)',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: item.bg, color: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={24} />
                </div>
                <ArrowRight size={18} style={{ color: 'var(--text-tertiary)', marginTop: 4 }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
