// Internal imports - Types
import type { Transaction } from '../types/db'

// Internal imports - Services
import { TransactionService } from './index'

// Re-export the new service methods for backward compatibility
export const fetchTransactionsByPackage = TransactionService.getByPackageId
export const addTransaction = TransactionService.create
export const addPaymentAndUpdatePackage = TransactionService.addPaymentAndUpdatePackage
export const deletePaymentAndUpdatePackage = TransactionService.deletePaymentAndUpdatePackage
export const updatePaymentAndUpdatePackage = TransactionService.updatePaymentAndUpdatePackage

// Re-export types
export type { Transaction }
