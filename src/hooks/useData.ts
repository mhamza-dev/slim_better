import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPatients } from '../store/patientsSlice'
import { fetchPackagesByPatient, addPackage, updatePackage, deletePackage } from '../store/buyedPackagesSlice'
import { fetchSessionsByPackage, rescheduleSession, generateSessions, completeSession } from '../store/sessionsSlice'
import { fetchTransactionsByPackage, addTransaction, deleteTransaction, updateTransaction } from '../store/transactionsSlice'
import { PatientService, PackageService, SessionService } from '../services'
import type { Patient, BuyedPackage, Session, QueryOptions } from '../types/db'

// Patients hooks
export function usePatients(_options?: QueryOptions) {
    const dispatch = useAppDispatch()
    const patients = useAppSelector((state) => state.patients.items)
    const loading = useAppSelector((state) => state.patients.loading)
    const error = useAppSelector((state) => state.patients.error)

    const refetch = useCallback(() => {
        dispatch(fetchPatients())
    }, [dispatch])

    const createPatient = useCallback(async (input: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'creator_email' | 'updated_by_email'>) => {
        return await PatientService.create(input)
    }, [])

    const updatePatient = useCallback(async (id: number, input: Partial<Patient> & { updated_by?: string | null }) => {
        await PatientService.update(id, input)
        refetch()
    }, [refetch])

    const softDeletePatient = useCallback(async (id: number, updatedBy?: string | null) => {
        await PatientService.softDelete(id, updatedBy)
        refetch()
    }, [refetch])

    return {
        patients,
        loading,
        error,
        refetch,
        createPatient,
        updatePatient,
        softDeletePatient
    }
}

