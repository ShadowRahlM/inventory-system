import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/utils'
import { InventoryPage } from '../InventoryPage'

vi.mock('../../hooks/useInventoryQueries', () => ({
  useStockList: vi.fn(() => ({
    data: { count: 0, results: [] },
    isLoading: false,
    error: null,
  })),
  useMovementsList: vi.fn(() => ({
    data: { count: 0, results: [] },
    isLoading: false,
    error: null,
  })),
  useAuditLogsList: vi.fn(() => ({
    data: { count: 0, results: [] },
    isLoading: false,
    error: null,
  })),
  useReceiveInventory: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: vi.fn(),
    data: null,
    error: null,
  })),
  useDispatchInventory: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: vi.fn(),
    data: null,
    error: null,
  })),
  useAdjustInventory: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: vi.fn(),
    data: null,
    error: null,
  })),
  useTransferInventory: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: vi.fn(),
    data: null,
    error: null,
  })),
  useTilesList: vi.fn(() => ({
    data: { count: 0, results: [] },
    isLoading: false,
  })),
  useBatchesList: vi.fn(() => ({
    data: { count: 0, results: [] },
    isLoading: false,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InventoryPage', () => {
  it('renders the title', () => {
    render(<InventoryPage />)
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('renders all tabs', () => {
    render(<InventoryPage />)
    expect(screen.getByText('Stock View')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Adjust')).toBeInTheDocument()
    expect(screen.getByText('Transfer')).toBeInTheDocument()
    expect(screen.getByText('Movements')).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
  })

  it('starts on Stock View tab', () => {
    render(<InventoryPage />)
    expect(screen.getByText('No stock records found')).toBeInTheDocument()
  })

  it('switches to Receive tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Receive'))
    const headings = screen.getAllByRole('heading', { name: /Receive Inventory/ })
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Dispatch tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Dispatch'))
    const headings = screen.getAllByRole('heading', { name: /Dispatch Inventory/ })
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Adjust tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Adjust'))
    const headings = screen.getAllByRole('heading', { name: /Adjust Inventory/ })
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Transfer tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Transfer'))
    const headings = screen.getAllByRole('heading', { name: /Transfer Inventory/ })
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Movements tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Movements'))
    expect(screen.getByText(/No movements recorded yet/)).toBeInTheDocument()
  })

  it('switches to Audit Logs tab on click', () => {
    render(<InventoryPage />)
    fireEvent.click(screen.getByText('Audit Logs'))
    expect(screen.getByText(/No audit logs yet/)).toBeInTheDocument()
  })
})
