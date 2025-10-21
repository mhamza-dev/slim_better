// Redux Toolkit imports
import { createAsyncThunk } from '@reduxjs/toolkit'

// Internal imports - Types
import type { RootState } from './index'

// Helper to create typed thunks with consistent rejectWithValue payloads
export function createAppAsyncThunk<Returned, ThunkArg = void>(
    typePrefix: string,
    payloadCreator: (
        arg: ThunkArg,
        thunkApi: {
            state: RootState
            rejectWithValue: (payload: { message: string }) => unknown
        }
    ) => Promise<Returned> | Returned
) {
    return createAsyncThunk<Returned, ThunkArg, { state: RootState; rejectValue: { message: string } }>(
        typePrefix,
        async (arg, thunkApi) => {
            try {
                return await payloadCreator(arg, {
                    state: thunkApi.getState() as RootState,
                    rejectWithValue: (payload: { message: string }) => thunkApi.rejectWithValue(payload),
                })
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error'
                return thunkApi.rejectWithValue({ message }) as unknown as Returned
            }
        }
    )
}
