import { useMemo, useState } from 'react'
import { toISODate } from '../../utils/date'

type DateRange = { start: string; end?: string }

function getMonthMeta(view: Date) {
    const year = view.getFullYear()
    const month = view.getMonth()
    const first = new Date(year, month, 1)
    const firstWeekday = first.getDay() // 0..6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { year, month, firstWeekday, daysInMonth }
}

export function DateRangeInput({
    value,
    onChange,
    className,
}: {
    value: DateRange
    onChange: (next: DateRange) => void
    className?: string
}) {
    const start = value.start ? toISODate(value.start) : ''
    const end = value.end ? toISODate(value.end) : ''

    const [open, setOpen] = useState(false)
    const [view, setView] = useState(() => (start ? new Date(start) : new Date()))
    const [tempStart, setTempStart] = useState(start)
    const [tempEnd, setTempEnd] = useState(end)

    const { year, month, firstWeekday, daysInMonth } = useMemo(() => getMonthMeta(view), [view])
    const monthLabel = useMemo(() => view.toLocaleString('default', { month: 'long' }), [view])

    function selectDay(day: number) {
        const iso = toISODate(new Date(year, month, day))
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(iso)
            setTempEnd('')
            return
        }
        if (iso < tempStart) {
            setTempEnd(tempStart)
            setTempStart(iso)
        } else {
            setTempEnd(iso)
        }
    }

    function apply() {
        onChange({ start: tempStart || start, end: tempEnd || undefined })
        setOpen(false)
    }

    function clearEnd() {
        setTempEnd('')
        onChange({ start: tempStart || start, end: undefined })
    }

    function isInRange(day: number) {
        const iso = toISODate(new Date(year, month, day))
        const s = tempStart || start
        const e = tempEnd || end || ''
        if (!s) return false
        if (!e) return iso === s
        return iso >= s && iso <= e
    }

    function isEdge(day: number) {
        const iso = toISODate(new Date(year, month, day))
        const s = tempStart || start
        const e = tempEnd || end || ''
        return (s && iso === s) || (!!e && iso === e)
    }

    return (
        <div className={`relative ${className || ''}`}>
            <button
                type="button"
                className="w-full sm:w-auto min-w-[260px] px-3 py-2 rounded-lg border border-[#e6eef8] bg-white text-left flex items-center justify-between gap-2"
                onClick={() => setOpen((o) => !o)}
            >
                <span className="truncate text-sm text-primaryDark">
                    {start || 'MM/DD/YYYY'}
                    <span className="mx-2">→</span>
                    {end || 'MM/DD/YYYY'}
                </span>
                <span className="text-gray-500">📅</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 bg-white border border-[#e6eef8] rounded-xl shadow-lg p-3 w-[300px]">
                    <div className="flex items-center justify-between mb-2">
                        <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => setView(new Date(year, month - 1, 1))}>◀</button>
                        <div className="font-semibold text-primaryDark">{monthLabel} {year}</div>
                        <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => setView(new Date(year, month + 1, 1))}>▶</button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (<div key={d} className="text-center py-1">{d}</div>))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstWeekday }).map((_, i) => (
                            <div key={`blank-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const day = idx + 1
                            const inRange = isInRange(day)
                            const isEdgeDay = isEdge(day)
                            const base = 'text-sm rounded-md text-center py-1'
                            const cls = isEdgeDay
                                ? 'bg-primary text-white'
                                : inRange
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-gray-100'
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    className={`${base} ${cls}`}
                                    onClick={() => selectDay(day)}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-gray-600">
                            {tempStart || start ? toISODate(tempStart || start) : '—'}
                            <span className="mx-1">→</span>
                            {tempEnd || end ? toISODate(tempEnd || end as string) : '—'}
                        </div>
                        <div className="flex items-center gap-2">
                            {(tempEnd || end) && (
                                <button className="px-3 py-1 rounded-lg border text-sm" onClick={clearEnd}>Clear end</button>
                            )}
                            <button className="px-3 py-1 rounded-lg bg-primary text-white text-sm" onClick={apply}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


