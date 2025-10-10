import { Formik, Form, Field, ErrorMessage, type FormikHelpers } from 'formik'

export type FormFieldConfig =
    | { type: 'text' | 'number' | 'date'; name: string; label: string; placeholder?: string; min?: number | string; max?: number | string }
    | { type: 'textarea'; name: string; label: string; placeholder?: string; rows?: number }
    | { type: 'select'; name: string; label: string; options: { label: string; value: string | number }[] }

export function FormBuilder<TValues extends Record<string, unknown>>({
    initialValues,
    validationSchema,
    fields,
    onSubmit,
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    onCancel,
    layout = 'two-column',
    isSubmitting,
}: {
    initialValues: TValues
    validationSchema: unknown
    fields: FormFieldConfig[]
    onSubmit: (values: TValues, helpers: FormikHelpers<TValues>) => Promise<void> | void
    submitLabel?: string
    cancelLabel?: string
    onCancel?: () => void
    layout?: 'one-column' | 'two-column'
    isSubmitting?: boolean
}) {
    const gridClass = layout === 'two-column' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'

    return (
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
            <Form className="space-y-3">
                <div className={gridClass}>
                    {fields.map((f) => (
                        <div key={f.name}>
                            <label className="block text-xs text-[#335] mb-1">{f.label}</label>
                            {f.type === 'textarea' ? (
                                <Field as="textarea" name={f.name} rows={(f as any).rows ?? 3} placeholder={f.placeholder} className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                            ) : f.type === 'select' ? (
                                <Field as="select" name={f.name} className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg">
                                    <option value="">Select</option>
                                    {(f as any).options.map((opt: { label: string; value: string | number }) => (
                                        <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Field>
                            ) : (
                                <Field type={f.type} name={f.name} placeholder={f.placeholder}
                                    min={(f as any).min as any} max={(f as any).max as any}
                                    className="w-full px-3 py-2 border border-[#cfe0ff] rounded-lg" />
                            )}
                            <ErrorMessage name={f.name} component="div" className="text-red-700 text-sm mt-1" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary text-white px-3 py-2 font-semibold flex-1">
                        {submitLabel}
                    </button>
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 text-primaryDark px-3 py-2 flex-1 sm:flex-none">
                            {cancelLabel}
                        </button>
                    )}
                </div>
            </Form>
        </Formik>
    )
}


