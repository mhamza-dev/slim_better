import { PackageService } from './index'
import type { BuyedPackageWithCreator, BuyedPackage } from '../types/db'

// Re-export the new service methods for backward compatibility
export const createPackage = PackageService.create
export const fetchDashboardPackages = PackageService.getDashboardPackages
export const fetchPackagesByPatient = PackageService.getByPatientId
export const updatePackageById = PackageService.update
export const deletePackageById = PackageService.softDelete
export const fetchPackageBySessionId = PackageService.getBySessionId

// Re-export types
export type CreatePackageInput = Omit<BuyedPackage, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'sessions_completed' | 'next_session_date' | 'paid_payment' | 'creator_email' | 'updated_by_email'>
export type DashboardPackageRow = Pick<BuyedPackageWithCreator,
    'id' | 'total_payment' | 'paid_payment' | 'advance_payment' | 'no_of_sessions' | 'gap_between_sessions' | 'start_date'> &
{ patients?: { name: string; phone_number: string } | null; sessions_completed: number; next_session_date: string | null }


