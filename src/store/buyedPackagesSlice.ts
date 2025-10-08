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
        const { error } = await supabase.from('buyed_packages').insert(payload as Record<string, unknown>)
        if (error) throw new Error(error.message)
        return { patientId: payload.patient_id }
    }
)

export const deletePackage = createAsyncThunk(
    'buyedPackages/delete',
    async (payload: { id: number; patientId: number }) => {
        const { error } = await supabase
            .from('buyed_packages')
            .delete()
            .eq('id', payload.id)
        if (error) throw new Error(error.message)
        return { patientId: payload.patientId }
    }
)

export const updatePackage = createAsyncThunk(
    'buyedPackages/update',
    async (payload: BuyedPackageWithCreator) => {
        const { error } = await supabase.from('buyed_packages').update(payload as Record<string, unknown>).eq('id', payload.id)
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
            .addCase(addPackage.pending, (state, action) => {
                const patientId = action.meta.arg.patient_id
                state.loadingByPatientId[patientId] = true
                state.errorByPatientId[patientId] = null
            })
            .addCase(addPackage.fulfilled, (state, action) => {
                const patientId = action.payload.patientId
                state.loadingByPatientId[patientId] = false
            })
            .addCase(addPackage.rejected, (state, action) => {
                const patientId = action.meta.arg.patient_id
                state.loadingByPatientId[patientId] = false
                state.errorByPatientId[patientId] = action.error.message || 'Failed to add package'
            })
            .addCase(updatePackage.pending, (state, action) => {
                const patientId = action.meta.arg.patient_id
                state.loadingByPatientId[patientId] = true
                state.errorByPatientId[patientId] = null
            })
            .addCase(updatePackage.fulfilled, (state, action) => {
                const patientId = action.payload.patientId
                state.loadingByPatientId[patientId] = false
            })
            .addCase(updatePackage.rejected, (state, action) => {
                const patientId = action.meta.arg.patient_id
                state.loadingByPatientId[patientId] = false
                state.errorByPatientId[patientId] = action.error.message || 'Failed to update package'
            })
            .addCase(deletePackage.pending, (state, action) => {
                const patientId = action.meta.arg.patientId
                state.loadingByPatientId[patientId] = true
                state.errorByPatientId[patientId] = null
            })
            .addCase(deletePackage.fulfilled, (state, action) => {
                const patientId = action.payload.patientId
                state.loadingByPatientId[patientId] = false
            })
            .addCase(deletePackage.rejected, (state, action) => {
                const patientId = action.meta.arg.patientId
                state.loadingByPatientId[patientId] = false
                state.errorByPatientId[patientId] = action.error.message || 'Failed to delete package'
            })
    }
})

export default slice.reducer


