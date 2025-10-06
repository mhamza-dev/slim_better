import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'
import { Button } from '../components/ui/Button'
import { Plus, Search } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import type { Patient } from '../types/db'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { fetchPatients } from '../store/patientsSlice'

function calculateAge(dobIso: string | null): number | null {
    if (!dobIso) return null
    const dob = new Date(dobIso)
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--
    }
    return age
}

export default function Patients() {
    const dispatch = useDispatch()
    const patients = useSelector((s: RootState) => (s as any).patients.items as Patient[])
    const loading = useSelector((s: RootState) => (s as any).patients.loading as boolean)

    useEffect(() => {
        // @ts-ignore
        dispatch(fetchPatients())
    }, [dispatch])

    const computed = useMemo(() => (patients as Patient[]).map((p: Patient) => ({
        ...p,
        age: calculateAge(p.date_of_birth),
    })), [patients])

    const [open, setOpen] = useState(false)

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-primaryDark">Patients</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input placeholder="Search patients" className="pl-9 pr-3 py-2 rounded-lg border border-[#e6eef8] bg-white" />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-500" />
                    </div>
                    <Button className="gap-2" onClick={() => setOpen(true)}><Plus size={16} /> Add patient</Button>
                </div>
            </div>
            <Card className="overflow-x-auto">
                <CardContent className="p-0">
                    <table className="w-full table-fixed h-full">
                        <thead >
                            <tr className="bg-[#f1f6ff] text-primaryDark">
                                {['Name', 'Phone', 'Age', 'Address', 'Created', ''].map((h) => (
                                    <th key={h} className="text-left p-3 text-sm font-semibold whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
                            ) : computed.length === 0 ? (
                                <tr><td className="p-3" colSpan={5}>No patients yet</td></tr>
                            ) : (
                                computed.map((p: any) => (
                                    <tr key={p.id} className="border-t border-[#e6eef8] hover:bg-blue-50/30 even:bg-blue-50/20">
                                        <td className="p-3 whitespace-nowrap">{p.name}</td>
                                        <td className="p-3 whitespace-nowrap">{p.phone_number}</td>
                                        <td className="p-3 whitespace-nowrap">{(p as any).age ?? '-'}</td>
                                        <td className="p-3 truncate">{p.address ?? '-'}</td>
                                        <td className="p-3 whitespace-nowrap">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <RowActions id={p.id} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title="Add patient">
                <PatientsModalForm onDone={() => { setOpen(false); /* simple reload */ location.reload() }} />
            </Modal>
        </div>
    )
}

import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

function PatientsModalForm({ onDone }: { onDone: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    return (
        <Formik
            initialValues={{ name: '', phone_number: '', address: '', date_of_birth: '' }}
            validationSchema={Yup.object({
                name: Yup.string().required('Required'),
                phone_number: Yup.string().required('Required'),
                address: Yup.string().nullable(),
                date_of_birth: Yup.string().nullable(),
            })}
            onSubmit={async (values) => {
                setSubmitting(true)
                const { error } = await supabase.from('patients').insert({
                    name: values.name,
                    phone_number: values.phone_number,
                    address: values.address || null,
                    date_of_birth: values.date_of_birth || null,
                })
                setSubmitting(false)
                if (error) { alert(error.message); return }
                onDone()
            }}
        >
            <Form className="space-y-3">
                <div>
                    <label className="block text-xs text-[#335] mb-1">Name</label>
                    <Field name="name" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                    <ErrorMessage name="name" component="div" className="text-red-700 text-sm" />
                </div>
                <div>
                    <label className="block text-xs text-[#335] mb-1">Phone</label>
                    <Field name="phone_number" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                    <ErrorMessage name="phone_number" component="div" className="text-red-700 text-sm" />
                </div>
                <div>
                    <label className="block text-xs text-[#335] mb-1">Address</label>
                    <Field as="textarea" name="address" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                </div>
                <div>
                    <label className="block text-xs text-[#335] mb-1">Date of birth</label>
                    <Field type="date" name="date_of_birth" className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                </div>
                <div className="flex gap-2">
                    <button type="submit" disabled={submitting} className="rounded-lg bg-primary text-white px-3 py-2 font-semibold">Save</button>
                    <button type="button" onClick={onDone} className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2">Cancel</button>
                </div>
            </Form>
        </Formik>
    )
}

function RowActions({ id }: { id: number }) {
    const [open, setOpen] = useState(false)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const target = e.target as HTMLElement
            if (!target.closest('[data-row-actions]')) setOpen(false)
        }
        document.addEventListener('click', onDocClick)
        return () => document.removeEventListener('click', onDocClick)
    }, [])

    useEffect(() => {
        function updatePos() {
            if (!btnRef.current) return
            const r = btnRef.current.getBoundingClientRect()
            const width = 140
            const padding = 8
            const left = Math.max(padding, Math.min(window.innerWidth - width - padding, r.right - width))
            const top = Math.min(window.innerHeight - padding, r.bottom + 6)
            setPos({ left, top })
        }
        if (open) {
            updatePos()
            window.addEventListener('scroll', updatePos, true)
            window.addEventListener('resize', updatePos)
            return () => { window.removeEventListener('scroll', updatePos, true); window.removeEventListener('resize', updatePos) }
        }
    }, [open])

    return (
        <span data-row-actions className="inline-block">
            <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} className="px-2 py-1 rounded-md hover:bg-blue-50">•••</button>
            {open && pos && createPortal(
                <div style={{ position: 'fixed', top: pos.top, left: pos.left }} className="w-32 bg-white border border-[#e6eef8] rounded-md shadow-lg z-[9999]">
                    <a className="block px-3 py-2 hover:bg-blue-50" href={`/patients/${id}`}>View</a>
                    <a className="block px-3 py-2 hover:bg-blue-50" href={`/patients/${id}/edit`}>Edit</a>
                </div>,
                document.body
            )}
        </span>
    )
}


