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
} from '../types/inventory';

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  tiles: () => [...INVENTORY_KEYS.all, 'tiles'] as const,
  batches: () => [...INVENTORY_KEYS.all, 'batches'] as const,
  stock: () => [...INVENTORY_KEYS.all, 'stock'] as const,
  movements: () => [...INVENTORY_KEYS.all, 'movements'] as const,
  auditLogs: () => [...INVENTORY_KEYS.all, 'audit-logs'] as const,
  users: () => [...INVENTORY_KEYS.all, 'users'] as const,
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
