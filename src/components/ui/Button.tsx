// Third-party imports
import clsx from 'clsx'

// React imports
import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none'
const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-blue-600 focus:ring-blue-300',
    secondary: 'bg-gray-100 text-primaryDark hover:bg-gray-200 focus:ring-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
    ghost: 'bg-transparent text-primary hover:bg-blue-50 focus:ring-blue-200',
}
const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-2.5 text-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = 'primary', size = 'md', ...props }, ref) {
    return <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
})
