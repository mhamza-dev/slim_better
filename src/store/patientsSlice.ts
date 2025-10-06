import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabaseClient'
import type { Patient } from '../types/db'

type PatientsState = {
    items: Patient[]
    loading: boolean
    error: string | null
}

const initialState: PatientsState = {
    items: [],
    loading: false,
    error: null,
}

export const fetchPatients = createAsyncThunk('patients/fetch', async () => {
    const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone_number, address, date_of_birth, created_at, updated_at')
        .order('id', { ascending: false })
        .limit(200)
    if (error) throw new Error(error.message)
    return (data as Patient[]) ?? []
})

const patientsSlice = createSlice({
    name: 'patients',
    initialState,
    reducers: {
        setPatients(state, action: PayloadAction<Patient[]>) {
            state.items = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPatients.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchPatients.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload
            })
            .addCase(fetchPatients.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message || 'Failed to load patients'
            })
    }
})

export const { setPatients } = patientsSlice.actions
export default patientsSlice.reducer


