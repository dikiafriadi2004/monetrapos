import apiClient, { unwrap } from '@/lib/api-client';

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role?: string;                                                        // role langsung di employee entity
  roleEntity?: { id: string; name: string };                           // custom Role entity (jika ada)
  user?: { id: string; name: string; email: string; role: string };    // User account
  store?: { id: string; name: string };
  storeId?: string;
  userId?: string;
  hireDate?: string;
  salary?: number;
  pin?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ClockInStatus {
  isClockedIn: boolean;
  currentAttendance?: {
    id: string;
    clockInTime: string;
    storeId: string;
    store?: { name: string };
    notes?: string;
  };
  workDuration?: number;
}

export interface AttendanceRecord {
  id: string;
  clockInAt?: string;    // backend field
  clockOutAt?: string;   // backend field
  clockInTime?: string;  // alias
  clockOutTime?: string; // alias
  breakDurationMinutes: number;
  workDurationMinutes?: number;
  store: { id: string; name: string };
  notes?: string;
}

export interface CreateEmployeeDto {
  name: string;
  email?: string;
  password?: string;
  phone?: string;
  position?: string;
  storeId?: string;
  hireDate?: string;
  salary?: number;
  pin?: string;
  role?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  storeId?: string;
  hireDate?: string;
  salary?: number;
  pin?: string;
  role?: string;
  isActive?: boolean;
}

export const employeesService = {
  getAll: async (params?: { storeId?: string; search?: string; isActive?: boolean }): Promise<Employee[]> => {
    const res = await apiClient.get('/employees', { params });
    const data = res.data;
    return Array.isArray(data) ? data : (data?.data || []);
  },

  create: async (dto: CreateEmployeeDto): Promise<Employee> =>
    unwrap<Employee>(await apiClient.post('/employees', dto)),

  update: async (id: string, dto: UpdateEmployeeDto): Promise<Employee> =>
    unwrap<Employee>(await apiClient.patch(`/employees/${id}`, dto)),

  delete: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/employees/${id}`)),

  getClockInStatus: async (id: string): Promise<ClockInStatus> =>
    unwrap<ClockInStatus>(await apiClient.get(`/employees/${id}/clock-in-status`)),

  clockIn: async (id: string, dto: { storeId: string; notes?: string }): Promise<void> =>
    unwrap<void>(await apiClient.post(`/employees/${id}/clock-in`, dto)),

  clockOut: async (id: string, dto: { breakDurationMinutes?: number; notes?: string }): Promise<void> =>
    unwrap<void>(await apiClient.post(`/employees/${id}/clock-out`, dto)),

  getAttendance: async (id: string, params?: { limit?: number; startDate?: string; endDate?: string }): Promise<AttendanceRecord[]> => {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const res = await apiClient.get(`/employees/${id}/attendance?${q.toString()}`);
    const data = res.data;
    return Array.isArray(data) ? data : (data?.data || []);
  },
};

export const rolesService = {
  getAll: async (): Promise<Array<{ id: string; name: string; description?: string; permissions?: Array<{ name: string }> }>> =>
    unwrap(await apiClient.get('/roles')),

  create: async (dto: { name: string; description?: string; permissions?: string[] }) =>
    unwrap(await apiClient.post('/roles', dto)),

  update: async (id: string, dto: { name?: string; description?: string; permissions?: string[] }) =>
    unwrap(await apiClient.patch(`/roles/${id}`, dto)),

  delete: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/roles/${id}`)),
};
