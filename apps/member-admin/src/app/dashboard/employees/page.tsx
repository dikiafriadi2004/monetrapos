"use client";

import { useState, useEffect } from 'react';
import { Users, ShieldAlert, Plus, Edit, Trash2, Clock, History, X, Calendar } from 'lucide-react';
import { api } from '../../../lib/api';
import { RoleFormModal } from './components/RoleFormModal';
import { EmployeeFormModal } from './components/EmployeeFormModal';

// Types
interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role?: { id: string; name: string };
  store?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
}

interface ClockInStatus {
  isClockedIn: boolean;
  currentAttendance?: {
    id: string;
    clockInTime: string;
    storeId: string;
    store?: { name: string };
    notes?: string;
  };
  workDuration?: number; // in minutes
}

interface AttendanceRecord {
  id: string;
  clockInTime: string;
  clockOutTime?: string;
  breakDurationMinutes: number;
  workDurationMinutes?: number;
  store: { id: string; name: string };
  notes?: string;
}

export default function EmployeesRolesPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  const [isEmpModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);

  // Clock in/out modal state
  const [clockInOutModal, setClockInOutModal] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    action: 'clock-in' | 'clock-out';
    status?: ClockInStatus;
  }>({ isOpen: false, employee: null, action: 'clock-in' });

  // Attendance history modal state
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    records: AttendanceRecord[];
    loading: boolean;
  }>({ isOpen: false, employee: null, records: [], loading: false });

  // Clock in/out form state
  const [clockInForm, setClockInForm] = useState({
    storeId: '',
    notes: '',
  });

  const [clockOutForm, setClockOutForm] = useState({
    breakDurationMinutes: 0,
    notes: '',
  });

  // Employee clock-in status cache
  const [clockInStatuses, setClockInStatuses] = useState<Record<string, ClockInStatus>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, empData, storesData]: any = await Promise.all([
        api.get('/roles'),
        api.get('/employees'),
        api.get('/stores')
      ]);
      setRoles(rolesData);
      setEmployees(empData);
      setStores(storesData);
      
      // Set default store for clock-in
      if (storesData.length > 0) {
        setClockInForm(prev => ({ ...prev, storeId: storesData[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch clock-in status for all employees
  useEffect(() => {
    if (employees.length > 0) {
      fetchAllClockInStatuses();
    }
  }, [employees]);

  const fetchAllClockInStatuses = async () => {
    try {
      const statusPromises = employees.map(emp =>
        api.get(`/employees/${emp.id}/clock-in-status`)
          .then((status: any) => ({ id: emp.id, status }))
          .catch(() => ({ id: emp.id, status: { isClockedIn: false } }))
      );
      
      const results = await Promise.all(statusPromises);
      const statusMap: Record<string, ClockInStatus> = {};
      results.forEach(({ id, status }) => {
        statusMap[id] = status;
      });
      setClockInStatuses(statusMap);
    } catch (err) {
      console.error('Failed to fetch clock-in statuses:', err);
    }
  };

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

  // Clock in/out handlers
  const openClockInOutModal = async (employee: Employee, action: 'clock-in' | 'clock-out') => {
    try {
      const status: any = await api.get(`/employees/${employee.id}/clock-in-status`);
      setClockInOutModal({ isOpen: true, employee, action, status });
      
      // Reset forms
      if (action === 'clock-in' && stores.length > 0) {
        setClockInForm({ storeId: stores[0].id, notes: '' });
      } else if (action === 'clock-out') {
        setClockOutForm({ breakDurationMinutes: 0, notes: '' });
      }
    } catch (err) {
      console.error('Failed to fetch clock-in status:', err);
      alert('Failed to load employee status');
    }
  };

  const handleClockIn = async () => {
    if (!clockInOutModal.employee) return;
    try {
      await api.post(`/employees/${clockInOutModal.employee.id}/clock-in`, clockInForm);
      setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' });
      await fetchAllClockInStatuses();
      alert('Employee clocked in successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    if (!clockInOutModal.employee) return;
    try {
      await api.post(`/employees/${clockInOutModal.employee.id}/clock-out`, clockOutForm);
      setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' });
      await fetchAllClockInStatuses();
      alert('Employee clocked out successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock out');
    }
  };

  // Attendance history handlers
  const openAttendanceHistory = async (employee: Employee) => {
    setAttendanceModal({ isOpen: true, employee, records: [], loading: true });
    try {
      const records: any = await api.get(`/employees/${employee.id}/attendance?limit=30`);
      setAttendanceModal(prev => ({ ...prev, records: records.data || records, loading: false }));
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setAttendanceModal(prev => ({ ...prev, loading: false }));
      alert('Failed to load attendance history');
    }
  };

  const closeAttendanceModal = () => {
    setAttendanceModal({ isOpen: false, employee: null, records: [], loading: false });
  };

  // Utility functions
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateCurrentWorkDuration = (clockInTime: string) => {
    const start = new Date(clockInTime).getTime();
    const now = Date.now();
    const durationMs = now - start;
    return Math.floor(durationMs / 1000 / 60); // minutes
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
                <div style={{ flex: 1 }}>Clock Status</div>
                <div style={{ flex: 1 }}>Work Duration</div>
                <div style={{ width: '200px' }}>Actions</div>
              </div>
              
              {employees.length === 0 && (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No staff members invited yet.</div>
              )}
              
              {employees.map(emp => {
                const status = clockInStatuses[emp.id];
                const isClockedIn = status?.isClockedIn || false;
                const currentDuration = status?.currentAttendance?.clockInTime 
                  ? calculateCurrentWorkDuration(status.currentAttendance.clockInTime)
                  : 0;

                return (
                  <div key={emp.id} className="flex-between animate-fade-in" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {emp.employeeNumber} • {emp.email}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="badge badge-success" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {emp.role?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {isClockedIn ? (
                        <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                          <Clock size={12} style={{ marginRight: '4px' }} />
                          Clocked In
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>
                          Clocked Out
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500, color: isClockedIn ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {isClockedIn ? formatDuration(currentDuration) : '-'}
                    </div>
                    <div style={{ display: 'flex', width: '200px', gap: '8px' }}>
                      <button 
                        onClick={() => openClockInOutModal(emp, isClockedIn ? 'clock-out' : 'clock-in')} 
                        className="btn btn-sm btn-outline" 
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '0.8rem',
                          borderColor: isClockedIn ? 'var(--warning)' : 'var(--success)',
                          color: isClockedIn ? 'var(--warning)' : 'var(--success)'
                        }}
                        title={isClockedIn ? 'Clock Out' : 'Clock In'}
                      >
                        <Clock size={14} style={{ marginRight: '4px' }} />
                        {isClockedIn ? 'Out' : 'In'}
                      </button>
                      <button 
                        onClick={() => openAttendanceHistory(emp)} 
                        className="btn btn-sm btn-outline" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        title="Attendance History"
                      >
                        <History size={14} />
                      </button>
                      <button onClick={() => { setEditingEmp(emp); setEmpModalOpen(true); }} className="btn btn-sm btn-outline" style={{ padding: '6px' }}><Edit size={14}/></button>
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="btn btn-sm btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
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
                    <button onClick={() => handleDeleteRole(role.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role Form Modal */}
      <RoleFormModal 
        isOpen={isRoleModalOpen} 
        onClose={() => setRoleModalOpen(false)} 
        onSubmit={handleSaveRole} 
        initialData={editingRole} 
      />

      {/* Employee Form Modal */}
      <EmployeeFormModal 
        isOpen={isEmpModalOpen} 
        onClose={() => setEmpModalOpen(false)} 
        onSubmit={handleSaveEmployee} 
        initialData={editingEmp}
        roles={roles}
      />

      {/* Clock In/Out Modal */}
      {clockInOutModal.isOpen && clockInOutModal.employee && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(4px)', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div className="glass-panel animate-fade-in" style={{ 
            width: '500px', 
            padding: 'var(--space-xl)', 
            background: '#111827' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>
                {clockInOutModal.action === 'clock-in' ? 'Clock In' : 'Clock Out'} - {clockInOutModal.employee.name}
              </h2>
              <button 
                onClick={() => setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' })} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>
            </div>

            {clockInOutModal.action === 'clock-in' ? (
              <>
                {/* Clock In Form */}
                <div className="glass-panel" style={{ 
                  padding: 'var(--space-md)', 
                  marginBottom: 'var(--space-lg)', 
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Employee Number
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                    {clockInOutModal.employee.employeeNumber}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Store *</label>
                  <select
                    className="form-input"
                    value={clockInForm.storeId}
                    onChange={(e) => setClockInForm({ ...clockInForm, storeId: e.target.value })}
                    required
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    value={clockInForm.notes}
                    onChange={(e) => setClockInForm({ ...clockInForm, notes: e.target.value })}
                    placeholder="Any notes for this clock in..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ flex: 1 }} 
                    onClick={() => setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' })}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1, background: 'var(--success)' }}
                    onClick={handleClockIn}
                  >
                    <Clock size={16} style={{ marginRight: '6px' }} />
                    Clock In Now
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Clock Out Form */}
                <div className="glass-panel" style={{ 
                  padding: 'var(--space-md)', 
                  marginBottom: 'var(--space-lg)', 
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Clocked In At
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {clockInOutModal.status?.currentAttendance?.clockInTime 
                          ? formatDateTime(clockInOutModal.status.currentAttendance.clockInTime)
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Current Duration
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {clockInOutModal.status?.currentAttendance?.clockInTime
                          ? formatDuration(calculateCurrentWorkDuration(clockInOutModal.status.currentAttendance.clockInTime))
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Break Duration (minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={clockOutForm.breakDurationMinutes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, breakDurationMinutes: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="0"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Total break time taken during this shift
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    value={clockOutForm.notes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, notes: e.target.value })}
                    placeholder="Any notes for this clock out..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ flex: 1 }} 
                    onClick={() => setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' })}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1, background: 'var(--warning)' }}
                    onClick={handleClockOut}
                  >
                    <Clock size={16} style={{ marginRight: '6px' }} />
                    Clock Out Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {attendanceModal.isOpen && attendanceModal.employee && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(4px)', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div className="glass-panel animate-fade-in" style={{ 
            width: '800px', 
            maxHeight: '90vh',
            padding: 'var(--space-xl)', 
            background: '#111827',
            margin: 'var(--space-xl)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>
                <History size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Attendance History - {attendanceModal.employee.name}
              </h2>
              <button 
                onClick={closeAttendanceModal} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="glass-panel" style={{ 
              padding: 'var(--space-md)', 
              marginBottom: 'var(--space-lg)', 
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Employee Number
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                {attendanceModal.employee.employeeNumber}
              </div>
            </div>

            {attendanceModal.loading ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Loading attendance records...
              </div>
            ) : attendanceModal.records.length === 0 ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Calendar size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {attendanceModal.records.map((record) => (
                  <div 
                    key={record.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: 'var(--space-md)',
                      background: record.clockOutTime ? 'rgba(255,255,255,0.03)' : 'rgba(34, 197, 94, 0.1)',
                      border: record.clockOutTime ? '1px solid var(--border-subtle)' : '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                          Clock In
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {formatDateTime(record.clockInTime)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                          Clock Out
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {record.clockOutTime ? formatDateTime(record.clockOutTime) : (
                            <span style={{ color: 'var(--success)' }}>Currently Working</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                          Store
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {record.store.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: 'var(--space-md)', 
                      padding: 'var(--space-sm)', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: 'var(--radius-sm)',
                      marginTop: 'var(--space-sm)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          Work Duration
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>
                          {formatDuration(record.workDurationMinutes)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          Break Time
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.95rem' }}>
                          {formatDuration(record.breakDurationMinutes)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                          Net Duration
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                          {record.workDurationMinutes 
                            ? formatDuration(record.workDurationMinutes - record.breakDurationMinutes)
                            : '-'}
                        </div>
                      </div>
                    </div>

                    {record.notes && (
                      <div style={{ 
                        marginTop: 'var(--space-sm)', 
                        padding: 'var(--space-sm)', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <strong>Notes:</strong> {record.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-outline" onClick={closeAttendanceModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
