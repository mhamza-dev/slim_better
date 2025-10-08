import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f9ff]">
            <div className="text-center max-w-md mx-auto px-4">
                {/* 404 Illustration */}
                <div className="mb-8">
                    <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
                    <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
                </div>

                {/* Error Message */}
                <h1 className="text-3xl font-bold text-primaryDark mb-4">
                    Page Not Found
                </h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    Sorry, the page you're looking for doesn't exist or has been moved. 
                    Let's get you back on track.
                </p>

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
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
                    <p className="text-sm text-blue-700">
                        If you believe this is an error, please check the URL or contact support.
                    </p>
                </div>
            </div>
        </div>
    )
}
