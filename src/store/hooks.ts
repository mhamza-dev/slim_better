// React Redux imports
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

// Internal imports - Types
import type { AppDispatch, RootState } from './index'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
