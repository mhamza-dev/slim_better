import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Patient } from '../types/db'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardHeader } from '../components/ui/Card'

export default function PatientForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { user } = useAuth()
    const editing = Boolean(id)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState<Partial<Patient>>({ name: '', phone_number: '', address: '', date_of_birth: '' })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!editing) return
        let mounted = true
            ; (async () => {
                const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
                if (error) { setError(error.message); return }
                if (mounted && data) setForm(data)
            })()
        return () => { mounted = false }
    }, [editing, id])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (editing) {
                const { error } = await supabase.from('patients').update({
                    name: form.name,
                    phone_number: form.phone_number,
                    address: form.address,
                    date_of_birth: form.date_of_birth || null,
                    created_by: user?.id,
                }).eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('patients').insert({
                    name: form.name,
                    phone_number: form.phone_number,
                    address: form.address,
                    date_of_birth: form.date_of_birth || null,
                })
                if (error) throw error
            }
            navigate('/patients')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <h2 className="text-primaryDark mb-3">{editing ? 'Edit patient' : 'Add patient'}</h2>
            <Card className="max-w-xl">
                <CardHeader />
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-3">
                        {error && <div className="text-red-700 text-sm">{error}</div>}
                        <div>
                            <label className="block text-xs text-[#335] mb-1">Name</label>
                            <input className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-xs text-[#335] mb-1">Phone number</label>
                            <input className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" value={form.phone_number || ''} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-xs text-[#335] mb-1">Address</label>
                            <textarea className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs text-[#335] mb-1">Date of birth</label>
                            <input type="date" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" value={form.date_of_birth || ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <button className="rounded-lg bg-primary text-white px-3 py-2 font-semibold" disabled={loading} type="submit">{editing ? 'Save changes' : 'Create'}</button>
                            <button className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2" type="button" onClick={() => history.back()}>Cancel</button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}


