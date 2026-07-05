import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Catalogs } from '../Catalogs'
import { useAuthStore } from '../../lib/store'

const { inventoryApi } = vi.hoisted(() => {
  const catalogs = {
    count: 2,
    results: [
      { id: 'c1', name: 'Catalog A', description: 'Test catalog', file: '/media/cats/a.pdf', uploaded_at: '2025-01-15T10:00:00Z', uploaded_by_username: 'manager' },
      { id: 'c2', name: 'Catalog B', description: '', file: '/media/cats/b.pdf', uploaded_at: '2025-01-20T10:00:00Z', uploaded_by_username: null },
    ],
  }
  const extResult = {
    products_found: 15,
    products_created: 10,
    products_skipped: 5,
    total_pages: 3,
    processed_pages: 3,
    cells_per_page: [6, 5, 4],
    page_errors: [] as string[],
    breakdown: { no_sku_detected: 3, already_in_db: 2, error: 0 },
    debug_first_50_sku: [
      { page: 1, name: 'Tile 1', sku: 'TILE-001', brand: 'goodwill', series: 'Cosmos', tier: 'standard', tile_type: 'Glazed', finish: 'Matte', thickness: '8mm', coverage_per_box: '1.44m²', use_case: 'Floor', image_filename: 'TILE-001.png', ocr_snippet: 'Tile 1 description' },
    ],
    products: [
      { id: 'p1', sku: 'TILE-001', image: null },
      { id: 'p2', sku: 'TILE-002', image: '/media/tiles/tile-002.png' },
    ],
  }
  return {
    inventoryApi: {
      catalogs: {
        list: vi.fn(() => Promise.resolve(catalogs)),
        create: vi.fn(() => Promise.resolve({ id: 'c3', name: 'New Cat' })),
        delete: vi.fn(() => Promise.resolve({})),
        batchDelete: vi.fn(() => Promise.resolve({ deleted: 2 })),
        extract: vi.fn(() => Promise.resolve(extResult)),
      },
    },
  }
})

vi.mock('../../api/inventoryApi', () => ({ inventoryApi }))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'test', role: 'admin' } })
})

describe('Catalogs', () => {
  it('renders heading', () => {
    render(<Catalogs />)
    expect(screen.getByText('Tile Catalogs')).toBeInTheDocument()
  })

  it('renders upload form', () => {
    render(<Catalogs />)
    expect(screen.getByText('Upload Catalog PDF')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('PDF File')).toBeInTheDocument()
  })

  it('renders catalog list', async () => {
    render(<Catalogs />)
    expect(await screen.findByText('Catalog A')).toBeInTheDocument()
    expect(await screen.findByText('Catalog B')).toBeInTheDocument()
  })

  it('shows upload date and user', async () => {
    render(<Catalogs />)
    expect(await screen.findByText(/manager/)).toBeInTheDocument()
  })

  it('renders action buttons for each catalog', async () => {
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    expect(screen.getAllByText('View PDF').length).toBe(2)
    expect(screen.getAllByText('Extract').length).toBe(2)
    expect(screen.getAllByText('Delete').length).toBe(2)
  })

  it('shows delete confirmation modal', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const deleteBtn = screen.getAllByText('Delete')[0]
    await user.click(deleteBtn)
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
  })

  it('deletes catalog after confirmation', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const deleteBtn = screen.getAllByText('Delete')[0]
    await user.click(deleteBtn)
    const modalDeleteBtns = screen.getAllByRole('button', { name: /delete/i })
    const modalDeleteBtn = modalDeleteBtns[modalDeleteBtns.length - 1]
    await user.click(modalDeleteBtn)
    await waitFor(() => {
      expect(inventoryApi.catalogs.delete).toHaveBeenCalledWith('c1')
    })
  })

  it('renders catalog checkboxes (excluding select-all)', async () => {
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
  })

  it('shows extract result after extraction', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const extractBtns = screen.getAllByText('Extract')
    await user.click(extractBtns[0])
    await waitFor(() => {
      expect(screen.getByText(/Found 15 products/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Created 10 new tiles/)).toBeInTheDocument()
  })

  it('shows image grid when products have images', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const extractBtns = screen.getAllByText('Extract')
    await user.click(extractBtns[0])
    await waitFor(() => {
      expect(screen.getByText('TILE-002')).toBeInTheDocument()
    })
  })
})
