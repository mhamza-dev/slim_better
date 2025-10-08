import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Patient, BuyedPackageWithCreator } from '../types/db'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { fetchPackagesByPatient, addPackage } from '../store/buyedPackagesSlice'
import Modal from '../components/Modal'
import { PackageEditModal } from '../components/PackageEditModal'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Edit, Trash2, PackagePlus, Download, Search, Eye } from 'lucide-react'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useAuth } from '../hooks/useAuth'
import type { AuthUser } from '../context/AuthContextTypes'
import { exportPackagesToExcelWithLogo } from '../lib/excelExport'

export default function PatientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [packages, setPackages] = useState<BuyedPackageWithCreator[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        const [{ data: pData, error: pErr }] = await Promise.all([
            supabase.from('patients').select('*').eq('id', id).single(),
        ])
        if (pErr) setError(pErr.message)
        setPatient(pData as Patient)
        // Packages now come from Redux slice on effect below
        setLoading(false)
    }, [id])

    useEffect(() => { load() }, [id, load])

    // Load packages via Redux slice
    const dispatch = useDispatch()
    const pkgState = useSelector((s: RootState) => (s as RootState & { buyedPackages: { itemsByPatientId: Record<number, BuyedPackageWithCreator[]> } }).buyedPackages)
    useEffect(() => {
        if (!id) return
        // @ts-expect-error - Redux dispatch type issue
        dispatch(fetchPackagesByPatient(Number(id)))
    }, [dispatch, id])
    useEffect(() => {
        const items = pkgState.itemsByPatientId[Number(id)] as BuyedPackageWithCreator[] | undefined
        if (items) setPackages(items)
    }, [pkgState, id])

    async function removePatient() {
        if (!confirm('Delete this patient?')) return
        const { error } = await supabase.from('patients').delete().eq('id', id)
        if (error) { alert(error.message); return }
        navigate('/patients')
    }

    const age = patient?.date_of_birth ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null

    return (
        <div>
            {loading ? (
                <div className="space-y-4">
                    <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                    <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
                </div>
            ) : error ? <div className="text-red-700">{error}</div> : (
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="text-xs text-gray-500"><a href="/patients" className="hover:underline">Patients</a> <span className="mx-1">›</span> <span className="text-primaryDark">{patient?.name || '—'}</span></div>
                                <h2 className="text-primaryDark text-lg sm:text-xl">{patient?.name}</h2>
                                <div className="text-sm text-gray-600">{age !== null ? `${age} yrs` : 'Age —'}</div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <a className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 text-primaryDark px-3 py-2" href={`/patients/${id}/edit`}><Edit size={16} /> Edit</a>
                                <Button variant="danger" className="gap-2" onClick={removePatient}><Trash2 size={16} /> Delete</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Phone</div>
                                    <div className="font-semibold text-primary">{patient?.phone_number}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Address</div>
                                    <div className="font-semibold text-primary">{patient?.address || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">DOB</div>
                                    <div className="font-semibold text-primary">{patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Branch</div>
                                    <div className="font-semibold text-primary">{patient?.branch_name || '-'}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <PackageSection patientId={Number(id)} items={packages} user={user as AuthUser} patientName={patient?.name} />
                </div>
            )}
        </div>
    )
}

function PackageSection({ patientId, items, user, patientName }: { patientId: number; items: BuyedPackageWithCreator[]; user: AuthUser; patientName?: string }) {
    const [formOpen, setFormOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sessionsModalOpen, setSessionsModalOpen] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<BuyedPackageWithCreator | null>(null)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingPackageId, setEditingPackageId] = useState<number | null>(null)
    const dispatch = useDispatch()
    const initial = {
        no_of_sessions: 0,
        total_payment: 0,
        advance_payment: 0,
        paid_payment: 0,
        sessions_completed: 0,
        gap_between_sessions: 0,
        start_date: new Date().toISOString().slice(0, 10),
        next_session_date: '' as string | null,
        created_by: user.id,
    }

    const schema = Yup.object({
        no_of_sessions: Yup.number().min(0).required(),
        total_payment: Yup.number().min(0).required(),
        advance_payment: Yup.number().min(0).required().max(Yup.ref('total_payment')),
        paid_payment: Yup.number().min(0).required().max(Yup.ref('total_payment')),
        sessions_completed: Yup.number().min(0).required(),
        gap_between_sessions: Yup.number().min(0).required(),
        start_date: Yup.string().required(),
        next_session_date: Yup.string().nullable(),
        created_by: Yup.string().required(),
    })

    // Filter packages based on search term
    const filteredPackages = useMemo(() => {
        if (!searchTerm.trim()) return items

        const term = searchTerm.toLowerCase()
        return items.filter(pkg =>
            pkg.created_by?.toLowerCase().includes(term) ||
            pkg.creator?.email?.toLowerCase().includes(term) ||
            pkg.no_of_sessions.toString().includes(term) ||
            pkg.sessions_completed.toString().includes(term) ||
            pkg.total_payment.toString().includes(term) ||
            pkg.paid_payment.toString().includes(term)
        )
    }, [items, searchTerm])

    // Calculate all session dates for a package
    const calculateSessionDates = (pkg: BuyedPackageWithCreator) => {
        const sessions = []
        const startDate = new Date(pkg.start_date)
        const gapDays = pkg.gap_between_sessions

        for (let i = 0; i < pkg.no_of_sessions; i++) {
            const sessionDate = new Date(startDate)
            sessionDate.setDate(startDate.getDate() + (i * gapDays))

            // If the session falls on Sunday (0), move it to Monday (1)
            if (sessionDate.getDay() === 0) {
                sessionDate.setDate(sessionDate.getDate() + 1)
            }

            const dayName = sessionDate.toLocaleDateString('en-US', { weekday: 'long' })
            const isCompleted = i < pkg.sessions_completed

            sessions.push({
                sessionNumber: i + 1,
                date: sessionDate,
                dayName,
                isCompleted,
                isUpcoming: !isCompleted && sessionDate >= new Date()
            })
        }

        return sessions
    }

    const handleViewSessions = (pkg: BuyedPackageWithCreator) => {
        setSelectedPackage(pkg)
        setSessionsModalOpen(true)
    }

    const handleEditPackage = (packageId: number) => {
        setEditingPackageId(packageId)
        setEditModalOpen(true)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-primaryDark">Packages</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative">
                        <input
                            placeholder="Search packages"
                            className="pl-9 pr-3 py-2 rounded-lg border border-[#e6eef8] bg-white w-full sm:w-auto"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-gray-500" />
                    </div>
                    <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => exportPackagesToExcelWithLogo(filteredPackages, patientName)}
                        disabled={filteredPackages.length === 0}
                    >
                        <Download size={16} /> Export Excel
                    </Button>
                    <Button className="gap-2" onClick={() => setFormOpen(true)}>
                        <PackagePlus size={16} /> Add package
                    </Button>
                </div>
            </div>

            <div className="mt-3 overflow-hidden bg-white border border-[#e6eef8] rounded-xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr className="bg-[#f1f6ff] text-primaryDark">
                                <th className="text-left p-2 text-xs font-semibold w-[12%]">Created by</th>
                                <th className="text-left p-2 text-xs font-semibold w-[8%]">Total</th>
                                <th className="text-left p-2 text-xs font-semibold w-[8%]">Completed</th>
                                <th className="text-left p-2 text-xs font-semibold w-[8%]">Gap</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Start Date</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Next Date</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Total PKR</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Paid PKR</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Pending PKR</th>
                                <th className="text-left p-2 text-xs font-semibold w-[10%]">Advance PKR</th>
                                <th className="text-center p-2 text-xs font-semibold w-[6%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPackages.length === 0 ? (
                                <tr><td className="p-3" colSpan={11}>
                                    {searchTerm ? `No packages found matching "${searchTerm}"` : 'No packages'}
                                </td></tr>
                            ) : filteredPackages.map((p) => (
                                <tr key={p.id} className="border-t border-[#e6eef8]">
                                    <td className="p-2 text-xs truncate max-w-[80px]" title={p.created_by === user.id ? 'You' : (p.creator?.email || '-')}>
                                        {p.created_by === user.id ? 'You' : (p.creator?.email || '-')}
                                    </td>
                                    <td className="p-2 text-xs text-left">{p.no_of_sessions}</td>
                                    <td className="p-2 text-xs text-left">{p.sessions_completed}</td>
                                    <td className="p-2 text-xs text-left">{p.gap_between_sessions}</td>
                                    <td className="p-2 text-xs">{new Date(p.start_date).toLocaleDateString()}</td>
                                    <td className="p-2 text-xs">{p.next_session_date ? new Date(p.next_session_date).toLocaleDateString() : '-'}</td>
                                    <td className="p-2 text-xs">PKR {p.total_payment.toFixed(0)}</td>
                                    <td className="p-2 text-xs">PKR {p.paid_payment.toFixed(0)}</td>
                                    <td className="p-2 text-xs">PKR {(p.total_payment - (p.paid_payment === 0 ? p.advance_payment : p.paid_payment + p.advance_payment)).toFixed(0)}</td>
                                    <td className="p-2 text-xs">PKR {p.advance_payment.toFixed(0)}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => handleViewSessions(p)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                title="View all sessions"
                                            >
                                                <Eye size={16} className="text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => handleEditPackage(p.id)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                title="Edit package"
                                            >
                                                <Edit size={16} className="text-green-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add package">
                <Formik
                    initialValues={initial}
                    validationSchema={schema}
                    onSubmit={async (values) => {
                        setLoading(true)

                        const payload = {
                            no_of_sessions: Number(values.no_of_sessions),
                            total_payment: Number(values.total_payment),
                            advance_payment: Number(values.advance_payment),
                            paid_payment: Number(values.paid_payment),
                            sessions_completed: Number(values.sessions_completed),
                            gap_between_sessions: Number(values.gap_between_sessions),
                            start_date: values.start_date,
                            next_session_date: values.next_session_date || null,
                            created_by: values.created_by,
                            patient_id: patientId,
                        }
                        await (dispatch as unknown as (action: unknown) => Promise<unknown>)(addPackage(payload))
                        setLoading(false)
                        setFormOpen(false)
                        await (dispatch as unknown as (action: unknown) => Promise<unknown>)(fetchPackagesByPatient(patientId))
                    }}
                >
                    <Form className="max-w-3xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <NumberField name="no_of_sessions" label="Sessions" />
                            <NumberField name="sessions_completed" label="Completed Sessions" />
                            <NumberField name="gap_between_sessions" label="Gap (days)" />
                            <DateField name="start_date" label="Start Date" />
                            <NumberField name="total_payment" label="Total Payment" />
                            <NumberField name="paid_payment" label="Paid Payment" />
                        </div>
                        <NumberField name="advance_payment" label="Advance Payment" />
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <button disabled={loading} className="rounded-lg bg-primary text-white px-3 py-2 font-semibold flex-1" type="submit">Save package</button>
                            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2 flex-1 sm:flex-none">Cancel</button>
                        </div>
                    </Form>
                </Formik>
            </Modal>

            {/* Sessions Modal */}
            <Modal open={sessionsModalOpen} onClose={() => setSessionsModalOpen(false)} title="Session Schedule">
                {selectedPackage && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Package Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="font-medium">Total Sessions:</span> {selectedPackage.no_of_sessions}</div>
                                <div><span className="font-medium">Completed:</span> {selectedPackage.sessions_completed}</div>
                                <div><span className="font-medium">Gap:</span> {selectedPackage.gap_between_sessions} days</div>
                                <div><span className="font-medium">Start Date:</span> {new Date(selectedPackage.start_date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            <h4 className="font-semibold text-gray-800 mb-3">All Sessions</h4>
                            <div className="space-y-2">
                                {calculateSessionDates(selectedPackage).map((session, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${session.isCompleted
                                            ? 'bg-green-50 border-green-200'
                                            : session.isUpcoming
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    Session {session.sessionNumber}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {session.date.toLocaleDateString()} - {session.dayName}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {session.isCompleted && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        Completed
                                                    </span>
                                                )}
                                                {session.isUpcoming && !session.isCompleted && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        Upcoming
                                                    </span>
                                                )}
                                                {!session.isCompleted && !session.isUpcoming && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                                        Past
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Package Edit Modal */}
            <PackageEditModal
                packageId={editingPackageId}
                patientId={patientId}
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false)
                    setEditingPackageId(null)
                }}
            />
        </div>
    )
}

function DateField({ name, label }: { name: string; label: string }) {
    return (
        <div>
            <label className="block text-xs text-[#335] mb-1">{label}</label>
            <Field type="date" name={name} min={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
        </div>
    )
}

function NumberField({ name, label }: { name: string; label: string }) {
    return (
        <div>
            <label className="block text-xs text-[#335] mb-1">{label}</label>
            <Field type="number" name={name} min={0} className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" placeholder="0" />
        </div>
    )
}


