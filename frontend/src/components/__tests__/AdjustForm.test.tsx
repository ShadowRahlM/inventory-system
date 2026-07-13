import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { AdjustForm } from '../AdjustForm'
import { useAdjustInventory } from '../../hooks/useInventoryQueries'

const mockMutate = vi.fn()

vi.mock('../../hooks/useInventoryQueries', () => ({
  useAdjustInventory: vi.fn(() => ({
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

describe('AdjustForm', () => {
  it('renders form title heading', () => {
    render(<AdjustForm />)
    expect(screen.getByRole('heading', { name: /Adjust Inventory/ })).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<AdjustForm />)
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument()
  })

  it('shows required field labels', () => {
    render(<AdjustForm />)
    expect(screen.getByText(/Tile/)).toBeInTheDocument()
    expect(screen.getByText(/Batch/)).toBeInTheDocument()
    expect(screen.getByText(/Reason/)).toBeInTheDocument()
  })

  it('shows success message on success', () => {
    vi.mocked(useAdjustInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: true,
      isError: false,
      reset: vi.fn(),
      data: null,
      error: null,
    } as unknown as ReturnType<typeof useAdjustInventory>)
    render(<AdjustForm />)
    expect(screen.getByText(/adjusted successfully/i)).toBeInTheDocument()
  })

  it('shows error message on failure', () => {
    vi.mocked(useAdjustInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: true,
      reset: vi.fn(),
      data: null,
      error: new Error('Batch not found'),
    } as unknown as ReturnType<typeof useAdjustInventory>)
    render(<AdjustForm />)
    expect(screen.getByText(/Batch not found/)).toBeInTheDocument()
  })
})
