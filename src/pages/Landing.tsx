import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'

export default function Landing() {
    const { user, signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const videoSrc = (import.meta as any).env?.VITE_HERO_VIDEO_URL || '/hero.mp4'
    const videoPoster = (import.meta as any).env?.VITE_HERO_POSTER_URL || '/hero-icon.jpeg'

    if (user) return <Navigate to="/dashboard" replace />

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await signIn(email, password)
        if (error) setError(error)
        setLoading(false)
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Background video */}
            {String(videoSrc).includes('player.cloudinary.com/embed') ? (
                <iframe
                    className="absolute inset-0 w-full h-full object-cover"
                    src={`${videoSrc}${videoSrc.includes('?') ? '&' : '?'}autoplay=true&muted=true&loop=true`}
                    title="Background video"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="eager"
                />
            ) : (
                <video
                    className="absolute inset-0 w-full h-full object-cover"
                    src={videoSrc}
                    poster={videoPoster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/60" />
            {/* Subtle animated blobs */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-primary/20 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-[320px] w-[320px] rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />

            {/* Content */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 min-h-screen">
                {/* Left: Brand + value prop */}
                <div className="p-6 md:p-10 flex flex-col justify-center text-white">
                    <div className="flex items-center gap-5 mb-8">
                        <div>
                            <div className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-white drop-shadow text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">Slim Better</div>
                            <div className="text-white/80 mt-1">Sessions • Patients • Payments</div>
                        </div>
                    </div>
                    <div className="text-white/90 text-base md:text-lg max-w-xl mb-5">
                        Manage your clinic with clarity. Lightning‑fast dashboard, delightful UX, and built‑in exports.
                    </div>
                    <ul className="space-y-2 text-white/85 text-sm md:text-base">
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Smart schedule with Sunday auto-shift</li>
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Payments and transaction history</li>
                        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Excel exports with logo</li>
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-white/80">
                        <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">Secure</span>
                        <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">Fast</span>
                        <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">Responsive</span>
                    </div>
                </div>

                {/* Right: Auth card */}
                <div className="flex items-center justify-center p-4 md:p-8">
                    <form onSubmit={handleSubmit} className="w-full max-w-sm backdrop-blur-xl bg-white/90 border border-white/60 shadow-[0_12px_40px_rgba(11,95,255,0.15)] p-5 sm:p-6 rounded-2xl">
                        <div className="mb-5 font-extrabold text-primaryDark text-xl">Welcome back</div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-[#335] mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full pl-9 pr-3 py-2 border border-[#cfe0ff] rounded-lg bg-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-[#335] mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-3 py-2 border border-[#cfe0ff] rounded-lg bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && <div className="text-red-700 text-sm mt-3">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full rounded-lg bg-primary text-white px-3 py-2 font-bold shadow hover:shadow-md transition-shadow"
                        >
                            {loading ? 'Please wait…' : 'Sign in'}
                        </button>

                        <div className="mt-4 flex items-center justify-between text-xs text-primaryDark">
                            <span>By continuing, you agree to our terms.</span>
                            <a className="text-primary font-semibold hover:underline" href="#">Privacy</a>
                        </div>
                    </form>
                </div>
            </div>
            {/* Footer */}
            <div className="relative z-10 text-center text-white/70 text-xs py-2">
                © {new Date().getFullYear()} Slim Better. All rights reserved.
            </div>
        </div>
    )
}


