import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Patient, BuyedPackageWithCreator } from '../types/db'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchPackagesByPatient, deletePackage } from '../store/buyedPackagesSlice'
import Modal from '../components/Modal'
import { PackageEditModal } from '../components/PackageEditModal'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Edit, Trash2, PackagePlus, Download, Search } from 'lucide-react'
import * as Yup from 'yup'
import { useAuth } from '../hooks/useAuth'
import type { AuthUser } from '../context/AuthContextTypes'
import { exportPackagesToExcelWithLogo } from '../lib/excelExport'
import { generateSessionsClientSide } from '../services/sessionsService'
import { fetchSessionsByPackage as fetchSessionsByPackageThunk, rescheduleSession as rescheduleSessionThunk, completeSession as completeSessionThunk } from '../store/sessionsSlice'
import { fetchTransactionsByPackage as fetchTransactionsByPackageThunk, addTransaction as addTransactionThunk, deleteTransaction as deleteTransactionThunk } from '../store/transactionsSlice'
import { FormBuilder, type FormFieldConfig } from '../components/ui/Form'
import { createPackage } from '../services/packagesService'
import { toISODate } from '../utils/date'

const EMPTY_ARRAY: never[] = []

function RoleGuardDelete({ createdByEmail, onDelete }: { createdByEmail: string | null | undefined; onDelete: () => Promise<void> }) {
    const { user } = useAuth()
    const canDelete = !!user?.email && (user.email === createdByEmail)
    if (!canDelete) return null
    return (
        <button className="px-2 py-1 text-xs bg-red-50 border border-red-200 rounded-lg hover:bg-red-100" onClick={onDelete}>Delete</button>
    )
}

export default function PatientDetail() {
    const { id } = useParams()
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
    const dispatch = useAppDispatch()
    const pkgState = useAppSelector((s) => s.buyedPackages)
    useEffect(() => {
        if (!id) return
        dispatch(fetchPackagesByPatient(Number(id)))
    }, [dispatch, id])
    useEffect(() => {
        const items = pkgState.itemsByPatientId[Number(id)] as BuyedPackageWithCreator[] | undefined
        if (items) setPackages(items)
    }, [pkgState, id])

    const age = patient?.age ?? null

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
                            <div className="flex flex-col gap-2">
                                <div className="text-xs text-gray-500"><Link to="/patients" className="hover:underline">Patients</Link> <span className="mx-1">›</span> <span className="text-primaryDark">{patient?.name || '—'}</span></div>
                                <div className="flex gap-2 items-end justify-between">
                                    <h2 className="text-primaryDark text-lg sm:text-xl">{patient?.name}</h2>
                                    <div className="text-sm text-gray-600">({age !== null ? `${age} yrs` : 'Age —'})</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Phone</div>
                                    <div className="font-semibold text-primary">{patient?.phone_number}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Address</div>
                                    <div className="font-semibold text-primary">{patient?.address || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Age</div>
                                    <div className="font-semibold text-primary">{patient?.age ? `${patient.age} years` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#335] mb-1">Branch</div>
                                    <div className="font-semibold text-primary">{patient?.branch_name || '-'}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <BuyedPackageForm patientId={Number(id)} items={packages} user={user as AuthUser} patientName={patient?.name} />
                </div>
            )}
        </div>
    )
}

