import { supabase } from '../lib/supabaseClient'
import type { BuyedPackageWithCreator, BuyedPackage } from '../types/db'
import { shiftSundayToMonday } from '../utils/date'

export type CreatePackageInput = {
    patient_id: number
    no_of_sessions: number
    total_payment: number
    advance_payment: number
    gap_between_sessions: number
    start_date: string
    created_by: string
}

export async function createPackage(input: CreatePackageInput): Promise<{ id: number; patient_id: number }> {
    const { data, error } = await supabase
        .from('buyed_packages')
        .insert(input as unknown as Record<string, unknown>)
        .select('id, patient_id')
        .single()
    if (error) throw error
    return { id: data?.id as number, patient_id: data?.patient_id as number }
}

export type DashboardPackageRow = Pick<BuyedPackageWithCreator,
    'id' | 'total_payment' | 'paid_payment' | 'advance_payment' | 'no_of_sessions' | 'gap_between_sessions' | 'start_date'> &
{ patients?: { name: string; phone_number: string } | null; sessions_completed: number; next_session_date: string | null }

export async function fetchDashboardPackages(limit = 1000): Promise<DashboardPackageRow[]> {
    const today = new Date().toISOString().slice(0, 10)
    // Step 1: base packages
    const { data: pkgs, error: pkgErr } = await supabase
        .from('buyed_packages')
        .select('id,total_payment,paid_payment,advance_payment,no_of_sessions,gap_between_sessions,start_date,patients(name,phone_number)')
        .eq('is_deleted', false)
        .order('start_date', { ascending: false })
        .limit(limit)
    if (pkgErr) throw pkgErr
    const packages = (pkgs as unknown as any[]) || []
    if (packages.length === 0) return []

    const packageIds: number[] = packages.map((p) => p.id)

    // Step 2: upcoming sessions per package (planned/rescheduled in future)
    const { data: nextSessions, error: nextErr } = await supabase
        .from('sessions')
        .select('buyed_package_id, scheduled_date, status')
        .in('buyed_package_id', packageIds)
        .in('status', ['planned', 'rescheduled'])
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
    if (nextErr) throw nextErr

    const packageIdToNextDate = new Map<number, string | null>()
    for (const s of (nextSessions as unknown as { buyed_package_id: number; scheduled_date: string }[]) || []) {
        if (!packageIdToNextDate.has(s.buyed_package_id)) {
            packageIdToNextDate.set(s.buyed_package_id, shiftSundayToMonday(s.scheduled_date))
        }
    }

    // Step 3: count completed sessions per package
    const { data: completedRows, error: compErr } = await supabase
        .from('sessions')
        .select('buyed_package_id')
        .in('buyed_package_id', packageIds)
        .eq('status', 'completed')
    if (compErr) throw compErr

    const packageIdToCompleted = new Map<number, number>()
    for (const s of (completedRows as unknown as { buyed_package_id: number }[]) || []) {
        packageIdToCompleted.set(s.buyed_package_id, (packageIdToCompleted.get(s.buyed_package_id) || 0) + 1)
    }

    // Step 4: merge into output shape
    return packages.map((r) => {
        const out: DashboardPackageRow = {
            id: r.id,
            total_payment: r.total_payment,
            paid_payment: r.paid_payment,
            advance_payment: r.advance_payment,
            no_of_sessions: r.no_of_sessions,
            gap_between_sessions: r.gap_between_sessions,
            start_date: r.start_date,
            patients: r.patients ?? null,
            sessions_completed: packageIdToCompleted.get(r.id) || 0,
            next_session_date: packageIdToNextDate.get(r.id) || null,
        }
        return out
    })
}

