import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initSession, clearSession, useSessionTimeout, saveRedirectPath, getRedirectPath, clearRedirectPath } from '../useSessionTimeout'
import { useAuthStore } from '../store'
import React from 'react'
import { render, cleanup } from '@testing-library/react'

let unmountHook: (() => void) | null = null

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  unmountHook = null
})

afterEach(() => {
  if (unmountHook) {
    unmountHook()
    unmountHook = null
  }
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('initSession', () => {
  it('sets tab_id in sessionStorage', () => {
    initSession()
    expect(sessionStorage.getItem('tab_id')).not.toBeNull()
  })

  it('sets last_activity in localStorage', () => {
    initSession()
    expect(localStorage.getItem('last_activity')).not.toBeNull()
  })

  it('generates unique tab_ids on each call', () => {
    initSession()
    const first = sessionStorage.getItem('tab_id')
    sessionStorage.clear()
    initSession()
    const second = sessionStorage.getItem('tab_id')
    expect(first).not.toBe(second)
  })
})

describe('clearSession', () => {
  it('removes tab_id from sessionStorage', () => {
    sessionStorage.setItem('tab_id', 'test-tab')
    clearSession()
    expect(sessionStorage.getItem('tab_id')).toBeNull()
  })

  it('removes last_activity from localStorage', () => {
    localStorage.setItem('last_activity', '12345')
    clearSession()
    expect(localStorage.getItem('last_activity')).toBeNull()
  })
})

describe('redirect path', () => {
  it('saveRedirectPath stores current path', () => {
    window.history.pushState({}, '', '/tiles?edit=abc')
    saveRedirectPath()
    expect(getRedirectPath()).toBe('/tiles?edit=abc')
  })

  it('getRedirectPath returns null when nothing saved', () => {
    expect(getRedirectPath()).toBeNull()
  })

  it('clearRedirectPath removes saved path', () => {
    localStorage.setItem('redirect_after_login', '/tiles')
    clearRedirectPath()
    expect(getRedirectPath()).toBeNull()
  })

  it('saveRedirectPath ignores /login', () => {
    window.history.pushState({}, '', '/login')
    saveRedirectPath()
    expect(getRedirectPath()).toBeNull()
  })

  it('saveRedirectPath ignores /register', () => {
    window.history.pushState({}, '', '/register')
    saveRedirectPath()
    expect(getRedirectPath()).toBeNull()
  })
})

describe('useSessionTimeout', () => {
  it('calls logout when tab_id is missing', () => {
    const logout = vi.fn()
    useAuthStore.setState({ logout })
    window.history.pushState({}, '', '/tiles')
    renderHook(useSessionTimeout)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(getRedirectPath()).toBe('/tiles')
  })

  it('calls logout when idle > 5 min', () => {
    const logout = vi.fn()
    useAuthStore.setState({ logout })
    sessionStorage.setItem('tab_id', 'test-tab')
    localStorage.setItem('last_activity', '0')
    window.history.pushState({}, '', '/inventory')
    renderHook(useSessionTimeout)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(getRedirectPath()).toBe('/inventory')
  })

  it('does not call logout when session is active', () => {
    const logout = vi.fn()
    useAuthStore.setState({ logout })
    sessionStorage.setItem('tab_id', 'test-tab')
    localStorage.setItem('last_activity', String(Date.now()))
    renderHook(useSessionTimeout)
    expect(logout).not.toHaveBeenCalled()
  })

  it('updates last_activity on user events', () => {
    const logout = vi.fn()
    useAuthStore.setState({ logout })
    sessionStorage.setItem('tab_id', 'test-tab')
    localStorage.setItem('last_activity', String(Date.now()))
    renderHook(useSessionTimeout)

    const oldActivity = localStorage.getItem('last_activity')
    window.dispatchEvent(new MouseEvent('mousedown'))
    const newActivity = localStorage.getItem('last_activity')
    expect(newActivity).not.toBe(oldActivity)
  })

  it('logs out after idle timeout via interval check', () => {
    vi.useFakeTimers()
    const logout = vi.fn()
    useAuthStore.setState({ logout })
    sessionStorage.setItem('tab_id', 'test-tab')
    localStorage.setItem('last_activity', String(Date.now()))
    renderHook(useSessionTimeout)

    expect(logout).not.toHaveBeenCalled()

    localStorage.setItem('last_activity', String(Date.now() - 6 * 60 * 1000))
    vi.advanceTimersByTime(31 * 1000)

    expect(logout).toHaveBeenCalled()
    vi.useRealTimers()
  })
})

function renderHook(hook: () => void) {
  function TestComponent() {
    hook()
    return null
  }
  const result = render(React.createElement(TestComponent))
  unmountHook = result.unmount
}
