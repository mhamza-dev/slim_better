import { useEffect } from 'react'
import Modal from './Modal'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'
import { WhatsAppButton } from './ui/WhatsAppButton'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPackageDetailsBySession, clearPackageDetails, setSessionId } from '../store/packageDetailsSlice'

interface PackageDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    sessionId: number | null
    sessionData?: {
        id: number
        scheduled_date: string
        status: string
        patient_name: string | null
    } | null
}

export function PackageDetailsModal({ isOpen, onClose, sessionId, sessionData }: PackageDetailsModalProps) {
    const dispatch = useAppDispatch()
    const { selectedPackage, loading, error } = useAppSelector((state) => state.packageDetails)

    useEffect(() => {
        if (!isOpen || !sessionId) {
            dispatch(clearPackageDetails())
            return
        }

        // Set the session ID and fetch package details
        dispatch(setSessionId(sessionId))
        dispatch(fetchPackageDetailsBySession(sessionId))
    }, [dispatch, isOpen, sessionId])

    const handleClose = () => {
        dispatch(clearPackageDetails())
        onClose()
    }

    const formatCurrency = (amount: number | null | undefined) =>
        `PKR ${(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

    const getRemainingSessions = () => {
        if (!selectedPackage) return 0
        const total = selectedPackage.no_of_sessions || 0
        const completed = selectedPackage.sessions_completed || 0
        return total - completed
    }

    const getRemainingPayment = () => {
        if (!selectedPackage) return 0
        const total = selectedPackage.total_payment || 0
        const paid = selectedPackage.paid_payment || 0
        const advance = selectedPackage.advance_payment || 0
        return total - (paid + advance)
    }

    const getProgressPercentage = () => {
        if (!selectedPackage) return 0
        const total = selectedPackage.no_of_sessions || 0
        const completed = selectedPackage.sessions_completed || 0
        if (total === 0) return 0
        return Math.round((completed / total) * 100)
    }

    const getPaymentProgressPercentage = () => {
        if (!selectedPackage) return 0
        const total = selectedPackage.total_payment || 0
        const paid = selectedPackage.paid_payment || 0
        if (total === 0) return 0
        return Math.round((paid / total) * 100)
    }

    return (
        <Modal open={isOpen} onClose={handleClose} title="Package Details">
            <div className="space-y-4">
                {loading && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-gray-600">Loading package details...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-2">⚠️ Error</div>
                        <p className="text-gray-600">{error}</p>
                        <button
                            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            onClick={() => sessionId && dispatch(fetchPackageDetailsBySession(sessionId))}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {selectedPackage && !loading && (
                    <>
                        {/* Patient Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center justify-between">
                                    Patient Information
                                    {selectedPackage.patients?.phone_number && (
                                        <WhatsAppButton 
                                            phoneNumber={selectedPackage.patients.phone_number}
                                            patientName={selectedPackage.patients.name}
                                            size="sm"
                                            variant="outline"
                                            messageType="appointment"
                                            appointmentDetails={sessionData ? {
                                                date: sessionData.scheduled_date,
                                                sessionNumber: sessionData.id
                                            } : undefined}
                                        />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-semibold text-primaryDark">
                                    {selectedPackage.patients?.name || 'Unknown Patient'}
                                </div>
                                {selectedPackage.patients?.phone_number && (
                                    <div className="text-sm text-gray-600 mt-1">
                                        {selectedPackage.patients.phone_number}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Package Overview */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Package Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Package ID</div>
                                        <div className="font-semibold">#{selectedPackage.id}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Start Date</div>
                                        <div className="font-semibold">{formatDate(selectedPackage.start_date)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Gap Between Sessions</div>
                                        <div className="font-semibold">{selectedPackage.gap_between_sessions || 0} days</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Next Session</div>
                                        <div className="font-semibold">
                                            {selectedPackage.next_session_date ? formatDate(selectedPackage.next_session_date) : 'No upcoming sessions'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sessions Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Sessions Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-primary">{selectedPackage.sessions_completed || 0}</div>
                                        <div className="text-sm text-gray-600">Completed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{getRemainingSessions()}</div>
                                        <div className="text-sm text-gray-600">Remaining</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-700">{selectedPackage.no_of_sessions || 0}</div>
                                        <div className="text-sm text-gray-600">Total</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{getProgressPercentage()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${getProgressPercentage()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Payment Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Total Payment</div>
                                        <div className="font-semibold text-lg">{formatCurrency(selectedPackage.total_payment)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Advance Payment</div>
                                        <div className="font-semibold text-lg">{formatCurrency(selectedPackage.advance_payment)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Paid Amount</div>
                                        <div className="font-semibold text-lg text-green-600">{formatCurrency(selectedPackage.paid_payment)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Remaining (Paid + Advance)</div>
                                        <div className="font-semibold text-lg text-red-600">{formatCurrency(getRemainingPayment())}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Payment Progress</span>
                                        <span>{getPaymentProgressPercentage()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${getPaymentProgressPercentage()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={selectedPackage.sessions_completed === selectedPackage.no_of_sessions ? 'green' : 'blue'}>
                                {selectedPackage.sessions_completed === selectedPackage.no_of_sessions ? 'Completed' : 'In Progress'}
                            </Badge>
                            <Badge variant={getRemainingPayment() === 0 ? 'green' : 'red'}>
                                {getRemainingPayment() === 0 ? 'Fully Paid' : 'Payment Pending'}
                            </Badge>
                            {selectedPackage.next_session_date && (
                                <Badge variant="gray">
                                    Next: {formatDate(selectedPackage.next_session_date)}
                                </Badge>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
