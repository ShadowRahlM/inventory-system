import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}
vi.mock('../../lib/api', () => ({ default: mockApi }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('inventoryApi tiles', () => {
  it('list calls GET /inventory/tiles/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } })
    const result = await inventoryApi.tiles.list()
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/tiles/', { params: undefined })
    expect(result).toEqual({ count: 0, results: [] })
  })

  it('list with search param adds query string', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } })
    await inventoryApi.tiles.list({ search: 'floor' })
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/tiles/', { params: { search: 'floor' } })
  })

  it('create calls POST /inventory/tiles/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const tileData = { sku: 'NEW', name: 'Test Tile' }
    mockApi.post.mockResolvedValue({ data: { id: '1', ...tileData } })
    const result = await inventoryApi.tiles.create(tileData)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/tiles/', tileData)
    expect(result.sku).toBe('NEW')
  })

  it('get calls GET /inventory/tiles/:id/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { id: '42', sku: 'TILE' } })
    const result = await inventoryApi.tiles.get('42')
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/tiles/42/')
    expect(result.id).toBe('42')
  })

  it('update calls PUT /inventory/tiles/:id/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.put.mockResolvedValue({ data: { id: '1', name: 'Updated' } })
    await inventoryApi.tiles.update('1', { name: 'Updated' })
    expect(mockApi.put).toHaveBeenCalledWith('/inventory/tiles/1/', { name: 'Updated' })
  })

  it('delete calls DELETE /inventory/tiles/:id/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.delete.mockResolvedValue({ data: {} })
    await inventoryApi.tiles.delete('1')
    expect(mockApi.delete).toHaveBeenCalledWith('/inventory/tiles/1/')
  })

  it('batchDelete calls POST with ids', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.post.mockResolvedValue({
      data: { success: true, data: { deleted: 2 } },
    })
    const result = await inventoryApi.tiles.batchDelete(['a', 'b'])
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/tiles/batch_delete/', {
      ids: ['a', 'b'],
    })
    expect(result).toEqual({ deleted: 2 })
  })
})

describe('inventoryApi operations', () => {
  const mockSuccessResponse = (data: unknown) => ({
    data: { success: true, data },
  })

  it('receive calls POST with payload', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const payload = { tile_id: '1', batch_number: 'B1', production_date: '2025-01-15', supplier: 'Supplier A', cartons: 5, loose_pieces: 0, location: 'WH' }
    mockApi.post.mockResolvedValue(
      mockSuccessResponse({ inventory: { id: 'i1' }, movement: { id: 'm1' } }),
    )
    const result = await inventoryApi.operations.receive(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/operations/receive/', payload)
    expect(result.inventory.id).toBe('i1')
  })

  it('dispatch calls POST with payload', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const payload = { tile_id: '1', batch_id: 'b1', cartons: 2, loose_pieces: 0, location: 'WH' }
    mockApi.post.mockResolvedValue(
      mockSuccessResponse({ inventory: {}, movement: {} }),
    )
    await inventoryApi.operations.dispatch(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/operations/issue_dispatch/', payload)
  })

  it('adjust calls POST with payload', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const payload = { tile_id: '1', batch_id: 'b1', location: 'WH', new_cartons: 3, new_loose_pieces: 0, reason: 'count' }
    mockApi.post.mockResolvedValue(mockSuccessResponse({ inventory: {}, movement: {} }))
    await inventoryApi.operations.adjust(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/operations/adjust/', payload)
  })

  it('transfer calls POST with payload', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const payload = { tile_id: '1', batch_id: 'b1', from_location: 'A', to_location: 'B', cartons: 1, loose_pieces: 0 }
    mockApi.post.mockResolvedValue(mockSuccessResponse({ source_inventory: {}, destination_inventory: {}, movement: {} }))
    await inventoryApi.operations.transfer(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/operations/transfer/', payload)
  })
})

describe('inventoryApi stock', () => {
  it('list calls GET /inventory/inventory/', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } })
    await inventoryApi.stock.list()
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/inventory/', { params: undefined })
  })

  it('list with params calls GET with params', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } })
    await inventoryApi.stock.list({ page_size: 5000 })
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/inventory/', { params: { page_size: 5000 } })
  })

  it('available calls with tile_id param', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.get.mockResolvedValue({ data: { tile_id: '1', total_pieces: 100 } })
    const result = await inventoryApi.stock.available('1')
    expect(mockApi.get).toHaveBeenCalledWith('/inventory/inventory/available_stock/?tile_id=1')
    expect(result.total_pieces).toBe(100)
  })
})

describe('inventoryApi catalogs', () => {
  it('create sends JSON payload', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const payload = { name: 'Catalog 1', description: '', json_data: { items: [] } }
    mockApi.post.mockResolvedValue({ data: { id: 'c1', name: 'Catalog 1' } })
    await inventoryApi.catalogs.create(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/catalogs/', payload)
  })

  it('process returns typed result', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    const processData = { created: 5, skipped: 2, errors: [] }
    mockApi.post.mockResolvedValue({ data: { success: true, data: processData } })
    const result = await inventoryApi.catalogs.process('c1')
    expect(mockApi.post).toHaveBeenCalledWith('/inventory/catalogs/c1/process/')
    expect(result.created).toBe(5)
  })
})

describe('extractData error handling', () => {
  it('throws when success is false', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.post.mockResolvedValue({
      data: { success: false, error: 'Operation failed' },
    })
    await expect(inventoryApi.tiles.batchDelete(['1'])).rejects.toThrow('Operation failed')
  })

  it('uses generic error message when none provided', async () => {
    const { inventoryApi } = await import('../inventoryApi')
    mockApi.post.mockResolvedValue({
      data: { success: false },
    })
    await expect(inventoryApi.tiles.batchDelete(['1'])).rejects.toThrow('Operation failed')
  })
})
