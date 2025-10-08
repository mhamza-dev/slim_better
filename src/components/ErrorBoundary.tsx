import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
    errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        })

        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }

    handleGoHome = () => {
        window.location.href = '/dashboard'
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f9ff] p-4">
                    <div className="text-center max-w-lg mx-auto">
                        {/* Error Icon */}
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            We're sorry, but something unexpected happened. Don't worry,
                            our team has been notified and we're working on it.
                        </p>

                        {/* Error Details (Development Only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
                                <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={this.handleRetry}
                                className="gap-2"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={this.handleGoHome}
                                className="gap-2"
                            >
                                <Home size={18} />
                                Go to Dashboard
                            </Button>
                        </div>

                        {/* Additional Help */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
                            <p className="text-sm text-gray-600">
                                If this problem persists, please contact support or try refreshing the page.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
