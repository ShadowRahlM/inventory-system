import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { UserManagement } from '../UserManagement'
import { useAuthStore } from '../../lib/store'

const mockUsers = [
  { id: 1, username: 'admin1', email: 'admin@test.com', first_name: '', last_name: '', is_active: true, role: 'admin' },
  { id: 2, username: 'manager1', email: 'manager@test.com', first_name: '', last_name: '', is_active: true, role: 'manager' },
  { id: 3, username: 'viewer1', email: 'viewer@test.com', first_name: '', last_name: '', is_active: false, role: 'viewer' },
]

vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    users: {
      list: vi.fn(() => Promise.resolve({ count: 3, results: mockUsers })),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(() => Promise.resolve({})),
      setRole: vi.fn(() => Promise.resolve({ success: true, data: {} })),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'admin1', role: 'admin' } })
})

describe('UserManagement', () => {
  it('renders the title', async () => {
    render(<UserManagement />)
    expect(await screen.findByText('User Management')).toBeInTheDocument()
  })

  it('shows user list after loading', async () => {
    render(<UserManagement />)
    expect(await screen.findByText('admin1')).toBeInTheDocument()
    expect(await screen.findByText('manager1')).toBeInTheDocument()
    expect(await screen.findByText('viewer1')).toBeInTheDocument()
  })

  it('shows New User button for admin', async () => {
    render(<UserManagement />)
    expect(await screen.findByText('+ New User')).toBeInTheDocument()
  })

  it('shows role badges for each user', async () => {
    render(<UserManagement />)
    expect(await screen.findByText('admin')).toBeInTheDocument()
    expect(await screen.findByText('manager')).toBeInTheDocument()
    expect(await screen.findByText('viewer')).toBeInTheDocument()
  })

  it('shows Active/Inactive status', async () => {
    render(<UserManagement />)
    const activeElements = await screen.findAllByText('Active')
    expect(activeElements.length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('Inactive')).toBeInTheDocument()
  })

  it('does not show New User button for viewer role', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { username: 'viewer1', role: 'viewer' } })
    render(<UserManagement />)
    await screen.findByText('User Management')
    expect(screen.queryByText('+ New User')).not.toBeInTheDocument()
  })

  it('shows edit and delete buttons for admin', async () => {
    render(<UserManagement />)
    const editButtons = await screen.findAllByText('Edit')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
    const deleteButtons = await screen.findAllByText('Delete')
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })
})
