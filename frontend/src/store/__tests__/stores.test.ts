import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, useUIStore } from '../../lib/store'
import { useInventoryStore } from '../useInventoryStore'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ isAuthenticated: false, user: null })
  useUIStore.setState({ sidebarOpen: true, selectedTile: null })
  useInventoryStore.setState({
    layout: { sidebarOpen: true, activePanel: 'dashboard' },
    filters: { selectedTileId: null, selectedBatchId: null, selectedLocation: null, searchQuery: '' },
    errors: [],
  })
})

describe('useAuthStore', () => {
  it('starts unauthenticated with no user', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('setAuth updates authentication and user', () => {
    useAuthStore.getState().setAuth(true, { username: 'manager', role: 'manager' })
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual({ username: 'manager', role: 'manager' })
  })

  it('logout clears tokens and auth state', () => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('refresh_token', 'test-refresh')
    useAuthStore.getState().setAuth(true, { username: 'test', role: 'viewer' })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})

describe('useUIStore', () => {
  it('sidebar starts open', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('setSidebarOpen toggles sidebar state', () => {
    useUIStore.getState().setSidebarOpen(false)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    useUIStore.getState().setSidebarOpen(true)
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('setSelectedTile updates selected tile', () => {
    useUIStore.getState().setSelectedTile('tile-1')
    expect(useUIStore.getState().selectedTile).toBe('tile-1')
    useUIStore.getState().setSelectedTile(null)
    expect(useUIStore.getState().selectedTile).toBeNull()
  })
})

describe('useInventoryStore', () => {
  it('has correct initial state', () => {
    const state = useInventoryStore.getState()
    expect(state.layout.sidebarOpen).toBe(true)
    expect(state.layout.activePanel).toBe('dashboard')
    expect(state.filters.searchQuery).toBe('')
    expect(state.errors).toEqual([])
  })

  it('setSidebarOpen toggles layout sidebar', () => {
    useInventoryStore.getState().setSidebarOpen(false)
    expect(useInventoryStore.getState().layout.sidebarOpen).toBe(false)
  })

  it('setActivePanel switches panel', () => {
    useInventoryStore.getState().setActivePanel('tiles')
    expect(useInventoryStore.getState().layout.activePanel).toBe('tiles')
    useInventoryStore.getState().setActivePanel('stock')
    expect(useInventoryStore.getState().layout.activePanel).toBe('stock')
  })

  it('setSearchQuery updates filter', () => {
    useInventoryStore.getState().setSearchQuery('floor')
    expect(useInventoryStore.getState().filters.searchQuery).toBe('floor')
  })

  it('pushError adds an error banner', () => {
    useInventoryStore.getState().pushError({ message: 'Something went wrong', severity: 'error' })
    const errors = useInventoryStore.getState().errors
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Something went wrong')
    expect(errors[0].severity).toBe('error')
    expect(errors[0].id).toBeTruthy()
    expect(errors[0].timestamp).toBeGreaterThan(0)
  })

  it('pushError adds multiple errors', () => {
    useInventoryStore.getState().pushError({ message: 'Error 1', severity: 'error' })
    useInventoryStore.getState().pushError({ message: 'Warning 1', severity: 'warning' })
    expect(useInventoryStore.getState().errors).toHaveLength(2)
  })

  it('dismissError removes specific error by id', () => {
    useInventoryStore.getState().pushError({ message: 'Error 1', severity: 'error' })
    useInventoryStore.getState().pushError({ message: 'Error 2', severity: 'error' })
    const id = useInventoryStore.getState().errors[0].id
    useInventoryStore.getState().dismissError(id)
    expect(useInventoryStore.getState().errors).toHaveLength(1)
    expect(useInventoryStore.getState().errors[0].message).toBe('Error 2')
  })

  it('clearErrors removes all errors', () => {
    useInventoryStore.getState().pushError({ message: 'Error 1', severity: 'error' })
    useInventoryStore.getState().pushError({ message: 'Error 2', severity: 'warning' })
    useInventoryStore.getState().clearErrors()
    expect(useInventoryStore.getState().errors).toEqual([])
  })

  it('setSelectedTileId / setSelectedBatchId / setSelectedLocation update filters', () => {
    const store = useInventoryStore.getState()
    store.setSelectedTileId('tile-1')
    store.setSelectedBatchId('batch-1')
    store.setSelectedLocation('WH-A')
    const state = useInventoryStore.getState()
    expect(state.filters.selectedTileId).toBe('tile-1')
    expect(state.filters.selectedBatchId).toBe('batch-1')
    expect(state.filters.selectedLocation).toBe('WH-A')
  })
})
