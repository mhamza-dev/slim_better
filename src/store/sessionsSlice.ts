// Redux Toolkit imports
import { createSlice } from '@reduxjs/toolkit'

// Internal imports - Types
import type { Session } from '../types/db'

// Internal imports - Store
import { createAppAsyncThunk } from './createAppAsyncThunk'

// Internal imports - Services
import {
    fetchSessionsByPackage as svcFetchSessionsByPackage,
    rescheduleSession as svcRescheduleSession,
    generateSessionsClientSide as svcGenerateSessions,
    completeSession as svcCompleteSession
} from '../services/sessionsService'

type State = {
    itemsByPackageId: Record<number, Session[]>
    loadingByPackageId: Record<number, boolean>
    errorByPackageId: Record<number, string | null>
}

const initialState: State = {
    itemsByPackageId: {},
    loadingByPackageId: {},
    errorByPackageId: {},
}

export const fetchSessionsByPackage = createAppAsyncThunk<{ packageId: number; items: Session[] }, number>(
    'sessions/fetchByPackage',
    async (packageId) => {
        const data = await svcFetchSessionsByPackage(packageId)
        return { packageId, items: data }
    }
)

export const rescheduleSession = createAppAsyncThunk<{ packageId: number }, { sessionId: number; packageId: number; newDateISO: string; updated_by?: string | null }>(
    'sessions/reschedule',
    async ({ sessionId, packageId, newDateISO, updated_by }) => {
        await svcRescheduleSession(sessionId, newDateISO, updated_by)
        return { packageId }
    }
)

export const generateSessions = createAppAsyncThunk<{ packageId: number }, { buyedPackageId: number; startDateISO: string; totalSessions: number; gapDays: number; completedCount: number }>(
    'sessions/generate',
    async ({ buyedPackageId, startDateISO, totalSessions, gapDays, completedCount }) => {
        await svcGenerateSessions({ buyedPackageId, startDateISO, totalSessions, gapDays, completedCount })
        return { packageId: buyedPackageId }
    }
)

export const completeSession = createAppAsyncThunk<{ packageId: number }, { sessionId: number; packageId: number; updated_by?: string | null }>(
    'sessions/complete',
    async ({ sessionId, packageId, updated_by }) => {
        await svcCompleteSession(sessionId, updated_by)
        return { packageId }
    }
)

const slice = createSlice({
    name: 'sessions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSessionsByPackage.pending, (state, action) => {
                const id = action.meta.arg
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(fetchSessionsByPackage.fulfilled, (state, action) => {
                const { packageId, items } = action.payload
                state.loadingByPackageId[packageId] = false
                state.itemsByPackageId[packageId] = items
            })
            .addCase(fetchSessionsByPackage.rejected, (state, action) => {
                const id = action.meta.arg
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to load sessions'
                console.error('Failed to fetch sessions:', action.error)
            })
            .addCase(rescheduleSession.pending, (state, action) => {
                const id = action.meta.arg.packageId
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(rescheduleSession.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(rescheduleSession.rejected, (state, action) => {
                const id = action.meta.arg.packageId
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to reschedule session'
                console.error('Failed to reschedule session:', action.error)
            })
            .addCase(generateSessions.pending, (state, action) => {
                const id = action.meta.arg.buyedPackageId
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(generateSessions.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(generateSessions.rejected, (state, action) => {
                const id = action.meta.arg.buyedPackageId
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to generate sessions'
                console.error('Failed to generate sessions:', action.error)
            })
            .addCase(completeSession.pending, (state, action) => {
                const id = action.meta.arg.packageId
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(completeSession.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(completeSession.rejected, (state, action) => {
                const id = action.meta.arg.packageId
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to complete session'
                console.error('Failed to complete session:', action.error)
            })
    }
})

export default slice.reducer


