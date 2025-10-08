import { useState, useEffect } from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabaseClient'
import { useDispatch } from 'react-redux'
import { updatePackage, fetchPackagesByPatient } from '../store/buyedPackagesSlice'
import type { BuyedPackage } from '../types/db'

interface PackageEditModalProps {
    packageId: number | null
    patientId: number
    isOpen: boolean
    onClose: () => void
}

export function PackageEditModal({ packageId, patientId, isOpen, onClose }: PackageEditModalProps) {
    const dispatch = useDispatch()
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
        paid_payment: Yup.number().min(0).required('Paid payment is required').max(Yup.ref('total_payment'), 'Paid payment cannot exceed total payment'),
        sessions_completed: Yup.number().min(0).required('Sessions completed is required'),
        gap_between_sessions: Yup.number().min(0).required('Gap between sessions is required'),
        start_date: Yup.string().required('Start date is required'),
        next_session_date: Yup.string().nullable(),
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

                            <Formik
                                initialValues={{
                                    no_of_sessions: packageData.no_of_sessions,
                                    total_payment: packageData.total_payment,
                                    advance_payment: packageData.advance_payment,
                                    paid_payment: packageData.paid_payment,
                                    sessions_completed: packageData.sessions_completed,
                                    gap_between_sessions: packageData.gap_between_sessions,
                                    start_date: packageData.start_date,
                                    next_session_date: packageData.next_session_date || '',
                                }}
                                validationSchema={schema}
                                onSubmit={async (values) => {
                                    if (!packageId) return

                                    setLoading(true)
                                    setError(null)

                                    try {
                                        const updateData = {
                                            no_of_sessions: Number(values.no_of_sessions),
                                            total_payment: Number(values.total_payment),
                                            advance_payment: Number(values.advance_payment),
                                            paid_payment: Number(values.paid_payment),
                                            sessions_completed: Number(values.sessions_completed),
                                            gap_between_sessions: Number(values.gap_between_sessions),
                                            start_date: values.start_date,
                                            next_session_date: values.next_session_date || null,
                                        }

                                        await (dispatch as unknown as (action: unknown) => Promise<unknown>)(updatePackage({
                                            id: packageId,
                                            patient_id: patientId,
                                            data: updateData
                                        }))

                                        // Refresh the packages list
                                        await (dispatch as unknown as (action: unknown) => Promise<unknown>)(fetchPackagesByPatient(patientId))

                                        onClose()
                                    } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Failed to update package')
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                            >
                                <Form className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Number of Sessions */}
                                        <div>
                                            <label htmlFor="no_of_sessions" className="block text-sm font-medium text-gray-700 mb-1">
                                                Number of Sessions *
                                            </label>
                                            <Field
                                                type="number"
                                                id="no_of_sessions"
                                                name="no_of_sessions"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                            />
                                            <ErrorMessage name="no_of_sessions" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Total Payment */}
                                        <div>
                                            <label htmlFor="total_payment" className="block text-sm font-medium text-gray-700 mb-1">
                                                Total Payment *
                                            </label>
                                            <Field
                                                type="number"
                                                id="total_payment"
                                                name="total_payment"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                                step="0.01"
                                            />
                                            <ErrorMessage name="total_payment" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Advance Payment */}
                                        <div>
                                            <label htmlFor="advance_payment" className="block text-sm font-medium text-gray-700 mb-1">
                                                Advance Payment *
                                            </label>
                                            <Field
                                                type="number"
                                                id="advance_payment"
                                                name="advance_payment"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                                step="0.01"
                                            />
                                            <ErrorMessage name="advance_payment" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Paid Payment */}
                                        <div>
                                            <label htmlFor="paid_payment" className="block text-sm font-medium text-gray-700 mb-1">
                                                Paid Payment *
                                            </label>
                                            <Field
                                                type="number"
                                                id="paid_payment"
                                                name="paid_payment"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                                step="0.01"
                                            />
                                            <ErrorMessage name="paid_payment" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Sessions Completed */}
                                        <div>
                                            <label htmlFor="sessions_completed" className="block text-sm font-medium text-gray-700 mb-1">
                                                Sessions Completed *
                                            </label>
                                            <Field
                                                type="number"
                                                id="sessions_completed"
                                                name="sessions_completed"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                            />
                                            <ErrorMessage name="sessions_completed" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Gap Between Sessions */}
                                        <div>
                                            <label htmlFor="gap_between_sessions" className="block text-sm font-medium text-gray-700 mb-1">
                                                Gap Between Sessions (days) *
                                            </label>
                                            <Field
                                                type="number"
                                                id="gap_between_sessions"
                                                name="gap_between_sessions"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                min="0"
                                            />
                                            <ErrorMessage name="gap_between_sessions" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Start Date */}
                                        <div>
                                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Start Date *
                                            </label>
                                            <Field
                                                type="date"
                                                id="start_date"
                                                name="start_date"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                            <ErrorMessage name="start_date" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>

                                        {/* Next Session Date */}
                                        <div>
                                            <label htmlFor="next_session_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Next Session Date
                                            </label>
                                            <Field
                                                type="date"
                                                id="next_session_date"
                                                name="next_session_date"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                            <ErrorMessage name="next_session_date" component="div" className="text-red-500 text-sm mt-1" />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1"
                                        >
                                            {loading ? 'Updating...' : 'Update Package'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={onClose}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </Form>
                            </Formik>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
