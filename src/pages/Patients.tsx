import { useEffect, useMemo, useState } from 'react'
//
import { createPatient } from '../services/patientsService'
import Modal from '../components/Modal'
import { PatientEditModal } from '../components/PatientEditModal'
import { Button } from '../components/ui/Button'
import { Plus, Search, Download, Edit } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import type { Patient } from '../types/db'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPatients } from '../store/patientsSlice'
import { exportPatientsToExcelWithLogo } from '../lib/excelExport'

import * as Yup from 'yup'
import { useAuth } from '../hooks/useAuth'
import { FormBuilder, type FormFieldConfig } from '../components/ui/Form'
import { useNavigate } from 'react-router-dom'

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
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const patients = useAppSelector((s) => s.patients.items)
    const loading = useAppSelector((s) => s.patients.loading)

    useEffect(() => {
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
            patient.branch_name?.toLowerCase().includes(term) ||
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
                                    <th className="text-left p-3 text-sm font-semibold w-[16%]">Name</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[14%]">Phone</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[7%]">Age</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[18%]">Address</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[16%]">Branch</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[10%]">Created</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[13%]">Created by</th>
                                    <th className="text-right p-3 text-sm font-semibold w-[6%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td className="p-3" colSpan={8}>Loading…</td></tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr><td className="p-3" colSpan={8}>
                                        {searchTerm ? `No patients found matching "${searchTerm}"` : 'No patients yet'}
                                    </td></tr>
                                ) : (
                                    filteredPatients.map((p: Patient & { age: number | null }) => (
                                        <tr key={p.id} className="border-t border-[#e6eef8] hover:bg-blue-50/30 even:bg-blue-50/20 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                                            <td className="p-3 truncate max-w-[120px]" title={p.name}>{p.name}</td>
                                            <td className="p-3 text-sm">{p.phone_number}</td>
                                            <td className="p-3 text-sm text-left">{p.age ?? '-'}</td>
                                            <td className="p-3 truncate max-w-[150px]" title={p.address ?? ''}>{p.address ?? '-'}</td>
                                            <td className="p-3 text-sm truncate max-w-[120px]" title={p.branch_name ?? ''}>{p.branch_name ?? '-'}</td>
                                            <td className="p-3 text-sm">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 text-sm truncate max-w-[100px]" title={p.creator_email ?? ''}>{p.creator_email ?? '-'}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditPatient(p.id) }}
                                                    className="p-1 hover:bg-green-100 rounded transition-colors"
                                                    title="Edit patient"
                                                >
                                                    <Edit size={20} className="text-green-600" />
                                                </button>
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
                    dispatch(fetchPatients())
                }}
            />
        </div>
    )
}

function PatientsModalForm({ onDone }: { onDone: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    const { user } = useAuth()
    const initialValues = { name: '', phone_number: '', address: '', date_of_birth: '', branch_name: '' }
    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        phone_number: Yup.string().required('Required'),
        address: Yup.string().nullable(),
        date_of_birth: Yup.string().nullable(),
        branch_name: Yup.string().required('Required'),
    })
    const fields: FormFieldConfig[] = [
        { type: 'text', name: 'name', label: 'Name' },
        { type: 'text', name: 'phone_number', label: 'Phone' },
        { type: 'textarea', name: 'address', label: 'Address', rows: 3 },
        { type: 'date', name: 'date_of_birth', label: 'Date of birth' },
        {
            type: 'select', name: 'branch_name', label: 'Branch *', options: [
                { label: 'Canal Road Branch, Fsd', value: 'Canal Road Branch, Fsd' },
                { label: 'Kohinoor Branch, Fsd', value: 'Kohinoor Branch, Fsd' },
            ]
        },
    ]
    return (
        <FormBuilder
            initialValues={initialValues}
            validationSchema={validationSchema}
            fields={fields}
            onSubmit={async (values) => {
                setSubmitting(true)
                try {
                    await createPatient({
                        name: values.name as string,
                        phone_number: values.phone_number as string,
                        address: (values.address as string) || null,
                        date_of_birth: (values.date_of_birth as string) || null,
                        branch_name: values.branch_name as string,
                        created_by: user?.id || null
                    })
                } catch (e) {
                    setSubmitting(false)
                    alert(e instanceof Error ? e.message : 'Failed to create patient')
                    return
                }
                setSubmitting(false)
                onDone()
            }}
            submitLabel="Save"
            cancelLabel="Cancel"
            onCancel={onDone}
            layout="one-column"
            isSubmitting={submitting}
        />
    )
}


