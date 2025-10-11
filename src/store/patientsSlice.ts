import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Patient } from '../types/db'
import { createAppAsyncThunk } from './createAppAsyncThunk'
import { fetchPatientsList } from '../services/patientsService'

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

export const fetchPatients = createAppAsyncThunk<Patient[], void>(
    'patients/fetch',
    async () => {
        const data = await fetchPatientsList({ limit: 200 })
        return data
    }
)

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


