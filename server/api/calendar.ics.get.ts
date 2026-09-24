import { getServiceClient } from '~/server/utils/superAdminClient'
import { calendrierPublic } from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

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

/**
 * RFC 5545 limite les lignes à 75 octets ; au-delà il faut les replier.
 * Les descriptions de concerts pouvant faire plus de mille caractères, sans
 * ce repli certains agendas refusent le flux.
 */
function fold(line: string) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 74) return line

  const out: string[] = []
  let cur = ''
  let bytes = 0
  let first = true
  for (const ch of line) {
    const size = enc.encode(ch).length
    // 74 sur la première ligne ; 73 ensuite, l'espace de repli comptant aussi.
    const limit = first ? 74 : 73
    if (bytes + size > limit) {
      out.push(first ? cur : ' ' + cur)
      first = false
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += size
  }
  if (cur) out.push(first ? cur : ' ' + cur)
  return out.join('\r\n')
}

const LIEUX = {
  saint_maurice: 'Église Saint-Maurice de Lille, Parvis Saint-Maurice, 59800 Lille, France',
  saint_etienne: "Église Saint-Étienne de Lille, 47 Rue de l'Hôpital Militaire, 59000 Lille, France"
} as const

// ── Moments musicaux ─────────────────────────────────────────────────────────
// Chaque jeudi ouvert : la séance inscrite par le lien, ou Louis-Paul Courtois,
// telles que le site les publie : voir server/utils/moments.ts.
const MONTHS_AHEAD = 12

export default defineEventHandler(async (event) => {
  const client = getServiceClient()
  const now = new Date()
  const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(now)
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`

  const { data, error } = await client
    .from('concerts')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const vevents: string[] = []

  for (const c of data ?? []) {
    vevents.push([
      'BEGIN:VEVENT',
      `UID:${c.id}@orgue-vivant`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(c.date, c.time)}`,
      `DTEND:${addMinutes(c.date, c.time, parseDurationMinutes(c.duration))}`,
      fold(`SUMMARY:${escapeIcs(c.title)}`),
      fold(`LOCATION:${escapeIcs(LIEUX[c.location as keyof typeof LIEUX] ?? LIEUX.saint_maurice)}`),
      fold(`DESCRIPTION:${escapeIcs(c.description || '')}`),
      'END:VEVENT'
    ].join('\r\n'))
  }

  for (const s of await calendrierPublic(today, plusMois(today, MONTHS_AHEAD))) {
    const day = s.date.replaceAll('-', '')
    // Les instruments ne sont indiqués qu'à plusieurs : seul, c'est l'orgue.
    const qui = s.interprete.replaceAll('\u00A0', ' ')
    const instruments = (s.musiciens?.length ?? 0) > 1
      ? s.musiciens!.map(m => m.instrument.toLocaleLowerCase('fr')).filter(Boolean).join(', ')
      : ''
    const avec = `${qui}${instruments ? ` (${instruments})` : ''}`
    const titre = s.type === 'regulier'
      ? `Moment musical — ${qui}`
      : `Moment musical — ${avec}${s.programme ? ` · ${s.programme}` : ''}`
    const description = s.type === 'regulier'
      ? `Une demi-heure de musique à l'orgue de chœur de l'église Saint-Maurice, par ${qui}.`
      : `Une demi-heure de musique à l'orgue de chœur de l'église Saint-Maurice, par ${avec}.${s.programme ? `\nProgramme : ${s.programme}` : ''}`
    vevents.push([
      'BEGIN:VEVENT',
      // Les séances inscrites gardent leur identifiant de réservation : une
      // annulation retire l'événement, une nouvelle réservation en crée un autre.
      `UID:${s.type === 'regulier' ? `moment-${day}` : `moment-${s.id}`}@orgue-vivant`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${s.debut.replace(':', '')}00`,
      `DTEND:${day}T${s.fin.replace(':', '')}00`,
      fold(`SUMMARY:${escapeIcs(titre)}`),
      fold(`LOCATION:${escapeIcs(LIEUX.saint_maurice)}`),
      fold(`DESCRIPTION:${escapeIcs(description)}`),
      'END:VEVENT'
    ].join('\r\n'))
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orgue Vivant//FR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Orgue Vivant — Concerts et moments musicaux',
    'X-WR-TIMEZONE:Europe/Paris',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n')

  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  // `inline` et non `attachment` : en pièce jointe forcée, les agendas
  // importaient une copie figée au lieu de s'abonner à l'URL.
  setHeader(event, 'Content-Disposition', 'inline; filename="orgue-vivant.ics"')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return ics
})
