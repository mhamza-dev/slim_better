// React imports
import { useContext } from 'react'

// Internal imports - Context
import { ToastContext } from '../context/ToastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
