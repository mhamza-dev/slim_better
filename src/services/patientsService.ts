// Internal imports - Services
import { PatientService } from './index'

// Re-export the new service methods for backward compatibility
export const fetchPatientById = PatientService.getById
export const createPatient = PatientService.create
export const updatePatient = PatientService.update
export const fetchPatientsList = PatientService.getAll
export const softDeletePatient = PatientService.softDelete
