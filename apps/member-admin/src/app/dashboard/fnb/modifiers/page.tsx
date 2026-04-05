'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, X, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface ModifierOption {
  id: string;
  name: string;
  additional_price: number;
  is_available: boolean;
  sort_order: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  min_selections: number;
  max_selections: number;
  is_active: boolean;
  options?: ModifierOption[];
}

const emptyGroup = { name: '', type: 'single' as 'single' | 'multiple', required: false, min_selections: 1, max_selections: 1, is_active: true };
const emptyOption = { name: '', additional_price: 0, is_available: true, sort_order: 0 };

export default function FnbModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupModal, setGroupModal] = useState<{ open: boolean; editing: ModifierGroup | null }>({ open: false, editing: null });
  const [optionModal, setOptionModal] = useState<{ open: boolean; groupId: string; editing: ModifierOption | null }>({ open: false, groupId: '', editing: null });
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [optionForm, setOptionForm] = useState(emptyOption);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/fnb/modifiers/groups');
      setGroups(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      toast.error('Failed to load modifiers');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openGroupModal = (group?: ModifierGroup) => {
    setGroupForm(group ? { name: group.name, type: group.type, required: group.required, min_selections: group.min_selections, max_selections: group.max_selections, is_active: group.is_active } : emptyGroup);
    setGroupModal({ open: true, editing: group || null });
  };

  const saveGroup = async () => {
    if (!groupForm.name) return;
    setSaving(true);
    try {
      if (groupModal.editing) {
        await apiClient.patch(`/fnb/modifiers/groups/${groupModal.editing.id}`, groupForm);
        toast.success('Modifier group updated');
      } else {
        await apiClient.post('/fnb/modifiers/groups', groupForm);
        toast.success('Modifier group created');
      }
      await loadGroups();
      setGroupModal({ open: false, editing: null });
    } catch { toast.error('Failed to save modifier group'); }
    finally { setSaving(false); }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this modifier group and all its options?')) return;
    try {
      await apiClient.delete(`/fnb/modifiers/groups/${id}`);
      toast.success('Modifier group deleted');
      await loadGroups();
    } catch { toast.error('Failed to delete'); }
  };

  const openOptionModal = (groupId: string, option?: ModifierOption) => {
    setOptionForm(option ? { name: option.name, additional_price: option.additional_price, is_available: option.is_available, sort_order: option.sort_order } : emptyOption);
    setOptionModal({ open: true, groupId, editing: option || null });
  };

  const saveOption = async () => {
    if (!optionForm.name) return;
    setSaving(true);
    try {
      if (optionModal.editing) {
        await apiClient.patch(`/fnb/modifiers/groups/${optionModal.groupId}/options/${optionModal.editing.id}`, optionForm);
        toast.success('Option updated');
      } else {
        await apiClient.post(`/fnb/modifiers/groups/${optionModal.groupId}/options`, optionForm);
        toast.success('Option added');
      }
      await loadGroups();
      setOptionModal({ open: false, groupId: '', editing: null });
    } catch { toast.error('Failed to save option'); }
    finally { setSaving(false); }
  };

  const deleteOption = async (groupId: string, optionId: string) => {
    try {
      await apiClient.delete(`/fnb/modifiers/groups/${groupId}/options/${optionId}`);
      toast.success('Option deleted');
      await loadGroups();
    } catch { toast.error('Failed to delete option'); }
  };

  const formatPrice = (p: number) => p > 0 ? `+Rp ${p.toLocaleString('id-ID')}` : 'Free';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Menu Modifiers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure add-ons and customizations for menu items (size, toppings, etc.)</p>
        </div>
        <button onClick={() => openGroupModal()} className="btn btn-primary">
          <Plus size={16} /> New Modifier Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No modifier groups yet. Create one to start customizing your menu items.</p>
          <button onClick={() => openGroupModal()} className="btn btn-primary"><Plus size={16} /> Create Modifier Group</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {groups.map(group => (
            <div key={group.id} className="glass-panel" style={{ padding: 0, opacity: group.is_active ? 1 : 0.6 }}>
              {/* Group Header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', gap: 'var(--space-md)', cursor: 'pointer' }} onClick={() => toggleExpand(group.id)}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}>
                  {expanded.has(group.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{group.name}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', background: group.type === 'single' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)', color: group.type === 'single' ? 'var(--primary)' : 'var(--success)' }}>
                      {group.type === 'single' ? 'Single choice' : 'Multiple choice'}
                    </span>
                    {group.required && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Required</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {group.options?.length || 0} options
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openOptionModal(group.id)} className="btn btn-outline" style={{ height: 32, padding: '0 10px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Option
                  </button>
                  <button onClick={() => openGroupModal(group)} className="btn btn-outline" style={{ height: 32, padding: '0 10px' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteGroup(group.id)} className="btn btn-outline" style={{ height: 32, padding: '0 10px', color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Options */}
              {expanded.has(group.id) && (
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {!group.options || group.options.length === 0 ? (
                    <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                      No options yet. <button onClick={() => openOptionModal(group.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Add one</button>
                    </div>
                  ) : (
                    group.options.map((opt, idx) => (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-sm) var(--space-lg)', borderBottom: idx < group.options!.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: 'var(--space-md)', opacity: opt.is_available ? 1 : 0.5 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500 }}>{opt.name}</span>
                          <span style={{ marginLeft: 12, fontSize: '0.85rem', color: opt.additional_price > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>
                            {formatPrice(opt.additional_price)}
                          </span>
                          {!opt.is_available && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(unavailable)</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openOptionModal(group.id, opt)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Edit2 size={14} /></button>
                          <button onClick={() => deleteOption(group.id, opt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Group Modal */}
      {groupModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setGroupModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 480, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{groupModal.editing ? 'Edit Modifier Group' : 'New Modifier Group'}</h3>
              <button onClick={() => setGroupModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input className="form-input" value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Size, Toppings, Spice Level" />
            </div>
            <div className="form-group">
              <label className="form-label">Selection Type</label>
              <select className="form-input" value={groupForm.type} onChange={e => setGroupForm(p => ({ ...p, type: e.target.value as any }))}>
                <option value="single">Single choice (pick one)</option>
                <option value="multiple">Multiple choice (pick many)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Min Selections</label>
                <input type="number" className="form-input" value={groupForm.min_selections} onChange={e => setGroupForm(p => ({ ...p, min_selections: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Max Selections</label>
                <input type="number" className="form-input" value={groupForm.max_selections} onChange={e => setGroupForm(p => ({ ...p, max_selections: Number(e.target.value) }))} min="1" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={groupForm.required} onChange={e => setGroupForm(p => ({ ...p, required: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>Required</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={groupForm.is_active} onChange={e => setGroupForm(p => ({ ...p, is_active: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>Active</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button onClick={() => setGroupModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button>
              <button onClick={saveGroup} className="btn btn-primary" disabled={saving || !groupForm.name}>
                {saving ? 'Saving...' : groupModal.editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {optionModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setOptionModal({ open: false, groupId: '', editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 400, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{optionModal.editing ? 'Edit Option' : 'Add Option'}</h3>
              <button onClick={() => setOptionModal({ open: false, groupId: '', editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Option Name *</label>
              <input className="form-input" value={optionForm.name} onChange={e => setOptionForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Large, Extra Cheese" />
            </div>
            <div className="form-group">
              <label className="form-label">Additional Price (IDR)</label>
              <input type="number" className="form-input" value={optionForm.additional_price} onChange={e => setOptionForm(p => ({ ...p, additional_price: Number(e.target.value) }))} min="0" placeholder="0 = free" />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={optionForm.is_available} onChange={e => setOptionForm(p => ({ ...p, is_available: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>Available</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button onClick={() => setOptionModal({ open: false, groupId: '', editing: null })} className="btn btn-outline">Cancel</button>
              <button onClick={saveOption} className="btn btn-primary" disabled={saving || !optionForm.name}>
                {saving ? 'Saving...' : optionModal.editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
