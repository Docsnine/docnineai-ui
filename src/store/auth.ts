/**
 * auth.ts — Auth Zustand store backed by real backend APIs.
 *
 * Access token lives in memory only (not localStorage).
 * The refresh token is a server-set httpOnly cookie — the browser
 * sends it automatically on POST /auth/refresh (credentials: 'include').
 *
 * initAuth() is called once at app startup (App.tsx) to restore session.
 */
import { create } from 'zustand'
import { authApi, setAccessToken, User } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  initialized: boolean           // Has the silent-refresh check completed?

  setTokens: (user: User, token: string) => void
  clearAuth: () => void
  initAuth: () => Promise<void>  // Called once on app mount
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,

  /** Called after a successful login / signup. */
  setTokens: (user, token) => {
    setAccessToken(token)
    set({ user, isAuthenticated: true })
  },

  /** Called on logout or on failed refresh. */
  clearAuth: () => {
    setAccessToken(null)
    set({ user: null, isAuthenticated: false })
  },

  /**
   * On app startup:
   *  1. Try GET /auth/me with the token we already have in memory (no-op on
   *     first load since token is null).
   *  2. Fall back to POST /auth/refresh which sends the httpOnly cookie.
   *  3. Mark initialized = true regardless of outcome so the app renders.
   */
  initAuth: async () => {
    try {
      const data = await authApi.refresh()
      setAccessToken(data.accessToken)
      set({ user: data.user, isAuthenticated: true })
    } catch {
      // No valid session — remain logged out.
      setAccessToken(null)
    } finally {
      set({ initialized: true })
    }
  },
}))
