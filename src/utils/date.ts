export function shiftSundayToMonday(dateISO: string): string {
    const d = new Date(dateISO)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
}


export function toISODate(input: string | Date): string {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    const d = typeof input === 'string' ? new Date(input) : input
    const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const y = localMidnight.getFullYear()
    const m = String(localMidnight.getMonth() + 1).padStart(2, '0')
    const day = String(localMidnight.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export function getDatesInRange(startISO: string, endISO: string): string[] {
    const start = new Date(startISO)
    const end = new Date(endISO)
    const out: string[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cur <= endDay) {
        out.push(toISODate(cur))
        cur.setDate(cur.getDate() + 1)
    }
    return out
}

export function isISODateWithinRange(dateISO: string, startISO: string, endISO?: string | null): boolean {
    const d = toISODate(dateISO)
    let s = toISODate(startISO)
    let e = endISO ? toISODate(endISO) : null
    if (!e) return d === s
    // normalize if user chose end < start
    if (e < s) { const tmp = s; s = e; e = tmp }
    return d >= s && d <= e
}


