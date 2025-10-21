// Redux Toolkit imports
import { createSlice } from '@reduxjs/toolkit'

// Internal imports - Types
import type { BuyedPackageWithCreator, BuyedPackage } from '../types/db'

// Internal imports - Store
import { createAppAsyncThunk } from './createAppAsyncThunk'

// Internal imports - Services
import {
    fetchPackagesByPatient as svcFetchPackagesByPatient,
    updatePackageById,
    deletePackageById,
    createPackage,
    type CreatePackageInput
} from '../services/packagesService'

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

export const fetchPackagesByPatient = createAppAsyncThunk<{ patientId: number; items: BuyedPackageWithCreator[] }, number>(
    'buyedPackages/fetchByPatient',
    async (patientId) => {
        const data = await svcFetchPackagesByPatient(patientId)
        return { patientId, items: data }
    }
)

export const addPackage = createAppAsyncThunk<{ patientId: number; packageId: number }, CreatePackageInput>(
    'buyedPackages/add',
    async (payload) => {
        const { id, patient_id } = await createPackage(payload)
        return { patientId: patient_id ?? payload.patient_id, packageId: id }
    }
)

export const deletePackage = createAppAsyncThunk<{ patientId: number }, { id: number; patientId: number; updatedBy?: string | null }>(
    'buyedPackages/delete',
    async (payload) => {
        await deletePackageById(payload.id, payload.updatedBy)
        return { patientId: payload.patientId }
    }
)

export const updatePackage = createAppAsyncThunk<{ patientId: number }, { id: number; patient_id: number; data: Partial<BuyedPackage> }>(
    'buyedPackages/update',
    async (payload) => {
        await updatePackageById(payload.id, payload.data)
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


