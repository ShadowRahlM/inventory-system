import api from '../lib/api';
import type {
  TileProduct,
  TileBatch,
  StockLevel,
  MovementRecord,
  AuditLogEntry,
  TileCatalog,
  UserRecord,
  ApiResponse,
  PaginatedResponse,
  AvailableStockResponse,
  ReceivePayload,
  ReceiveResult,
  DispatchPayload,
  DispatchResult,
  AdjustPayload,
  AdjustResult,
  TransferPayload,
  TransferResult,
  CatalogExtractResult,
  StockSummary,
  MovementSummary,
} from '../types/inventory';

function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.error ?? 'Operation failed');
  }
  return response.data.data;
}

export const inventoryApi = {
  tiles: {
    list: (params?: { search?: string }) =>
      api.get<PaginatedResponse<TileProduct>>('/inventory/tiles/', { params }).then(r => r.data),
    create: (data: Partial<TileProduct>) =>
      api.post<TileProduct>('/inventory/tiles/', data).then(r => r.data),
    get: (id: string) =>
      api.get<TileProduct>(`/inventory/tiles/${id}/`).then(r => r.data),
    update: (id: string, data: Partial<TileProduct>) =>
      api.put<TileProduct>(`/inventory/tiles/${id}/`, data).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/inventory/tiles/${id}/`).then(r => r.data),
    batchDelete: (ids: string[]) =>
      api.post<ApiResponse<{ deleted: number }>>('/inventory/tiles/batch_delete/', { ids }).then(extractData),
  },

  batches: {
    list: () =>
      api.get<PaginatedResponse<TileBatch>>('/inventory/batches/').then(r => r.data),
    create: (data: Partial<TileBatch>) =>
      api.post<TileBatch>('/inventory/batches/', data).then(r => r.data),
    get: (id: string) =>
      api.get<TileBatch>(`/inventory/batches/${id}/`).then(r => r.data),
  },

  stock: {
    list: () =>
      api.get<PaginatedResponse<StockLevel>>('/inventory/inventory/').then(r => r.data),
    get: (id: string) =>
      api.get<StockLevel>(`/inventory/inventory/${id}/`).then(r => r.data),
    available: (tileId: string) =>
      api.get<AvailableStockResponse>(`/inventory/inventory/available_stock/?tile_id=${tileId}`).then(r => r.data),
    lowStock: (threshold: number = 50) =>
      api.get<{ count: number; threshold: number; results: StockLevel[] }>(`/inventory/inventory/low_stock/?threshold=${threshold}`).then(r => r.data),
  },

  movements: {
    list: () =>
      api.get<PaginatedResponse<MovementRecord>>('/inventory/movements/').then(r => r.data),
    get: (id: string) =>
      api.get<MovementRecord>(`/inventory/movements/${id}/`).then(r => r.data),
  },

  auditLogs: {
    list: () =>
      api.get<PaginatedResponse<AuditLogEntry>>('/inventory/audit-logs/').then(r => r.data),
    get: (id: string) =>
      api.get<AuditLogEntry>(`/inventory/audit-logs/${id}/`).then(r => r.data),
  },

  catalogs: {
    list: () =>
      api.get<PaginatedResponse<TileCatalog>>('/inventory/catalogs/').then(r => r.data),
    get: (id: string) =>
      api.get<TileCatalog>(`/inventory/catalogs/${id}/`).then(r => r.data),
    create: (data: FormData) =>
      api.post<TileCatalog>('/inventory/catalogs/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/inventory/catalogs/${id}/`).then(r => r.data),
    batchDelete: (ids: string[]) =>
      api.post<ApiResponse<{ deleted: number }>>('/inventory/catalogs/batch_delete/', { ids }).then(extractData),
    extract: (id: string) =>
      api.post<ApiResponse<CatalogExtractResult>>(`/inventory/catalogs/${id}/extract/`).then(extractData),
  },

  users: {
    list: () =>
      api.get<PaginatedResponse<UserRecord>>('/inventory/users/').then(r => r.data),
    get: (id: number) =>
      api.get<UserRecord>(`/inventory/users/${id}/`).then(r => r.data),
    create: (data: Partial<UserRecord> & { password?: string }) =>
      api.post<UserRecord>('/inventory/users/', data).then(r => r.data),
    update: (id: number, data: Partial<UserRecord>) =>
      api.put<UserRecord>(`/inventory/users/${id}/`, data).then(r => r.data),
    delete: (id: number) =>
      api.delete(`/inventory/users/${id}/`).then(r => r.data),
    setRole: (id: number, role: string) =>
      api.post<ApiResponse<{ data: UserRecord }>>(`/inventory/users/${id}/set_role/`, { role }).then(r => r.data),
  },

  reports: {
    stockSummary: () =>
      api.get<StockSummary>('/inventory/reports/stock_summary/').then(r => r.data),
    movementSummary: (period: 'day' | 'week' | 'month' = 'month') =>
      api.get<MovementSummary>(`/inventory/reports/movement_summary/?period=${period}`).then(r => r.data),
  },

  operations: {
    receive: (payload: ReceivePayload) =>
      api.post<ApiResponse<ReceiveResult>>('/inventory/operations/receive/', payload).then(extractData),
    dispatch: (payload: DispatchPayload) =>
      api.post<ApiResponse<DispatchResult>>('/inventory/operations/issue_dispatch/', payload).then(extractData),
    adjust: (payload: AdjustPayload) =>
      api.post<ApiResponse<AdjustResult>>('/inventory/operations/adjust/', payload).then(extractData),
    transfer: (payload: TransferPayload) =>
      api.post<ApiResponse<TransferResult>>('/inventory/operations/transfer/', payload).then(extractData),
  },
};
