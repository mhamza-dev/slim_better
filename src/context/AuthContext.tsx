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

        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, session?.user?.email)
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
            try {
                // First check if there's an active session
                const { data: { session } } = await supabase.auth.getSession()

                if (!session) {
                    // No active session, just clear local state
                    console.log('No active session found, clearing local state')
                    setUser(null)
                    return
                }

                // There's an active session, try to sign out from server
                const { error } = await supabase.auth.signOut()
                if (error) {
                    console.error('Sign out error:', error)
                    // Even if server sign out fails, clear local state
                    setUser(null)
                    throw error
                }
            } catch (error) {
                console.error('Sign out failed:', error)
                // Always clear local state even if server call fails
                setUser(null)

                // Don't throw the error if it's just a missing session
                if (error instanceof Error && error.message.includes('Auth session missing')) {
                    console.log('Session already expired, clearing local state')
                    return
                }

                throw error
            }
        },
    }), [user, loading])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



