import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import type {
  ReceivePayload,
  ReceiveResult,
  DispatchPayload,
  DispatchResult,
  AdjustPayload,
  AdjustResult,
  TransferPayload,
  TransferResult,
  SalesOrder,
  PurchaseOrder,
  CreateSalesOrderPayload,
  CreatePurchaseOrderPayload,
} from '../types/inventory';

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  tiles: () => [...INVENTORY_KEYS.all, 'tiles'] as const,
  batches: () => [...INVENTORY_KEYS.all, 'batches'] as const,
  stock: () => [...INVENTORY_KEYS.all, 'stock'] as const,
  movements: () => [...INVENTORY_KEYS.all, 'movements'] as const,
  auditLogs: () => [...INVENTORY_KEYS.all, 'audit-logs'] as const,
  users: () => [...INVENTORY_KEYS.all, 'users'] as const,
  customers: () => [...INVENTORY_KEYS.all, 'customers'] as const,
  suppliers: () => [...INVENTORY_KEYS.all, 'suppliers'] as const,
  salesOrders: () => [...INVENTORY_KEYS.all, 'sales-orders'] as const,
  purchaseOrders: () => [...INVENTORY_KEYS.all, 'purchase-orders'] as const,
  notifications: () => [...INVENTORY_KEYS.all, 'notifications'] as const,
  syncConflicts: () => [...INVENTORY_KEYS.all, 'sync-conflicts'] as const,
};

export function useTilesList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.tiles(),
    queryFn: () => inventoryApi.tiles.list(),
  });
}

export function useBatchesList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.batches(),
    queryFn: () => inventoryApi.batches.list(),
  });
}

export function useStockList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.stock(),
    queryFn: () => inventoryApi.stock.list(),
  });
}

export function useMovementsList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.movements(),
    queryFn: () => inventoryApi.movements.list(),
  });
}

export function useAuditLogsList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.auditLogs(),
    queryFn: () => inventoryApi.auditLogs.list(),
  });
}

export function useUsersList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.users(),
    queryFn: () => inventoryApi.users.list(),
  });
}

export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation<ReceiveResult, Error, ReceivePayload>({
    mutationFn: (payload) => inventoryApi.operations.receive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
    },
  });
}

export function useDispatchInventory() {
  const queryClient = useQueryClient();

  return useMutation<DispatchResult, Error, DispatchPayload>({
    mutationFn: (payload) => inventoryApi.operations.dispatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
    },
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation<AdjustResult, Error, AdjustPayload>({
    mutationFn: (payload) => inventoryApi.operations.adjust(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
    },
  });
}

export function useTransferInventory() {
  const queryClient = useQueryClient();

  return useMutation<TransferResult, Error, TransferPayload>({
    mutationFn: (payload) => inventoryApi.operations.transfer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
    },
  });
}

export function useCustomersList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.customers(),
    queryFn: () => inventoryApi.customers.list(),
  });
}

export function useSuppliersList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.suppliers(),
    queryFn: () => inventoryApi.suppliers.list(),
  });
}

export function useSalesOrdersList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.salesOrders(),
    queryFn: () => inventoryApi.salesOrders.list(),
  });
}

export function usePurchaseOrdersList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.purchaseOrders(),
    queryFn: () => inventoryApi.purchaseOrders.list(),
  });
}

export function useNotificationsList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.notifications(),
    queryFn: () => inventoryApi.notifications.list(),
    refetchInterval: 30000,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation<SalesOrder, Error, CreateSalesOrderPayload>({
    mutationFn: (payload) => inventoryApi.orderOperations.createSalesOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.salesOrders() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
    },
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation<PurchaseOrder, Error, CreatePurchaseOrderPayload>({
    mutationFn: (payload) => inventoryApi.orderOperations.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.purchaseOrders() });
    },
  });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation<SalesOrder, Error, string>({
    mutationFn: (orderId) => inventoryApi.orderOperations.confirmSalesOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.salesOrders() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
    },
  });
}

export function useShipSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation<SalesOrder, Error, string>({
    mutationFn: (orderId) => inventoryApi.orderOperations.shipSalesOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.salesOrders() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation<SalesOrder, Error, string>({
    mutationFn: (orderId) => inventoryApi.orderOperations.cancelSalesOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.salesOrders() });
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => inventoryApi.notifications.markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.notifications() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => inventoryApi.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.notifications() });
    },
  });
}

export function useSyncConflictsList() {
  return useQuery({
    queryKey: INVENTORY_KEYS.syncConflicts(),
    queryFn: () => inventoryApi.syncConflicts.list(),
  });
}

export function useResolveSyncConflict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'local' | 'remote' }) =>
      inventoryApi.syncConflicts.resolve(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.syncConflicts() });
    },
  });
}
