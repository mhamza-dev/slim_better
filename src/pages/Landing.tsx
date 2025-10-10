import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Landing() {
    const { user, signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const videoSrc = (import.meta as any).env?.VITE_HERO_VIDEO_URL || '/hero.mp4'
    const videoPoster = (import.meta as any).env?.VITE_HERO_POSTER_URL || '/hero-icon.jpeg'
    const [iframeStyle, setIframeStyle] = useState<{ width: string; height: string } | null>(null)

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
        <div className="relative h-screen w-full overflow-hidden">
            {/* Background video */}
            {String(videoSrc).includes('player.cloudinary.com/embed') ? (
                <div className="absolute inset-0 overflow-hidden">
                    {
                        // Keep the iframe covering logic responsive based on viewport aspect ratio
                        (() => {
                            // compute on client
                            if (typeof window !== 'undefined' && !iframeStyle) {
                                const calc = () => {
                                    const vw = window.innerWidth
                                    const vh = window.innerHeight
                                    const target = 16 / 9
                                    const viewport = vw / vh
                                    if (viewport < target) {
                                        // viewport is taller/narrower than 16:9 → match height, expand width to cover
                                        setIframeStyle({ width: `${Math.ceil(vh * target)}px`, height: `${vh}px` })
                                    } else {
                                        // viewport is wider than 16:9 → match width, expand height to cover
                                        setIframeStyle({ width: `${vw}px`, height: `${Math.ceil(vw / target)}px` })
                                    }
                                }
                                calc()
                                window.addEventListener('resize', calc)
                                // small cleanup timeout to avoid SSR mismatch
                                setTimeout(calc, 0)
                            }
                            return null
                        })()
                    }
                    <iframe
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        src={`${videoSrc}${videoSrc.includes('?') ? '&' : '?'}autoplay=true&muted=true&loop=true&controls=false&playsinline=true`}
                        title="Background video"
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="eager"
                        style={{ pointerEvents: 'none', border: 0, margin: 0, padding: 0, display: 'block', width: iframeStyle?.width || '100vw', height: iframeStyle?.height || '100vh' }}
                    />
                </div>
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

            {/* Content: Only image and form */}
            <div className="relative z-10 h-full flex flex-col">
                <div className="flex-1" />
                <div className="w-full flex items-end justify-center p-3 sm:p-4 md:p-6 pb-[env(safe-area-inset-bottom)]">
                    <form onSubmit={handleSubmit} className="w-full max-w-md mx-2 sm:mx-0 backdrop-blur-2xl bg-white/15 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-4 sm:p-5 rounded-xl sm:rounded-2xl text-white">
                        <div className="mb-5 font-extrabold text-white/80 text-xl text-center">Welcome back</div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-white/80 mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-2.5 text-white/70" />
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full pl-9 pr-3 py-2 h-10 sm:h-[42px] rounded-lg bg-white/10 text-white placeholder-white/70 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white/60"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-white/80 mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-2.5 text-white/70" />
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-2 h-10 sm:h-[42px] rounded-lg bg-white/10 text-white placeholder-white/70 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white/60"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-white/70 hover:text-white/90 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && <div className="text-red-200 text-sm mt-3">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full rounded-lg bg-primary/90 hover:bg-primary text-white px-3 py-2 h-10 sm:h-[42px] font-bold shadow-lg transition"
                        >
                            {loading ? 'Please wait…' : 'Sign in'}
                        </button>

                        <div className="mt-3 text-center text-xs text-white/80">By continuing, you agree to our terms. <a className="underline" href="#">Privacy</a></div>
                    </form>
                </div>
            </div>
            {/* Footer */}
            <div className="absolute bottom-1 left-0 right-0 z-10 text-center text-white/70 text-xs">© {new Date().getFullYear()} Slim Better. All rights reserved.</div>
        </div>
    )
}


