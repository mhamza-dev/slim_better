import { useEffect, useMemo, useState } from 'react'
//
import { createPatient, softDeletePatient } from '../services/patientsService'
import Modal from '../components/Modal'
import { PatientEditModal } from '../components/PatientEditModal'
import { Button } from '../components/ui/Button'
import { Plus, Search, Download, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { WhatsAppButton } from '../components/ui/WhatsAppButton'
import type { Patient } from '../types/db'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPatients } from '../store/patientsSlice'
import { exportPatientsToExcelWithLogo } from '../lib/excelExport'

import * as Yup from 'yup'
import { useAuth } from '../hooks/useAuth'
import { FormBuilder, type FormFieldConfig } from '../components/ui/Form'
import { useNavigate } from 'react-router-dom'

// Removed calculateAge function since age is now stored directly

export default function Patients() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { user } = useAuth()
    const patients = useAppSelector((s) => s.patients.items)
    const loading = useAppSelector((s) => s.patients.loading)

    useEffect(() => {
        dispatch(fetchPatients())
    }, [dispatch])

    const computed = useMemo(() => (patients as Patient[]), [patients])

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

    const handleDeletePatient = async (patientId: number, patientName: string) => {
        if (!confirm(`Are you sure you want to delete "${patientName}"? This will also delete all their packages and cannot be undone.`)) {
            return
        }

        try {
            await softDeletePatient(patientId, user?.id || null)
            // Refresh the patients list
            dispatch(fetchPatients())
        } catch (error) {
            console.error('Failed to delete patient:', error)
            alert(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
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
                                    <th className="text-left p-3 text-sm font-semibold w-[12%]">Name</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[10%]">Phone</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[5%]">Age</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[14%]">Address</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[12%]">Branch</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[8%]">Created</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[10%]">Created by</th>
                                    <th className="text-left p-3 text-sm font-semibold w-[10%]">Updated by</th>
                                    <th className="text-center p-3 text-sm font-semibold w-[6%]">WhatsApp</th>
                                    <th className="text-right p-3 text-sm font-semibold w-[6%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td className="p-3" colSpan={10}>Loading…</td></tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr><td className="p-3" colSpan={10}>
                                        {searchTerm ? `No patients found matching "${searchTerm}"` : 'No patients yet'}
                                    </td></tr>
                                ) : (
                                    filteredPatients.map((p: Patient) => (
                                        <tr key={p.id} className="border-t border-[#e6eef8] hover:bg-blue-50/30 even:bg-blue-50/20">
                                            <td className="p-3 truncate max-w-[120px] cursor-pointer" title={p.name} onClick={() => navigate(`/patients/${p.id}`)}>{p.name}</td>
                                            <td className="p-3 text-sm">{p.phone_number}</td>
                                            <td className="p-3 text-sm text-left">{p.age ?? '-'}</td>
                                            <td className="p-3 truncate max-w-[150px]" title={p.address ?? ''}>{p.address ?? '-'}</td>
                                            <td className="p-3 text-sm truncate max-w-[120px]" title={p.branch_name ?? ''}>{p.branch_name ?? '-'}</td>
                                            <td className="p-3 text-sm">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 text-sm truncate max-w-[100px]">{p.creator_email ?? '-'}</td>
                                            <td className="p-3 text-sm truncate max-w-[100px]">{p.updated_by_email ?? '-'}</td>
                                            <td className="p-3 text-center">
                                                <WhatsAppButton
                                                    phoneNumber={p.phone_number}
                                                    patientName={p.name}
                                                    size="sm"
                                                    variant="ghost"
                                                    messageType="greeting"
                                                />
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditPatient(p.id) }}
                                                        className="p-1 hover:bg-green-100 rounded transition-colors"
                                                        title="Edit patient"
                                                    >
                                                        <Edit size={20} className="text-green-600" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeletePatient(p.id, p.name) }}
                                                        className="p-1 hover:bg-red-100 rounded transition-colors"
                                                        title="Delete patient"
                                                    >
                                                        <Trash2 size={20} className="text-red-600" />
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
                    dispatch(fetchPatients())
                }}
            />
        </div>
    )
}

function PatientsModalForm({ onDone }: { onDone: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    const { user } = useAuth()
    const initialValues = { name: '', phone_number: '', address: '', age: '', branch_name: '' }
    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        phone_number: Yup.string().required('Required'),
        address: Yup.string().nullable(),
        age: Yup.number().min(0).max(150).nullable(),
        branch_name: Yup.string().required('Required'),
    })
    const fields: FormFieldConfig[] = [
        { type: 'text', name: 'name', label: 'Name' },
        { type: 'text', name: 'phone_number', label: 'Phone' },
        { type: 'textarea', name: 'address', label: 'Address', rows: 3 },
        { type: 'number', name: 'age', label: 'Age', min: 0, max: 150 },
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
                        age: values.age ? Number(values.age) : null,
                        branch_name: values.branch_name as string,
                        created_by: user?.id || null,
                        updated_by: null
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


