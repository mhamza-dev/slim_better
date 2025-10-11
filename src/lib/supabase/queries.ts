import { supabase } from '../supabaseClient'
import type {
    Patient,
    BuyedPackage,
    BuyedPackageWithCreator,
    BuyedPackageWithCreatorAndPatient,
    Session,
    Transaction,
    Profile,
    QueryOptions
} from '../../types/db'

// Generic query builder for soft delete handling
export class SupabaseQueryBuilder<T> {
    private query: any

    constructor(tableName: string) {
        this.query = supabase.from(tableName)
    }

    select(columns: string = '*'): this {
        this.query = this.query.select(columns)
        return this
    }

    where(column: string, operator: string, value: any): this {
        this.query = this.query[operator](column, value)
        return this
    }

    eq(column: string, value: any): this {
        this.query = this.query.eq(column, value)
        return this
    }

    neq(column: string, value: any): this {
        this.query = this.query.neq(column, value)
        return this
    }

    in(column: string, values: any[]): this {
        this.query = this.query.in(column, values)
        return this
    }

    gte(column: string, value: any): this {
        this.query = this.query.gte(column, value)
        return this
    }

    lte(column: string, value: any): this {
        this.query = this.query.lte(column, value)
        return this
    }

    order(column: string, options?: { ascending?: boolean }): this {
        this.query = this.query.order(column, options)
        return this
    }

    limit(count: number): this {
        this.query = this.query.limit(count)
        return this
    }

    offset(count: number): this {
        this.query = this.query.range(count, count + this.query.limit - 1)
        return this
    }

    // Apply soft delete filter unless withDeleted is true
    applySoftDelete(options?: QueryOptions): this {
        if (!options?.withDeleted) {
            this.query = this.query.eq('is_deleted', false)
        }
        return this
    }

    // Execute the query
    async execute(): Promise<{ data: T[] | null; error: any }> {
        return await this.query
    }

    // Execute single query
    async single(): Promise<{ data: T | null; error: any }> {
        return await this.query.single()
    }
}

