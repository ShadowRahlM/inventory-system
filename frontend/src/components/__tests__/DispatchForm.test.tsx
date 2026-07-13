import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { DispatchForm } from '../DispatchForm'
import { useDispatchInventory } from '../../hooks/useInventoryQueries'

const mockMutate = vi.fn()

vi.mock('../../hooks/useInventoryQueries', () => ({
  useDispatchInventory: vi.fn(() => ({
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

describe('DispatchForm', () => {
  it('renders form title heading', () => {
    render(<DispatchForm />)
    expect(screen.getByRole('heading', { name: /Dispatch Inventory/ })).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<DispatchForm />)
    expect(screen.getByRole('button', { name: /dispatch/i })).toBeInTheDocument()
  })

  it('shows all required field labels', () => {
    render(<DispatchForm />)
    expect(screen.getByText(/Tile/)).toBeInTheDocument()
    expect(screen.getByText(/Batch/)).toBeInTheDocument()
    expect(screen.getByText(/Cartons/)).toBeInTheDocument()
    expect(screen.getByText(/Location/)).toBeInTheDocument()
  })

  it('shows success message when mutation succeeds', () => {
    vi.mocked(useDispatchInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: true,
      isError: false,
      reset: vi.fn(),
      data: null,
      error: null,
    } as unknown as ReturnType<typeof useDispatchInventory>)
    render(<DispatchForm />)
    expect(screen.getByText(/dispatched successfully/i)).toBeInTheDocument()
  })

  it('shows error message when mutation fails', () => {
    vi.mocked(useDispatchInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: true,
      reset: vi.fn(),
      data: null,
      error: new Error('Not enough stock'),
    } as unknown as ReturnType<typeof useDispatchInventory>)
    render(<DispatchForm />)
    expect(screen.getByText(/Not enough stock/)).toBeInTheDocument()
  })
})
