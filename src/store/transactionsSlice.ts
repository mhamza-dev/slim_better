import { createSlice } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from './createAppAsyncThunk'
import type { Transaction } from '../services/transactionsService'
import { fetchTransactionsByPackage as svcFetchTransactionsByPackage, addPaymentAndUpdatePackage as svcAddPaymentAndUpdatePackage, deletePaymentAndUpdatePackage as svcDeletePaymentAndUpdatePackage, updatePaymentAndUpdatePackage as svcUpdatePaymentAndUpdatePackage } from '../services/transactionsService'

type State = {
    itemsByPackageId: Record<number, Transaction[]>
    loadingByPackageId: Record<number, boolean>
    errorByPackageId: Record<number, string | null>
}

const initialState: State = {
    itemsByPackageId: {},
    loadingByPackageId: {},
    errorByPackageId: {},
}

export const fetchTransactionsByPackage = createAppAsyncThunk<{ packageId: number; items: Transaction[] }, number>(
    'transactions/fetchByPackage',
    async (packageId) => {
        const data = await svcFetchTransactionsByPackage(packageId)
        return { packageId, items: data }
    }
)

export const addTransaction = createAppAsyncThunk<{ packageId: number }, { buyed_package_id: number; amount: number; date?: string | null; created_by?: string | null }>(
    'transactions/add',
    async (payload) => {
        await svcAddPaymentAndUpdatePackage(payload)
        return { packageId: payload.buyed_package_id }
    }
)

export const deleteTransaction = createAppAsyncThunk<{ packageId: number }, { id: number; buyed_package_id: number; updated_by?: string | null }>(
    'transactions/delete',
    async ({ id, buyed_package_id, updated_by }) => {
        await svcDeletePaymentAndUpdatePackage(id, updated_by)
        return { packageId: buyed_package_id }
    }
)

export const updateTransaction = createAppAsyncThunk<{ packageId: number }, { id: number; buyed_package_id: number; amount?: number; date?: string | null; updated_by?: string | null }>(
    'transactions/update',
    async ({ id, buyed_package_id, amount, date, updated_by }) => {
        await svcUpdatePaymentAndUpdatePackage(id, { amount, date, updated_by })
        return { packageId: buyed_package_id }
    }
)

const slice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTransactionsByPackage.pending, (state, action) => {
                const id = action.meta.arg
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(fetchTransactionsByPackage.fulfilled, (state, action) => {
                const { packageId, items } = action.payload
                state.loadingByPackageId[packageId] = false
                state.itemsByPackageId[packageId] = items
            })
            .addCase(fetchTransactionsByPackage.rejected, (state, action) => {
                const id = action.meta.arg
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to load transactions'
            })
            .addCase(addTransaction.pending, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(addTransaction.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(addTransaction.rejected, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to add transaction'
            })
            .addCase(deleteTransaction.pending, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(deleteTransaction.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(deleteTransaction.rejected, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to delete transaction'
            })
            .addCase(updateTransaction.pending, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = true
                state.errorByPackageId[id] = null
            })
            .addCase(updateTransaction.fulfilled, (state, action) => {
                const id = action.payload.packageId
                state.loadingByPackageId[id] = false
            })
            .addCase(updateTransaction.rejected, (state, action) => {
                const id = action.meta.arg.buyed_package_id
                state.loadingByPackageId[id] = false
                state.errorByPackageId[id] = action.error.message || 'Failed to update transaction'
            })
    }
})

export default slice.reducer


