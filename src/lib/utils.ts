import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function formatDateShort(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function formatDateLabel(isoDate: string): string {
  try {
    const d = parseISO(isoDate)
    if (isToday(d)) return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function isDatePast(isoDate: string, time: string): boolean {
  try {
    const [h, m] = time.split(':').map(Number)
    const d = parseISO(isoDate)
    d.setHours(h, m)
    return isPast(d)
  } catch {
    return false
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function generateShareToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export function buildGoogleCalendarUrl(
  title: string,
  date: string,
  time: string,
  location: string,
  description: string,
): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  const endHour = hour + 2
  const end = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    location,
    details: description,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
