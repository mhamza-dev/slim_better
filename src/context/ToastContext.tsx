import { createContext } from 'react'

export type Toast = { id: number; title: string; description?: string; variant?: 'success' | 'error' | 'info' }

export const ToastContext = createContext<{
  show: (t: Omit<Toast, 'id'>) => void
} | null>(null)
