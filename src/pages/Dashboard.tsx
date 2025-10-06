import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { fetchPatients } from '../store/patientsSlice'

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
    const dispatch = useDispatch<any>()
    const patients = useSelector((s: RootState) => (s as any).patients.items as any[])

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const [pkgRes] = await Promise.all([
                    supabase
                        .from('buyed_packages')
                        .select('id,total_payment,paid_payment,advance_payment,no_of_sessions,sessions_completed,gap_between_sessions,start_date,next_session_date,patients(name)')
                        .order('start_date', { ascending: false })
                        .limit(1000)
                ])
                if (!mounted) return
                setPackages((pkgRes.data as any) ?? [])
                setLoading(false)
            })()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        if (!patients || patients.length === 0) {
            // ensure we load at least once for the count
            dispatch(fetchPatients())
        }
    }, [dispatch])

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
        amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

    const daysUntil = (dateStr: string) => {
        const today = new Date()
        const date = new Date(dateStr)
        const diff = Math.ceil((date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / (1000 * 60 * 60 * 24))
        return diff
    }

    return (
        <div>
            <h2 className="text-primaryDark mb-3">Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard title="Patients" loading={loading} value={totalPatients.toString()} />
                <StatCard title="Packages" loading={loading} value={totalPackages.toString()} />
                <StatCard title="Revenue" loading={loading} value={formatCurrency(totalRevenue)} />
                <StatCard title="Paid" loading={loading} value={formatCurrency(totalPaid)} />
                <StatCard title="Advance" loading={loading} value={formatCurrency(totalAdvance)} />
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 220 }}>
                            {loading ? (
                                <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" />
                            ) : (
                                <ResponsiveContainer>
                                    <LineChart data={revenueSeries} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                                        <CartesianGrid stroke="#eef3fb" />
                                        <XAxis dataKey="month" stroke="#6b7280" />
                                        <YAxis stroke="#6b7280" />
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
                        <div style={{ width: '100%', height: 220 }}>
                            {loading ? (
                                <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse" />
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={sessionsSeries} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                                        <CartesianGrid stroke="#eef3fb" />
                                        <XAxis dataKey="label" stroke="#6b7280" />
                                        <YAxis stroke="#6b7280" />
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
                        {!loading && (
                            <Badge variant="gray">Top 5</Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                                ))
                            ) : (
                                packages
                                    .filter((p) => p.next_session_date)
                                    .sort((a, b) => new Date(a.next_session_date as string).getTime() - new Date(b.next_session_date as string).getTime())
                                    .slice(0, 5)
                                    .map((p) => {
                                        const days = daysUntil(p.next_session_date as string)
                                        const badgeVariant = days < 0 ? 'red' : days <= 2 ? 'green' : 'blue'
                                        const badgeText = days < 0 ? 'Overdue' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`
                                        return (
                                            <div key={p.id} className="flex items-center justify-between bg-white border border-[#e6eef8] rounded-xl p-3">
                                                <div>
                                                    <div className="font-bold">{p.patients?.name ?? 'Patient'}</div>
                                                    <div className="text-sm text-[#335]">Next: {new Date(p.next_session_date as string).toLocaleDateString()}</div>
                                                </div>
                                                <Badge variant={badgeVariant as any}>{badgeText}</Badge>
                                            </div>
                                        )
                                    })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function StatCard({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
    return (
        <Card className="p-3">
            <div className="text-primaryDark text-xs mb-1">{title}</div>
            {loading ? (
                <div className="h-6 w-24 rounded bg-gray-100 animate-pulse" />
            ) : (
                <div className="text-primary text-xl font-extrabold">{value}</div>
            )}
        </Card>
    )
}


