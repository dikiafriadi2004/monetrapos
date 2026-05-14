"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ShieldAlert, Plus, Edit, Trash2, Clock, History, X, Calendar, Loader2 } from 'lucide-react';
import { employeesService, Employee, ClockInStatus, AttendanceRecord, rolesService } from '@/services/employees.service';
import { RoleFormModal } from './components/RoleFormModal';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, StatusBadge, EmptyState, LoadingSpinner, ConfirmModal, Pagination } from '@/components/ui';
import { usePagination } from '@/hooks/usePagination';

interface Store { id: string; name: string; }
interface Role { id: string; name: string; description?: string; permissions?: Array<{ name: string } | string>; }

export default function EmployeesRolesPage() {
  const router = useRouter();
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
  const [now, setNow] = useState(() => Date.now());

  // Update waktu setiap 30 detik agar durasi clock-in real-time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, empData, storesData]: any = await Promise.all([
        rolesService.getAll().catch((e: any) => { console.error('roles error:', e?.response?.status, e?.response?.data); return []; }),
        employeesService.getAll().catch((e: any) => {
          console.error('employees error:', e?.response?.status, e?.response?.data);
          const status = e?.response?.status;
          if (status === 401 || status === 403) toast.error('Sesi habis, silakan login ulang');
          else toast.error(`Gagal memuat karyawan: ${e?.response?.data?.message || e.message}`);
          return [];
        }),
        apiClient.get('/stores').then((r: any) => {
          const d = r.data ?? r;
          return Array.isArray(d) ? d : (d?.data || []);
        }).catch(() => []),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
      setStores(Array.isArray(storesData) ? storesData : []);
      if (storesData.length > 0) setClockInForm(prev => ({ ...prev, storeId: storesData[0].id }));
    } catch (err: any) {
      console.error('Failed to fetch employees data:', err);
      toast.error('Gagal memuat data');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const empPagination = usePagination(employees);
  const rolesPagination = usePagination(roles, 10);

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
      console.log('[handleSaveEmployee] data:', JSON.stringify(data));
      if (editingEmp) {
        const result = await employeesService.update(editingEmp.id, data);
        console.log('[handleSaveEmployee] update result:', JSON.stringify(result));
      } else {
        await employeesService.create(data);
      }
      toast.success(editingEmp ? 'Employee updated' : 'Employee invited');
      await fetchData();
    } catch (err: any) {
      console.error('[handleSaveEmployee] error:', err);
      toast.error(err?.response?.data?.message || 'Failed to save employee');
      throw err;
    }
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
    if (!clockInForm.storeId) { toast.error('Pilih toko terlebih dahulu'); return; }
    const empId = clockInOutModal.employee.id; // simpan sebelum modal di-reset
    setClockActionLoading(empId);
    try {
      await employeesService.clockIn(empId, clockInForm);
      setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' });
      toast.success('Employee clocked in');
      const newStatus = await employeesService.getClockInStatus(empId).catch(() => ({ isClockedIn: false } as ClockInStatus));
      setClockInStatuses(prev => ({ ...prev, [empId]: newStatus }));
    }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to clock in'); }
    finally { setClockActionLoading(null); }
  };

  const handleClockOut = async () => {
    if (!clockInOutModal.employee) return;
    if (clockOutForm.breakDurationMinutes < 0) { toast.error('Durasi istirahat tidak boleh negatif'); return; }
    const empId = clockInOutModal.employee.id; // simpan sebelum modal di-reset
    setClockActionLoading(empId);
    try {
      await employeesService.clockOut(empId, clockOutForm);
      setClockInOutModal({ isOpen: false, employee: null, action: 'clock-in' });
      toast.success('Employee clocked out');
      const newStatus = await employeesService.getClockInStatus(empId).catch(() => ({ isClockedIn: false } as ClockInStatus));
      setClockInStatuses(prev => ({ ...prev, [empId]: newStatus }));
    }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to clock out'); }
    finally { setClockActionLoading(null); }
  };

  const openAttendance = async (employee: Employee) => {
    setAttendanceModal({ isOpen: true, employee, records: [], loading: true });
    try { const records = await employeesService.getAttendance(employee.id); setAttendanceModal(prev => ({ ...prev, records: Array.isArray(records) ? records : [], loading: false })); }
    catch { toast.error('Failed to load attendance'); setAttendanceModal(prev => ({ ...prev, loading: false })); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  const fmtDuration = (min?: number) => {
    if (min === undefined || min === null || isNaN(min) || min < 0) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h ${m}m`;
  };
  const calcDuration = (t: string) => {
    const ms = now - new Date(t).getTime();
    return isNaN(ms) ? 0 : Math.floor(ms / 60000);
  };

  return (
    <div>
      <PageHeader title="Team & Permissions" description="Configure roles and manage store staff."
        action={
          <div className="flex gap-2">
            <button onClick={() => router.push('/dashboard/employees/attendance')} className="btn btn-outline btn-sm">
              <Calendar size={14}/> Laporan Absensi
            </button>
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
              <>
                <div className="table-container border-0">
                  <table className="table">
                    <thead><tr><th>Employee</th><th>Role</th><th>Clock Status</th><th>Duration</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>
                      {empPagination.paginated.map(emp => {
                        const status = clockInStatuses[emp.id];
                        const isClockedIn = status?.isClockedIn || false;
                        const clockInTime = status?.currentAttendance?.clockInTime;
                        const duration = isClockedIn && clockInTime
                          ? calcDuration(typeof clockInTime === 'string' ? clockInTime : new Date(clockInTime).toISOString())
                          : null;
                        return (
                          <tr key={emp.id}>
                            <td><div className="font-semibold">{emp.name}</div><div className="text-xs text-gray-400">{emp.employeeNumber} • {emp.email}</div></td>
                            <td>
                              {(() => {
                                const role = emp.user?.role || (typeof emp.role === 'string' ? emp.role : '') || '';
                                const ROLE_BADGE: Record<string, string> = {
                                  owner: 'bg-purple-100 text-purple-700',
                                  admin: 'badge-primary',
                                  manager: 'badge-info',
                                  accountant: 'bg-amber-100 text-amber-700',
                                  cashier: 'badge-success',
                                  staff: 'badge-gray',
                                };
                                return (
                                  <span className={`badge ${ROLE_BADGE[role] || 'badge-gray'} capitalize`}>
                                    {role || 'Unassigned'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td><span className={`badge ${isClockedIn ? 'badge-success' : 'badge-gray'}`}>{isClockedIn ? '● Clocked In' : 'Clocked Out'}</span></td>
                            <td className={`font-medium ${isClockedIn ? 'text-emerald-600' : 'text-gray-400'}`}>{isClockedIn ? fmtDuration(duration ?? 0) : '—'}</td>
                            <td>
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openClockModal(emp, isClockedIn ? 'clock-out' : 'clock-in')} disabled={clockActionLoading === emp.id}
                                  className={`btn btn-sm ${isClockedIn ? 'btn-warning' : 'btn-success'}`}>
                                  <Clock size={13}/> {clockActionLoading === emp.id ? '...' : isClockedIn ? 'Out' : 'In'}
                                </button>
                                <button onClick={() => openAttendance(emp)} className="btn btn-ghost btn-icon btn-sm" title="Attendance"><History size={14}/></button>
                                <button onClick={async () => {
                                  // Fetch data terbaru sebelum buka form edit
                                  try {
                                    const fresh = await employeesService.getAll();
                                    const freshEmp = (Array.isArray(fresh) ? fresh : (fresh as any)?.data || []).find((e: any) => e.id === emp.id) || emp;
                                    setEditingEmp(freshEmp);
                                  } catch { setEditingEmp(emp); }
                                  setEmpModalOpen(true);
                                }} className="btn btn-ghost btn-icon btn-sm"><Edit size={14}/></button>
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
                <div className="px-4 pb-3">
                  <Pagination page={empPagination.page} totalPages={empPagination.totalPages} onPageChange={empPagination.setPage} totalItems={empPagination.totalItems} />
                </div>
              </>
            )
          )}

          {activeTab === 'roles' && (
            roles.length === 0 ? <div className="card-body"><EmptyState icon={ShieldAlert} title="No roles defined" /></div> : (
              <>
                <div className="table-container border-0">
                  <table className="table">
                    <thead><tr><th>Role Name</th><th>Permissions</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>
                      {rolesPagination.paginated.map(role => (
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
                <div className="px-4 pb-3">
                  <Pagination page={rolesPagination.page} totalPages={rolesPagination.totalPages} onPageChange={rolesPagination.setPage} totalItems={rolesPagination.totalItems} />
                </div>
              </>
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
