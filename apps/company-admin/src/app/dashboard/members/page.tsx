"use client";

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Edit, Trash2, ShieldCheck, ShieldOff, Mail, Building2, X } from 'lucide-react';
import { api } from '../../../lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  status: 'active' | 'suspended' | 'pending';
  subscription?: { plan?: { name: string } };
  createdAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', businessName: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    try {
      const data: any = await api.get('/admin/companies');
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${member.name}"?`)) return;
    try {
      await api.patch(`/admin/companies/${member.id}/status`, { status: newStatus });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m));
    } catch (err) {
      alert(`Failed to ${action} member`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/companies/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete member');
    }
  };

  const openNewModal = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', phone: '', businessName: '' });
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      businessName: member.businessName || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        await api.patch(`/admin/companies/${editingMember.id}`, formData);
      } else {
        await api.post('/admin/companies', { ...formData, password: 'Monetra@123' });
      }
      await fetchMembers();
      setModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save member');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchQuery || 
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge badge-success">Active</span>;
      case 'suspended': return <span className="badge badge-danger">Suspended</span>;
      case 'pending': return <span className="badge badge-warning">Pending</span>;
      default: return <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{status}</span>;
    }
  };

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    suspended: members.filter(m => m.status === 'suspended').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Member Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage platform members, approve registrations, and control access.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary">
          <Plus size={18} /> Add Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{stats.total}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Total Members</p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{stats.active}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active Members</p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldOff size={18} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{stats.suspended}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Suspended</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search by name, email, or business..." 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {['all', 'active', 'suspended', 'pending'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <Users size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>No members found</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center', margin: '0 auto var(--space-lg)' }}>
              {searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filters.' : 'Start by inviting your first member to the platform.'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button onClick={openNewModal} className="btn btn-outline">Add First Member</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 2 }}>Member</div>
              <div style={{ flex: 1.5 }}>Business</div>
              <div style={{ flex: 1 }}>Subscription</div>
              <div style={{ flex: 0.8 }}>Status</div>
              <div style={{ width: '120px' }}>Actions</div>
            </div>

            {/* Data Rows */}
            {filteredMembers.map(member => (
              <div key={member.id} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}>
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--accent-base), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>
                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{member.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {member.email}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <Building2 size={14} /> {member.businessName || '—'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                    {member.subscription?.plan?.name || 'Free'}
                  </span>
                </div>
                <div style={{ flex: 0.8 }}>
                  {statusBadge(member.status || 'active')}
                </div>
                <div style={{ display: 'flex', width: '120px', gap: '6px' }}>
                  <button onClick={() => openEditModal(member)} className="btn btn-outline" style={{ padding: '6px' }} title="Edit">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleToggleStatus(member)} className="btn btn-outline" style={{ padding: '6px', color: member.status === 'active' ? 'var(--warning)' : 'var(--success)' }} title={member.status === 'active' ? 'Suspend' : 'Activate'}>
                    {member.status === 'active' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  </button>
                  <button onClick={() => handleDelete(member.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '500px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingMember ? 'Edit Member' : 'Add New Member'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" placeholder="john@business.com" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="+62 812..." value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input className="form-input" placeholder="My Restaurant" value={formData.businessName} onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !formData.name || !formData.email}>
                {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
