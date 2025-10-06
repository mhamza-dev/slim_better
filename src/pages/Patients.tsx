import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Patient = {
    id: number
    patient_name: string
    date_of_birth: string
    city: string | null
    advance_payment: number | null
    paid_payment: number | null
    total_payment: number | null
    sessions_completed: number | null
    total_sessions: number | null
    gap_between_sessions: number | null
    start_date: string
    next_session_date: string | null
    created_at: string | null
    updated_at: string | null
}

function calculateAge(dobIso: string): number {
    const dob = new Date(dobIso)
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--
    }
    return age
}

function computeNextSession(startIso: string, gapDays: number, completed: number): string {
    const start = new Date(startIso)
    const next = new Date(start)
    next.setDate(start.getDate() + gapDays * (completed + 1))
    return next.toISOString()
}

export default function Patients() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const { data } = await supabase
                    .from('patients')
                    .select('*')
                    .order('id', { ascending: false })
                    .limit(200)
                if (!mounted) return
                setPatients(data ?? [])
                setLoading(false)
            })()
        return () => { mounted = false }
    }, [])

    const computed = useMemo(() => patients.map((p) => {
        const age = calculateAge(p.date_of_birth)
        const pendingPayment = (p.total_payment ?? 0) - (p.paid_payment ?? 0)
        const progress = `${p.sessions_completed ?? 0}/${p.total_sessions ?? 0}`
        const gap = p.gap_between_sessions ?? 7
        const next = p.next_session_date ?? computeNextSession(p.start_date, gap, p.sessions_completed ?? 0)
        return { ...p, age, pendingPayment, progress, next }
    }), [patients])

    return (
        <div>
            <h2 style={{ color: '#09357b', marginBottom: 16 }}>Patients</h2>
            <div style={{ overflowX: 'auto', background: 'white', border: '1px solid #e6eef8', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: '#f1f6ff', color: '#09357b' }}>
                            {['Name', 'Age', 'City', 'Paid', 'Total', 'Pending', 'Sessions', 'Start', 'Next'].map((h) => (
                                <th key={h} style={{ textAlign: 'left', padding: 12, fontSize: 13 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td style={{ padding: 12 }} colSpan={9}>Loading…</td></tr>
                        ) : computed.length === 0 ? (
                            <tr><td style={{ padding: 12 }} colSpan={9}>No patients yet</td></tr>
                        ) : (
                            computed.map((p) => (
                                <tr key={p.id} style={{ borderTop: '1px solid #e6eef8' }}>
                                    <td style={{ padding: 12 }}>{p.patient_name}</td>
                                    <td style={{ padding: 12 }}>{p.age}</td>
                                    <td style={{ padding: 12 }}>{p.city ?? '-'}</td>
                                    <td style={{ padding: 12 }}>₹{(p.paid_payment ?? 0).toFixed(2)}</td>
                                    <td style={{ padding: 12 }}>₹{(p.total_payment ?? 0).toFixed(2)}</td>
                                    <td style={{ padding: 12 }}>₹{p.pendingPayment.toFixed(2)}</td>
                                    <td style={{ padding: 12 }}>{p.progress}</td>
                                    <td style={{ padding: 12 }}>{new Date(p.start_date).toLocaleDateString()}</td>
                                    <td style={{ padding: 12 }}>{new Date(p.next).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


