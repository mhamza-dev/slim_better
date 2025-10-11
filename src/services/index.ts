import {
    patientQueries,
    packageQueries,
    sessionQueries,
    transactionQueries,
    enrichWithUserEmails
} from '../lib/supabase/queries'
import type {
    Patient,
    BuyedPackage,
    BuyedPackageWithCreator,
    Session,
    Transaction,
    QueryOptions
} from '../types/db'
import { shiftSundayToMonday } from '../utils/date'

// Patient Service
export class PatientService {
    static async getAll(options?: QueryOptions): Promise<Patient[]> {
        const patients = await patientQueries.getAll(options)
        return enrichWithUserEmails(patients)
    }

    static async getById(id: number, options?: QueryOptions): Promise<Patient | null> {
        const patient = await patientQueries.getById(id, options)
        if (!patient) return null
        return (await enrichWithUserEmails([patient]))[0]
    }

    static async create(input: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'creator_email' | 'updated_by_email'>): Promise<Patient> {
        const patient = await patientQueries.create(input)
        return (await enrichWithUserEmails([patient]))[0]
    }

    static async update(id: number, input: Partial<Patient> & { updated_by?: string | null }): Promise<void> {
        await patientQueries.update(id, input)
    }

    static async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        // First, get all package IDs for this patient
        const packages = await packageQueries.getByPatientId(id, { withDeleted: false })
        const packageIds = packages.map(p => p.id)

        // Soft-delete all sessions for these packages
        if (packageIds.length > 0) {
            await Promise.all(packageIds.map(packageId =>
                sessionQueries.softDeleteByPackageId(packageId, updatedBy)
            ))

            // Soft-delete all transactions for these packages
            await Promise.all(packageIds.map(packageId =>
                transactionQueries.softDeleteByPackageId(packageId, updatedBy)
            ))
        }

        // Soft-delete all packages for this patient
        await packageQueries.softDelete(id, updatedBy)

        // Finally, soft-delete the patient
        await patientQueries.softDelete(id, updatedBy)
    }
}

// Package Service
export class PackageService {
    static async getAll(options?: QueryOptions): Promise<BuyedPackage[]> {
        const packages = await packageQueries.getAll(options)
        return enrichWithUserEmails(packages)
    }

    static async getByPatientId(patientId: number, options?: QueryOptions): Promise<BuyedPackageWithCreator[]> {
        const packages = await packageQueries.getByPatientId(patientId, options)
        return enrichWithUserEmails(packages)
    }

    static async getById(id: number, options?: QueryOptions): Promise<BuyedPackage | null> {
        const pkg = await packageQueries.getById(id, options)
        if (!pkg) return null
        return (await enrichWithUserEmails([pkg]))[0]
    }

    static async getBySessionId(sessionId: number): Promise<BuyedPackageWithCreator | null> {
        return await packageQueries.getBySessionId(sessionId)
    }

    static async create(input: Omit<BuyedPackage, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'sessions_completed' | 'next_session_date' | 'paid_payment' | 'creator_email' | 'updated_by_email'>): Promise<BuyedPackage> {
        const pkg = await packageQueries.create(input)
        return (await enrichWithUserEmails([pkg]))[0]
    }

    static async update(id: number, input: Partial<BuyedPackage> & { updated_by?: string | null }): Promise<void> {
        await packageQueries.update(id, input)
    }

    static async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        // Soft-delete all related sessions
        await sessionQueries.softDeleteByPackageId(id, updatedBy)

        // Soft-delete all related transactions
        await transactionQueries.softDeleteByPackageId(id, updatedBy)

