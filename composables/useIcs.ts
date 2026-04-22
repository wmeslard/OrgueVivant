import type { Concert } from './useConcerts'

function pad(n: number) { return String(n).padStart(2, '0') }

function toIcsDate(date: string, time: string) {
  // YYYYMMDDTHHMMSS (local floating time)
  return `${date.replaceAll('-', '')}T${(time || '20:00').replaceAll(':', '')}00`
}

function addMinutes(date: string, time: string, mins: number) {
  const d = new Date(`${date}T${time || '20:00'}`)
  d.setMinutes(d.getMinutes() + mins)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function parseDurationMinutes(d?: string) {
  if (!d) return 75
  const m = d.match(/(\d+)\s*h\s*(\d*)/i)
  if (m) return parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0)
  const n = parseInt(d)
  return Number.isFinite(n) ? n : 75
}

export function useIcs() {
  function buildIcs(c: Concert) {
    const dtstart = toIcsDate(c.date, c.time)
    const dtend = addMinutes(c.date, c.time, parseDurationMinutes(c.duration))
    const loc = c.location === 'saint_maurice' ? 'Église Saint-Maurice, Lille' : 'Église Saint-Étienne, Lille'
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Orgue Vivant//FR',
      'BEGIN:VEVENT',
      `UID:${c.id}@orgue-vivant`,
      `DTSTAMP:${dtstart}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${c.title}`,
      `LOCATION:${loc}`,
      `DESCRIPTION:${(c.description || '').replaceAll('\n', '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')
  }

  function downloadIcs(c: Concert) {
    const blob = new Blob([buildIcs(c)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${c.title.replaceAll(' ', '-').toLowerCase()}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { buildIcs, downloadIcs }
}
