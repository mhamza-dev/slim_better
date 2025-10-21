// React imports
import { useCallback, useMemo, useState } from 'react'

// Internal imports - Context
import { ToastContext, type Toast } from '../context/ToastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, ...t }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-[60] bottom-4 right-2 sm:right-4 left-2 sm:left-auto flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`min-w-[260px] max-w-[calc(100vw-1rem)] sm:max-w-none rounded-xl border px-4 py-3 shadow-lg backdrop-blur text-sm ${t.variant === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' :
            t.variant === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : 'bg-white/90 border-[#e6eef8] text-primaryDark'
            }`}>
            <div className="font-semibold">{t.title}</div>
            {t.description && <div className="text-xs opacity-80">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
