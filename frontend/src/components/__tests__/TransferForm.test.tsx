import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { TransferForm } from '../TransferForm'
import { useTransferInventory } from '../../hooks/useInventoryQueries'

const mockMutate = vi.fn()

vi.mock('../../hooks/useInventoryQueries', () => ({
  useTransferInventory: vi.fn(() => ({
    mutate: mockMutate,
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

describe('TransferForm', () => {
  it('renders form title heading', () => {
    render(<TransferForm />)
    expect(screen.getByRole('heading', { name: /Transfer Inventory/ })).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<TransferForm />)
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument()
  })

  it('shows required field labels', () => {
    render(<TransferForm />)
    expect(screen.getByText(/From Location/)).toBeInTheDocument()
    expect(screen.getByText(/To Location/)).toBeInTheDocument()
    expect(screen.getByText(/Cartons/)).toBeInTheDocument()
  })

  it('shows success message on success', () => {
    vi.mocked(useTransferInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: true,
      isError: false,
      reset: vi.fn(),
      data: null,
      error: null,
    } as unknown as ReturnType<typeof useTransferInventory>)
    render(<TransferForm />)
    expect(screen.getByText(/transferred successfully/i)).toBeInTheDocument()
  })

  it('shows error message on failure', () => {
    vi.mocked(useTransferInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: true,
      reset: vi.fn(),
      data: null,
      error: new Error('Insufficient stock'),
    } as unknown as ReturnType<typeof useTransferInventory>)
    render(<TransferForm />)
    expect(screen.getByText(/Insufficient stock/)).toBeInTheDocument()
  })
})
