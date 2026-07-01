import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/utils'
import { LowStockAlerts } from '../LowStockAlerts'

const mockLowStockItems = {
  count: 2,
  threshold: 50,
  results: [
    { id: '1', tile: 'uuid1', tile_sku: 'GG-001', tile_name: 'Tile One', batch: 'uuid-b1', batch_number: 'BATCH-001', cartons: 1, loose_pieces: 5, total_pieces: 15, location: 'Warehouse A', updated_at: '2026-01-01T00:00:00Z' },
    { id: '2', tile: 'uuid2', tile_sku: 'RS-002', tile_name: 'Tile Two', batch: 'uuid-b2', batch_number: 'BATCH-002', cartons: 0, loose_pieces: 3, total_pieces: 3, location: 'Warehouse B', updated_at: '2026-01-01T00:00:00Z' },
  ],
}

vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    stock: {
      lowStock: vi.fn(() => Promise.resolve(mockLowStockItems)),
      list: vi.fn(() => Promise.resolve({ count: 0, results: [] })),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LowStockAlerts', () => {
  it('renders the title in full mode', async () => {
    render(<LowStockAlerts />)
    expect(await screen.findByText('Low Stock Alerts')).toBeInTheDocument()
  })

  it('renders the threshold input', async () => {
    render(<LowStockAlerts />)
    expect(await screen.findByDisplayValue('50')).toBeInTheDocument()
  })

  it('shows low stock items in full mode', async () => {
    render(<LowStockAlerts />)
    expect(await screen.findByText('GG-001')).toBeInTheDocument()
    expect(await screen.findByText('RS-002')).toBeInTheDocument()
  })

  it('shows piece counts', async () => {
    render(<LowStockAlerts />)
    expect(await screen.findByText('15')).toBeInTheDocument()
    const threes = screen.getAllByText('3')
    expect(threes.length).toBeGreaterThanOrEqual(2)
  })

  it('shows item count', async () => {
    render(<LowStockAlerts />)
    expect(await screen.findByText('2 items')).toBeInTheDocument()
  })

  it('respects compact mode with different title', async () => {
    render(<LowStockAlerts compact />)
    expect(await screen.findByText(/Low Stock Alerts/)).toBeInTheDocument()
    expect(await screen.findByText('GG-001')).toBeInTheDocument()
  })

  it('updates threshold on input change', async () => {
    render(<LowStockAlerts />)
    const input = await screen.findByDisplayValue('50')
    fireEvent.change(input, { target: { value: '25' } })
    expect(await screen.findByDisplayValue('25')).toBeInTheDocument()
  })

  it('shows empty state when no low stock items', async () => {
    const inventoryApi = await import('../../api/inventoryApi')
    vi.mocked(inventoryApi.inventoryApi.stock.lowStock).mockResolvedValue({
      count: 0, threshold: 50, results: [],
    })
    render(<LowStockAlerts />)
    expect(await screen.findByText(/All stock levels/)).toBeInTheDocument()
  })
})
