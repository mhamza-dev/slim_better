import { supabase } from '../lib/supabaseClient'
import type { Patient } from '../types/db'

export async function fetchPatientById(id: number): Promise<Patient | null> {
    const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
    if (error) throw error
    return (data as Patient) ?? null
}

export async function createPatient(input: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const { data, error } = await supabase
        .from('patients')
        .insert(input as unknown as Record<string, unknown>)
        .select('id')
        .single()
    if (error) throw error
    return (data?.id as number)
}

export async function updatePatient(id: number, input: Partial<Patient>): Promise<void> {
    const { error } = await supabase
        .from('patients')
        .update(input as unknown as Record<string, unknown>)
        .eq('id', id)
    if (error) throw error
}

export async function fetchPatientsList(limit = 200): Promise<Patient[]> {
    const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone_number, address, age, branch_name, created_at, updated_at, created_by, updated_by')
        .eq('is_deleted', false)
        .order('id', { ascending: false })
        .limit(limit)
    if (error) throw error

    const patients = (data as Patient[]) ?? []

    // Get creator and updater emails for patients
    const creatorIds = [...new Set(patients.map(p => p.created_by).filter(Boolean))]
    const updaterIds = [...new Set(patients.map(p => p.updated_by).filter(Boolean))]
    const allIds = [...new Set([...creatorIds, ...updaterIds])]

    if (allIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', allIds)
        if (profilesError) throw profilesError

        const profilesMap = new Map(profiles?.map(p => [p.id, p.email]) ?? [])

        // Add creator_email and updated_by_email to each patient
        return patients.map(patient => ({
            ...patient,
            creator_email: patient.created_by ? profilesMap.get(patient.created_by) ?? null : null,
            updated_by_email: patient.updated_by ? profilesMap.get(patient.updated_by) ?? null : null
        }))
    }

    return patients
}

export async function softDeletePatient(id: number): Promise<void> {
    // Soft delete patient and their packages
    const { error } = await supabase
        .from('patients')
        .update({ is_deleted: true } as unknown as Record<string, unknown>)
        .eq('id', id)
    if (error) throw error

    // Also soft-delete related buyed_packages
    const { error: pkgErr } = await supabase
        .from('buyed_packages')
        .update({ is_deleted: true } as unknown as Record<string, unknown>)
        .eq('patient_id', id)
    if (pkgErr) throw pkgErr
}


