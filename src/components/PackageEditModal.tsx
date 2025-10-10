import { useState, useEffect } from 'react'
import * as Yup from 'yup'
//
import { supabase } from '../lib/supabaseClient'
import { useAppDispatch } from '../store/hooks'
import { updatePackage, fetchPackagesByPatient } from '../store/buyedPackagesSlice'
import type { BuyedPackage } from '../types/db'
import { FormBuilder, type FormFieldConfig } from './ui/Form'
import { useAuth } from '../hooks/useAuth'

interface PackageEditModalProps {
    packageId: number | null
    patientId: number
    isOpen: boolean
    onClose: () => void
}

export function PackageEditModal({ packageId, patientId, isOpen, onClose }: PackageEditModalProps) {
    const dispatch = useAppDispatch()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [packageData, setPackageData] = useState<BuyedPackage | null>(null)

    useEffect(() => {
        if (!packageId || !isOpen) return

        async function loadPackage() {
            try {
                const { data, error } = await supabase
                    .from('buyed_packages')
                    .select('*')
                    .eq('id', packageId)
                    .eq('is_deleted', false)
                    .single()

                if (error) throw error
                setPackageData(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load package')
            }
        }

        loadPackage()
    }, [packageId, isOpen])

    // Handle Escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    const schema = Yup.object({
        no_of_sessions: Yup.number().min(0).required('Number of sessions is required'),
        total_payment: Yup.number().min(0).required('Total payment is required'),
        advance_payment: Yup.number().min(0).required('Advance payment is required').max(Yup.ref('total_payment'), 'Advance payment cannot exceed total payment'),
        gap_between_sessions: Yup.number().min(0).required('Gap between sessions is required'),
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] lg:max-h-[80vh] overflow-y-auto mt-4 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-primaryDark">Edit Package</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {!packageData ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading package data...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    {error}
                                </div>
                            )}

                            <FormBuilder
                                initialValues={{
                                    no_of_sessions: packageData.no_of_sessions,
                                    total_payment: packageData.total_payment,
                                    advance_payment: packageData.advance_payment,
                                    gap_between_sessions: packageData.gap_between_sessions,
                                }}
                                validationSchema={schema}
                                fields={[
                                    { type: 'number', name: 'no_of_sessions', label: 'Number of Sessions *', min: 0 },
                                    { type: 'number', name: 'gap_between_sessions', label: 'Gap Between Sessions (days) *', min: 0 },
                                    { type: 'number', name: 'total_payment', label: 'Total Payment *', min: 0 },
                                    { type: 'number', name: 'advance_payment', label: 'Advance Payment *', min: 0 },
                                ] as FormFieldConfig[]}
                                onSubmit={async (values) => {
                                    console.log('Form Values:', values)
                                    console.log('Package ID:', packageId)
                                    console.log('Patient ID:', patientId)
                                    console.log('User ID:', user?.id)

                                    if (!packageId) {
                                        setError('Package ID is missing')
                                        return
                                    }

                                    setLoading(true)
                                    setError(null)
                                    try {
                                        const updateData = {
                                            no_of_sessions: Number(values.no_of_sessions as number),
                                            total_payment: Number(values.total_payment as number),
                                            advance_payment: Number(values.advance_payment as number),
                                            gap_between_sessions: Number(values.gap_between_sessions as number),
                                            updated_by: user?.id || null,
                                        }
                                        console.log('Update Data:', updateData)

                                        const result = await dispatch(updatePackage({ id: packageId, patient_id: patientId, data: updateData }))
                                        console.log('Update Result:', result)

                                        if (updatePackage.fulfilled.match(result)) {
                                            await dispatch(fetchPackagesByPatient(patientId))
                                            onClose()
                                        } else {
                                            throw new Error(result.error?.message || 'Failed to update package')
                                        }
                                    } catch (err) {
                                        console.error('Update Error:', err)
                                        setError(err instanceof Error ? err.message : 'Failed to update package')
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                                submitLabel={loading ? 'Updating...' : 'Update Package'}
                                cancelLabel="Cancel"
                                onCancel={onClose}
                                layout="two-column"
                                isSubmitting={loading}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
