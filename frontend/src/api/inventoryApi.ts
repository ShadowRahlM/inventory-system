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
  CatalogProcessResult,
  StockSummary,
  MovementSummary,
  Customer,
  Supplier,
  SalesOrder,
  PurchaseOrder,
  NotificationRecord,
  CreateSalesOrderPayload,
  CreatePurchaseOrderPayload,
  SyncConflict,
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
    checkSkus: (skus: string[]) =>
      api.post<{ existing: Record<string, TileProduct> }>('/inventory/tiles/check_skus/', { skus }).then(r => r.data),
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
    create: (data: { name: string; description?: string; json_data: Record<string, unknown> }) =>
      api.post<TileCatalog>('/inventory/catalogs/', data).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/inventory/catalogs/${id}/`).then(r => r.data),
    batchDelete: (ids: string[]) =>
      api.post<ApiResponse<{ deleted: number }>>('/inventory/catalogs/batch_delete/', { ids }).then(extractData),
    process: (id: string) =>
      api.post<ApiResponse<CatalogProcessResult>>(`/inventory/catalogs/${id}/process/`).then(extractData),
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

  customers: {
    list: () =>
      api.get<PaginatedResponse<Customer>>('/inventory/customers/').then(r => r.data),
    create: (data: Partial<Customer>) =>
      api.post<Customer>('/inventory/customers/', data).then(r => r.data),
    get: (id: string) =>
      api.get<Customer>(`/inventory/customers/${id}/`).then(r => r.data),
    update: (id: string, data: Partial<Customer>) =>
      api.put<Customer>(`/inventory/customers/${id}/`, data).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/inventory/customers/${id}/`).then(r => r.data),
  },

  suppliers: {
    list: () =>
      api.get<PaginatedResponse<Supplier>>('/inventory/suppliers/').then(r => r.data),
    create: (data: Partial<Supplier>) =>
      api.post<Supplier>('/inventory/suppliers/', data).then(r => r.data),
    get: (id: string) =>
      api.get<Supplier>(`/inventory/suppliers/${id}/`).then(r => r.data),
    update: (id: string, data: Partial<Supplier>) =>
      api.put<Supplier>(`/inventory/suppliers/${id}/`, data).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/inventory/suppliers/${id}/`).then(r => r.data),
  },

  salesOrders: {
    list: () =>
      api.get<PaginatedResponse<SalesOrder>>('/inventory/sales-orders/').then(r => r.data),
    get: (id: string) =>
      api.get<SalesOrder>(`/inventory/sales-orders/${id}/`).then(r => r.data),
  },

  purchaseOrders: {
    list: () =>
      api.get<PaginatedResponse<PurchaseOrder>>('/inventory/purchase-orders/').then(r => r.data),
    get: (id: string) =>
      api.get<PurchaseOrder>(`/inventory/purchase-orders/${id}/`).then(r => r.data),
  },

  orderOperations: {
    createSalesOrder: (payload: CreateSalesOrderPayload) =>
      api.post<ApiResponse<SalesOrder>>('/inventory/order-operations/create_sales_order/', payload).then(extractData),
    confirmSalesOrder: (order_id: string) =>
      api.post<ApiResponse<SalesOrder>>('/inventory/order-operations/confirm_sales_order/', { order_id }).then(extractData),
    shipSalesOrder: (order_id: string) =>
      api.post<ApiResponse<SalesOrder>>('/inventory/order-operations/ship_sales_order/', { order_id }).then(extractData),
    cancelSalesOrder: (order_id: string) =>
      api.post<ApiResponse<SalesOrder>>('/inventory/order-operations/cancel_sales_order/', { order_id }).then(extractData),
    createPurchaseOrder: (payload: CreatePurchaseOrderPayload) =>
      api.post<ApiResponse<PurchaseOrder>>('/inventory/order-operations/create_purchase_order/', payload).then(extractData),
    confirmPurchaseOrder: (order_id: string) =>
      api.post<ApiResponse<PurchaseOrder>>('/inventory/order-operations/confirm_purchase_order/', { order_id }).then(extractData),
    receivePurchaseOrder: (order_id: string, location: string = 'RECEIVING') =>
      api.post<ApiResponse<PurchaseOrder>>('/inventory/order-operations/receive_purchase_order/', { order_id, location }).then(extractData),
  },

  notifications: {
    list: () =>
      api.get<PaginatedResponse<NotificationRecord>>('/inventory/notifications/').then(r => r.data),
    markRead: (ids: string[]) =>
      api.post<ApiResponse<null>>('/inventory/notifications/mark_read/', { ids }).then(r => r.data),
    markAllRead: () =>
      api.post<ApiResponse<{ marked_read: number }>>('/inventory/notifications/mark_all_read/').then(r => r.data),
  },

  syncConflicts: {
    list: () =>
      api.get<PaginatedResponse<SyncConflict>>('/inventory/sync-conflicts/').then(r => r.data),
    resolve: (id: string, resolution: 'local' | 'remote') =>
      api.post<SyncConflict>(`/inventory/sync-conflicts/${id}/resolve/`, { resolution }).then(r => r.data),
  },
};
