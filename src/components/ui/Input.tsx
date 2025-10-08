import clsx from 'clsx'
import { forwardRef, type InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx('w-full px-3 py-2 rounded-lg border border-[#e6eef8] bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200', className)} {...props} />
})


