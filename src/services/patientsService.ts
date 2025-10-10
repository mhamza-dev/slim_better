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
        .select('id, name, phone_number, address, date_of_birth, branch_name, created_at, updated_at')
        .order('id', { ascending: false })
        .limit(limit)
    if (error) throw error
    return (data as Patient[]) ?? []
}


