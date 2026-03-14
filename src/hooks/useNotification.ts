import { useState, useCallback } from "react"

export type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
}

export function useNotification(autoClearMs = 5000) {
  const [notification, setNotification] = useState<Notification | null>(null)

  const show = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message })
    if (autoClearMs > 0) {
      setTimeout(() => setNotification(null), autoClearMs)
    }
  }, [autoClearMs])

  const success = useCallback((message: string) => show("success", message), [show])
  const error = useCallback((message: string) => show("error", message), [show])
  const clear = useCallback(() => setNotification(null), [])

  return {
    notification,
    show,
    success,
    error,
    clear,
  }
}
