import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { NewTile } from '../NewTile'
import { useAuthStore } from '../../lib/store'

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { id: 'new1', sku: 'TEST-001' } }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'test', role: 'viewer' } })
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
})
