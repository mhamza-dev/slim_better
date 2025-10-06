import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
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
        <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'linear-gradient(180deg, #ffffff 0%, #eef5ff 100%)' }}>
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#0b5fff', fontWeight: 800, fontSize: 42, lineHeight: 1.1, marginBottom: 12 }}>Slim Better</div>
                <div style={{ color: '#09357b', fontSize: 18, opacity: 0.85, marginBottom: 24 }}>Manage patients, sessions, and payments with clarity. A modern, minimal dashboard for your clinic.</div>
                <ul style={{ color: '#09357b', opacity: 0.9, lineHeight: 1.8 }}>
                    <li>Fast analytics dashboard</li>
                    <li>Track sessions and next appointments</li>
                    <li>Payments overview at a glance</li>
                </ul>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <form onSubmit={handleSubmit} style={{ width: 360, background: 'white', border: '1px solid #e6eef8', boxShadow: '0 10px 30px rgba(11,95,255,0.08)', padding: 24, borderRadius: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: '#09357b', marginBottom: 16 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</div>
                    <label style={{ display: 'block', fontSize: 12, color: '#335', marginBottom: 6 }}>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" style={{ width: '100%', padding: '10px 12px', border: '1px solid #cfe0ff', borderRadius: 10, marginBottom: 12 }} />
                    <label style={{ display: 'block', fontSize: 12, color: '#335', marginBottom: 6 }}>Password</label>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', border: '1px solid #cfe0ff', borderRadius: 10, marginBottom: 12 }} />
                    {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ width: '100%', border: 'none', background: '#0b5fff', color: 'white', padding: '10px 12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                        {loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account')}
                    </button>
                    <div style={{ marginTop: 12, textAlign: 'center', color: '#09357b' }}>
                        {mode === 'login' ? (
                            <span>New here? <button type="button" onClick={() => setMode('signup')} style={{ background: 'transparent', border: 'none', color: '#0b5fff', fontWeight: 700, cursor: 'pointer' }}>Create an account</button></span>
                        ) : (
                            <span>Already have an account? <button type="button" onClick={() => setMode('login')} style={{ background: 'transparent', border: 'none', color: '#0b5fff', fontWeight: 700, cursor: 'pointer' }}>Sign in</button></span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}


