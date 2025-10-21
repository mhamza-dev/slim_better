// React imports
import { useEffect, useState } from 'react'

// React Router imports
import { useNavigate, useParams } from 'react-router-dom'

// Third-party imports
import * as Yup from 'yup'

// Internal imports - Types
import type { FormFieldConfig } from '../components/ui/Form'

// Internal imports - Components
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { FormBuilder } from '../components/ui/Form'

// Internal imports - Hooks
import { useAuth } from '../hooks/useAuth'

// Internal imports - Services & Utils
import { createPatient, updatePatient } from '../services/patientsService'
import { supabase } from '../lib/supabaseClient'

export default function PatientForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { user } = useAuth()
    const editing = Boolean(id)
    const [loading, setLoading] = useState(false)
    const [initialValues, setInitialValues] = useState({ name: '', phone_number: '', address: '', age: '', branch_name: '' })

    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        phone_number: Yup.string().required('Required'),
        address: Yup.string().nullable(),
        age: Yup.number().min(0).max(150).nullable(),
        branch_name: Yup.string().required('Required'),
    })

    const fields: FormFieldConfig[] = [
        { type: 'text', name: 'name', label: 'Name' },
        { type: 'text', name: 'phone_number', label: 'Phone number' },
        { type: 'textarea', name: 'address', label: 'Address', rows: 3 },
        { type: 'number', name: 'age', label: 'Age', min: 0, max: 150 },
        {
            type: 'select', name: 'branch_name', label: 'Branch', options: [
                { label: 'Canal Road Branch, Fsd', value: 'Canal Road Branch, Fsd' },
                { label: 'Kohinoor Branch, Fsd', value: 'Kohinoor Branch, Fsd' },
            ]
        },
    ]

    useEffect(() => {
        if (!editing || !id) return

        const loadPatient = async () => {
            try {
                const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
                if (error) throw error
                if (data) {
                    setInitialValues({
                        name: data.name || '',
                        phone_number: data.phone_number || '',
                        address: data.address || '',
                        age: data.age ? String(data.age) : '',
                        branch_name: data.branch_name || '',
                    })
                }
            } catch (error) {
                console.error('Failed to load patient:', error)
            }
        }

        loadPatient()
    }, [editing, id])

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            if (editing && id) {
                await updatePatient(Number(id), {
                    name: values.name as string,
                    phone_number: values.phone_number as string,
                    address: (values.address as string) || null,
                    age: values.age ? Number(values.age) : null,
                    branch_name: values.branch_name as string,
                    updated_by: user?.id || null,
                })
            } else {
                await createPatient({
                    name: values.name as string,
                    phone_number: values.phone_number as string,
                    address: (values.address as string) || null,
                    age: values.age ? Number(values.age) : null,
                    branch_name: values.branch_name as string,
                    created_by: user?.id || null,
                    updated_by: null,
                })
            }
            navigate('/patients')
        } catch (error) {
            console.error('Failed to save patient:', error)
            alert(error instanceof Error ? error.message : 'Failed to save patient')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <h2 className="text-primaryDark mb-3 text-lg sm:text-xl">{editing ? 'Edit patient' : 'Add patient'}</h2>
            <Card className="max-w-xl mx-auto">
                <CardHeader />
                <CardContent>
                    <FormBuilder
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        fields={fields}
                        onSubmit={handleSubmit}
                        submitLabel={editing ? 'Save changes' : 'Create'}
                        cancelLabel="Cancel"
                        onCancel={() => navigate('/patients')}
                        layout="one-column"
                        isSubmitting={loading}
                    />
                </CardContent>
            </Card>
        </div>
    )
}


