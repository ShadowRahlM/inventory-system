import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../../test/utils'
import { Dashboard } from '../Dashboard'
import { useAuthStore } from '../../lib/store'

const { inventoryApi } = vi.hoisted(() => {
  const stockSummary = {
    total_tiles: 254,
    total_cartons: 15,
    total_loose_pieces: 5,
    total_pieces: 85,
    low_stock_count: 3,
    location_count: 2,
    total_batches: 5,
  }
  const fastMovers = [
    { tile_id: '1', tile__sku: 'SKU-001', tile__name: 'Floor Tile A', tile__dimensions: '60x60cm', tile__category: 'Floor', tile__pieces_per_carton: 4, movement_count: 20 },
    { tile_id: '2', tile__sku: 'SKU-002', tile__name: 'Wall Tile B', tile__dimensions: '30x60cm', tile__category: 'Wall', tile__pieces_per_carton: 8, movement_count: 15 },
  ]
  const locations = [
    { location: 'WH-A', total_cartons: 10, total_loose: 5, total_pieces: 45, item_count: 3 },
    { location: 'WH-B', total_cartons: 5, total_loose: 0, total_pieces: 40, item_count: 2 },
  ]
  const movementSummary = {
    period: 'week', since: '2026-07-11T12:00:00',
    movements: [{ period: '2026-07-18', movement_type: 'receive', count: 2 }],
    by_type: [{ movement_type: 'receive', count: 2, total_pieces: 30 }, { movement_type: 'dispatch', count: 1, total_pieces: 10 }],
  }
  return {
    inventoryApi: {
      reports: {
        stockSummary: vi.fn(() => Promise.resolve(stockSummary)),
        fastMovers: vi.fn(() => Promise.resolve(fastMovers)),
        stockByLocation: vi.fn(() => Promise.resolve(locations)),
        movementSummary: vi.fn(() => Promise.resolve(movementSummary)),
      },
      salesOrders: { list: vi.fn(() => Promise.resolve({ count: 0, results: [] })) },
      purchaseOrders: { list: vi.fn(() => Promise.resolve({ count: 0, results: [] })) },
    },
  }
})

vi.mock('../../api/inventoryApi', () => ({ inventoryApi }))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'test', role: 'viewer' } })
})

describe('Dashboard', () => {
  it('renders dashboard heading', () => {
    render(<Dashboard />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders stat card headings', () => {
    render(<Dashboard />)
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Low-Stock Alerts')).toBeInTheDocument()
    expect(screen.getByText('To be Delivered')).toBeInTheDocument()
    expect(screen.getByText('To be Ordered')).toBeInTheDocument()
  })

  it('renders stats cards with correct counts after loading', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument()
    })
    expect(screen.getByText('254 tile types')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Items ≤ 50 pieces')).toBeInTheDocument()
  })

  it('renders top selling products section', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('Floor Tile A')).toBeInTheDocument()
    })
    expect(screen.getByText('Wall Tile B')).toBeInTheDocument()
    expect(screen.getByText('20 movements')).toBeInTheDocument()
  })

  it('renders warehouse detail section', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText(/WH-A/)).toBeInTheDocument()
    })
    expect(screen.getByText(/45 items/)).toBeInTheDocument()
  })

  it('renders sales activities section', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('Received')).toBeInTheDocument()
    })
    expect(screen.getByText('Dispatched')).toBeInTheDocument()
    expect(screen.getByText('30 pieces')).toBeInTheDocument()
    expect(screen.getByText('10 pieces')).toBeInTheDocument()
  })

  it('renders quick action links', () => {
    render(<Dashboard />)
    expect(screen.getByText('New Stock Take')).toBeInTheDocument()
    expect(screen.getByText('Add New Product')).toBeInTheDocument()
    expect(screen.getByText('Manage Orders')).toBeInTheDocument()
  })
})