export async function fetchPackagesByPatient(patientId: number): Promise<BuyedPackageWithCreator[]> {
    const today = new Date().toISOString().slice(0, 10)
    // Step 1: base packages with creator
    const { data: pkgs, error: pkgErr } = await supabase
        .from('buyed_packages')
        .select('id,patient_id,no_of_sessions,total_payment,advance_payment,paid_payment,gap_between_sessions,start_date,created_by,created_at,updated_by,updated_at,creator:created_by(id,email)')
        .eq('is_deleted', false)
        .eq('patient_id', patientId)
        .order('id', { ascending: false })
    if (pkgErr) throw pkgErr
    const packages = (pkgs as unknown as any[]) || []
    if (packages.length === 0) return []

    const packageIds: number[] = packages.map((p) => p.id)

    // Step 2: next upcoming session per package
    const { data: nextSessions, error: nextErr } = await supabase
        .from('sessions')
        .select('buyed_package_id, scheduled_date, status')
        .in('buyed_package_id', packageIds)
        .in('status', ['planned', 'rescheduled'])
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
    if (nextErr) throw nextErr

    const packageIdToNextDate = new Map<number, string | null>()
    for (const s of (nextSessions as unknown as { buyed_package_id: number; scheduled_date: string }[]) || []) {
        if (!packageIdToNextDate.has(s.buyed_package_id)) {
            packageIdToNextDate.set(s.buyed_package_id, shiftSundayToMonday(s.scheduled_date))
        }
    }

    // Step 3: completed count per package
    const { data: completedRows, error: compErr } = await supabase
        .from('sessions')
        .select('buyed_package_id')
        .in('buyed_package_id', packageIds)
        .eq('status', 'completed')
    if (compErr) throw compErr

    const packageIdToCompleted = new Map<number, number>()
    for (const s of (completedRows as unknown as { buyed_package_id: number }[]) || []) {
        packageIdToCompleted.set(s.buyed_package_id, (packageIdToCompleted.get(s.buyed_package_id) || 0) + 1)
    }

    // Step 4: merge and return
    return packages.map((r) => {
        const pkg: BuyedPackageWithCreator = {
            id: r.id,
            patient_id: r.patient_id,
            no_of_sessions: r.no_of_sessions,
            total_payment: r.total_payment,
            advance_payment: r.advance_payment,
            paid_payment: r.paid_payment,
            sessions_completed: packageIdToCompleted.get(r.id) || 0,
            gap_between_sessions: r.gap_between_sessions,
            start_date: r.start_date,
            next_session_date: packageIdToNextDate.get(r.id) || null,
            created_by: r.created_by,
            created_at: r.created_at ?? null,
            updated_at: r.updated_at ?? null,
            updated_by: r.updated_by ?? null,
            creator: r.creator ?? null,
        }
        return pkg
    })
}

export async function updatePackageById(id: number, data: Partial<BuyedPackage> & { updated_by?: string | null }): Promise<void> {
    const { error } = await supabase
        .from('buyed_packages')
        .update(data as Record<string, unknown>)
        .eq('id', id)
    if (error) throw error
}

export async function deletePackageById(id: number): Promise<void> {
    const { error } = await supabase
        .from('buyed_packages')
        .update({ is_deleted: true } as unknown as Record<string, unknown>)
        .eq('id', id)
    if (error) throw error
}

export async function fetchPackageBySessionId(sessionId: number): Promise<DashboardPackageRow | null> {
    // First get the package ID from the session
    const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('buyed_package_id')
        .eq('id', sessionId)
        .single()

    if (sessionError) throw sessionError
    if (!sessionData) return null

    const packageId = sessionData.buyed_package_id

    // Now fetch the package details
    const { data: pkgData, error: pkgError } = await supabase
        .from('buyed_packages')
        .select('id,total_payment,paid_payment,advance_payment,no_of_sessions,gap_between_sessions,start_date,patients(name,phone_number)')
        .eq('id', packageId)
        .single()

    if (pkgError) throw pkgError
    if (!pkgData) return null

    const today = new Date().toISOString().slice(0, 10)

    // Get next session date
    const { data: nextSessionData, error: nextSessionError } = await supabase
        .from('sessions')
        .select('scheduled_date')
        .eq('buyed_package_id', packageId)
        .in('status', ['planned', 'rescheduled'])
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(1)

    if (nextSessionError) throw nextSessionError
    const nextSessionDate = nextSessionData?.[0]?.scheduled_date ? shiftSundayToMonday(nextSessionData[0].scheduled_date) : null

    // Get completed sessions count
    const { data: completedData, error: completedError } = await supabase
        .from('sessions')
        .select('id')
        .eq('buyed_package_id', packageId)
        .eq('status', 'completed')

    if (completedError) throw completedError
    const sessionsCompleted = completedData?.length || 0

    return {
        id: pkgData.id,
        total_payment: pkgData.total_payment,
        paid_payment: pkgData.paid_payment,
        advance_payment: pkgData.advance_payment,
        no_of_sessions: pkgData.no_of_sessions,
        gap_between_sessions: pkgData.gap_between_sessions,
        start_date: pkgData.start_date,
        patients: pkgData.patients as unknown as { name: string; phone_number: string } | null,
        sessions_completed: sessionsCompleted,
        next_session_date: nextSessionDate,
    }
}


