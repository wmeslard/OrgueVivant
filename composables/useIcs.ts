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

/**
 * Échappe les caractères réservés d'une valeur ICS (RFC 5545 §3.3.11).
 * Sans cela, la moindre virgule dans un titre ou une description casse le
 * fichier : le parseur y voit un séparateur de valeurs.
 */
function escapeIcs(str: string) {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Replie les lignes à 75 octets, limite imposée par la RFC 5545. On compte les
 * octets et non les caractères, un accent en occupant deux en UTF-8.
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

/**
 * Nom de fichier sûr sur tous les systèmes : accents décomposés puis retirés,
 * et tout caractère non alphanumérique remplacé par un tiret. Un titre tel que
 * « Bach / Buxtehude » produisait sinon un nom invalide.
 */
function slugify(title: string) {
  const slug = (title || '')
    // Les ligatures ne se décomposent pas en NFD : sans cela « Œuvres »
    // deviendrait « uvres ».
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return slug || 'concert'
}

const LIEUX = {
  saint_maurice: 'Église Saint-Maurice de Lille, Parvis Saint-Maurice, 59800 Lille, France',
  saint_etienne: "Église Saint-Étienne de Lille, 47 Rue de l'Hôpital Militaire, 59000 Lille, France"
} as const

export function useIcs() {
  function buildIcs(c: Concert) {
    const dtstart = toIcsDate(c.date, c.time)
    const dtend = addMinutes(c.date, c.time, parseDurationMinutes(c.duration))
    // DTSTAMP doit être un horodatage UTC de génération, pas la date de l'événement.
    const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
    const loc = LIEUX[c.location as keyof typeof LIEUX] ?? LIEUX.saint_maurice

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Orgue Vivant//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${c.id}@orgue-vivant`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      fold(`SUMMARY:${escapeIcs(c.title)}`),
      fold(`LOCATION:${escapeIcs(loc)}`),
      fold(`DESCRIPTION:${escapeIcs(c.description || '')}`),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')
  }

  function downloadIcs(c: Concert) {
    const blob = new Blob([buildIcs(c)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(c.title)}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { buildIcs, downloadIcs }
}
