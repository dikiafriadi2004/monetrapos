"use client";

import { useState, useEffect } from 'react';
import { Users, ShieldAlert, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { RoleFormModal } from './components/RoleFormModal';
import { EmployeeFormModal } from './components/EmployeeFormModal';

export default function EmployeesRolesPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  const [isEmpModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, empData]: any = await Promise.all([
        api.get('/roles'),
        api.get('/employees')
      ]);
      setRoles(rolesData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Roles
  const handleSaveRole = async (data: any) => {
    if (editingRole) await api.patch(`/roles/${editingRole.id}`, data);
    else await api.post('/roles', data);
    await fetchData();
  };

  const handleDeleteRole = async (id: string) => {
    if (confirm('Delete this role? This cannot be undone.')) {
      await api.delete(`/roles/${id}`);
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  // Handlers for Employees
  const handleSaveEmployee = async (data: any) => {
    if (editingEmp) await api.patch(`/employees/${editingEmp.id}`, data);
    else await api.post('/employees', data);
    await fetchData();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Remove this employee? They will instantly lose access.')) {
      await api.delete(`/employees/${id}`);
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Team & Permissions</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure granular roles and manage store staff.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button 
            onClick={() => { setEditingRole(null); setRoleModalOpen(true); }}
            className="btn btn-outline"
          >
            <ShieldAlert size={16} style={{ marginRight: '6px' }} /> New Role
          </button>
          <button 
            onClick={() => { setEditingEmp(null); setEmpModalOpen(true); }}
            className="btn btn-primary" style={{ background: 'var(--success)' }}
          >
            <Users size={16} style={{ marginRight: '6px' }} /> Invite Staff
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => setActiveTab('employees')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'employees' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'employees' ? '2px solid var(--success)' : '2px solid transparent'
          }}
        >
          Staff Members ({employees.length})
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'roles' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'roles' ? '2px solid var(--success)' : '2px solid transparent'
          }}
        >
          Access Roles ({roles.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading data...</div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          
          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                <div style={{ flex: 2 }}>Employee</div>
                <div style={{ flex: 1 }}>Role</div>
                <div style={{ flex: 1 }}>Status</div>
                <div style={{ width: '80px' }}>Actions</div>
              </div>
              
              {employees.length === 0 && (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No staff members invited yet.</div>
              )}
              
              {employees.map(emp => (
                <div key={emp.id} className="flex-between animate-fade-in" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontWeight: 500 }}>{emp.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{emp.email}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="badge badge-success" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {emp.role?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <div style={{ display: 'flex', width: '80px', gap: '8px' }}>
                    <button onClick={() => { setEditingEmp(emp); setEmpModalOpen(true); }} className="btn btn-outline" style={{ padding: '6px' }}><Edit size={14}/></button>
                    <button onClick={() => handleDeleteEmployee(emp.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ROLES TAB */}
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                <div style={{ flex: 1 }}>Role Name</div>
                <div style={{ flex: 2 }}>Permissions Count</div>
                <div style={{ width: '80px' }}>Actions</div>
              </div>
              
              {roles.map(role => (
                <div key={role.id} className="flex-between animate-fade-in" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{role.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{role.description || 'No description'}</div>
                  </div>
                  <div style={{ flex: 2, color: 'var(--success)', fontWeight: 600 }}>
                    {role.permissions?.length || 0} Permissions Configured
                  </div>
                  <div style={{ display: 'flex', width: '80px', gap: '8px' }}>
                    <button onClick={() => { setEditingRole(role); setRoleModalOpen(true); }} className="btn btn-outline" style={{ padding: '6px' }}><Edit size={14}/></button>
                    {/* Assuming System Default roles cannot be deleted, you could flag this later */}
                    <button onClick={() => handleDeleteRole(role.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RoleFormModal 
        isOpen={isRoleModalOpen} 
        onClose={() => setRoleModalOpen(false)} 
        onSubmit={handleSaveRole} 
        initialData={editingRole} 
      />

      <EmployeeFormModal 
        isOpen={isEmpModalOpen} 
        onClose={() => setEmpModalOpen(false)} 
        onSubmit={handleSaveEmployee} 
        initialData={editingEmp}
        roles={roles}
      />
    </div>
  );
}
