import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { TileList } from '../TileList'
import { useAuthStore } from '../../lib/store'

const { inventoryApi } = vi.hoisted(() => {
  const t1 = { id: '1', sku: 'SKU-001', name: 'Floor Tile A', category: 'Floor', dimensions: '60x60cm', pieces_per_carton: 4, image: null, brand: 'goodwill', series: 'Cosmos', tier: 'standard', tile_type: 'Glazed', finish: 'Matte', thickness: '8mm', coverage_per_box: '1.44m²', use_case: 'Living rooms', description: '', is_mix: false, created_at: '2025-01-01', updated_at: '2025-01-01' }
  const t2 = { id: '2', sku: 'SKU-002', name: 'Wall Tile B', category: 'Wall', dimensions: '30x60cm', pieces_per_carton: 8, image: null, brand: 'crown_crane', series: 'Noble', tier: 'premium', tile_type: 'Porcelain', finish: 'Glossy', thickness: '10mm', coverage_per_box: '1.44m²', use_case: 'Bathroom', description: '', is_mix: true, created_at: '2025-01-02', updated_at: '2025-01-02' }
  return {
    inventoryApi: {
      tiles: {
        list: vi.fn().mockResolvedValue({ count: 2, results: [t1, t2] }),
        batchDelete: vi.fn().mockResolvedValue({ deleted: 2 }),
        update: vi.fn().mockImplementation((id: string) => Promise.resolve({ ...t1, id })),
        delete: vi.fn().mockResolvedValue({}),
      },
      stock: {
        list: vi.fn().mockResolvedValue({ count: 0, results: [] }),
      },
    },
  }
})

vi.mock('../../api/inventoryApi', () => ({ inventoryApi }))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'test', role: 'admin' } })
})

describe('TileList', () => {
  it('renders location group headers', async () => {
    render(<TileList />)
    expect(await screen.findByText('Unstocked')).toBeInTheDocument()
    expect(await screen.findByText('2 products')).toBeInTheDocument()
  })

  it('renders tile data from API', async () => {
    render(<TileList />)
    expect(await screen.findByText('SKU-001')).toBeInTheDocument()
    expect(await screen.findByText('SKU-002')).toBeInTheDocument()
  })

  it('renders checkboxes for admin', async () => {
    render(<TileList />)
    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders action buttons per card', async () => {
    render(<TileList />)
    const editButtons = await screen.findAllByRole('button', { name: /edit/i })
    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows delete confirmation modal', async () => {
    const user = userEvent.setup()
    render(<TileList />)
    const deleteBtn = (await screen.findAllByRole('button', { name: /delete/i }))[0]
    await user.click(deleteBtn)
    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
  })

  it('deletes tile after confirmation', async () => {
    const user = userEvent.setup()
    render(<TileList />)
    const deleteBtn = (await screen.findAllByRole('button', { name: /delete/i }))[0]
    await user.click(deleteBtn)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])
    await waitFor(() => {
      expect(inventoryApi.tiles.delete).toHaveBeenCalled()
    })
  })

  it('shows edit modal with is_mix checkbox and allows updating', async () => {
    const user = userEvent.setup()
    render(<TileList />)
    const editBtn = (await screen.findAllByRole('button', { name: /edit/i }))[0]
    await user.click(editBtn)
    expect(screen.getByText(/Edit Tile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mixed\/Temporary Bin/i)).toBeInTheDocument()
    const nameInput = screen.getByDisplayValue('Floor Tile A')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Tile')
    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)
    await waitFor(() => {
      expect(inventoryApi.tiles.update).toHaveBeenCalled()
    })
  })

  it('searches tiles when user types', async () => {
    const user = userEvent.setup()
    render(<TileList />)
    const searchInput = await screen.findByPlaceholderText(/Search by SKU/)
    await user.clear(searchInput)
    await user.type(searchInput, 'floor')
    await waitFor(() => {
      expect(inventoryApi.tiles.list).toHaveBeenCalledWith({ search: 'floor', page_size: 5000 })
    })
  })
})
