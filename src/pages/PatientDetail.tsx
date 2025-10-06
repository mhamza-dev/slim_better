import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Patient, BuyedPackageWithCreator } from '../types/db'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPackagesByPatient, addPackage } from '../store/buyedPackagesSlice'
import Modal from '../components/Modal'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Edit, Trash2, PackagePlus } from 'lucide-react'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useAuth, type AuthUser } from '../context/AuthContext'

export default function PatientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [packages, setPackages] = useState<BuyedPackageWithCreator[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        setError(null)
        const [{ data: pData, error: pErr }] = await Promise.all([
            supabase.from('patients').select('*').eq('id', id).single(),
        ])
        if (pErr) setError(pErr.message)
        setPatient(pData as any)
        // Packages now come from Redux slice on effect below
        setLoading(false)
    }

    useEffect(() => { load() }, [id])

    // Load packages via Redux slice
    const dispatch = useDispatch<any>()
    const pkgState = useSelector((s: any) => s.buyedPackages)
    useEffect(() => {
        if (!id) return
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
                        <CardHeader className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500"><a href="/patients" className="hover:underline">Patients</a> <span className="mx-1">›</span> <span className="text-primaryDark">{patient?.name || '—'}</span></div>
                                <h2 className="text-primaryDark">{patient?.name}</h2>
                                <div className="text-sm text-gray-600">{age !== null ? `${age} yrs` : 'Age —'}</div>
                            </div>
                            <div className="flex gap-2">
                                <a className="inline-flex items-center gap-2 rounded-lg bg-gray-100 text-primaryDark px-3 py-2" href={`/patients/${id}/edit`}><Edit size={16} /> Edit</a>
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
                            </div>
                        </CardContent>
                    </Card>

                    <PackageSection patientId={Number(id)} items={packages} user={user as AuthUser} />
                </div>
            )}
        </div>
    )
}

function PackageSection({ patientId, items, user }: { patientId: number; items: BuyedPackageWithCreator[]; user: AuthUser }) {
    const [formOpen, setFormOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch<any>()
    const initial = {
        no_of_sessions: '',
        total_payment: '',
        advance_payment: '',
        paid_payment: '',
        sessions_completed: '',
        gap_between_sessions: '',
        start_date: new Date().toISOString().slice(0, 10),
        next_session_date: '' as string | '',
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

    return (
        <div>
            <div className="flex items-center justify-between">
                <h3 className="text-primaryDark">Packages</h3>
                <Button className="gap-2" onClick={() => setFormOpen(true)}><PackagePlus size={16} /> Add package</Button>
            </div>

            <div className="mt-3 overflow-x-auto bg-white border border-[#e6eef8] rounded-xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#f1f6ff] text-primaryDark">
                            {['Created by', 'Total Sessions', 'Completed Sessions', 'Gap(days)', 'Start Date', 'Next Session Date', 'Total Payment', 'Paid Payment', 'Pending Payment', 'Advance Payment'].map((h) => (
                                <th key={h} className="text-left p-3 text-sm font-semibold">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td className="p-3" colSpan={8}>No packages</td></tr>
                        ) : items.map((p) => (
                            <tr key={p.id} className="border-t border-[#e6eef8]">
                                <td className="p-3">{p.created_by === user.id ? 'You' : (p.creator?.email || '-')}</td>
                                <td className="p-3">{p.no_of_sessions}</td>
                                <td className="p-3">{p.sessions_completed}</td>
                                <td className="p-3">{p.gap_between_sessions}</td>
                                <td className="p-3">{new Date(p.start_date).toLocaleDateString()}</td>
                                <td className="p-3">{p.next_session_date ? new Date(p.next_session_date).toLocaleDateString() : '-'}</td>
                                <td className="p-3">₹{p.total_payment.toFixed(2)}</td>
                                <td className="p-3">₹{p.paid_payment.toFixed(2)}</td>
                                <td className="p-3">₹{(p.total_payment - (p.paid_payment + p.advance_payment)).toFixed(2)}</td>
                                <td className="p-3">₹{p.advance_payment.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add package">
                <Formik
                    initialValues={initial}
                    validationSchema={schema}
                    onSubmit={async (values) => {
                        setLoading(true)

                        const payload = {
                            ...(values as any),
                            next_session_date: (values as any).next_session_date || null,
                            patient_id: patientId,
                        }
                        await dispatch(addPackage(payload))
                        setLoading(false)
                        setFormOpen(false)
                        dispatch(fetchPackagesByPatient(patientId))
                    }}
                >
                    <Form className="max-w-3xl">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <NumberField name="no_of_sessions" label="Sessions" />
                            <NumberField name="sessions_completed" label="Completed Sessions" />
                            <NumberField name="gap_between_sessions" label="Gap (days)" />
                            <DateField name="start_date" label="Start Date" />
                            <NumberField name="total_payment" label="Total Payment" />
                            <NumberField name="paid_payment" label="Paid Payment" />
                        </div>
                        <NumberField name="advance_payment" label="Advance Payment" />
                        <div className="col-span-2 flex gap-2 mt-2">
                            <button disabled={loading} className="rounded-lg bg-primary text-white px-3 py-2 font-semibold" type="submit">Save package</button>
                            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2">Cancel</button>
                        </div>
                    </Form>
                </Formik>
            </Modal>
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


