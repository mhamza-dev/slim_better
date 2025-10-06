import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabaseClient'
import type { BuyedPackageWithCreator } from '../types/db'

type State = {
    itemsByPatientId: Record<number, BuyedPackageWithCreator[]>
    loadingByPatientId: Record<number, boolean>
    errorByPatientId: Record<number, string | null>
}

const initialState: State = {
    itemsByPatientId: {},
    loadingByPatientId: {},
    errorByPatientId: {},
}

export const fetchPackagesByPatient = createAsyncThunk(
    'buyedPackages/fetchByPatient',
    async (patientId: number) => {
        const { data, error } = await supabase
            .from('buyed_packages')
            .select('*, creator:created_by(id,email)')
            .eq('patient_id', patientId)
            .order('id', { ascending: false })
        if (error) throw new Error(error.message)
        return { patientId, items: (data as BuyedPackageWithCreator[]) ?? [] }
    }
)

export const addPackage = createAsyncThunk(
    'buyedPackages/add',
    async (payload: Omit<BuyedPackageWithCreator, 'id' | 'created_at' | 'updated_at' | 'creator'> & { patient_id: number }) => {
        const { error } = await supabase.from('buyed_packages').insert(payload as any)
        if (error) throw new Error(error.message)
        return { patientId: payload.patient_id }
    }
)

const slice = createSlice({
    name: 'buyedPackages',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPackagesByPatient.pending, (state, action) => {
                const id = action.meta.arg
                state.loadingByPatientId[id] = true
                state.errorByPatientId[id] = null
            })
            .addCase(fetchPackagesByPatient.fulfilled, (state, action) => {
                const { patientId, items } = action.payload
                state.loadingByPatientId[patientId] = false
                state.itemsByPatientId[patientId] = items
            })
            .addCase(fetchPackagesByPatient.rejected, (state, action) => {
                const id = action.meta.arg
                state.loadingByPatientId[id] = false
                state.errorByPatientId[id] = action.error.message || 'Failed to load packages'
            })
    }
})

export default slice.reducer


