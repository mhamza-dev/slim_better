import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="p-4">Loading...</div>
    if (!user) return <Navigate to="/" replace />
    return children
}


