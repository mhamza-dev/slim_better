import { useEffect, useMemo, useState } from 'react'
//
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Download } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPatients } from '../store/patientsSlice'
import { exportDashboardToExcelWithLogo } from '../lib/excelExport'
import { fetchDashboardPackages } from '../services/packagesService'
import { fetchPlannedSessionsByDateRange, type DashboardSessionRow } from '../services/sessionsService'
//
import { DateRangeInput } from '../components/ui/DateRange'
import { PackageDetailsModal } from '../components/PackageDetailsModal'

type PackageRow = {
    id: number
    total_payment: number
    paid_payment: number
    advance_payment: number
    no_of_sessions: number
    sessions_completed: number
    gap_between_sessions: number
    start_date: string
    next_session_date: string | null
    patients?: { name: string } | null
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [packages, setPackages] = useState<PackageRow[]>([])
    const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0])
    const [filterEndDate, setFilterEndDate] = useState<string>('')
    const [rangeSessions, setRangeSessions] = useState<DashboardSessionRow[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false)
    const dispatch = useAppDispatch()
    const patients = useAppSelector((s) => s.patients.items)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const data = await fetchDashboardPackages(1000)
                if (!mounted) return
                setPackages((data as unknown as PackageRow[]) ?? [])
                setLoading(false)
            })()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        if (!patients || patients.length === 0) {
            // ensure we load at least once for the count
            dispatch(fetchPatients())
        }
    }, [dispatch, patients])

    const totalPatients = patients?.length ?? 0
    const totalPackages = packages.length
    const totalRevenue = packages.reduce((sum, p) => sum + (p.total_payment ?? 0), 0)
    const totalPaid = packages.reduce((sum, p) => sum + (p.paid_payment ?? 0), 0)
    const totalAdvance = packages.reduce((sum, p) => sum + (p.advance_payment ?? 0), 0)

    const revenueSeries = useMemo(() => {
        const buckets: Record<string, { month: string; total: number; paid: number }> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        packages.forEach((p) => {
            const idx = new Date(p.start_date).getMonth()
            const key = months[idx]
            buckets[key] = buckets[key] || { month: key, total: 0, paid: 0 }
            buckets[key].total += p.total_payment ?? 0
            buckets[key].paid += p.paid_payment ?? 0
        })
        return months.map((m) => buckets[m] || { month: m, total: 0, paid: 0 })
    }, [packages])

    const sessionsSeries = useMemo(() => {
        const buckets: Record<string, { label: string; planned: number; completed: number }> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        packages.forEach((p) => {
            const key = months[new Date(p.start_date).getMonth()]
            buckets[key] = buckets[key] || { label: key, planned: 0, completed: 0 }
            buckets[key].planned += p.no_of_sessions ?? 0
            buckets[key].completed += p.sessions_completed ?? 0
        })
        return months.map((l) => buckets[l] || { label: l, planned: 0, completed: 0 })
    }, [packages])

    const formatCurrency = (amount: number) =>
        `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

    const handleSessionClick = (sessionId: number) => {
        setSelectedSessionId(sessionId)
        setIsPackageModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsPackageModalOpen(false)
        setSelectedSessionId(null)
    }

    // Fetch sessions for the selected day/range
    useEffect(() => {
        let mounted = true
            ; (async () => {
                const start = filterDate
                const end = filterEndDate || undefined
                const rows = await fetchPlannedSessionsByDateRange(start, end)
                if (!mounted) return
                setRangeSessions(rows)
            })()
        return () => { mounted = false }
    }, [filterDate, filterEndDate])

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center mb-3 gap-3">
                <h2 className="text-primaryDark text-lg sm:text-xl">Dashboard</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <StatCard title="Patients" loading={loading} value={totalPatients.toString()} />
                <StatCard title="Packages" loading={loading} value={totalPackages.toString()} />
                <StatCard title="Revenue" loading={loading} value={formatCurrency(totalRevenue)} />
                <StatCard title="Paid" loading={loading} value={formatCurrency(totalPaid)} />
                <StatCard title="Advance" loading={loading} value={formatCurrency(totalAdvance)} />
            </div>

            <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: '200px' }} className="sm:h-[220px]">
                            {loading ? (
                                <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" />
                            ) : (
                                <ResponsiveContainer>
                                    <LineChart data={revenueSeries} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                                        <CartesianGrid stroke="#eef3fb" />
                                        <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                                        <YAxis stroke="#6b7280" fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" stroke="#0b5fff" strokeWidth={2} dot={false} name="Total" />
                                        <Line type="monotone" dataKey="paid" stroke="#22c55e" strokeWidth={2} dot={false} name="Paid" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sessions (planned vs completed)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: '200px' }} className="sm:h-[220px]">
                            {loading ? (
                                <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" />
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={sessionsSeries} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                                        <CartesianGrid stroke="#eef3fb" />
                                        <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                                        <YAxis stroke="#6b7280" fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="planned" fill="#60a5fa" name="Planned" />
                                        <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-3">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Upcoming sessions</CardTitle>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <DateRangeInput
                                value={{ start: filterDate, end: filterEndDate || undefined }}
                                onChange={(r) => { setFilterDate(r.start); setFilterEndDate(r.end || '') }}
                            />
                            <Button
                                variant="secondary"
                                className="gap-2 whitespace-nowrap"
                                onClick={() => {
                                    exportDashboardToExcelWithLogo({
                                        totalPatients,
                                        totalPackages,
                                        totalRevenue,
                                        totalPaid,
                                        totalAdvance,
                                        upcomingSessions: rangeSessions.map((s) => ({
                                            patient_name: s.patient_name,
                                            scheduled_date: s.scheduled_date,
                                            status: s.status,
                                        }))
                                    })
                                }}
                                disabled={loading}
                            >
                                <Download size={16} />
                                <span className="hidden xs:inline">Export Excel</span>
                                <span className="xs:hidden">Export</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                                ))
                            ) : rangeSessions.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                    {`No upcoming sessions for ${new Date(filterDate).toLocaleDateString()}`}
                                </div>
                            ) : (
                                rangeSessions.map((s) => {
                                    const badgeVariant = 'blue'
                                    const badgeText = new Date(s.scheduled_date).toLocaleDateString()
                                    return (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between bg-white border border-[#e6eef8] rounded-xl p-3 cursor-pointer hover:bg-gray-50 hover:border-primary transition-colors"
                                            onClick={() => handleSessionClick(s.id)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold truncate">{s.patient_name ?? 'Patient'}</div>
                                                <div className="text-sm text-[#335] truncate">{s.status}</div>
                                            </div>
                                            <div className="ml-2 flex-shrink-0">
                                                <Badge variant={badgeVariant as 'blue' | 'green' | 'gray' | 'red'}>{badgeText}</Badge>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <PackageDetailsModal
                isOpen={isPackageModalOpen}
                onClose={handleCloseModal}
                sessionId={selectedSessionId}
            />
        </div>
    )
}

function StatCard({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
    return (
        <Card className="p-2 sm:p-3">
            <div className="text-primaryDark text-xs mb-1">{title}</div>
            {loading ? (
                <div className="h-5 sm:h-6 w-16 sm:w-24 rounded bg-gray-100 animate-pulse" />
            ) : (
                <div className="text-primary text-sm sm:text-xl font-extrabold truncate">{value}</div>
            )}
        </Card>
    )
}


