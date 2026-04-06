import apiClient from '@/lib/api-client';
import { Shift } from '@/types';

export interface OpenShiftRequest {
  storeId: string;
  openingAmount?: number;
  openingCash?: {
    cash100k: number;
    cash50k: number;
    cash20k: number;
    cash10k: number;
    cash5k: number;
    cash2k: number;
    cash1k: number;
    coins: number;
  };
}

export interface CloseShiftRequest {
  shiftId: string;
  closingCash?: number;
  notes?: string;
}

// Helper to normalize shift fields from backend
function normalizeShift(s: any): any {
  if (!s) return s;
  return {
    ...s,
    startTime: s.startTime || s.openedAt || s.createdAt,
    endTime: s.endTime || s.closedAt,
    startingCash: s.startingCash ?? s.openingCash ?? 0,
    endingCash: s.endingCash ?? s.closingCash,
    status: s.status === 'open' ? 'open' : s.status === 'closed' ? 'closed' : s.status,
  };
}

export const shiftService = {
  async openShift(data: OpenShiftRequest): Promise<Shift> {
    const response = await apiClient.post<Shift>('/shifts/open', data);
    return normalizeShift(response.data);
  },

  async closeShift(id: string, data: CloseShiftRequest): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}/close`, data);
    return normalizeShift(response.data);
  },

  async getActiveShift(storeId: string): Promise<Shift | null> {
    try {
      const response = await apiClient.get<Shift>('/shifts/active', {
        params: { storeId },
      });
      return normalizeShift(response.data);
    } catch (error) {
      return null;
    }
  },

  async getShifts(storeId?: string): Promise<Shift[]> {
    const response = await apiClient.get<Shift[]>('/shifts', {
      params: { storeId },
    });
    const data = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
    return data.map(normalizeShift);
  },

  async getShiftReport(shiftId: string) {
    const response = await apiClient.get(`/shifts/${shiftId}/report`);
    return response.data;
  },
};
