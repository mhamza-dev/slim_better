import { configureStore } from '@reduxjs/toolkit'
import patientsReducer from './patientsSlice'
import buyedPackagesReducer from './buyedPackagesSlice'

export const store = configureStore({
    reducer: {
        patients: patientsReducer,
        buyedPackages: buyedPackagesReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type PatientsState = ReturnType<typeof patientsReducer>


