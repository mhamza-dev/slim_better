import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Patient } from '../types/db'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

interface PatientEditModalProps {
    patientId: number | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function PatientEditModal({ patientId, isOpen, onClose, onSuccess }: PatientEditModalProps) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState<Partial<Patient>>({ name: '', phone_number: '', address: '', date_of_birth: '' })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!patientId || !isOpen) return

        async function loadPatient() {
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', patientId)
                    .single()

                if (error) throw error
                setForm(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load patient')
            }
        }

        loadPatient()
    }, [patientId, isOpen])

    // Handle Escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!patientId) return

        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.from('patients').update({
                name: form.name,
                phone_number: form.phone_number,
                address: form.address,
                date_of_birth: form.date_of_birth || null,
                created_by: user?.id,
            }).eq('id', patientId)

            if (error) throw error

            onSuccess?.()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] lg:max-h-[80vh] overflow-y-auto mt-4 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-primaryDark">Edit Patient</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name *
                            </label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                value={form.name || ''}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number *
                            </label>
                            <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                value={form.phone_number || ''}
                                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                rows={3}
                                value={form.address || ''}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                value={form.date_of_birth || ''}
                                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
