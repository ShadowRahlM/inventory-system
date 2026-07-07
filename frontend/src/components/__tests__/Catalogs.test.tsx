import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Catalogs } from '../Catalogs'
import { useAuthStore } from '../../lib/store'

const { inventoryApi } = vi.hoisted(() => {
  const catalogs = {
    count: 2,
    results: [
      { id: 'c1', name: 'Catalog A', description: 'Test catalog', json_data: {}, processed: false, uploaded_at: '2025-01-15T10:00:00Z', uploaded_by_username: 'manager' },
      { id: 'c2', name: 'Catalog B', description: '', json_data: {}, processed: true, uploaded_at: '2025-01-20T10:00:00Z', uploaded_by_username: null },
    ],
  }
  const processResult = {
    created: 5,
    skipped: 2,
    errors: [],
  }
  return {
    inventoryApi: {
      catalogs: {
        list: vi.fn(() => Promise.resolve(catalogs)),
        create: vi.fn(() => Promise.resolve({ id: 'c3', name: 'New Cat' })),
        delete: vi.fn(() => Promise.resolve({})),
        batchDelete: vi.fn(() => Promise.resolve({ deleted: 2 })),
        process: vi.fn(() => Promise.resolve(processResult)),
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

  it('renders JSON input form', () => {
    render(<Catalogs />)
    expect(screen.getByText('New Catalog (JSON)')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('JSON Data')).toBeInTheDocument()
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

  it('shows processed status', async () => {
    render(<Catalogs />)
    expect(await screen.findByText('Processed')).toBeInTheDocument()
  })

  it('renders action buttons per catalog', async () => {
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    expect(screen.getAllByText('Delete').length).toBe(2)
    expect(screen.getAllByText('Process').length).toBe(1)
  })

  it('does not show process button for already processed catalog', async () => {
    render(<Catalogs />)
    await screen.findByText('Catalog B')
    const processBtns = screen.queryAllByText('Process')
    expect(processBtns.length).toBe(1)
  })

  it('creates catalog via JSON input', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('New Catalog (JSON)')

    await user.type(screen.getByPlaceholderText('Catalog name'), 'Test JSON')
    const textarea = screen.getByPlaceholderText(/TILE-001/)
    await user.click(textarea)
    await user.paste('[{"sku": "T-1"}]')
    await user.click(screen.getByText('Save Catalog'))

    await waitFor(() => {
      expect(inventoryApi.catalogs.create).toHaveBeenCalledWith({
        name: 'Test JSON',
        description: '',
        json_data: [{ sku: 'T-1' }],
      })
    })
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

  it('shows process result after processing', async () => {
    const user = userEvent.setup()
    render(<Catalogs />)
    await screen.findByText('Catalog A')
    const processBtns = screen.getAllByText('Process')
    await user.click(processBtns[0])
    await waitFor(() => {
      expect(screen.getByText(/Created 5 tiles/)).toBeInTheDocument()
    })
  })

  it('shows validation error for empty name', async () => {
    render(<Catalogs />)
    await screen.findByText('Save Catalog')
    const textarea = screen.getByPlaceholderText(/TILE-001/)
    fireEvent.change(textarea, { target: { value: '[{"sku": "T-1"}]' } })
    const form = screen.getByText('Save Catalog').closest('form')!
    fireEvent.submit(form)
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})
