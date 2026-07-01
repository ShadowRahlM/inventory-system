import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Dashboard } from '../Dashboard'
import { useAuthStore } from '../../lib/store'

const { inventoryApi } = vi.hoisted(() => {
  const tiles = {
    count: 254,
    results: [
      { id: '1', sku: 'SKU-001', name: 'Floor Tile A', category: 'Floor', dimensions: '60x60cm', pieces_per_carton: 4, image: null, brand: 'goodwill', series: 'Cosmos', tier: 'standard', tile_type: '', finish: '', thickness: '', coverage_per_box: '', use_case: '', description: '', created_at: '', updated_at: '' },
      { id: '2', sku: 'SKU-002', name: 'Wall Tile B', category: 'Wall', dimensions: '30x60cm', pieces_per_carton: 8, image: null, brand: 'crown_crane', series: 'Noble', tier: 'premium', tile_type: '', finish: '', thickness: '', coverage_per_box: '', use_case: '', description: '', created_at: '', updated_at: '' },
    ],
  }
  const stock = {
    count: 5,
    results: [
      { id: 's1', tile_sku: 'SKU-001', batch_number: 'B001', location: 'WH-A', cartons: 10, loose_pieces: 5, total_pieces: 45 },
      { id: 's2', tile_sku: 'SKU-002', batch_number: 'B002', location: 'WH-B', cartons: 5, loose_pieces: 0, total_pieces: 40 },
    ],
  }
  return {
    inventoryApi: {
      tiles: { list: vi.fn(() => Promise.resolve(tiles)) },
      stock: { list: vi.fn(() => Promise.resolve(stock)) },
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
    expect(screen.getByText('Total Tiles')).toBeInTheDocument()
    expect(screen.getByText('Inventory Items')).toBeInTheDocument()
    expect(screen.getAllByText('Total Pieces').length).toBeGreaterThanOrEqual(1)
  })

  it('renders stats cards with correct counts after loading', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('254')).toBeInTheDocument()
    })
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<Dashboard />)
    expect(screen.getByPlaceholderText(/Search by SKU/)).toBeInTheDocument()
  })

  it('shows recent inventory items table after loading', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument()
    })
    expect(screen.getByText('B001')).toBeInTheDocument()
    expect(screen.getByText('WH-A')).toBeInTheDocument()
  })

  it('searches tiles when user types', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    const searchInput = await screen.findByPlaceholderText(/Search by SKU/)
    await user.type(searchInput, 'floor')
    await waitFor(() => {
      expect(screen.getByText('Floor Tile A')).toBeInTheDocument()
    })
  })
})