// Packages hooks
export function usePackages(patientId?: number, _options?: QueryOptions) {
    const dispatch = useAppDispatch()
    const packages = useAppSelector((state) =>
        patientId ? state.buyedPackages.itemsByPatientId[patientId] || [] : []
    )
    const loading = useAppSelector((state) =>
        patientId ? state.buyedPackages.loadingByPatientId[patientId] || false : false
    )
    const error = useAppSelector((state) =>
        patientId ? state.buyedPackages.errorByPatientId[patientId] || null : null
    )

    const refetch = useCallback(() => {
        if (patientId) {
            dispatch(fetchPackagesByPatient(patientId))
        }
    }, [dispatch, patientId])

    const createPackage = useCallback(async (input: Omit<BuyedPackage, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'sessions_completed' | 'next_session_date' | 'paid_payment' | 'creator_email' | 'updated_by_email'>) => {
        const result = await dispatch(addPackage(input))
        if (addPackage.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch])

    const updatePackageCallback = useCallback(async (id: number, input: Partial<BuyedPackage> & { updated_by?: string | null }) => {
        const result = await dispatch(updatePackage({ id, patient_id: patientId!, data: input }))
        if (updatePackage.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, patientId])

    const softDeletePackage = useCallback(async (id: number, updatedBy?: string | null) => {
        const result = await dispatch(deletePackage({ id, patientId: patientId!, updatedBy }))
        if (deletePackage.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, patientId])

    return {
        packages,
        loading,
        error,
        refetch,
        createPackage,
        updatePackage: updatePackageCallback,
        softDeletePackage
    }
}

// Sessions hooks
export function useSessions(packageId?: number, _options?: QueryOptions) {
    const dispatch = useAppDispatch()
    const sessions = useAppSelector((state) =>
        packageId ? state.sessions.itemsByPackageId[packageId] || [] : []
    )
    const loading = useAppSelector((state) =>
        packageId ? state.sessions.loadingByPackageId[packageId] || false : false
    )
    const error = useAppSelector((state) =>
        packageId ? state.sessions.errorByPackageId[packageId] || null : null
    )

    const refetch = useCallback(() => {
        if (packageId) {
            dispatch(fetchSessionsByPackage(packageId))
        }
    }, [dispatch, packageId])

    const rescheduleSessionCallback = useCallback(async (sessionId: number, newDateISO: string, updatedBy?: string | null) => {
        const result = await dispatch(rescheduleSession({ sessionId, packageId: packageId!, newDateISO, updated_by: updatedBy }))
        if (rescheduleSession.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, packageId])

    const completeSessionCallback = useCallback(async (sessionId: number, updatedBy?: string | null) => {
        const result = await dispatch(completeSession({ sessionId, packageId: packageId!, updated_by: updatedBy }))
        if (completeSession.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, packageId])

    const generateSessionsCallback = useCallback(async (args: {
        buyedPackageId: number
        startDateISO: string
        totalSessions: number
        gapDays: number
        completedCount: number
        createdBy?: string | null
    }) => {
        const result = await dispatch(generateSessions(args))
        if (generateSessions.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch])

    return {
        sessions,
        loading,
        error,
        refetch,
        rescheduleSession: rescheduleSessionCallback,
        completeSession: completeSessionCallback,
        generateSessions: generateSessionsCallback
    }
}

// Transactions hooks
export function useTransactions(packageId?: number, _options?: QueryOptions) {
    const dispatch = useAppDispatch()
    const transactions = useAppSelector((state) =>
        packageId ? state.transactions.itemsByPackageId[packageId] || [] : []
    )
    const loading = useAppSelector((state) =>
        packageId ? state.transactions.loadingByPackageId[packageId] || false : false
    )
    const error = useAppSelector((state) =>
        packageId ? state.transactions.errorByPackageId[packageId] || null : null
    )

    const refetch = useCallback(() => {
        if (packageId) {
            dispatch(fetchTransactionsByPackage(packageId))
        }
    }, [dispatch, packageId])

    const addTransactionCallback = useCallback(async (input: {
        buyed_package_id: number
        amount: number
        date?: string | null
        created_by?: string | null
    }) => {
        const result = await dispatch(addTransaction(input))
        if (addTransaction.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch])

    const updateTransactionCallback = useCallback(async (id: number, changes: {
        amount?: number
        date?: string | null
        updated_by?: string | null
    }) => {
        const result = await dispatch(updateTransaction({ id, buyed_package_id: packageId!, ...changes }))
        if (updateTransaction.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, packageId])

    const softDeleteTransaction = useCallback(async (id: number, updatedBy?: string | null) => {
        const result = await dispatch(deleteTransaction({ id, buyed_package_id: packageId!, updated_by: updatedBy }))
        if (deleteTransaction.fulfilled.match(result)) {
            refetch()
        }
        return result
    }, [dispatch, refetch, packageId])

    return {
        transactions,
        loading,
        error,
        refetch,
        addTransaction: addTransactionCallback,
        updateTransaction: updateTransactionCallback,
        softDeleteTransaction
    }
}

// Dashboard hooks
export function useDashboardData() {
    const [packages, setPackages] = useState<Array<BuyedPackage & {
        patients?: { name: string; phone_number: string } | null
        sessions_completed: number
        next_session_date: string | null
    }>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await PackageService.getDashboardPackages()
            setPackages(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refetch()
    }, [refetch])

    return {
        packages,
        loading,
        error,
        refetch
    }
}

// Sessions by date range hook
export function useSessionsByDateRange(startDate: string, endDate?: string, _options?: QueryOptions) {
    const [sessions, setSessions] = useState<Array<Session & { patient_name: string | null }>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await SessionService.getByDateRange(startDate, endDate, _options)
            // Transform the data to include patient_name
            const transformedData = data.map(session => ({
                ...session,
                patient_name: null // This would need to be populated from the actual query
            }))
            setSessions(transformedData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions')
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate, _options])

    useEffect(() => {
        refetch()
    }, [refetch])

    return {
        sessions,
        loading,
        error,
        refetch
    }
}

// Import React hooks
import { useState, useEffect } from 'react'
