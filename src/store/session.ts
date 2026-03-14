import { create } from 'zustand'

interface SessionState {
  sessionExpiredOpen: boolean
  showSessionExpired: () => void
  hideSessionExpired: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionExpiredOpen: false,

  showSessionExpired: () => {
    set({ sessionExpiredOpen: true })
  },

  hideSessionExpired: () => {
    set({ sessionExpiredOpen: false })
  },
}))
