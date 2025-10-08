import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function Landing() {
    const { user, signIn, signUp } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    if (user) return <Navigate to="/dashboard" replace />

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const action = mode === 'login' ? signIn : signUp
        const { error } = await action(email, password)
        if (error) setError(error)
        setLoading(false)
    }

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gradient-to-b from-white to-[#eef5ff]">
            <div className="p-4 sm:p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-6 mb-8">
                    <img
                        src="/hero-icon.jpeg"
                        alt="SLIM BETTER"
                        className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:h-48 lg:w-48 rounded-xl object-cover shadow-2xl"
                    />
                    <div className="text-primary font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight">Slim Better</div>
                </div>
                <div className="text-primaryDark text-sm sm:text-base md:text-lg opacity-85 mb-5">Manage patients, sessions, and payments with clarity. A modern, minimal dashboard for your clinic.</div>
                <ul className="text-primaryDark opacity-90 leading-6 sm:leading-7 list-disc list-inside text-sm sm:text-base">
                    <li>Fast analytics dashboard</li>
                    <li>Track sessions and next appointments</li>
                    <li>Payments overview at a glance</li>
                </ul>
            </div>
            <div className="flex items-center justify-center p-4 md:p-6">
                <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-[#e6eef8] shadow-[0_8px_24px_rgba(11,95,255,0.08)] p-4 sm:p-6 rounded-xl">
                    <div className="font-bold text-lg text-primaryDark mb-3">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
                    <label className="block text-xs text-[#335] mb-1">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg mb-3" />
                    <label className="block text-xs text-[#335] mb-1">Password</label>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg mb-3" />
                    {error && <div className="text-red-700 text-sm mb-2">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary text-white px-3 py-2 font-bold">
                        {loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account')}
                    </button>
                    <div className="mt-3 text-center text-primaryDark text-sm">
                        {mode === 'login' ? (
                            <span>New here? <button type="button" onClick={() => setMode('signup')} className="bg-transparent border-0 text-primary font-bold">Create an account</button></span>
                        ) : (
                            <span>Already have an account? <button type="button" onClick={() => setMode('login')} className="bg-transparent border-0 text-primary font-bold">Sign in</button></span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}


