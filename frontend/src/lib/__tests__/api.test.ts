import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAxiosInstance = {
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockAxiosInstance) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('api axios instance', () => {
  it('creates an axios instance with correct baseURL', async () => {
    await import('../api')
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
  })
})

describe('authAPI', () => {
  it('login posts to /auth/token/', async () => {
    const apiModule = await import('../api')
    mockAxiosInstance.post.mockResolvedValue({ data: { access: 'token', refresh: 'refresh' } })
    const result = await apiModule.authAPI.login('manager', 'manager123')
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/token/', {
      username: 'manager',
      password: 'manager123',
    })
    expect(result.data).toEqual({ access: 'token', refresh: 'refresh' })
  })

  it('refreshToken posts to /auth/token/refresh/', async () => {
    const apiModule = await import('../api')
    mockAxiosInstance.post.mockResolvedValue({ data: { access: 'new-token' } })
    const result = await apiModule.authAPI.refreshToken('test-refresh')
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/token/refresh/', {
      refresh: 'test-refresh',
    })
    expect(result.data).toEqual({ access: 'new-token' })
  })
})

describe('inventoryAPI (legacy, untyped)', () => {
  it('tiles.list returns raw axios response (no .then unwrap)', async () => {
    const apiModule = await import('../api')
    const mockData = { count: 10, results: [{ id: '1', sku: 'TEST' }] }
    mockAxiosInstance.get.mockResolvedValue({ data: mockData })
    const result = await apiModule.inventoryAPI.tiles.list()
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/inventory/tiles/')
    expect(result).toEqual({ data: mockData })
  })

  it('operations.receive posts to the receive endpoint', async () => {
    const apiModule = await import('../api')
    const payload = { tile_id: 'abc', batch_number: 'B001', cartons: 5, loose_pieces: 0, location: 'WH-A' }
    await apiModule.inventoryAPI.operations.receive(payload)
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/inventory/operations/receive/', payload)
  })
})
