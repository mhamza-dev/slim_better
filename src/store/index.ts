import { configureStore } from '@reduxjs/toolkit'
import patientsReducer from './patientsSlice'
import buyedPackagesReducer from './buyedPackagesSlice'
import sessionsReducer from './sessionsSlice'
import transactionsReducer from './transactionsSlice'
import packageDetailsReducer from './packageDetailsSlice'

export const store = configureStore({
    reducer: {
        patients: patientsReducer,
        buyedPackages: buyedPackagesReducer,
        sessions: sessionsReducer,
        transactions: transactionsReducer,
        packageDetails: packageDetailsReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type PatientsState = ReturnType<typeof patientsReducer>



