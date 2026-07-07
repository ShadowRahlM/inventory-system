import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { NewTile } from '../NewTile'
import { useAuthStore } from '../../lib/store'

const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
  default: {
    post: mockPost,
    get: mockGet,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'test', role: 'viewer' } })
  mockPost.mockResolvedValue({ data: { id: 'new1', sku: 'TEST-001' } })
})

describe('NewTile', () => {
  it('renders form heading', () => {
    render(<NewTile />)
    expect(screen.getByText('New Tile')).toBeInTheDocument()
  })

  it('renders brand selector with options', () => {
    render(<NewTile />)
    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.getByText('Goodwill')).toBeInTheDocument()
    expect(screen.getByText('Crown Crane')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('renders SKU, name, and dimensions fields', () => {
    render(<NewTile />)
    expect(screen.getByText(/SKU/)).toBeInTheDocument()
    expect(screen.getByText(/Name/)).toBeInTheDocument()
    expect(screen.getByText(/Dimensions/)).toBeInTheDocument()
  })

  it('renders image upload field', () => {
    render(<NewTile />)
    expect(screen.getByText(/Product Image/)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<NewTile />)
    expect(screen.getByRole('button', { name: /save tile/i })).toBeInTheDocument()
  })

  it('renders specifications fieldset', () => {
    render(<NewTile />)
    expect(screen.getByText('Specifications')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Finish')).toBeInTheDocument()
  })

  it('shows SKU warning banner when tile already exists', async () => {
    mockGet.mockResolvedValue({
      data: { exists: true, tile: { id: 'existing-1', name: 'Existing Tile', sku: 'GW-EXIST' } },
    })
    const user = userEvent.setup()
    render(<NewTile />)
    const skuInput = screen.getByPlaceholderText(/e\.g\. GW-COS/)
    await user.type(skuInput, 'GW-EXIST')
    await waitFor(() => {
      expect(screen.getByText(/already exists/)).toBeInTheDocument()
    }, { timeout: 1500 })
    expect(screen.getByRole('button', { name: /save tile/i })).toBeInTheDocument()
  })

  it('keeps save button present while SKU check is in flight', async () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<NewTile />)
    const skuInput = screen.getByPlaceholderText(/e\.g\. GW-COS/)
    await user.type(skuInput, 'GW-XXX')
    expect(screen.getByRole('button', { name: /save tile/i })).toBeInTheDocument()
  })

  it('submits form with new SKU after SKU check completes', async () => {
    mockGet.mockResolvedValue({
      data: { exists: false, tile: null },
    })
    mockPost.mockResolvedValue({ data: { id: 'new-99', sku: 'BR-NEW-001' } })
    const user = userEvent.setup()
    render(<NewTile />)
    await user.type(screen.getByPlaceholderText(/e\.g\. GW-COS/), 'BR-NEW-001')
    await user.type(screen.getByPlaceholderText(/e\.g\. Cosmos/), 'Brand New Tile')
    await user.type(screen.getByPlaceholderText(/e\.g\. 30x60/), '45x45cm')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save tile/i })).not.toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: /save tile/i }))
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
    })
    const callData = mockPost.mock.calls[0][1]
    expect(callData.get('sku')).toBe('BR-NEW-001')
    expect(callData.get('name')).toBe('Brand New Tile')
    expect(callData.get('dimensions')).toBe('45x45cm')
  })
})
