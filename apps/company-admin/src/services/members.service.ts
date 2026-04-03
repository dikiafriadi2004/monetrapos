import { api } from '../lib/api';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  status: 'active' | 'suspended' | 'pending';
  subscription?: {
    id: string;
    status: string;
    plan?: {
      id: string;
      name: string;
      price: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface MemberStats {
  total: number;
  active: number;
  suspended: number;
  pending: number;
}

class MembersService {
  async getAll(): Promise<Member[]> {
    const data = await api.get('/admin/companies') as any;
    return Array.isArray(data) ? data : [];
  }

  async getById(id: string): Promise<Member> {
    return await api.get(`/admin/companies/${id}`) as any;
  }

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    businessName?: string;
    password: string;
  }): Promise<Member> {
    return await api.post('/auth/register', data) as any;
  }

  async update(id: string, data: Partial<Member>): Promise<Member> {
    return await api.patch(`/admin/companies/${id}`, data) as any;
  }

  async updateStatus(id: string, status: 'active' | 'suspended'): Promise<Member> {
    return await api.patch(`/admin/companies/${id}/status`, { status }) as any;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/companies/${id}`);
  }

  async getStats(): Promise<MemberStats> {
    const members = await this.getAll();
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      suspended: members.filter(m => m.status === 'suspended').length,
      pending: members.filter(m => m.status === 'pending').length,
    };
  }
}

export const membersService = new MembersService();
