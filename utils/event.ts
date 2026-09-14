/**
 * Aides pour les données structurées d'un concert (schema.org/MusicEvent).
 * Sans dépendance à Nuxt : utilisables côté page comme côté serveur.
 */

/**
 * Date ISO 8601 avec le décalage d'Europe/Paris à cette date — heure d'été
 * ou d'hiver. Sans décalage, `2027-04-24T18:00:00` est ambigu et Google le
 * lit parfois en UTC, soit une heure de décalage sur l'affichage de l'événement.
 */
export function parisIso(date: string, time: string): string {
  const probe = new Date(`${date}T${time}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' })
    .formatToParts(probe)
  const off = (parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+01:00').replace('GMT', '')
  return `${date}T${time}:00${off || '+01:00'}`
}

/** Durée saisie librement (« 1h », « 1h15 », « 45 min ») → minutes, ou null. */
export function durationMinutes(text: string | null | undefined): number | null {
  if (!text) return null
  const h = text.match(/(\d+)\s*h(?:\s*(\d{1,2}))?/i)
  if (h) return Number(h[1]) * 60 + Number(h[2] ?? 0)
  const m = text.match(/(\d+)\s*min/i)
  return m ? Number(m[1]) : null
}

/** Heure de fin ISO, si la durée est exploitable. Un concert ne franchit ni
 *  minuit ni un changement d'heure : simple arithmétique d'horloge locale. */
export function parisEndIso(date: string, time: string, duration: string | null | undefined): string | undefined {
  const minutes = durationMinutes(duration)
  if (!minutes) return undefined
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const end = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  return parisIso(date, end)
}

/**
 * Type schema.org d'un interprète d'après son nom : un ensemble, un chœur ou
 * un orchestre est un groupe ; tout le reste, une personne.
 */
export function performerType(name: string): 'Person' | 'PerformingGroup' {
  return /^(ensemble|ch[oœ]ur|orchestre|quatuor|trio|duo|maîtrise|maitrise|choir)\b/i.test(name.trim())
    ? 'PerformingGroup' : 'Person'
}

/** Coupe une description à ~160 caractères sur un mot entier, pour la balise meta. */
export function metaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30))}…`
}
