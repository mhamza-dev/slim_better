import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ZodError } from 'zod'

// Error types
export interface AppError {
    code: string
    message: string
    details?: any
    timestamp: string
}

export interface ValidationError extends AppError {
    code: 'VALIDATION_ERROR'
    fieldErrors: Record<string, string[]>
}

export interface DatabaseError extends AppError {
    code: 'DATABASE_ERROR'
    originalError?: any
}

export interface NetworkError extends AppError {
    code: 'NETWORK_ERROR'
    status?: number
}

export interface AuthError extends AppError {
    code: 'AUTH_ERROR'
}

// Error factory functions
export function createValidationError(zodError: ZodError): ValidationError {
    const fieldErrors: Record<string, string[]> = {}

    zodError.issues.forEach((error) => {
        const path = error.path.join('.')
        if (!fieldErrors[path]) {
            fieldErrors[path] = []
        }
        fieldErrors[path].push(error.message)
    })

    return {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fieldErrors,
        timestamp: new Date().toISOString()
    }
}

export function createDatabaseError(error: any): DatabaseError {
    return {
        code: 'DATABASE_ERROR',
        message: error.message || 'Database operation failed',
        originalError: error,
        timestamp: new Date().toISOString()
    }
}

export function createNetworkError(error: any): NetworkError {
    return {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network request failed',
        status: error.status,
        timestamp: new Date().toISOString()
    }
}

export function createAuthError(message: string): AuthError {
    return {
        code: 'AUTH_ERROR',
        message,
        timestamp: new Date().toISOString()
    }
}

// Error handler utility
export function handleError(error: unknown): AppError {
    if (error instanceof ZodError) {
        return createValidationError(error)
    }

    if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return createNetworkError(error)
        }

        if (error.message.includes('auth') || error.message.includes('permission')) {
            return createAuthError(error.message)
        }

        // Default to database error for unknown errors
        return createDatabaseError(error)
    }

    // Fallback for unknown error types
    return {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        details: error,
        timestamp: new Date().toISOString()
    }
}

// Error display component
interface ErrorDisplayProps {
    error: AppError
    onRetry?: () => void
    onDismiss?: () => void
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
    const getErrorIcon = () => {
        switch (error.code) {
            case 'VALIDATION_ERROR':
                return '⚠️'
            case 'DATABASE_ERROR':
                return '🗄️'
            case 'NETWORK_ERROR':
                return '🌐'
            case 'AUTH_ERROR':
                return '🔐'
            default:
                return '❌'
        }
    }

    const getErrorTitle = () => {
        switch (error.code) {
            case 'VALIDATION_ERROR':
                return 'Validation Error'
            case 'DATABASE_ERROR':
                return 'Database Error'
            case 'NETWORK_ERROR':
                return 'Network Error'
            case 'AUTH_ERROR':
                return 'Authentication Error'
            default:
                return 'Error'
        }
    }

    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <span className="text-2xl">{getErrorIcon()}</span>
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                        {getErrorTitle()}
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                        <p>{error.message}</p>

                        {error.code === 'VALIDATION_ERROR' && 'fieldErrors' in error && (
                            <div className="mt-2">
                                <ul className="list-disc list-inside space-y-1">
                                    {Object.entries((error as ValidationError).fieldErrors).map(([field, errors]) => (
                                        <li key={field}>
                                            <strong>{field}:</strong> {errors.join(', ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex space-x-3">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
                            >
                                Retry
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Error fallback component for ErrorBoundary
interface ErrorFallbackProps {
    error: Error
    resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    const appError = handleError(error)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full">
                <ErrorDisplay
                    error={appError}
                    onRetry={resetErrorBoundary}
                />
            </div>
        </div>
    )
}

// Enhanced ErrorBoundary component
interface AppErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<ErrorFallbackProps>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function AppErrorBoundary(props: AppErrorBoundaryProps): React.ReactElement {
    const { children, fallback: Fallback = ErrorFallback, onError } = props

    const handleErrorCallback = (error: Error, errorInfo: React.ErrorInfo) => {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        onError?.(error, errorInfo)
    }

    return (
        <ErrorBoundary
            FallbackComponent={Fallback}
            onError={handleErrorCallback}
        >
            {children}
        </ErrorBoundary>
    )
}

// Hook for error handling in components
export function useErrorHandler() {
    const [error, setError] = React.useState<AppError | null>(null)

    const handleErrorCallback = React.useCallback((err: unknown) => {
        const appError = handleError(err)
        setError(appError)
        return appError
    }, [])

    const clearError = React.useCallback(() => {
        setError(null)
    }, [])

    const handleAsync = React.useCallback(async <T,>(
        asyncFn: () => Promise<T>
    ): Promise<T | null> => {
        try {
            clearError()
            return await asyncFn()
        } catch (err) {
            handleErrorCallback(err)
            return null
        }
    }, [handleErrorCallback, clearError])

    return {
        error,
        handleError: handleErrorCallback,
        clearError,
        handleAsync
    }
}

// Toast notification for errors
interface ErrorToastProps {
    error: AppError
    onDismiss: () => void
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
    React.useEffect(() => {
        const timer = setTimeout(onDismiss, 5000)
        return () => clearTimeout(timer)
    }, [onDismiss])

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            <ErrorDisplay error={error} onDismiss={onDismiss} />
        </div>
    )
}

// Error context for global error handling
interface ErrorContextType {
    errors: AppError[]
    addError: (error: AppError) => void
    removeError: (index: number) => void
    clearErrors: () => void
}

const ErrorContext = React.createContext<ErrorContextType | null>(null)

export function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [errors, setErrors] = React.useState<AppError[]>([])

    const addError = React.useCallback((error: AppError) => {
        setErrors(prev => [...prev, error])
    }, [])

    const removeError = React.useCallback((index: number) => {
        setErrors(prev => prev.filter((_, i) => i !== index))
    }, [])

    const clearErrors = React.useCallback(() => {
        setErrors([])
    }, [])

    const value = React.useMemo(() => ({
        errors,
        addError,
        removeError,
        clearErrors
    }), [errors, addError, removeError, clearErrors])

    return (
        <ErrorContext.Provider value={value}>
            {children}
            {errors.map((error, index) => (
                <ErrorToast
                    key={index}
                    error={error}
                    onDismiss={() => removeError(index)}
                />
            ))}
        </ErrorContext.Provider>
    )
}

export function useErrorContext() {
    const context = React.useContext(ErrorContext)
    if (!context) {
        throw new Error('useErrorContext must be used within an ErrorProvider')
    }
    return context
}