"use client";

import { useState, useEffect } from 'react';
import { Users, ShieldAlert, Plus, Edit, Trash2, Clock, History, X, Calendar, Loader2 } from 'lucide-react';
import { employeesService, Employee, ClockInStatus, AttendanceRecord, rolesService } from '@/services/employees.service';
import { RoleFormModal } from './components/RoleFormModal';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, StatusBadge, EmptyState, LoadingSpinner, ConfirmModal } from '@/components/ui';

interface Store { id: string; name: string; }
interface Role { id: string; name: string; description?: string; permissions?: Array<{ name: string } | string>; }

export default function EmployeesRolesPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockActionLoading, setClockActionLoading] = useState<string | null>(null);

  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isEmpModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const [clockInOutModal, setClockInOutModal] = useState<{ isOpen: boolean; employee: Employee | null; action: 'clock-in' | 'clock-out'; status?: ClockInStatus }>({ isOpen: false, employee: null, action: 'clock-in' });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; employee: Employee | null; records: AttendanceRecord[]; loading: boolean }>({ isOpen: false, employee: null, records: [], loading: false });
  const [clockInForm, setClockInForm] = useState({ storeId: '', notes: '' });
  const [clockOutForm, setClockOutForm] = useState({ breakDurationMinutes: 0, notes: '' });
  const [clockInStatuses, setClockInStatuses] = useState<Record<string, ClockInStatus>>({});
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteEmpConfirm, setDeleteEmpConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, empData, storesData]: any = await Promise.all([
        rolesService.getAll(), employeesService.getAll(),
        apiClient.get('/stores').then((r: any) => r.data ?? r).catch(() => []),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
      setStores(Array.isArray(storesData) ? storesData : []);
      if (storesData.length > 0) setClockInForm(prev => ({ ...prev, storeId: storesData[0].id }));
    } catch (err) { console.error('Failed to fetch employees data:', err); toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (employees.length > 0) {
      Promise.all(employees.map(emp => employeesService.getClockInStatus(emp.id).then(status => ({ id: emp.id, status })).catch(() => ({ id: emp.id, status: { isClockedIn: false } as ClockInStatus }))))
        .then(results => { const map: Record<string, ClockInStatus> = {}; results.forEach(({ id, status }) => { map[id] = status; }); setClockInStatuses(map); });
    }
  }, [employees]);

  const handleSaveRole = async (data: any) => {
    try {
      if (editingRole) await rolesService.update(editingRole.id, data); else await rolesService.create(data);
      toast.success(editingRole ? 'Role updated' : 'Role created'); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save role'); throw err; }
  };

  const handleDeleteRole = async (id: string) => {
    setDeleteRoleConfirm({ open: true, id });
  };

  const confirmDeleteRole = async () => {
    if (!deleteRoleConfirm.id) return;
    setDeleteLoading(true);
    try { await rolesService.delete(deleteRoleConfirm.id); toast.success('Role dihapus'); setRoles(prev => prev.filter(r => r.id !== deleteRoleConfirm.id)); setDeleteRoleConfirm({ open: false, id: null }); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menghapus role'); }
    finally { setDeleteLoading(false); }
  };

  const handleSaveEmployee = async (data: any) => {
    try {
      if (editingEmp) await employeesService.update(editingEmp.id, data); else await employeesService.create(data);
      toast.success(editingEmp ? 'Employee updated' : 'Employee invited'); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save employee'); throw err; }
  };

  const handleDeleteEmployee = async (id: string) => {
    setDeleteEmpConfirm({ open: true, id });
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteEmpConfirm.id) return;
    setDeleteLoading(true);
    try { await employeesService.delete(deleteEmpConfirm.id); toast.success('Karyawan dihapus'); setEmployees(prev => prev.filter(e => e.id !== deleteEmpConfirm.id)); setDeleteEmpConfirm({ open: false, id: null }); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menghapus karyawan'); }
    finally { setDeleteLoading(false); }
  };

  const openClockModal = async (employee: Employee, action: 'clock-in' | 'clock-out') => {
    try {
      const status = await employeesService.getClockInStatus(employee.id);
      setClockInOutModal({ isOpen: true, employee, action, status });
      if (action === 'clock-in' && stores.length > 0) setClockInForm({ storeId: stores[0].id, notes: '' });
      else if (action === 'clock-out') setClockOutForm({ breakDurationMinutes: 0, notes: '' });
    } catch { toast.error('Failed to load employee status'); }
  };

  const handleClockIn = async () => {
    if (!clockInOutModal.employee) return;
    setClockActionLoading(clockInOutModal.employee.id);
    try { await employeesService.clockIn(clockInOutModal.employee.id, clockInForm); setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' }); toast.success('Employee clocked in'); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to clock in'); }
    finally { setClockActionLoading(null); }
  };

  const handleClockOut = async () => {
    if (!clockInOutModal.employee) return;
    setClockActionLoading(clockInOutModal.employee.id);
    try { await employeesService.clockOut(clockInOutModal.employee.id, clockOutForm); setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' }); toast.success('Employee clocked out'); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to clock out'); }
    finally { setClockActionLoading(null); }
  };

  const openAttendance = async (employee: Employee) => {
    setAttendanceModal({ isOpen: true, employee, records: [], loading: true });
    try { const records = await employeesService.getAttendance(employee.id); setAttendanceModal(prev => ({ ...prev, records: Array.isArray(records) ? records : [], loading: false })); }
    catch { toast.error('Failed to load attendance'); setAttendanceModal(prev => ({ ...prev, loading: false })); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const fmtDuration = (min?: number) => { if (!min) return '—'; const h = Math.floor(min/60), m = min%60; return `${h}h ${m}m`; };
  const calcDuration = (t: string) => Math.floor((Date.now() - new Date(t).getTime()) / 60000);

  return (
    <div>
      <PageHeader title="Team & Permissions" description="Configure roles and manage store staff."
        action={
          <div className="flex gap-2">
            <PermissionGate permission={PERMISSIONS.EMPLOYEE_MANAGE_ROLE}>
              <button onClick={() => { setEditingRole(null); setRoleModalOpen(true); }} className="btn btn-outline btn-sm"><ShieldAlert size={14}/> New Role</button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.EMPLOYEE_CREATE}>
              <button onClick={() => { setEditingEmp(null); setEmpModalOpen(true); }} className="btn btn-success btn-sm"><Users size={14}/> Invite Staff</button>
            </PermissionGate>
          </div>
        } />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['employees', 'roles'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'employees' ? `Staff Members (${employees.length})` : `Access Roles (${roles.length})`}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {activeTab === 'employees' && (
            employees.length === 0 ? <div className="card-body"><EmptyState icon={Users} title="No staff members yet" /></div> : (
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Employee</th><th>Role</th><th>Clock Status</th><th>Duration</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {employees.map(emp => {
                      const status = clockInStatuses[emp.id];
                      const isClockedIn = status?.isClockedIn || false;
                      const duration = status?.currentAttendance?.clockInTime ? calcDuration(status.currentAttendance.clockInTime) : 0;
                      return (
                        <tr key={emp.id}>
                          <td><div className="font-semibold">{emp.name}</div><div className="text-xs text-gray-400">{emp.employeeNumber} • {emp.email}</div></td>
                          <td><span className="badge badge-gray">{emp.role?.name || 'Unassigned'}</span></td>
                          <td><span className={`badge ${isClockedIn ? 'badge-success' : 'badge-gray'}`}>{isClockedIn ? '● Clocked In' : 'Clocked Out'}</span></td>
                          <td className={`font-medium ${isClockedIn ? 'text-emerald-600' : 'text-gray-400'}`}>{isClockedIn ? fmtDuration(duration) : '—'}</td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openClockModal(emp, isClockedIn ? 'clock-out' : 'clock-in')} disabled={clockActionLoading === emp.id}
                                className={`btn btn-sm ${isClockedIn ? 'btn-warning' : 'btn-success'}`}>
                                <Clock size={13}/> {clockActionLoading === emp.id ? '...' : isClockedIn ? 'Out' : 'In'}
                              </button>
                              <button onClick={() => openAttendance(emp)} className="btn btn-ghost btn-icon btn-sm" title="Attendance"><History size={14}/></button>
                              <button onClick={() => { setEditingEmp(emp); setEmpModalOpen(true); }} className="btn btn-ghost btn-icon btn-sm"><Edit size={14}/></button>
                              <PermissionGate permission={PERMISSIONS.EMPLOYEE_DELETE}>
                                <button onClick={() => handleDeleteEmployee(emp.id)} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14}/></button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'roles' && (
            roles.length === 0 ? <div className="card-body"><EmptyState icon={ShieldAlert} title="No roles defined" /></div> : (
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Role Name</th><th>Permissions</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {roles.map(role => (
                      <tr key={role.id}>
                        <td><div className="font-semibold">{role.name}</div><div className="text-xs text-gray-400">{role.description || 'No description'}</div></td>
                        <td><span className="text-emerald-600 font-semibold">{role.permissions?.length || 0} permissions</span></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <PermissionGate permission={PERMISSIONS.EMPLOYEE_MANAGE_ROLE}>
                              <button onClick={() => { setEditingRole(role); setRoleModalOpen(true); }} className="btn btn-ghost btn-icon btn-sm"><Edit size={14}/></button>
                              <button onClick={() => handleDeleteRole(role.id)} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14}/></button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      <RoleFormModal isOpen={isRoleModalOpen} onClose={() => setRoleModalOpen(false)} onSubmit={handleSaveRole} initialData={editingRole} />
      <EmployeeFormModal isOpen={isEmpModalOpen} onClose={() => setEmpModalOpen(false)} onSubmit={handleSaveEmployee} initialData={editingEmp} roles={roles} />

      {/* Clock In/Out Modal */}
      <Modal open={clockInOutModal.isOpen} onClose={() => setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' })}
        title={`${clockInOutModal.action === 'clock-in' ? 'Clock In' : 'Clock Out'} — ${clockInOutModal.employee?.name}`}
        footer={<>
          <button onClick={() => setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' })} className="btn btn-outline">Cancel</button>
          <button onClick={clockInOutModal.action === 'clock-in' ? handleClockIn : handleClockOut} disabled={!!clockActionLoading} className={`btn ${clockInOutModal.action === 'clock-in' ? 'btn-success' : 'btn-warning'}`}>
            {clockActionLoading ? <Loader2 size={14} className="animate-spin"/> : <Clock size={14}/>}
            {clockActionLoading ? 'Processing...' : clockInOutModal.action === 'clock-in' ? 'Clock In Now' : 'Clock Out Now'}
          </button>
        </>}>
        {clockInOutModal.action === 'clock-in' ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-700">Employee: <strong>{clockInOutModal.employee?.employeeNumber}</strong></div>
            <div className="form-group"><label className="form-label">Store *</label><select className="form-input" value={clockInForm.storeId} onChange={e => setClockInForm({...clockInForm,storeId:e.target.value})} required>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Notes (Optional)</label><textarea className="form-input" value={clockInForm.notes} onChange={e => setClockInForm({...clockInForm,notes:e.target.value})} rows={2} placeholder="Any notes..."/></div>
          </div>
        ) : (
          <div className="space-y-4">
            {clockInOutModal.status?.currentAttendance && (
              <div className="grid grid-cols-2 gap-3 bg-amber-50 rounded-lg p-3">
                <div><p className="text-xs text-amber-600">Clocked In At</p><p className="font-semibold text-sm">{fmtDate(clockInOutModal.status.currentAttendance.clockInTime)}</p></div>
                <div><p className="text-xs text-amber-600">Duration</p><p className="font-semibold text-sm text-emerald-600">{fmtDuration(calcDuration(clockInOutModal.status.currentAttendance.clockInTime))}</p></div>
              </div>
            )}
            <div className="form-group"><label className="form-label">Break Duration (minutes)</label><input type="number" className="form-input" value={clockOutForm.breakDurationMinutes} onChange={e => setClockOutForm({...clockOutForm,breakDurationMinutes:parseInt(e.target.value)||0})} min="0"/></div>
            <div className="form-group"><label className="form-label">Notes (Optional)</label><textarea className="form-input" value={clockOutForm.notes} onChange={e => setClockOutForm({...clockOutForm,notes:e.target.value})} rows={2}/></div>
          </div>
        )}
      </Modal>

      {/* Attendance Modal */}
      <Modal open={attendanceModal.isOpen} onClose={() => setAttendanceModal({ isOpen: false, employee: null, records: [], loading: false })}
        title={`Attendance — ${attendanceModal.employee?.name}`} size="lg">
        {attendanceModal.loading ? <LoadingSpinner /> : attendanceModal.records.length === 0 ? (
          <EmptyState icon={Calendar} title="No attendance records" />
        ) : (
          <div className="space-y-2">
            {attendanceModal.records.map(record => (
              <div key={record.id} className={`rounded-lg p-3 border ${(record.clockOutTime || record.clockOutAt) ? 'border-gray-200 bg-gray-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Clock In</p><p className="font-medium">{fmtDate(record.clockInTime || record.clockInAt || '')}</p></div>
                  <div><p className="text-xs text-gray-400">Clock Out</p><p className="font-medium">{(record.clockOutTime || record.clockOutAt) ? fmtDate(record.clockOutTime || record.clockOutAt || '') : <span className="text-emerald-600">Active</span>}</p></div>
                  <div><p className="text-xs text-gray-400">Duration</p><p className="font-medium">{fmtDuration(record.workDurationMinutes)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmModal open={deleteRoleConfirm.open} onClose={() => setDeleteRoleConfirm({ open: false, id: null })} onConfirm={confirmDeleteRole}
        title="Hapus Role" description="Hapus role ini? Karyawan yang menggunakan role ini akan kehilangan akses." confirmLabel="Ya, Hapus" loading={deleteLoading} />
      <ConfirmModal open={deleteEmpConfirm.open} onClose={() => setDeleteEmpConfirm({ open: false, id: null })} onConfirm={confirmDeleteEmployee}
        title="Hapus Karyawan" description="Hapus karyawan ini dari sistem? Tindakan ini tidak bisa dibatalkan." confirmLabel="Ya, Hapus" loading={deleteLoading} />
    </div>
  );
}
