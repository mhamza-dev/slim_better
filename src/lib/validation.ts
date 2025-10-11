import { z } from 'zod'

// Base schemas for common fields
const uuidSchema = z.string().uuid()
const nonNegativeNumberSchema = z.number().min(0)
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
const phoneNumberSchema = z.string().min(10, 'Phone number must be at least 10 digits')
const emailSchema = z.string().email('Invalid email format')

// Patient validation schemas
export const createPatientSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    phone_number: phoneNumberSchema,
    address: z.string().max(200, 'Address must be less than 200 characters').optional(),
    age: z.number().min(0).max(150).optional(),
    branch_name: z.string().min(1, 'Branch name is required').max(100, 'Branch name must be less than 100 characters'),
    created_by: uuidSchema.optional(),
    updated_by: uuidSchema.optional()
})

export const updatePatientSchema = createPatientSchema.partial().extend({
    id: z.number().positive(),
    updated_by: uuidSchema.optional()
})

// Package validation schemas
export const createPackageSchema = z.object({
    patient_id: z.number().positive('Patient ID is required'),
    no_of_sessions: z.number().min(1, 'Number of sessions must be at least 1').max(1000, 'Number of sessions must be less than 1000'),
    total_payment: nonNegativeNumberSchema,
    advance_payment: nonNegativeNumberSchema,
    gap_between_sessions: z.number().min(1, 'Gap between sessions must be at least 1 day').max(365, 'Gap between sessions must be less than 365 days'),
    start_date: dateStringSchema,
    created_by: uuidSchema.optional(),
    updated_by: uuidSchema.optional()
}).refine(
    (data) => data.advance_payment <= data.total_payment,
    {
        message: 'Advance payment cannot exceed total payment',
        path: ['advance_payment']
    }
)

export const updatePackageSchema = createPackageSchema.partial().extend({
    id: z.number().positive(),
    updated_by: uuidSchema.optional()
})

// Session validation schemas
export const createSessionSchema = z.object({
    buyed_package_id: z.number().positive('Package ID is required'),
    session_number: z.number().min(1, 'Session number must be at least 1'),
    scheduled_date: dateStringSchema,
    actual_date: dateStringSchema.optional(),
    status: z.enum(['planned', 'completed', 'missed', 'rescheduled']),
    created_by: uuidSchema.optional(),
    updated_by: uuidSchema.optional()
})

export const updateSessionSchema = createSessionSchema.partial().extend({
    id: z.number().positive(),
    updated_by: uuidSchema.optional()
})

export const rescheduleSessionSchema = z.object({
    sessionId: z.number().positive(),
    newDateISO: dateStringSchema,
    updatedBy: uuidSchema.optional()
})

export const completeSessionSchema = z.object({
    sessionId: z.number().positive(),
    updatedBy: uuidSchema.optional()
})

// Transaction validation schemas
export const createTransactionSchema = z.object({
    buyed_package_id: z.number().positive('Package ID is required'),
    amount: nonNegativeNumberSchema,
    date: dateStringSchema.optional(),
    created_by: uuidSchema.optional(),
    updated_by: uuidSchema.optional()
})

export const updateTransactionSchema = createTransactionSchema.partial().extend({
    id: z.number().positive(),
    updated_by: uuidSchema.optional()
})

export const addPaymentSchema = z.object({
    buyed_package_id: z.number().positive('Package ID is required'),
    amount: nonNegativeNumberSchema,
    date: dateStringSchema.optional(),
    created_by: uuidSchema.optional()
})

// Generate sessions schema
export const generateSessionsSchema = z.object({
    buyedPackageId: z.number().positive(),
    startDateISO: dateStringSchema,
    totalSessions: z.number().min(1).max(1000),
    gapDays: z.number().min(1).max(365),
    completedCount: z.number().min(0),
    createdBy: uuidSchema.optional()
})

// Query options schema
export const queryOptionsSchema = z.object({
    withDeleted: z.boolean().optional(),
    limit: z.number().min(1).max(10000).optional(),
    offset: z.number().min(0).optional()
})

// Profile validation schemas
export const createProfileSchema = z.object({
    id: uuidSchema,
    email: emailSchema.optional()
})

export const updateProfileSchema = createProfileSchema.partial().extend({
    id: uuidSchema
})

