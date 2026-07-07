import { useEffect, useRef } from 'react'
import { useAuthStore } from './store'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000
const TAB_ID_KEY = 'tab_id'
const LAST_ACTIVITY_KEY = 'last_activity'
const REDIRECT_KEY = 'redirect_after_login'

function generateTabId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function initSession() {
  sessionStorage.setItem(TAB_ID_KEY, generateTabId())
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}

export function clearSession() {
  sessionStorage.removeItem(TAB_ID_KEY)
  localStorage.removeItem(LAST_ACTIVITY_KEY)
}

export function saveRedirectPath() {
  const path = window.location.pathname + window.location.search
  if (path !== '/login' && path !== '/register') {
    localStorage.setItem(REDIRECT_KEY, path)
  }
}

export function getRedirectPath(): string | null {
  return localStorage.getItem(REDIRECT_KEY)
}

export function clearRedirectPath() {
  localStorage.removeItem(REDIRECT_KEY)
}

export function useSessionTimeout() {
  const logout = useAuthStore((s) => s.logout)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const tabId = sessionStorage.getItem(TAB_ID_KEY)
    if (!tabId) {
      saveRedirectPath()
      logout()
      return
    }

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
    if (lastActivity) {
      const idleMs = Date.now() - Number(lastActivity)
      if (idleMs > IDLE_TIMEOUT_MS) {
        saveRedirectPath()
        logout()
        return
      }
    }

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    const events = ['mousedown', 'keydown', 'touchstart'] as const
    for (const event of events) {
      window.addEventListener(event, updateActivity)
    }

    const checkIdle = () => {
      const last = localStorage.getItem(LAST_ACTIVITY_KEY)
      if (last) {
        const idle = Date.now() - Number(last)
        if (idle > IDLE_TIMEOUT_MS) {
          saveRedirectPath()
          logout()
        }
      }
    }

    timerRef.current = setInterval(checkIdle, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', checkIdle)

    return () => {
      for (const event of events) {
        window.removeEventListener(event, updateActivity)
      }
      document.removeEventListener('visibilitychange', checkIdle)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [logout])
}
