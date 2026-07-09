import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { ReceiveInventoryForm } from '../InventoryForm'
import { useReceiveInventory } from '../../hooks/useInventoryQueries'

const mockMutate = vi.fn()

vi.mock('../../hooks/useInventoryQueries', () => ({
  useReceiveInventory: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    reset: vi.fn(),
    data: null,
    error: null,
  })),
  useTilesList: vi.fn(() => ({
    data: { results: [] },
    isLoading: false,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReceiveInventoryForm', () => {
  it('renders all form field labels', () => {
    render(<ReceiveInventoryForm />)
    expect(screen.getByText(/Tile/)).toBeInTheDocument()
    expect(screen.getByText(/Cartons/)).toBeInTheDocument()
    expect(screen.getByText(/Loose Pieces/)).toBeInTheDocument()
    expect(screen.getByText(/Location/)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ReceiveInventoryForm />)
    expect(screen.getByRole('button', { name: /receive/i })).toBeInTheDocument()
  })

  it('shows success message when mutation succeeds', () => {
    vi.mocked(useReceiveInventory).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: true,
      reset: vi.fn(),
      data: null,
      error: null,
    } as unknown as ReturnType<typeof useReceiveInventory>)
    render(<ReceiveInventoryForm />)
    expect(screen.getByText(/received successfully/i)).toBeInTheDocument()
  })
})
