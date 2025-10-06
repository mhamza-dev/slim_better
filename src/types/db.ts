export type Patient = {
    id: number
    name: string
    phone_number: string
    address: string | null
    date_of_birth: string | null
    created_by: string | null
    created_at: string | null
    updated_at: string | null
}

export type BuyedPackage = {
    id: number
    patient_id: number
    no_of_sessions: number
    total_payment: number
    advance_payment: number
    paid_payment: number
    sessions_completed: number
    gap_between_sessions: number
    start_date: string
    next_session_date: string | null
    created_by: string | null
    created_at: string | null
    updated_at: string | null
}
// Note: created_by is a UUID (string) referencing auth.users(id)

export type BuyedPackageWithCreator = BuyedPackage & {
    // When selected with: select('*, creator:created_by(id,email)')
    creator: { id: string; email: string | null } | null
}


