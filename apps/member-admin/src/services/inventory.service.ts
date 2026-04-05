import apiClient, { unwrap } from '@/lib/api-client';

export interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  availableQuantity: number;
  reservedQuantity: number;
  product?: { id: string; name: string; sku: string; minStock: number };
}

export interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
  quantity: number;
  stockAfter: number;
  reason?: string;
  reference?: string;
  productId: string;
  storeId: string;
  product?: { name: string; sku: string };
  createdAt: string;
}

export interface CreateMovementDto {
  type: string;
  quantity: number;
  productId: string;
  storeId: string;
  reason?: string;
  reference?: string;
}

export interface TransferDto {
  fromStoreId: string;
  toStoreId: string;
  items: { productId: string; quantity: number }[];
  notes?: string;
}

export interface ReserveDto {
  storeId: string;
  productId: string;
  quantity: number;
  reference?: string;
}

export const inventoryService = {
  getInventory: async (storeId: string): Promise<InventoryItem[]> =>
    unwrap<InventoryItem[]>(await apiClient.get(`/inventory?storeId=${storeId}`)),

  getMovements: async (storeId: string): Promise<StockMovement[]> =>
    unwrap<StockMovement[]>(await apiClient.get(`/inventory/movements?storeId=${storeId}`)),

  getLowStock: async (storeId: string): Promise<InventoryItem[]> =>
    unwrap<InventoryItem[]>(await apiClient.get(`/inventory/low-stock?storeId=${storeId}`)),

  createMovement: async (dto: CreateMovementDto): Promise<StockMovement> =>
    unwrap<StockMovement>(await apiClient.post('/inventory/movements', dto)),

  transfer: async (dto: TransferDto): Promise<void> =>
    unwrap<void>(await apiClient.post('/inventory/transfer', dto)),

  reserve: async (dto: ReserveDto): Promise<void> =>
    unwrap<void>(await apiClient.post('/inventory/reserve', dto)),

  release: async (dto: ReserveDto): Promise<void> =>
    unwrap<void>(await apiClient.post('/inventory/release', dto)),

  sendLowStockAlerts: async (storeId: string): Promise<void> =>
    unwrap<void>(await apiClient.post('/inventory/low-stock/alerts', { storeId })),
};
