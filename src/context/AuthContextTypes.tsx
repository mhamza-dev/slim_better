import { createContext } from 'react'

export type AuthUser = {
    id: string
    email: string | null
}

export type AuthContextValue = {
    user: AuthUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error?: string }>
    signUp: (email: string, password: string) => Promise<{ error?: string }>
    signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
