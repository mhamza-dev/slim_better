import { TransactionService } from './index'
import type { Transaction } from '../types/db'

// Re-export the new service methods for backward compatibility
export const fetchTransactionsByPackage = TransactionService.getByPackageId
export const addTransaction = TransactionService.create
export const addPaymentAndUpdatePackage = TransactionService.addPaymentAndUpdatePackage
export const deletePaymentAndUpdatePackage = TransactionService.deletePaymentAndUpdatePackage
export const updatePaymentAndUpdatePackage = TransactionService.updatePaymentAndUpdatePackage

// Re-export types
export type { Transaction }


