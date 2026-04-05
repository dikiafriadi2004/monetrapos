"use client";

import { useState, useEffect } from 'react';
import { Key, Shield, Users, ChevronDown, ChevronRight, Search, RefreshCcw } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
}

interface PermissionGroup {
  category: string;
  permissions: Permission[];
}

const CATEGORY_LABELS: Record<string, string> = {
  POS: '🛒 Point of Sale',
  Products: '📦 Produk & Kategori',
  Inventory: '🏭 Inventori',
  Employees: '👥 Karyawan',
  Finance: '💰 Keuangan & Laporan',
  Stores: '🏪 Toko',
  Settings: '⚙️ Pengaturan',
  Customers: '👤 Pelanggan',
  Kitchen: '🍳 Dapur (FnB)',
  Laundry: '👕 Laundry',
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['POS', 'Products']));

  useEffect(() => { fetchPermissions(); }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/roles/permissions');
      setPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      toast.error('Gagal memuat permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filtered = permissions.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const groups: PermissionGroup[] = Object.entries(
    filtered.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {} as Record<string, Permission[]>)
  ).map(([category, perms]) => ({ category, permissions: perms }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Key size={24} color="var(--accent-base)" /> Permission Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Daftar semua permission yang tersedia untuk role karyawan member.
            Owner dapat mengatur permission karyawannya di menu Roles & Permissions di Member Admin.
          </p>
        </div>
        <button onClick={fetchPermissions} className="btn btn-outline">
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Shield size={20} style={{ color: 'var(--accent-base)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Cara Kerja Permission System</div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: 16, margin: 0 }}>
              <li><strong>Owner</strong> — memiliki semua permission secara otomatis</li>
              <li><strong>Karyawan</strong> — permission diatur oleh owner via menu Roles di Member Admin</li>
              <li><strong>Super Admin</strong> — akses penuh ke semua fitur platform</li>
            </ul>
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              Owner dapat membuat role custom (Kasir, Manager, dll) dan assign permission di:
              <strong> Member Admin → Settings → Roles & Permissions</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Permissions', value: permissions.length, color: 'var(--accent-base)' },
          { label: 'Kategori', value: groups.length, color: 'var(--success)' },
          { label: 'Tersedia untuk Role', value: 'Unlimited', color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-lg)' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Cari permission..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Permission Groups */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading permissions...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {groups.map(group => (
            <div key={group.category} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.category)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-secondary)',
                  border: 'none', cursor: 'pointer', borderBottom: expanded.has(group.category) ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {CATEGORY_LABELS[group.category] || group.category}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-base)', fontWeight: 600 }}>
                    {group.permissions.length} permissions
                  </span>
                </div>
                {expanded.has(group.category) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {/* Permissions List */}
              {expanded.has(group.category) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 0 }}>
                  {group.permissions.map((perm, i) => (
                    <div
                      key={perm.id}
                      style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderBottom: '1px solid var(--border-subtle)',
                        borderRight: i % 2 === 0 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, marginTop: 6 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{perm.name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-base)', marginTop: 2 }}>{perm.code}</div>
                          {perm.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{perm.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
