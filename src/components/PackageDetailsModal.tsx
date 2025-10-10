import { useEffect, useState } from 'react'
import Modal from './Modal'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Badge } from './ui/Badge'
import { fetchPackageBySessionId, type DashboardPackageRow } from '../services/packagesService'

interface PackageDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    sessionId: number | null
}

export function PackageDetailsModal({ isOpen, onClose, sessionId }: PackageDetailsModalProps) {
    const [packageData, setPackageData] = useState<DashboardPackageRow | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || !sessionId) {
            setPackageData(null)
            setError(null)
            return
        }

        let mounted = true
        setLoading(true)
        setError(null)

            ; (async () => {
                try {
                    const data = await fetchPackageBySessionId(sessionId)
                    if (!mounted) return
                    setPackageData(data)
                } catch (err) {
                    if (!mounted) return
                    setError(err instanceof Error ? err.message : 'Failed to fetch package details')
                } finally {
                    if (mounted) {
                        setLoading(false)
                    }
                }
            })()

        return () => { mounted = false }
    }, [isOpen, sessionId])

    const formatCurrency = (amount: number) =>
        `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

    const getRemainingSessions = () => {
        if (!packageData) return 0
        return packageData.no_of_sessions - packageData.sessions_completed
    }

    const getRemainingPayment = () => {
        if (!packageData) return 0
        return packageData.total_payment - packageData.paid_payment
    }

    const getProgressPercentage = () => {
        if (!packageData || packageData.no_of_sessions === 0) return 0
        return Math.round((packageData.sessions_completed / packageData.no_of_sessions) * 100)
    }

    const getPaymentProgressPercentage = () => {
        if (!packageData || packageData.total_payment === 0) return 0
        return Math.round((packageData.paid_payment / packageData.total_payment) * 100)
    }

    return (
        <Modal open={isOpen} onClose={onClose} title="Package Details">
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
                    </div>
                )}

                {packageData && !loading && (
                    <>
                        {/* Patient Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Patient Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-semibold text-primaryDark">
                                    {packageData.patients?.name || 'Unknown Patient'}
                                </div>
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
                                        <div className="font-semibold">#{packageData.id}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Start Date</div>
                                        <div className="font-semibold">{formatDate(packageData.start_date)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Gap Between Sessions</div>
                                        <div className="font-semibold">{packageData.gap_between_sessions} days</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Next Session</div>
                                        <div className="font-semibold">
                                            {packageData.next_session_date ? formatDate(packageData.next_session_date) : 'No upcoming sessions'}
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
                                        <div className="text-2xl font-bold text-primary">{packageData.sessions_completed}</div>
                                        <div className="text-sm text-gray-600">Completed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{getRemainingSessions()}</div>
                                        <div className="text-sm text-gray-600">Remaining</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-700">{packageData.no_of_sessions}</div>
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
                                        <div className="font-semibold text-lg">{formatCurrency(packageData.total_payment)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Advance Payment</div>
                                        <div className="font-semibold text-lg">{formatCurrency(packageData.advance_payment)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Paid Amount</div>
                                        <div className="font-semibold text-lg text-green-600">{formatCurrency(packageData.paid_payment)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Remaining</div>
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
                            <Badge variant={packageData.sessions_completed === packageData.no_of_sessions ? 'green' : 'blue'}>
                                {packageData.sessions_completed === packageData.no_of_sessions ? 'Completed' : 'In Progress'}
                            </Badge>
                            <Badge variant={getRemainingPayment() === 0 ? 'green' : 'red'}>
                                {getRemainingPayment() === 0 ? 'Fully Paid' : 'Payment Pending'}
                            </Badge>
                            {packageData.next_session_date && (
                                <Badge variant="gray">
                                    Next: {formatDate(packageData.next_session_date)}
                                </Badge>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
