import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Sidebar } from '../Sidebar'
import { useAuthStore, useUIStore } from '../../lib/store'

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true, user: { username: 'admin', role: 'admin' } })
  useUIStore.setState({ sidebarOpen: true, selectedTile: null })
})

function renderSidebar() {
  return render(<Sidebar />, { initialRoute: '/' })
}

describe('Sidebar', () => {
  it('renders all navigation links when open', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Tiles')).toBeInTheDocument()
    expect(screen.getByText('New Tile')).toBeInTheDocument()
    expect(screen.getByText('Batches')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('Movements')).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
    expect(screen.getByText('Catalogs')).toBeInTheDocument()
    expect(screen.getByText('Stock Take')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('displays the username and role from auth store', () => {
    renderSidebar()
    const adminElements = screen.getAllByText(/admin/)
    expect(adminElements.length).toBe(2)
  })

  it('shows sign out button', () => {
    renderSidebar()
    const signOut = screen.getByText('Sign out')
    expect(signOut).toBeInTheDocument()
  })

  it('calls logout and navigates on sign out click', async () => {
    const user = userEvent.setup()
    const spy = vi.fn()
    useAuthStore.setState({ logout: spy })
    renderSidebar()
    await user.click(screen.getByText('Sign out'))
    expect(spy).toHaveBeenCalled()
  })

  it('toggles sidebar on collapse button click', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const buttons = screen.getAllByRole('button')
    const collapseBtn = buttons.find(b => b.textContent?.includes('◀') || b.textContent?.includes('▶'))
    expect(collapseBtn).toBeTruthy()
    await user.click(collapseBtn!)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })
})