function SessionsList({ packageId, patientId }: { packageId: number; patientId: number }) {
    const dispatch = useAppDispatch()
    const rows = useAppSelector((s) => s.sessions.itemsByPackageId[packageId] ?? (EMPTY_ARRAY as unknown as import('../types/db').Session[]))
    const loading = useAppSelector((s) => s.sessions.loadingByPackageId[packageId])
    const { user } = useAuth()
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
    const [editingSessionDate, setEditingSessionDate] = useState<string>('')

    useEffect(() => {
        dispatch(fetchSessionsByPackageThunk(packageId))
    }, [dispatch, packageId])

    const startReschedule = (s: { id: number; scheduled_date: string }) => {
        setEditingSessionId(s.id)
        setEditingSessionDate(toISODate(s.scheduled_date))
    }

    const submitReschedule = async (id: number) => {
        if (!editingSessionDate) return
        const normalizedDate = toISODate(editingSessionDate)
        const d = new Date(normalizedDate)
        if (d.getDay() === 0) d.setDate(d.getDate() + 1)
        const newISO = toISODate(d)
        const result = await dispatch(rescheduleSessionThunk({ sessionId: id, packageId, newDateISO: newISO, updated_by: user?.id || null }))
        if (!rescheduleSessionThunk.rejected.match(result)) {
            await dispatch(fetchSessionsByPackageThunk(packageId))
            await dispatch(fetchPackagesByPatient(patientId))
            setEditingSessionId(null)
            setEditingSessionDate('')
        }
    }

    if (loading) return <div className="p-3 text-sm">Loading…</div>

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-primaryDark">Sessions</div>
            </div>
            {rows.length === 0 ? (
                <div className="text-sm text-gray-600">No sessions yet</div>
            ) : (
                <div className="relative pl-3">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-2">
                        {rows.map((s) => {
                            const badge = s.status === 'completed'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : s.status === 'rescheduled'
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                            return (
                                <div key={s.id} className="relative">
                                    <div className="absolute -left-[7px] top-4 w-3 h-3 rounded-full bg-white border border-gray-300" />
                                    <div className="p-3 rounded-xl border bg-white">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="font-medium truncate">Session {s.session_number}</div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] border ${badge}`}>{s.status}</span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(s.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-1 truncate">
                                                    {s.updated_at && s.updated_by_email ? (
                                                        <>Updated by <span className="font-medium">{s.updated_by_email}</span> · {new Date(s.updated_at).toLocaleString()}</>
                                                    ) : s.creator_email ? (
                                                        <>Created by <span className="font-medium">{s.creator_email}</span>{s.created_at ? ` · ${new Date(s.created_at).toLocaleString()}` : ''}</>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {s.status !== 'completed' && (
                                                <div className="flex gap-2 shrink-0">
                                                    <button className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100" onClick={() => startReschedule(s)}>Reschedule</button>
                                                    <button className="px-2.5 py-1 text-xs bg-green-50 border border-green-200 rounded-lg hover:bg-green-100" onClick={async () => {
                                                        const result = await dispatch(completeSessionThunk({ sessionId: s.id, packageId, updated_by: user?.id || null }))
                                                        if (completeSessionThunk.rejected.match(result)) {
                                                            alert(result.error.message || 'Failed to complete')
                                                        } else {
                                                            await dispatch(fetchSessionsByPackageThunk(packageId))
                                                            await dispatch(fetchPackagesByPatient(patientId))
                                                        }
                                                    }}>Complete</button>
                                                </div>
                                            )}
                                        </div>
                                        {editingSessionId === s.id && (
                                            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                <div className="text-[12px] font-medium text-primaryDark mb-2">Reschedule session</div>
                                                <div className="flex items-end gap-2">
                                                    <div>
                                                        <div className="text-[11px] text-gray-500 mb-1">New date</div>
                                                        <input
                                                            type="date"
                                                            className="px-2 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            value={editingSessionDate}
                                                            onChange={(e) => setEditingSessionDate(toISODate(e.target.value))}
                                                        />
                                                    </div>
                                                    <button className="px-3 py-1.5 text-xs bg-primary text-white rounded-md shadow-sm hover:opacity-95" onClick={() => submitReschedule(s.id)}>Save</button>
                                                    <button className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-100" onClick={() => { setEditingSessionId(null); setEditingSessionDate('') }}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div >
    )
}

function TransactionsList({ packageId, patientId }: { packageId: number; patientId: number }) {
    const dispatch = useAppDispatch()
    const rows = useAppSelector((s) => (s as any).transactions.itemsByPackageId[packageId] || []) as Array<{ id: number; amount: number; date: string | null; creator_email?: string | null; updated_by_email?: string | null; created_at?: string | null; updated_at?: string | null }>
    const loading = useAppSelector((s) => (s as any).transactions.loadingByPackageId[packageId]) as boolean | undefined
    const [adding, setAdding] = useState(false)
    const [open, setOpen] = useState(false)
    const [editingTxId, setEditingTxId] = useState<number | null>(null)
    const [editingTxAmount, setEditingTxAmount] = useState<string>('0')
    const [editingTxDate, setEditingTxDate] = useState<string>('')
    const { user } = useAuth()
    useEffect(() => {
        dispatch(fetchTransactionsByPackageThunk(packageId as unknown as number))
    }, [dispatch, packageId])

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-primaryDark">Transactions</div>
                <button className="px-2.5 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50" onClick={() => setOpen(true)}>Add Payment</button>
            </div>
            {open && (
                <div className="p-3 border rounded-xl bg-white">
                    <FormBuilder
                        initialValues={{ amount: 0, date: toISODate(new Date()) }}
                        validationSchema={Yup.object({ amount: Yup.number().min(1).required(), date: Yup.string().required() })}
                        fields={[
                            { type: 'number', name: 'amount', label: 'Amount (PKR)', min: 1 },
                            { type: 'date', name: 'date', label: 'Date' },
                        ] as FormFieldConfig[]}
                        onSubmit={async (values) => {
                            setAdding(true)
                            try {
                                await dispatch(addTransactionThunk({ buyed_package_id: packageId, amount: Number(values.amount as number), date: values.date as string, created_by: user?.id || undefined }))
                                await dispatch(fetchTransactionsByPackageThunk(packageId))
                                await dispatch(fetchPackagesByPatient(patientId))
                                setOpen(false)
                            } finally {
                                setAdding(false)
                            }
                        }}
                        submitLabel={adding ? 'Saving…' : 'Save payment'}
                        cancelLabel="Cancel"
                        onCancel={() => setOpen(false)}
                        layout="one-column"
                        isSubmitting={adding}
                    />
                </div>
            )}
            {loading ? (
                <div className="p-3 text-sm">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-gray-600">No transactions</div>
            ) : (
                <div className="space-y-2">
                    {rows.map((t) => (
                        <div key={t.id} className="p-3 rounded-xl border bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm text-gray-600">{t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200">Payment</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                        {t.updated_by_email ? (
                                            <>Updated by <span className="font-medium">{t.updated_by_email}</span>{t.updated_at ? ` · ${new Date(t.updated_at).toLocaleString()}` : ''}</>
                                        ) : t.creator_email ? (
                                            <>Added by <span className="font-medium">{t.creator_email}</span>{t.created_at ? ` · ${new Date(t.created_at).toLocaleString()}` : ''}</>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="font-semibold">PKR {t.amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</div>
                                    <button className="px-2 py-1 text-xs bg-gray-50 border rounded-lg hover:bg-gray-100" onClick={() => {
                                        setEditingTxId(t.id)
                                        setEditingTxAmount(String(t.amount))
                                        setEditingTxDate(toISODate(t.date ?? toISODate(new Date())))
                                    }}>Edit</button>
                                    <RoleGuardDelete createdByEmail={t.creator_email} onDelete={async () => {
                                        if (!confirm('Delete this payment?')) return
                                        await dispatch(deleteTransactionThunk({ id: t.id, buyed_package_id: packageId, updated_by: user?.id || null }))
                                        await dispatch(fetchTransactionsByPackageThunk(packageId))
                                        await dispatch(fetchPackagesByPatient(patientId))
                                    }} />
                                </div>
                            </div>
                            {editingTxId === t.id && (
                                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                    <div>
                                        <div className="text-[11px] text-gray-500 mb-1">Amount (PKR)</div>
                                        <input
                                            type="number"
                                            className="px-2 py-1.5 border rounded-md text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            value={editingTxAmount}
                                            min={1}
                                            onChange={(e) => setEditingTxAmount(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-gray-500 mb-1">Date</div>
                                        <input
                                            type="date"
                                            className="px-2 py-1.5 border rounded-md text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            value={editingTxDate}
                                            onChange={(e) => setEditingTxDate(toISODate(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1.5 text-xs bg-primary text-white rounded-md shadow-sm hover:opacity-95" onClick={async () => {
                                            const amount = Math.max(1, Number(editingTxAmount || 0))
                                            const date = editingTxDate ? toISODate(editingTxDate) : null
                                            // @ts-ignore
                                            const { updateTransaction: updateTx } = await import('../store/transactionsSlice')
                                            const result = await (dispatch as unknown as (args: unknown) => Promise<unknown>)(updateTx({ id: t.id, buyed_package_id: packageId, amount, date, updated_by: user?.id || null }))
                                            if (updateTx.fulfilled.match(result)) {
                                                await dispatch(fetchTransactionsByPackageThunk(packageId))
                                                await dispatch(fetchPackagesByPatient(patientId))
                                                setEditingTxId(null)
                                                setEditingTxAmount('0')
                                                setEditingTxDate('')
                                            } else {
                                                alert('Failed to update payment')
                                            }
                                        }}>Save</button>
                                        <button className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-100" onClick={() => { setEditingTxId(null); setEditingTxAmount('0'); setEditingTxDate('') }}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

        </div>
    )
}
function BuyedPackageForm({ patientId, items, user, patientName }: { patientId: number; items: BuyedPackageWithCreator[]; user: AuthUser; patientName?: string }) {
    const [formOpen, setFormOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sessionsModalOpen, setSessionsModalOpen] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<BuyedPackageWithCreator | null>(null)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingPackageId, setEditingPackageId] = useState<number | null>(null)
    const dispatch = useAppDispatch()
    const initial = {
        no_of_sessions: 0,
        total_payment: 0,
        advance_payment: 0,
        gap_between_sessions: 7,
        start_date: toISODate(new Date()),
        created_by: user.id,
    }

    const schema = Yup.object({
        no_of_sessions: Yup.number().min(0).required(),
        total_payment: Yup.number().min(0).required(),
        advance_payment: Yup.number().min(0).required().max(Yup.ref('total_payment')),
        gap_between_sessions: Yup.number().min(0).required(),
        start_date: Yup.string().required(),
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

    // (Removed unused calculateSessionDates)

    const handleViewSessions = (pkg: BuyedPackageWithCreator) => {
        setSelectedPackage(pkg)
        setSessionsModalOpen(true)
    }

    const handleEditPackage = (packageId: number) => {
        setEditingPackageId(packageId)
        setEditModalOpen(true)
    }

    const handleDeletePackage = async (packageId: number) => {
        if (!window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
            return
        }

        console.log('Attempting to delete package:', packageId, 'for patient:', patientId)

        try {
            const result = await dispatch(deletePackage({ id: packageId, patientId: Number(patientId), updatedBy: user?.id || null }))

            console.log('Delete result:', result)

            if (deletePackage.fulfilled.match(result)) {
                console.log('Delete successful, refreshing packages')
                // Refresh the packages list
                dispatch(fetchPackagesByPatient(Number(patientId)))
            } else if (deletePackage.rejected.match(result)) {
                console.error('Delete package rejected:', result.error)
                alert(`Failed to delete package: ${result.error.message || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Failed to delete package:', error)
            alert(`Failed to delete package: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
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
                                <tr key={p.id} className="border-t border-[#e6eef8] cursor-pointer" onClick={() => handleViewSessions(p)}>
                                    <td className="p-2 text-sm truncate max-w-[80px]" title={p.created_by === user.id ? 'You' : (p.creator?.email || '-')}>
                                        {p.created_by === user.id ? 'You' : (p.creator?.email || '-')}
                                    </td>
                                    <td className="p-2 text-sm text-left">{p.no_of_sessions}</td>
                                    <td className="p-2 text-sm text-left">{p.sessions_completed}</td>
                                    <td className="p-2 text-sm text-left">{p.gap_between_sessions}</td>
                                    <td className="p-2 text-sm">{new Date(p.start_date).toLocaleDateString()}</td>
                                    <td className="p-2 text-sm">{p.next_session_date ? new Date(p.next_session_date).toLocaleDateString() : '-'}</td>
                                    <td className="p-2 text-sm">PKR {p.total_payment.toFixed(0)}</td>
                                    <td className="p-2 text-sm">PKR {p.paid_payment.toFixed(0)}</td>
                                    <td className="p-2 text-sm">PKR {(p.total_payment - (p.paid_payment + p.advance_payment)).toFixed(0)}</td>
                                    <td className="p-2 text-sm">PKR {p.advance_payment.toFixed(0)}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditPackage(p.id) }}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                title="Edit package"
                                            >
                                                <Edit size={20} className="text-green-600" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePackage(p.id) }}
                                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                                title="Delete package"
                                            >
                                                <Trash2 size={20} className="text-red-600" />
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
                <FormBuilder
                    initialValues={initial}
                    validationSchema={schema}
                    fields={[
                        { type: 'number', name: 'no_of_sessions', label: 'Sessions', min: 0 },
                        { type: 'number', name: 'gap_between_sessions', label: 'Gap (days)', min: 0 },
                        { type: 'date', name: 'start_date', label: 'Start Date' },
                        { type: 'number', name: 'total_payment', label: 'Total Payment', min: 0 },
                        { type: 'number', name: 'advance_payment', label: 'Advance Payment', min: 0 },
                    ] as FormFieldConfig[]}
                    onSubmit={async (values) => {
                        setLoading(true)
                        const payload = {
                            no_of_sessions: Number(values.no_of_sessions as number),
                            total_payment: Number(values.total_payment as number),
                            advance_payment: Number(values.advance_payment as number),
                            gap_between_sessions: Number(values.gap_between_sessions as number),
                            start_date: values.start_date as string,
                            created_by: values.created_by as string,
                            updated_by: null,
                            patient_id: patientId,
                        }
                        console.log('Payload:', payload)
                        const inserted = await createPackage(payload)
                        console.log('Inserted:', inserted)
                        const generated = await generateSessionsClientSide({
                            buyedPackageId: inserted.id,
                            startDateISO: values.start_date as string,
                            totalSessions: Number(values.no_of_sessions as number),
                            gapDays: Number(values.gap_between_sessions as number),
                            completedCount: 0
                        })
                        console.log('Generated sessions:', generated)
                        setLoading(false)
                        setFormOpen(false)
                        await dispatch(fetchPackagesByPatient(patientId))
                    }}
                    submitLabel="Save package"
                    cancelLabel="Cancel"
                    onCancel={() => setFormOpen(false)}
                    layout="two-column"
                    isSubmitting={loading}
                />
            </Modal>

            {/* Sessions Modal */}
            <Modal open={sessionsModalOpen} onClose={() => setSessionsModalOpen(false)} title="Sessions and Payment History">
                {selectedPackage && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <SessionsList packageId={selectedPackage.id} patientId={patientId} />
                        <TransactionsList packageId={selectedPackage.id} patientId={patientId} />
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