// Soft delete schemas
export const softDeleteSchema = z.object({
    id: z.number().positive(),
    updatedBy: uuidSchema.optional()
})

// Type exports for TypeScript
export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type GenerateSessionsInput = z.infer<typeof generateSessionsSchema>
export type QueryOptionsInput = z.infer<typeof queryOptionsSchema>
export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type SoftDeleteInput = z.infer<typeof softDeleteSchema>

// Validation helper functions
export function validateCreatePatient(data: unknown): CreatePatientInput {
    return createPatientSchema.parse(data)
}

export function validateUpdatePatient(data: unknown): UpdatePatientInput {
    return updatePatientSchema.parse(data)
}

export function validateCreatePackage(data: unknown): CreatePackageInput {
    return createPackageSchema.parse(data)
}

export function validateUpdatePackage(data: unknown): UpdatePackageInput {
    return updatePackageSchema.parse(data)
}

export function validateCreateSession(data: unknown): CreateSessionInput {
    return createSessionSchema.parse(data)
}

export function validateUpdateSession(data: unknown): UpdateSessionInput {
    return updateSessionSchema.parse(data)
}

export function validateRescheduleSession(data: unknown): RescheduleSessionInput {
    return rescheduleSessionSchema.parse(data)
}

export function validateCompleteSession(data: unknown): CompleteSessionInput {
    return completeSessionSchema.parse(data)
}

export function validateCreateTransaction(data: unknown): CreateTransactionInput {
    return createTransactionSchema.parse(data)
}

export function validateUpdateTransaction(data: unknown): UpdateTransactionInput {
    return updateTransactionSchema.parse(data)
}

export function validateAddPayment(data: unknown): AddPaymentInput {
    return addPaymentSchema.parse(data)
}

export function validateGenerateSessions(data: unknown): GenerateSessionsInput {
    return generateSessionsSchema.parse(data)
}

export function validateQueryOptions(data: unknown): QueryOptionsInput {
    return queryOptionsSchema.parse(data)
}

export function validateSoftDelete(data: unknown): SoftDeleteInput {
    return softDeleteSchema.parse(data)
}

// Safe validation functions that return results instead of throwing
export function safeValidateCreatePatient(data: unknown): { success: true; data: CreatePatientInput } | { success: false; error: z.ZodError } {
    const result = createPatientSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateUpdatePatient(data: unknown): { success: true; data: UpdatePatientInput } | { success: false; error: z.ZodError } {
    const result = updatePatientSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateCreatePackage(data: unknown): { success: true; data: CreatePackageInput } | { success: false; error: z.ZodError } {
    const result = createPackageSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateUpdatePackage(data: unknown): { success: true; data: UpdatePackageInput } | { success: false; error: z.ZodError } {
    const result = updatePackageSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateCreateSession(data: unknown): { success: true; data: CreateSessionInput } | { success: false; error: z.ZodError } {
    const result = createSessionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateUpdateSession(data: unknown): { success: true; data: UpdateSessionInput } | { success: false; error: z.ZodError } {
    const result = updateSessionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateRescheduleSession(data: unknown): { success: true; data: RescheduleSessionInput } | { success: false; error: z.ZodError } {
    const result = rescheduleSessionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateCompleteSession(data: unknown): { success: true; data: CompleteSessionInput } | { success: false; error: z.ZodError } {
    const result = completeSessionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateCreateTransaction(data: unknown): { success: true; data: CreateTransactionInput } | { success: false; error: z.ZodError } {
    const result = createTransactionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateUpdateTransaction(data: unknown): { success: true; data: UpdateTransactionInput } | { success: false; error: z.ZodError } {
    const result = updateTransactionSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateAddPayment(data: unknown): { success: true; data: AddPaymentInput } | { success: false; error: z.ZodError } {
    const result = addPaymentSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateGenerateSessions(data: unknown): { success: true; data: GenerateSessionsInput } | { success: false; error: z.ZodError } {
    const result = generateSessionsSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateQueryOptions(data: unknown): { success: true; data: QueryOptionsInput } | { success: false; error: z.ZodError } {
    const result = queryOptionsSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

export function safeValidateSoftDelete(data: unknown): { success: true; data: SoftDeleteInput } | { success: false; error: z.ZodError } {
    const result = softDeleteSchema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}