        // Soft-delete the package
        await packageQueries.softDelete(id, updatedBy)
    }

    // Dashboard-specific methods
    static async getDashboardPackages(limit = 1000): Promise<Array<BuyedPackage & {
        patients?: { name: string; phone_number: string } | null
        sessions_completed: number
        next_session_date: string | null
    }>> {
        const today = new Date().toISOString().slice(0, 10)

        // Get packages with patient info
        const { data: pkgs, error: pkgErr } = await supabase
            .from('buyed_packages')
            .select('*, patients(name,phone_number)')
            .eq('is_deleted', false)
            .order('start_date', { ascending: false })
            .limit(limit)

        if (pkgErr) throw pkgErr
        const packages = pkgs || []
        if (packages.length === 0) return []

        const packageIds: number[] = packages.map((p: any) => p.id)

        // Get next session dates
        const { data: nextSessions, error: nextErr } = await supabase
            .from('sessions')
            .select('buyed_package_id, scheduled_date, status')
            .in('buyed_package_id', packageIds)
            .in('status', ['planned', 'rescheduled'])
            .gte('scheduled_date', today)
            .eq('is_deleted', false)
            .order('scheduled_date', { ascending: true })

        if (nextErr) throw nextErr

        const packageIdToNextDate = new Map<number, string | null>()
        for (const s of nextSessions || []) {
            if (!packageIdToNextDate.has(s.buyed_package_id)) {
                packageIdToNextDate.set(s.buyed_package_id, shiftSundayToMonday(s.scheduled_date))
            }
        }

        // Get completed sessions count
        const { data: completedRows, error: compErr } = await supabase
            .from('sessions')
            .select('buyed_package_id')
            .in('buyed_package_id', packageIds)
            .eq('status', 'completed')
            .eq('is_deleted', false)

        if (compErr) throw compErr

        const packageIdToCompleted = new Map<number, number>()
        for (const s of completedRows || []) {
            packageIdToCompleted.set(s.buyed_package_id, (packageIdToCompleted.get(s.buyed_package_id) || 0) + 1)
        }

        return packages.map((r: any) => ({
            ...r,
            patients: r.patients ?? null,
            sessions_completed: packageIdToCompleted.get(r.id) || 0,
            next_session_date: packageIdToNextDate.get(r.id) || null,
        }))
    }
}

// Session Service
export class SessionService {
    static async getByPackageId(packageId: number, options?: QueryOptions): Promise<Session[]> {
        const sessions = await sessionQueries.getByPackageId(packageId, options)
        return enrichWithUserEmails(sessions)
    }

    static async getByDateRange(startDate: string, endDate?: string, options?: QueryOptions): Promise<Session[]> {
        const sessions = await sessionQueries.getByDateRange(startDate, endDate, options)
        return enrichWithUserEmails(sessions)
    }

    static async createMany(sessions: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'creator_email' | 'updated_by_email'>[]): Promise<void> {
        const sessionsWithDefaults = sessions.map(session => ({
            ...session,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))
        await sessionQueries.createMany(sessionsWithDefaults)
    }

    static async update(id: number, input: Partial<Session> & { updated_by?: string | null }): Promise<void> {
        await sessionQueries.update(id, input)
    }

    static async reschedule(id: number, newDateISO: string, updatedBy?: string | null): Promise<void> {
        const scheduled_date = shiftSundayToMonday(newDateISO)
        await sessionQueries.update(id, {
            scheduled_date,
            status: 'rescheduled',
            updated_by: updatedBy
        })
    }

    static async complete(id: number, updatedBy?: string | null): Promise<void> {
        await sessionQueries.update(id, {
            status: 'completed',
            actual_date: new Date().toISOString().slice(0, 10),
            updated_by: updatedBy
        })
    }

    static async generateSessions(args: {
        buyedPackageId: number
        startDateISO: string
        totalSessions: number
        gapDays: number
        completedCount: number
        createdBy?: string | null
    }): Promise<void> {
        const { buyedPackageId, startDateISO, totalSessions, gapDays, completedCount, createdBy } = args
        const start = new Date(startDateISO)
        const sessions: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'creator_email' | 'updated_by_email'>[] = []

        for (let i = 1; i <= totalSessions; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + (i - 1) * gapDays)
            const iso = shiftSundayToMonday(d.toISOString())
            sessions.push({
                buyed_package_id: buyedPackageId,
                session_number: i,
                scheduled_date: iso,
                actual_date: null,
                status: i <= completedCount ? 'completed' : 'planned',
                created_by: createdBy ?? null,
                updated_by: null
            })
        }

        if (sessions.length > 0) {
            await this.createMany(sessions)
        }
    }
}

