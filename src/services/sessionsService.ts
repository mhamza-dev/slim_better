import { supabase } from '../lib/supabaseClient'
import type { Session } from '../types/db'
import { shiftSundayToMonday } from '../utils/date'

export async function fetchSessionsByPackage(buyedPackageId: number): Promise<Session[]> {
    // Skip if the package is soft-deleted
    const { data: pkgRow, error: pkgCheckErr } = await supabase
        .from('buyed_packages')
        .select('id')
        .eq('id', buyedPackageId)
        .eq('is_deleted', false)
        .single()
    if (pkgCheckErr) throw pkgCheckErr
    if (!pkgRow) return []

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('buyed_package_id', buyedPackageId)
        .eq('is_deleted', false)
        .order('session_number', { ascending: true })
    if (error) throw error
    
    const sessions = (data as Session[]) || []
    
    // Get creator and updater emails
    const creatorIds = [...new Set(sessions.map(s => s.created_by).filter(Boolean))]
    const updaterIds = [...new Set(sessions.map(s => s.updated_by).filter(Boolean))]
    const allIds = [...new Set([...creatorIds, ...updaterIds])]
    
    if (allIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', allIds)
        if (profilesError) throw profilesError
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p.email]) ?? [])
        
        // Add creator_email and updated_by_email to each session
        return sessions.map(session => ({
            ...session,
            creator_email: session.created_by ? profilesMap.get(session.created_by) ?? null : null,
            updated_by_email: session.updated_by ? profilesMap.get(session.updated_by) ?? null : null
        }))
    }
    
    return sessions
}

export async function rescheduleSession(
    sessionId: number,
    newDateISO: string,
    updatedBy?: string | null,
): Promise<void> {
    const scheduled_date = shiftSundayToMonday(newDateISO)
    const { error } = await supabase
        .from('sessions')
        .update({ scheduled_date, status: 'rescheduled', updated_by: updatedBy ?? null })
        .eq('id', sessionId)
    if (error) throw error
}

export async function generateSessionsClientSide(args: {
    buyedPackageId: number
    startDateISO: string
    totalSessions: number
    gapDays: number
    completedCount: number
}): Promise<void> {
    const { buyedPackageId, startDateISO, totalSessions, gapDays, completedCount } = args
    const start = new Date(startDateISO)
    const rows: Partial<Session>[] = []
    for (let i = 1; i <= totalSessions; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + (i - 1) * gapDays)
        const iso = shiftSundayToMonday(d.toISOString())
        rows.push({
            buyed_package_id: buyedPackageId,
            session_number: i,
            scheduled_date: iso,
            actual_date: null,
            status: i <= completedCount ? 'completed' : 'planned'
        } as Partial<Session>)
    }
    if (rows.length) {
        const { error } = await supabase.from('sessions').insert(rows as Record<string, unknown>[])
        if (error) throw error
    }
}

export async function completeSession(sessionId: number, updatedBy?: string | null): Promise<void> {
    const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', actual_date: new Date().toISOString().slice(0, 10), updated_by: updatedBy ?? null })
        .eq('id', sessionId)
    if (error) throw error
}

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

export async function fetchPlannedSessionsByDateRange(startISO: string, endISO?: string | null): Promise<DashboardSessionRow[]> {
    // First query: sessions only (no related selects)
    let sessionQuery = supabase
        .from('sessions')
        .select('id,scheduled_date,status,buyed_package_id,created_at,updated_at,created_by,updated_by')
        .in('status', ['planned', 'rescheduled'])
        .order('scheduled_date', { ascending: true })

    if (endISO) {
        sessionQuery = sessionQuery.gte('scheduled_date', startISO).lte('scheduled_date', endISO)
    } else {
        sessionQuery = sessionQuery.eq('scheduled_date', startISO)
    }

    const { data: sessionsData, error: sessionsErr } = await sessionQuery
    if (sessionsErr) throw sessionsErr
    const sessions = (sessionsData as unknown as Array<{ id: number; scheduled_date: string; status: DashboardSessionRow['status']; buyed_package_id: number; created_at?: string | null; updated_at?: string | null; created_by?: string | null; updated_by?: string | null }>) || []
    if (sessions.length === 0) return []

    // Second query: fetch patient names for the related buyed packages
    const pkgIds = Array.from(new Set(sessions.map((s) => s.buyed_package_id)))
    const { data: pkgsData, error: pkgsErr } = await supabase
        .from('buyed_packages')
        .select('id,patients(name)')
        .eq('is_deleted', false)
        .in('id', pkgIds)
    if (pkgsErr) throw pkgsErr
    const idToPatientName = new Map<number, string | null>()
    for (const r of (pkgsData as unknown as Array<{ id: number; patients: { name: string } | null }>) || []) {
        idToPatientName.set(r.id, r.patients?.name ?? null)
    }

    // Third query: map creator and updater ids to emails
    const creatorIds = Array.from(new Set(sessions.map((s) => s.created_by).filter(Boolean))) as string[]
    const updaterIds = Array.from(new Set(sessions.map((s) => s.updated_by).filter(Boolean))) as string[]
    const allIds = Array.from(new Set([...creatorIds, ...updaterIds]))
    const idToEmail = new Map<string, string | null>()
    if (allIds.length) {
        const { data: profs, error: profErr } = await supabase
            .from('profiles')
            .select('id,email')
            .in('id', allIds)
        if (profErr) throw profErr
        for (const p of (profs as Array<{ id: string; email: string | null }>) || []) {
            idToEmail.set(p.id, p.email ?? null)
        }
    }

    return sessions.map((s) => ({
        id: s.id,
        scheduled_date: s.scheduled_date,
        status: s.status,
        patient_name: idToPatientName.get(s.buyed_package_id) ?? null,
        created_at: s.created_at ?? null,
        updated_at: s.updated_at ?? null,
        created_by_email: s.created_by ? (idToEmail.get(s.created_by) ?? null) : null,
        updated_by_email: s.updated_by ? (idToEmail.get(s.updated_by) ?? null) : null,
    }))
}


