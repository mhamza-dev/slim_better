import { SessionService } from './index'

// Re-export the new service methods for backward compatibility
export const fetchSessionsByPackage = SessionService.getByPackageId
export const rescheduleSession = SessionService.reschedule
export const generateSessionsClientSide = SessionService.generateSessions
export const completeSession = SessionService.complete

// Dashboard-specific method that returns the correct type
export const fetchPlannedSessionsByDateRange = async (startDate: string, endDate?: string) => {
    const sessions = await SessionService.getByDateRange(startDate, endDate)
    // The sessions already include patient_name from the join query
    return sessions.map(session => ({
        ...session,
        patient_name: session.patient_name || 'Unknown Patient'
    }))
}

// Re-export types
export type DashboardSessionRow = {
    id: number
    scheduled_date: string
    status: 'planned' | 'completed' | 'missed' | 'rescheduled'
    patient_name: string | null
    created_at?: string | null
    updated_at?: string | null
    created_by_email?: string | null
    updated_by_email?: string | null
}


