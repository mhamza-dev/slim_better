import { configureStore } from '@reduxjs/toolkit'
import patientsReducer from './patientsSlice'
import buyedPackagesReducer from './buyedPackagesSlice'
import sessionsReducer from './sessionsSlice'
import transactionsReducer from './transactionsSlice'

export const store = configureStore({
    reducer: {
        patients: patientsReducer,
        buyedPackages: buyedPackagesReducer,
        sessions: sessionsReducer,
        transactions: transactionsReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type PatientsState = ReturnType<typeof patientsReducer>



