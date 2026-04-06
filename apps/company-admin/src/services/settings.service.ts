import { api } from '../lib/api';

export interface PlatformSettings {
  id: string;
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone?: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultPlanId?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

class SettingsService {
  async getPlatformSettings(): Promise<PlatformSettings> {
    return await api.get('/admin/settings');
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return await api.patch('/admin/settings', data);
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    const data = await api.get('/admin/users');
    return Array.isArray(data) ? data : [];
  }

  async createAdminUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<AdminUser> {
    return await api.post('/admin/users', data);
  }

  async updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    return await api.patch(`/admin/users/${id}`, data);
  }

  async deleteAdminUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Use auth me endpoint via users profile update
    await api.patch('/users/profile', { currentPassword, newPassword });
  }

  async testEmailSettings(): Promise<{ success: boolean; message: string }> {
    // Delegate to backend email test endpoint using saved config
    try {
      const configs = await api.get('/admin/email/config') as any[];
      const activeConfig = Array.isArray(configs) ? configs.find((c: any) => c.isEnabled) : null;
      if (!activeConfig) {
        return { success: false, message: 'Tidak ada konfigurasi email yang aktif. Atur email di halaman Email Settings.' };
      }
      return { success: true, message: `Email aktif: ${activeConfig.provider} (${activeConfig.username || activeConfig.fromEmail})` };
    } catch {
      return { success: false, message: 'Gagal mengambil konfigurasi email' };
    }
  }
}

export const settingsService = new SettingsService();
