// React Router imports
import { useRouteError, useNavigate } from 'react-router-dom'

// Third-party imports
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

// Internal imports - Components
import { Button } from '../components/ui/Button'

export default function ErrorPage() {
    const error = useRouteError() as any
    const navigate = useNavigate()

    const isNotFound = error?.status === 404
    const errorMessage = error?.statusText || error?.message || 'An unexpected error occurred'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f9ff] p-4">
            <div className="text-center max-w-lg mx-auto">
                {/* Error Icon */}
                <div className="mb-6">
                    <div className={`w-16 h-16 ${isNotFound ? 'bg-blue-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <AlertTriangle className={`w-8 h-8 ${isNotFound ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                </div>

                {/* Error Message */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {isNotFound ? 'Page Not Found' : 'Something went wrong'}
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    {isNotFound
                        ? "Sorry, the page you're looking for doesn't exist or has been moved."
                        : "We're sorry, but something unexpected happened. Don't worry, our team has been notified."
                    }
                </p>

                {/* Error Details */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Error Details:</h3>
                    <p className="text-sm text-gray-600">
                        {errorMessage}
                    </p>
                    {error?.status && (
                        <p className="text-xs text-gray-500 mt-1">
                            Status Code: {error.status}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={() => navigate('/dashboard')}
                        className="gap-2"
                    >
                        <Home size={18} />
                        Go to Dashboard
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </Button>
                </div>

                {/* Additional Help */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
                    <p className="text-sm text-blue-700">
                        {isNotFound
                            ? "If you believe this is an error, please check the URL or contact support."
                            : "If this problem persists, please contact support or try refreshing the page."
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}