// Patient queries
export const patientQueries = {
    // Get all patients with optional soft delete handling
    async getAll(options?: QueryOptions): Promise<Patient[]> {
        const query = new SupabaseQueryBuilder<Patient>('patients')
            .select('*')
            .applySoftDelete(options)
            .order('id', { ascending: false })

        if (options?.limit) {
            query.limit(options.limit)
        }
        if (options?.offset) {
            query.offset(options.offset)
        }

        const { data, error } = await query.execute()
        if (error) throw error
        return data || []
    },

    // Get patient by ID
    async getById(id: number, options?: QueryOptions): Promise<Patient | null> {
        const query = new SupabaseQueryBuilder<Patient>('patients')
            .select('*')
            .eq('id', id)
            .applySoftDelete(options)

        const { data, error } = await query.single()
        if (error) throw error
        return data
    },

    // Create new patient
    async create(input: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Patient> {
        const { data, error } = await supabase
            .from('patients')
            .insert({
                ...input,
                is_deleted: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('*')
            .single()

        if (error) throw error
        return data
    },

    // Update patient
    async update(id: number, input: Partial<Patient> & { updated_by?: string | null }): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    },

    // Soft delete patient
    async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .update({
                is_deleted: true,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    }
}

// Helper function to calculate sessions_completed and next_session_date
function calculateSessionStats(packageSessions: any[]) {
    // Calculate completed sessions
    const completedSessions = packageSessions.filter(s => s.status === 'completed').length

    // Find next session (planned or rescheduled after last completed session)
    const completedSessionsWithDates = packageSessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())

    const lastCompletedDate = completedSessionsWithDates.length > 0
        ? completedSessionsWithDates[completedSessionsWithDates.length - 1].scheduled_date
        : null

    const nextSession = packageSessions
        .filter(s => (s.status === 'planned' || s.status === 'rescheduled'))
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .find(s => !lastCompletedDate || new Date(s.scheduled_date) > new Date(lastCompletedDate))

    return {
        sessions_completed: completedSessions,
        next_session_date: nextSession?.scheduled_date || null
    }
}

// Package queries
export const packageQueries = {
    // Get all packages with calculated sessions_completed and next_session_date
    async getAll(options?: QueryOptions): Promise<BuyedPackage[]> {
        const query = new SupabaseQueryBuilder<BuyedPackage>('buyed_packages')
            .select('*')
            .applySoftDelete(options)
            .order('id', { ascending: false })

        if (options?.limit) {
            query.limit(options.limit)
        }

        const { data, error } = await query.execute()
        if (error) throw error
        const packages = data || []

        if (packages.length === 0) return packages

        // Get sessions for all packages
        const packageIds = packages.map(p => p.id)
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('buyed_package_id, status, scheduled_date')
            .in('buyed_package_id', packageIds)
            .eq('is_deleted', false)

        if (sessionsError) throw sessionsError

        // Calculate sessions_completed and next_session_date for each package
        const sessionsByPackage = new Map<number, any[]>()
        for (const session of sessions || []) {
            if (!sessionsByPackage.has(session.buyed_package_id)) {
                sessionsByPackage.set(session.buyed_package_id, [])
            }
            sessionsByPackage.get(session.buyed_package_id)!.push(session)
        }

        return packages.map(pkg => {
            const packageSessions = sessionsByPackage.get(pkg.id) || []
            const stats = calculateSessionStats(packageSessions)

            return {
                ...pkg,
                ...stats
            }
        })
    },

    // Get packages by patient ID with calculated sessions_completed and next_session_date
    async getByPatientId(patientId: number, options?: QueryOptions): Promise<BuyedPackageWithCreator[]> {
        const query = new SupabaseQueryBuilder<BuyedPackageWithCreator>('buyed_packages')
            .select('*, creator:created_by(id,email)')
            .eq('patient_id', patientId)
            .applySoftDelete(options)
            .order('id', { ascending: false })

        const { data, error } = await query.execute()
        if (error) throw error
        const packages = data || []

        if (packages.length === 0) return packages

        // Get sessions for all packages
        const packageIds = packages.map(p => p.id)
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('buyed_package_id, status, scheduled_date')
            .in('buyed_package_id', packageIds)
            .eq('is_deleted', false)

        if (sessionsError) throw sessionsError

        // Calculate sessions_completed and next_session_date for each package
        const sessionsByPackage = new Map<number, any[]>()
        for (const session of sessions || []) {
            if (!sessionsByPackage.has(session.buyed_package_id)) {
                sessionsByPackage.set(session.buyed_package_id, [])
            }
            sessionsByPackage.get(session.buyed_package_id)!.push(session)
        }

        return packages.map(pkg => {
            const packageSessions = sessionsByPackage.get(pkg.id) || []
            const stats = calculateSessionStats(packageSessions)

            return {
                ...pkg,
                ...stats
            }
        })
    },

    // Get package by ID with calculated sessions_completed and next_session_date
    async getById(id: number, options?: QueryOptions): Promise<BuyedPackage | null> {
        const query = new SupabaseQueryBuilder<BuyedPackage>('buyed_packages')
            .select('*')
            .eq('id', id)
            .applySoftDelete(options)

        const { data, error } = await query.single()
        if (error) throw error
        if (!data) return null

        // Get sessions for this package
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('status, scheduled_date')
            .eq('buyed_package_id', id)
            .eq('is_deleted', false)

        if (sessionsError) throw sessionsError

        // Calculate sessions_completed and next_session_date
        const packageSessions = sessions || []
        const stats = calculateSessionStats(packageSessions)

        return {
            ...data,
            ...stats
        }
    },

    // Get package by session ID with calculated sessions_completed and next_session_date
    async getBySessionId(sessionId: number): Promise<BuyedPackageWithCreatorAndPatient | null> {
        const { data, error } = await supabase
            .from('sessions')
            .select(`
                buyed_packages!inner(
                    *,
                    creator:created_by(id,email),
                    patients!inner(
                        name,
                        phone_number
                    )
                )
            `)
            .eq('id', sessionId)
            .eq('is_deleted', false)
            .single()

        if (error) throw error
        const packageData = (data?.buyed_packages as any) || null
        if (!packageData) return null

        // Get sessions for this package
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('status, scheduled_date')
            .eq('buyed_package_id', packageData.id)
            .eq('is_deleted', false)

        if (sessionsError) throw sessionsError

        // Calculate sessions_completed and next_session_date
        const packageSessions = sessions || []
        const stats = calculateSessionStats(packageSessions)

        return {
            ...packageData,
            ...stats
        }
    },

    // Create new package
    async create(input: Omit<BuyedPackage, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'sessions_completed' | 'next_session_date' | 'paid_payment'>): Promise<BuyedPackage> {
        const { data, error } = await supabase
            .from('buyed_packages')
            .insert({
                ...input,
                is_deleted: false,
                paid_payment: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('*')
            .single()

        if (error) throw error
        return data
    },

    // Update package
    async update(id: number, input: Partial<BuyedPackage> & { updated_by?: string | null }): Promise<void> {
        const { error } = await supabase
            .from('buyed_packages')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    },

    // Soft delete package
    async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        const { error } = await supabase
            .from('buyed_packages')
            .update({
                is_deleted: true,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    }
}

// Session queries
export const sessionQueries = {
    // Get sessions by package ID
    async getByPackageId(packageId: number, options?: QueryOptions): Promise<Session[]> {
        const query = new SupabaseQueryBuilder<Session>('sessions')
            .select('*')
            .eq('buyed_package_id', packageId)
            .applySoftDelete(options)
            .order('session_number', { ascending: true })

        const { data, error } = await query.execute()
        if (error) throw error
        return data || []
    },

    // Get sessions by date range
    async getByDateRange(startDate: string, endDate?: string, options?: QueryOptions): Promise<Session[]> {
        let query = supabase
            .from('sessions')
            .select(`
                *,
                buyed_packages!inner(
                    patient_id,
                    patients!inner(
                        name,
                        phone_number
                    )
                )
            `)
            .in('status', ['planned', 'rescheduled'])
            .order('scheduled_date', { ascending: true })

        // Apply soft delete filter if enabled
        if (!options?.withDeleted) {
            query = query.eq('is_deleted', false)
        }

        if (endDate) {
            query = query.gte('scheduled_date', startDate).lte('scheduled_date', endDate)
        } else {
            query = query.eq('scheduled_date', startDate)
        }

        const { data, error } = await query
        if (error) throw error

        // Transform the data to include patient_name
        return (data || []).map(session => ({
            ...session,
            patient_name: session.buyed_packages?.patients?.name || 'Unknown Patient'
        }))
    },

    // Create sessions
    async createMany(sessions: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>[]): Promise<void> {
        const sessionsWithDefaults = sessions.map(session => ({
            ...session,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
            .from('sessions')
            .insert(sessionsWithDefaults)

        if (error) throw error
    },

    // Update session
    async update(id: number, input: Partial<Session> & { updated_by?: string | null }): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    },

    // Soft delete sessions by package ID
    async softDeleteByPackageId(packageId: number, updatedBy?: string | null): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .update({
                is_deleted: true,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            })
            .eq('buyed_package_id', packageId)
            .eq('is_deleted', false)

        if (error) throw error
    }
}

// Transaction queries
export const transactionQueries = {
    // Get transactions by package ID
    async getByPackageId(packageId: number, options?: QueryOptions): Promise<Transaction[]> {
        const query = new SupabaseQueryBuilder<Transaction>('transactions_history')
            .select('*')
            .eq('buyed_package_id', packageId)
            .applySoftDelete(options)
            .order('date', { ascending: false })

        const { data, error } = await query.execute()
        if (error) throw error
        return data || []
    },

    // Create transaction
    async create(input: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Transaction> {
        const { data, error } = await supabase
            .from('transactions_history')
            .insert({
                ...input,
                is_deleted: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('*')
            .single()

        if (error) throw error
        return data
    },

    // Update transaction
    async update(id: number, input: Partial<Transaction> & { updated_by?: string | null }): Promise<void> {
        const { error } = await supabase
            .from('transactions_history')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    },

    // Soft delete transaction
    async softDelete(id: number, updatedBy?: string | null): Promise<void> {
        const { error } = await supabase
            .from('transactions_history')
            .update({
                is_deleted: true,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
    },

    // Soft delete transactions by package ID
    async softDeleteByPackageId(packageId: number, updatedBy?: string | null): Promise<void> {
        const { error } = await supabase
            .from('transactions_history')
            .update({
                is_deleted: true,
                updated_by: updatedBy,
                updated_at: new Date().toISOString()
            })
            .eq('buyed_package_id', packageId)
            .eq('is_deleted', false)

        if (error) throw error
    }
}

// Profile queries
export const profileQueries = {
    // Get profiles by IDs
    async getByIds(ids: string[]): Promise<Profile[]> {
        if (ids.length === 0) return []

        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, created_at')
            .in('id', ids)

        if (error) throw error
        return data || []
    },

    // Get profile by ID
    async getById(id: string): Promise<Profile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    }
}

// Utility function to enrich entities with creator/updater emails
export async function enrichWithUserEmails<T extends { created_by?: string | null; updated_by?: string | null; creator_email?: string | null; updated_by_email?: string | null }>(
    entities: T[]
): Promise<T[]> {
    if (entities.length === 0) return entities

    const creatorIds = [...new Set(entities.map(e => e.created_by).filter((id): id is string => Boolean(id)))]
    const updaterIds = [...new Set(entities.map(e => e.updated_by).filter((id): id is string => Boolean(id)))]
    const allIds = [...new Set([...creatorIds, ...updaterIds])]

    if (allIds.length === 0) return entities

    const profiles = await profileQueries.getByIds(allIds)
    const profilesMap = new Map(profiles.map(p => [p.id, p.email]))

    return entities.map(entity => ({
        ...entity,
        creator_email: entity.created_by ? profilesMap.get(entity.created_by) ?? null : null,
        updated_by_email: entity.updated_by ? profilesMap.get(entity.updated_by) ?? null : null
    }))
}
