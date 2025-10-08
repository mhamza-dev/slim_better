import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'
import { PatientEditModal } from '../components/PatientEditModal'
import { Button } from '../components/ui/Button'
import { Plus, Search, Download, Eye, Edit } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import type { Patient } from '../types/db'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { fetchPatients } from '../store/patientsSlice'
import { exportPatientsToExcelWithLogo } from '../lib/excelExport'

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
    const patients = useSelector((s: RootState) => (s as RootState & { patients: { items: Patient[] } }).patients.items)
    const loading = useSelector((s: RootState) => (s as RootState & { patients: { loading: boolean } }).patients.loading)

    useEffect(() => {
        // @ts-expect-error - Redux dispatch type issue
        dispatch(fetchPatients())
    }, [dispatch])

    const computed = useMemo(() => (patients as Patient[]).map((p: Patient) => ({
        ...p,
        age: calculateAge(p.date_of_birth),
    })), [patients])

    const [searchTerm, setSearchTerm] = useState('')
    const [open, setOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingPatientId, setEditingPatientId] = useState<number | null>(null)

    // Filter patients based on search term
    const filteredPatients = useMemo(() => {
        if (!searchTerm.trim()) return computed

        const term = searchTerm.toLowerCase()
        return computed.filter(patient =>
            patient.name.toLowerCase().includes(term) ||
            patient.phone_number.toLowerCase().includes(term) ||
            patient.address?.toLowerCase().includes(term) ||
            (patient.age && patient.age.toString().includes(term))
        )
    }, [computed, searchTerm])

    const handleEditPatient = (patientId: number) => {
        setEditingPatientId(patientId)
        setEditModalOpen(true)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                <div>
                    <h2 className="text-primaryDark text-lg sm:text-xl">Patients</h2>
                    {searchTerm && (
                        <p className="text-sm text-gray-600 mt-1">
                            {filteredPatients.length} of {computed.length} patients found
                        </p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative">
                        <input
                            placeholder="Search patients"
                            className="pl-9 pr-3 py-2 rounded-lg border border-[#e6eef8] bg-white w-full sm:w-auto"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-500" />
                    </div>
                    <Button
                        variant="secondary"
                        className="gap-2 whitespace-nowrap"
                        onClick={() => exportPatientsToExcelWithLogo(filteredPatients)}
                        disabled={loading || filteredPatients.length === 0}
                    >
                        <Download size={16} />
                        <span className="hidden xs:inline">Export Excel</span>
                        <span className="xs:hidden">Export</span>
                    </Button>
                    <Button className="gap-2 whitespace-nowrap" onClick={() => setOpen(true)}>
                        <Plus size={16} />
                        <span className="hidden xs:inline">Add patient</span>
                        <span className="xs:hidden">Add</span>
                    </Button>
                </div>
            </div>
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-[#f1f6ff] text-primaryDark">
                                    <th className="text-left p-3 text-sm font-semibold w-[20%]">Name</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[18%]">Phone</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[10%]">Age</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[25%]">Address</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[15%]">Created</th>
                                    <th className="text-right p-3 text-sm font-semibold w-[12%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td className="p-3" colSpan={6}>Loading…</td></tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr><td className="p-3" colSpan={6}>
                                        {searchTerm ? `No patients found matching "${searchTerm}"` : 'No patients yet'}
                                    </td></tr>
                                ) : (
                                    filteredPatients.map((p: Patient & { age: number | null }) => (
                                        <tr key={p.id} className="border-t border-[#e6eef8] hover:bg-blue-50/30 even:bg-blue-50/20">
                                            <td className="p-3 truncate max-w-[120px]" title={p.name}>{p.name}</td>
                                            <td className="p-3 text-sm">{p.phone_number}</td>
                                            <td className="p-3 text-sm text-left">{p.age ?? '-'}</td>
                                            <td className="p-3 truncate max-w-[150px]" title={p.address ?? ''}>{p.address ?? '-'}</td>
                                            <td className="p-3 text-sm">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => window.location.href = `/patients/${p.id}`}
                                                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                                                        title="View patient"
                                                    >
                                                        <Eye size={20} className="text-blue-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPatient(p.id)}
                                                        className="p-1 hover:bg-green-100 rounded transition-colors"
                                                        title="Edit patient"
                                                    >
                                                        <Edit size={20} className="text-green-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title="Add patient">
                <PatientsModalForm onDone={() => { setOpen(false); /* simple reload */ location.reload() }} />
            </Modal>

            {/* Patient Edit Modal */}
            <PatientEditModal
                patientId={editingPatientId}
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false)
                    setEditingPatientId(null)
                }}
                onSuccess={() => {
                    // Refresh the patients list
                    // @ts-expect-error - Redux dispatch type issue
                    dispatch(fetchPatients())
                }}
            />
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
                <div className="flex flex-col sm:flex-row gap-2">
                    <button type="submit" disabled={submitting} className="rounded-lg bg-primary text-white px-3 py-2 font-semibold flex-1">Save</button>
                    <button type="button" onClick={onDone} className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2 flex-1 sm:flex-none">Cancel</button>
                </div>
            </Form>
        </Formik>
    )
}


