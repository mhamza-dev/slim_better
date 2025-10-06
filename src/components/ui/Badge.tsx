import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

type Variant = 'blue' | 'green' | 'gray' | 'red'

const variants: Record<Variant, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    gray: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

export function Badge({ className, variant = 'blue', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
    return <span className={clsx('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', variants[variant], className)} {...props} />
}


