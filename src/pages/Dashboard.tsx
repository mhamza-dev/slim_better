import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Patient = {
    id: number
    patient_name: string
    total_payment: number | null
    paid_payment: number | null
    sessions_completed: number | null
    total_sessions: number | null
    next_session_date: string | null
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [patients, setPatients] = useState<Patient[]>([])

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const { data } = await supabase
                    .from('patients')
                    .select('id, patient_name, total_payment, paid_payment, sessions_completed, total_sessions, next_session_date')
                    .order('id', { ascending: false })
                    .limit(100)
                if (!mounted) return
                setPatients(data ?? [])
                setLoading(false)
            })()
        return () => { mounted = false }
    }, [])

    const totalPatients = patients.length
    const totalRevenue = patients.reduce((sum, p) => sum + (p.total_payment ?? 0), 0)
    const totalPaid = patients.reduce((sum, p) => sum + (p.paid_payment ?? 0), 0)
    const sessionsCompleted = patients.reduce((sum, p) => sum + (p.sessions_completed ?? 0), 0)
    const sessionsPlanned = patients.reduce((sum, p) => sum + (p.total_sessions ?? 0), 0)

    return (
        <div>
            <h2 style={{ color: '#09357b', marginBottom: 16 }}>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                <StatCard title="Patients" value={loading ? '—' : totalPatients.toString()} />
                <StatCard title="Revenue" value={loading ? '—' : `₹${totalRevenue.toFixed(2)}`} />
                <StatCard title="Paid" value={loading ? '—' : `₹${totalPaid.toFixed(2)}`} />
                <StatCard title="Sessions" value={loading ? '—' : `${sessionsCompleted}/${sessionsPlanned}`} />
            </div>
            <div style={{ marginTop: 20 }}>
                <h3 style={{ color: '#09357b', marginBottom: 8 }}>Upcoming sessions</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                    {patients
                        .filter((p) => p.next_session_date)
                        .slice(0, 5)
                        .map((p) => (
                            <div key={p.id} style={{ background: 'white', border: '1px solid #e6eef8', borderRadius: 10, padding: 12 }}>
                                <div style={{ fontWeight: 700 }}>{p.patient_name}</div>
                                <div style={{ fontSize: 13, color: '#335' }}>Next: {new Date(p.next_session_date as string).toLocaleDateString()}</div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value }: { title: string; value: string }) {
    return (
        <div style={{ background: 'white', border: '1px solid #e6eef8', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#09357b', fontSize: 12, marginBottom: 6 }}>{title}</div>
            <div style={{ color: '#0b5fff', fontSize: 22, fontWeight: 800 }}>{value}</div>
        </div>
    )
}


