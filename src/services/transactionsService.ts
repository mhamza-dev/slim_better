import { supabase } from '../lib/supabaseClient'

export type Transaction = {
    id: number
    buyed_package_id: number
    amount: number
    date: string | null
    created_by: string | null
    created_at: string | null
    updated_at: string | null
    creator_email?: string | null
}

export async function fetchTransactionsByPackage(buyedPackageId: number): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions_history')
        .select('*')
        .eq('buyed_package_id', buyedPackageId)
        .order('date', { ascending: false })
    if (error) throw error
    const tx = (data as Transaction[]) || []
    const creatorIds = Array.from(new Set(tx.map(t => t.created_by).filter(Boolean))) as string[]
    let idToEmail = new Map<string, string | null>()
    if (creatorIds.length) {
        const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('id,email')
            .in('id', creatorIds)
        if (profErr) throw profErr
        for (const p of (prof as Array<{ id: string; email: string | null }>) || []) {
            idToEmail.set(p.id, p.email ?? null)
        }
    }
    return tx.map(t => ({ ...t, creator_email: t.created_by ? (idToEmail.get(t.created_by) ?? null) : null }))
}

export async function addTransaction(input: { buyed_package_id: number; amount: number; date?: string | null; created_by?: string | null }): Promise<void> {
    const { error } = await supabase
        .from('transactions_history')
        .insert({ ...input })
    if (error) throw error
}

export async function addPaymentAndUpdatePackage(input: { buyed_package_id: number; amount: number; date?: string | null; created_by?: string | null }): Promise<void> {
    // 1) insert history
    const { error: insErr } = await supabase.from('transactions_history').insert({ ...input })
    if (insErr) throw insErr

    // 2) read current paid and total
    const { data: pkg, error: pkgErr } = await supabase
        .from('buyed_packages')
        .select('paid_payment,total_payment')
        .eq('id', input.buyed_package_id)
        .single()
    if (pkgErr) throw pkgErr
    const current = Number((pkg as any)?.paid_payment ?? 0)
    const total = Number((pkg as any)?.total_payment ?? 0)
    const next = Math.min(current + Number(input.amount), total)

    // 3) update package
    const { error: updErr } = await supabase
        .from('buyed_packages')
        .update({ paid_payment: next })
        .eq('id', input.buyed_package_id)
    if (updErr) throw updErr
}

export async function deletePaymentAndUpdatePackage(id: number): Promise<void> {
    // 1) read transaction
    const { data: row, error: readErr } = await supabase
        .from('transactions_history')
        .select('id,buyed_package_id,amount')
        .eq('id', id)
        .single()
    if (readErr) throw readErr
    const tx = row as { id: number; buyed_package_id: number; amount: number }
    // 2) delete
    const { error: delErr } = await supabase
        .from('transactions_history')
        .delete()
        .eq('id', id)
    if (delErr) throw delErr
    // 3) update package paid_payment = max(current - amount, 0)
    const { data: pkg, error: pkgErr } = await supabase
        .from('buyed_packages')
        .select('paid_payment')
        .eq('id', tx.buyed_package_id)
        .single()
    if (pkgErr) throw pkgErr
    const current = Number((pkg as any)?.paid_payment ?? 0)
    const next = Math.max(current - Number(tx.amount), 0)
    const { error: updErr } = await supabase
        .from('buyed_packages')
        .update({ paid_payment: next })
        .eq('id', tx.buyed_package_id)
    if (updErr) throw updErr
}

export async function updatePaymentAndUpdatePackage(id: number, changes: { amount?: number; date?: string | null }): Promise<void> {
    // read existing
    const { data: row, error: readErr } = await supabase
        .from('transactions_history')
        .select('id,buyed_package_id,amount')
        .eq('id', id)
        .single()
    if (readErr) throw readErr
    const tx = row as { id: number; buyed_package_id: number; amount: number }
    const newAmount = changes.amount !== undefined ? Number(changes.amount) : tx.amount
    // update history
    const { error: updTxErr } = await supabase
        .from('transactions_history')
        .update({ amount: newAmount, date: changes.date ?? null })
        .eq('id', id)
    if (updTxErr) throw updTxErr
    // compute delta and update package
    const delta = Number(newAmount) - Number(tx.amount)
    if (delta !== 0) {
        const { data: pkg, error: pkgErr } = await supabase
            .from('buyed_packages')
            .select('paid_payment,total_payment')
            .eq('id', tx.buyed_package_id)
            .single()
        if (pkgErr) throw pkgErr
        const current = Number((pkg as any)?.paid_payment ?? 0)
        const total = Number((pkg as any)?.total_payment ?? 0)
        const next = Math.max(0, Math.min(current + delta, total))
        const { error: updPkgErr } = await supabase
            .from('buyed_packages')
            .update({ paid_payment: next })
            .eq('id', tx.buyed_package_id)
        if (updPkgErr) throw updPkgErr
    }
}


