import { getServiceClient } from '~/server/utils/superAdminClient'

function pad(n: number) { return String(n).padStart(2, '0') }

function toIcsDate(date: string, time: string) {
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

function escapeIcs(str: string) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export default defineEventHandler(async (event) => {
  const client = getServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await client
    .from('concerts')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const events = (data ?? []).map((c: any) => {
    const dtstart = toIcsDate(c.date, c.time)
    const dtend = addMinutes(c.date, c.time, parseDurationMinutes(c.duration))
    const loc = c.location === 'saint_maurice'
      ? 'Église Saint-Maurice de Lille, Parvis Saint-Maurice, 59800 Lille, France'
      : "Église Saint-Étienne de Lille, 47 Rue de l'Hôpital Militaire, 59000 Lille, France"
    return [
      'BEGIN:VEVENT',
      `UID:${c.id}@orgue-vivant`,
      `DTSTAMP:${dtstart}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcs(c.title)}`,
      `LOCATION:${escapeIcs(loc)}`,
      `DESCRIPTION:${escapeIcs(c.description || '')}`,
      'END:VEVENT'
    ].join('\r\n')
  }).join('\r\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orgue Vivant//FR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Orgue Vivant — Concerts',
    'X-WR-TIMEZONE:Europe/Paris',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    events,
    'END:VCALENDAR'
  ].join('\r\n')

  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="orgue-vivant.ics"')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return ics
})
