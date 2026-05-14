'use client';

import { useRouter } from 'next/navigation';
import { Shirt, ClipboardList, Settings, CalendarDays, ArrowRight } from 'lucide-react';

const LAUNDRY_MENU = [
  {
    href: '/dashboard/laundry/orders',
    icon: Shirt,
    title: 'Laundry Orders',
    desc: 'Kelola pesanan laundry masuk, status proses, dan pengambilan',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  {
    href: '/dashboard/laundry/checklist',
    icon: ClipboardList,
    title: 'Item Checklist',
    desc: 'Catat dan verifikasi item pakaian yang diterima dari customer',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    href: '/dashboard/laundry/service-types',
    icon: Settings,
    title: 'Jenis Layanan',
    desc: 'Atur jenis layanan, harga per kg, dan estimasi waktu selesai',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
  },
  {
    href: '/dashboard/laundry/schedule',
    icon: CalendarDays,
    title: 'Jadwal Pickup & Delivery',
    desc: 'Lihat jadwal antar-jemput laundry berdasarkan tanggal',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
  },
];

export default function LaundryPage() {
  const router = useRouter();

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shirt size={24} style={{ color: 'var(--primary)' }} />
          Laundry
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Kelola semua operasional laundry — pesanan, checklist, layanan, dan jadwal
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        {LAUNDRY_MENU.map(item => {
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