// Transaction Service
export class TransactionService {
    static async getByPackageId(packageId: number, options?: QueryOptions): Promise<Transaction[]> {
        const transactions = await transactionQueries.getByPackageId(packageId, options)
        return enrichWithUserEmails(transactions)
    }

    static async create(input: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'creator_email' | 'updated_by_email'>): Promise<Transaction> {
        const transaction = await transactionQueries.create(input)
        return (await enrichWithUserEmails([transaction]))[0]
    }

    static async update(id: number, input: Partial<Transaction> & { updated_by?: string | null }): Promise<void> {
        await transactionQueries.update(id, input)
    }

    static async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        await transactionQueries.softDelete(id, updatedBy)
    }

    static async addPaymentAndUpdatePackage(input: {
        buyed_package_id: number
        amount: number
        date?: string | null
        created_by?: string | null
    }): Promise<void> {
        // Ensure package is not deleted
        const pkg = await packageQueries.getById(input.buyed_package_id, { withDeleted: false })
        if (!pkg) throw new Error('Package not found or deleted')

        // Insert transaction
        await this.create({
            ...input,
            date: input.date ?? null,
            created_by: input.created_by ?? null,
            updated_by: null
        })

        // Update package paid_payment
        const current = Number(pkg.paid_payment ?? 0)
        const total = Number(pkg.total_payment ?? 0)
        const advance = Number(pkg.advance_payment ?? 0)
        const maxAllowedPaid = Math.max(0, total - advance)
        const requested = Number(input.amount)

        if (current + requested > maxAllowedPaid) {
            throw new Error(`Payment exceeds remaining amount. Remaining: ${Math.max(0, maxAllowedPaid - current)}`)
        }

        const next = current + requested
        await packageQueries.update(input.buyed_package_id, { paid_payment: next })
    }

    static async deletePaymentAndUpdatePackage(id: number, updatedBy?: string | null): Promise<void> {
        // Get transaction details
        const { data: tx, error: readErr } = await supabase
            .from('transactions_history')
            .select('id,buyed_package_id,amount')
            .eq('id', id)
            .eq('is_deleted', false)
            .single()

        if (readErr) throw readErr
        if (!tx) throw new Error('Transaction not found')

        // Soft delete transaction
        await this.softDelete(id, updatedBy)

        // Update package paid_payment
        const pkg = await packageQueries.getById(tx.buyed_package_id)
        if (!pkg) throw new Error('Package not found')

        const current = Number(pkg.paid_payment ?? 0)
        const next = Math.max(current - Number(tx.amount), 0)
        await packageQueries.update(tx.buyed_package_id, { paid_payment: next })
    }

    static async updatePaymentAndUpdatePackage(id: number, changes: {
        amount?: number
        date?: string | null
        updated_by?: string | null
    }): Promise<void> {
        // Get existing transaction
        const { data: tx, error: readErr } = await supabase
            .from('transactions_history')
            .select('id,buyed_package_id,amount')
            .eq('id', id)
            .eq('is_deleted', false)
            .single()

        if (readErr) throw readErr
        if (!tx) throw new Error('Transaction not found')

        const newAmount = changes.amount !== undefined ? Number(changes.amount) : tx.amount

        // Update transaction
        await this.update(id, {
            amount: newAmount,
            date: changes.date ?? null,
            updated_by: changes.updated_by
        })

        // Update package if amount changed
        const delta = Number(newAmount) - Number(tx.amount)
        if (delta !== 0) {
            const pkg = await packageQueries.getById(tx.buyed_package_id)
            if (!pkg) throw new Error('Package not found')

            const current = Number(pkg.paid_payment ?? 0)
            const total = Number(pkg.total_payment ?? 0)
            const advance = Number(pkg.advance_payment ?? 0)
            const maxAllowedPaid = Math.max(0, total - advance)
            const tentative = current + delta

            if (tentative > maxAllowedPaid) {
                throw new Error(`Payment exceeds remaining amount. Remaining: ${Math.max(0, maxAllowedPaid - current)}`)
            }

            const next = Math.max(0, tentative)
            await packageQueries.update(tx.buyed_package_id, { paid_payment: next })
        }
    }
}

// Import supabase client for direct queries
import { supabase } from '../lib/supabaseClient'
