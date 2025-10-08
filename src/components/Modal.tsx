import { useEffect } from 'react'

export default function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        if (open) document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-[#e6eef8] animate-[fadeIn_150ms_ease-out]">
                <div className="p-4 sm:p-5">
                    {title && <div className="text-lg font-bold text-primaryDark mb-3">{title}</div>}
                    <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 hover:text-gray-700" aria-label="Close">×</button>
                    {children}
                </div>
            </div>
        </div>
    )
}


