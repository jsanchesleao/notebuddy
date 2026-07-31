// Formats the stored date/time/datetime strings (produced by DateValueEditor/TimeValueEditor/
// DateTimeValueEditor as 'YYYY-MM-DD', 'HH:MM', and 'YYYY-MM-DDTHH:MM' respectively) into
// locale-aware, human-readable text for read-only display contexts.

function toLocalDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute)
}

function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function parseTimeParts(time: string): { hour: number; minute: number } | null {
  const [hour, minute] = time.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

export function formatDateDisplay(value: string): string {
  const parts = parseDateParts(value)
  if (!parts) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    toLocalDate(parts.year, parts.month, parts.day),
  )
}

export function formatTimeDisplay(value: string): string {
  const parts = parseTimeParts(value)
  if (!parts) return value
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
    toLocalDate(1970, 1, 1, parts.hour, parts.minute),
  )
}

export function formatDateTimeDisplay(value: string): string {
  const [date, time] = value.split('T')
  const dateParts = date ? parseDateParts(date) : null
  const timeParts = time ? parseTimeParts(time) : null
  if (!dateParts) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    toLocalDate(dateParts.year, dateParts.month, dateParts.day, timeParts?.hour, timeParts?.minute),
  )
}
