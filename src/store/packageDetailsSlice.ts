import { createSlice } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from './createAppAsyncThunk'
import { fetchPackageBySessionId, type DashboardPackageRow } from '../services/packagesService'

type State = {
    selectedPackage: DashboardPackageRow | null
    loading: boolean
    error: string | null
    sessionId: number | null
}

const initialState: State = {
    selectedPackage: null,
    loading: false,
    error: null,
    sessionId: null,
}

export const fetchPackageDetailsBySession = createAppAsyncThunk<
    { packageData: DashboardPackageRow | null },
    number
>('packageDetails/fetchBySession', async (sessionId) => {
    const packageData = await fetchPackageBySessionId(sessionId)
    return { packageData }
})

const slice = createSlice({
    name: 'packageDetails',
    initialState,
    reducers: {
        clearPackageDetails: (state) => {
            state.selectedPackage = null
            state.error = null
            state.sessionId = null
        },
        setSessionId: (state, action) => {
            state.sessionId = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPackageDetailsBySession.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchPackageDetailsBySession.fulfilled, (state, action) => {
                state.loading = false
                state.selectedPackage = action.payload.packageData
            })
            .addCase(fetchPackageDetailsBySession.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message || 'Failed to fetch package details'
                state.selectedPackage = null
            })
    },
})

export const { clearPackageDetails, setSessionId } = slice.actions
export default slice.reducer
