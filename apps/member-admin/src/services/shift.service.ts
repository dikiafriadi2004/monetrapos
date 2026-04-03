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
  notes?: string;
}

export const shiftService = {
  async openShift(data: OpenShiftRequest): Promise<Shift> {
    const response = await apiClient.post<Shift>('/shifts/open', data);
    return response.data;
  },

  async closeShift(id: string, data: CloseShiftRequest): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}/close`, data);
    return response.data;
  },

  async getActiveShift(storeId: string): Promise<Shift | null> {
    try {
      const response = await apiClient.get<Shift>('/shifts/active', {
        params: { storeId },
      });
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async getShifts(storeId?: string): Promise<Shift[]> {
    const response = await apiClient.get<Shift[]>('/shifts', {
      params: { storeId },
    });
    return response.data;
  },

  async getShiftReport(shiftId: string) {
    const response = await apiClient.get(`/shifts/${shiftId}/report`);
    return response.data;
  },
};
