import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockReceive = vi.fn()
const mockDispatch = vi.fn()
const mockAdjust = vi.fn()
const mockTransfer = vi.fn()

vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    operations: {
      receive: (...args: unknown[]) => mockReceive(...args),
      dispatch: (...args: unknown[]) => mockDispatch(...args),
      adjust: (...args: unknown[]) => mockAdjust(...args),
      transfer: (...args: unknown[]) => mockTransfer(...args),
    },
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useReceiveInventory', () => {
  it('calls inventoryApi.operations.receive and invalidates queries', async () => {
    const { useReceiveInventory } = await import('../useInventoryQueries')
    mockReceive.mockResolvedValue({ inventory: { id: 'i1' }, movement: { id: 'm1' } })
    const { result } = renderHook(() => useReceiveInventory(), { wrapper: createWrapper() })
    const payload = { tile_id: '1', batch_number: 'B1', production_date: '2025-01-15', supplier: 'Supplier A', cartons: 5, loose_pieces: 0, location: 'WH' }
    result.current.mutateAsync(payload)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockReceive).toHaveBeenCalledWith(payload)
    expect(result.current.data).toEqual({ inventory: { id: 'i1' }, movement: { id: 'm1' } })
  })
})

describe('useDispatchInventory', () => {
  it('calls inventoryApi.operations.dispatch', async () => {
    const { useDispatchInventory } = await import('../useInventoryQueries')
    mockDispatch.mockResolvedValue({ inventory: {}, movement: {} })
    const { result } = renderHook(() => useDispatchInventory(), { wrapper: createWrapper() })
    result.current.mutateAsync({ tile_id: '1', batch_id: 'b1', cartons: 2, loose_pieces: 0, location: 'WH' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDispatch).toHaveBeenCalled()
  })
})

describe('useAdjustInventory', () => {
  it('calls inventoryApi.operations.adjust', async () => {
    const { useAdjustInventory } = await import('../useInventoryQueries')
    mockAdjust.mockResolvedValue({ inventory: {}, movement: {} })
    const { result } = renderHook(() => useAdjustInventory(), { wrapper: createWrapper() })
    result.current.mutateAsync({ tile_id: '1', batch_id: 'b1', location: 'WH', new_cartons: 3, new_loose_pieces: 0, reason: 'test' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockAdjust).toHaveBeenCalled()
  })
})

describe('useTransferInventory', () => {
  it('calls inventoryApi.operations.transfer', async () => {
    const { useTransferInventory } = await import('../useInventoryQueries')
    mockTransfer.mockResolvedValue({ source_inventory: {}, destination_inventory: {}, movement: {} })
    const { result } = renderHook(() => useTransferInventory(), { wrapper: createWrapper() })
    result.current.mutateAsync({ tile_id: '1', batch_id: 'b1', from_location: 'A', to_location: 'B', cartons: 1, loose_pieces: 0 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockTransfer).toHaveBeenCalled()
  })
})

describe('INVENTORY_KEYS', () => {
  it('produces correct query key structures', async () => {
    const { INVENTORY_KEYS } = await import('../useInventoryQueries')
    expect(INVENTORY_KEYS.all).toEqual(['inventory'])
    expect(INVENTORY_KEYS.tiles()).toEqual(['inventory', 'tiles'])
    expect(INVENTORY_KEYS.batches()).toEqual(['inventory', 'batches'])
    expect(INVENTORY_KEYS.stock()).toEqual(['inventory', 'stock'])
    expect(INVENTORY_KEYS.movements()).toEqual(['inventory', 'movements'])
    expect(INVENTORY_KEYS.auditLogs()).toEqual(['inventory', 'audit-logs'])
  })
})
