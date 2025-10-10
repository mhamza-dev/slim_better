import { supabase } from '../lib/supabaseClient'
import type { Session } from '../types/db'
import { shiftSundayToMonday } from '../utils/date'

export async function fetchSessionsByPackage(buyedPackageId: number): Promise<Session[]> {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('buyed_package_id', buyedPackageId)
        .order('session_number', { ascending: true })
    if (error) throw error
    return (data as Session[]) || []
}

export async function rescheduleSession(
    sessionId: number,
    newDateISO: string,
): Promise<void> {
    const scheduled_date = shiftSundayToMonday(newDateISO)
    const { error } = await supabase
        .from('sessions')
        .update({ scheduled_date, status: 'rescheduled' })
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

export async function completeSession(sessionId: number): Promise<void> {
    const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', actual_date: new Date().toISOString().slice(0, 10) })
        .eq('id', sessionId)
    if (error) throw error
}

export type DashboardSessionRow = {
    id: number
    scheduled_date: string
    status: 'planned' | 'completed' | 'missed' | 'rescheduled'
    patient_name: string | null
}

export async function fetchPlannedSessionsByDateRange(startISO: string, endISO?: string | null): Promise<DashboardSessionRow[]> {
    // First query: sessions only (no related selects)
    let sessionQuery = supabase
        .from('sessions')
        .select('id,scheduled_date,status,buyed_package_id')
        .in('status', ['planned', 'rescheduled'])
        .order('scheduled_date', { ascending: true })

    if (endISO) {
        sessionQuery = sessionQuery.gte('scheduled_date', startISO).lte('scheduled_date', endISO)
    } else {
        sessionQuery = sessionQuery.eq('scheduled_date', startISO)
    }

    const { data: sessionsData, error: sessionsErr } = await sessionQuery
    if (sessionsErr) throw sessionsErr
    const sessions = (sessionsData as unknown as Array<{ id: number; scheduled_date: string; status: DashboardSessionRow['status']; buyed_package_id: number }>) || []
    if (sessions.length === 0) return []

    // Second query: fetch patient names for the related buyed packages
    const pkgIds = Array.from(new Set(sessions.map((s) => s.buyed_package_id)))
    const { data: pkgsData, error: pkgsErr } = await supabase
        .from('buyed_packages')
        .select('id,patients(name)')
        .in('id', pkgIds)
    if (pkgsErr) throw pkgsErr
    const idToPatientName = new Map<number, string | null>()
    for (const r of (pkgsData as unknown as Array<{ id: number; patients: { name: string } | null }>) || []) {
        idToPatientName.set(r.id, r.patients?.name ?? null)
    }

    return sessions.map((s) => ({
        id: s.id,
        scheduled_date: s.scheduled_date,
        status: s.status,
        patient_name: idToPatientName.get(s.buyed_package_id) ?? null,
    }))
}


