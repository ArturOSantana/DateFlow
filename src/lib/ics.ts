import type { DateEvent } from '../types'

/**
 * Gera o conteúdo de um arquivo iCalendar (.ics) para o date informado.
 * Compatível com Google Calendar, Apple Calendar e Outlook.
 *
 * @param date         O evento DateEvent
 * @param organizer    Nome + e-mail de quem criou o date
 * @param attendeeEmail E-mail da parceira/parceiro (opcional — gera ATTENDEE)
 * @param shareUrl     Link público do date (colocado na DESCRIPTION)
 */
export function buildIcs(
  date: DateEvent,
  organizer: { name: string; email: string },
  attendeeEmail?: string,
  shareUrl?: string,
): string {
  const [year, month, day] = date.date.split('-').map(Number)
  const [hour, minute]     = date.time.split(':').map(Number)

  const pad = (n: number) => String(n).padStart(2, '0')

  // DTSTART e DTEND (duração de 2 h)
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  const endHour  = hour + 2
  const dtEnd   = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`

  // DTSTAMP em UTC (momento da geração)
  const now     = new Date()
  const stamp   = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  // Título — oculta o nome real se hiddenFromPartner
  const summary = date.hiddenFromPartner ? 'Surpresa especial 🎁' : date.title

  // Descrição — inclui notas e link público se houver
  const descParts: string[] = []
  if (!date.hiddenFromPartner && date.description) descParts.push(date.description)
  if (shareUrl) descParts.push(`Ver detalhes: ${shareUrl}`)
  const description = descParts.join('\\n')

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DateFlow//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${date.id}@dateflow.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${foldLine(summary)}`,
    `ORGANIZER;CN="${foldLine(organizer.name)}":mailto:${organizer.email}`,
  ]

  if (date.location) {
    lines.push(`LOCATION:${foldLine(date.location)}`)
  }
  if (description) {
    lines.push(`DESCRIPTION:${foldLine(description)}`)
  }
  if (attendeeEmail) {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${attendeeEmail}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Dobra linhas longas conforme RFC 5545 (máx. 75 octetos por linha).
 * Caracteres especiais do iCal são escapados.
 */
function foldLine(value: string): string {
  // Escapa vírgula, ponto-e-vírgula e barra invertida (RFC 5545 §3.3.11)
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')

  // Folding: quebra a cada 75 chars, continua com <CRLF><SP>
  let result = ''
  let remaining = escaped
  while (remaining.length > 75) {
    result += remaining.slice(0, 75) + '\r\n '
    remaining = remaining.slice(75)
  }
  result += remaining
  return result
}

/**
 * Aciona o download do arquivo .ics no browser do usuário.
 */
export function downloadIcs(
  date: DateEvent,
  organizer: { name: string; email: string },
  attendeeEmail?: string,
  shareUrl?: string,
): void {
  const content = buildIcs(date, organizer, attendeeEmail, shareUrl)
  const blob    = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = `date-${date.id}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
