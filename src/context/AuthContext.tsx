import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext, type AuthUser, type AuthContextValue } from './AuthContextTypes'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        supabase.auth.getSession().then(({ data }) => {
            if (!isMounted) return
            const sessionUser = data.session?.user
            setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null)
            setLoading(false)
        })

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user
            setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null)
        })

        return () => {
            isMounted = false
            sub.subscription?.unsubscribe()
        }
    }, [])

    const value = useMemo<AuthContextValue>(() => ({
        user,
        loading,
        async signIn(email: string, password: string) {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) return { error: error.message }
            return {}
        },
        async signUp(email: string, password: string) {
            const { error } = await supabase.auth.signUp({ email, password })
            if (error) return { error: error.message }
            return {}
        },
        async signOut() {
            await supabase.auth.signOut()
        },
    }), [user, loading])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



