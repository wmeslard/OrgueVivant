/**
 * Aides pour les données structurées d'un concert (schema.org/MusicEvent).
 * Sans dépendance à Nuxt : utilisables côté page comme côté serveur.
 */
import { artistList } from './artists'
import { venues } from './venues'

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

/**
 * Durée retenue quand elle n'est pas renseignée : les concerts du festival
 * durent entre une heure et une heure et demie. Google recommande une heure
 * de fin sur chaque événement ; l'estimation vaut mieux qu'une absence, qui
 * est signalée dans la Search Console.
 */
export const DEFAULT_DURATION_MINUTES = 90

/** Heure de fin ISO, d'après la durée saisie ou, à défaut, la durée par défaut.
 *  Un concert ne franchit ni minuit ni un changement d'heure : simple
 *  arithmétique d'horloge locale. */
export function parisEndIso(date: string, time: string, duration: string | null | undefined): string {
  const minutes = durationMinutes(duration) ?? DEFAULT_DURATION_MINUTES
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

/** Ce que la page fournit au bloc MusicEvent : textes dans la langue affichée et URL absolues. */
export interface MusicEventContext {
  siteUrl: string
  /** Adresse de la fiche du concert. */
  url: string
  name: string
  description: string
  /** Illustration, URL absolue (celle du concert ou son illustration par défaut). */
  image: string
  /** Billetterie si elle existe, sinon la fiche. */
  offerUrl: string
}

/** Champs du concert dont dépendent les données structurées. */
export interface MusicEventSource {
  date: string
  time: string
  duration?: string | null
  location: keyof typeof venues
  artists: unknown
  price_type: 'free' | 'paid'
}

/**
 * Bloc schema.org/MusicEvent complet d'un concert, commun à la fiche et à la
 * liste des concerts : les deux pages décrivent le même événement, Google
 * attend les mêmes champs (heure de fin, interprètes, offre, image,
 * description) sur chacune.
 */
export function musicEventJsonLd(c: MusicEventSource, ctx: MusicEventContext) {
  const venue = venues[c.location] ?? venues.saint_maurice
  const time = c.time || '20:00'
  const performer = artistList(c.artists).map(a => ({ '@type': performerType(a.name), name: a.name }))
  return {
    '@type': 'MusicEvent',
    name: ctx.name,
    startDate: parisIso(c.date, time),
    endDate: parisEndIso(c.date, time, c.duration),
    location: {
      '@type': 'Place',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.streetAddress,
        postalCode: venue.postalCode,
        addressLocality: 'Lille',
        addressCountry: 'FR'
      },
      geo: { '@type': 'GeoCoordinates', latitude: venue.latitude, longitude: venue.longitude }
    },
    // Sans interprète connu, l'association elle-même : Google exige le champ.
    performer: performer.length ? performer : [{ '@type': 'Organization', name: 'Orgue Vivant', url: ctx.siteUrl }],
    organizer: { '@type': 'Organization', name: 'Orgue Vivant', url: ctx.siteUrl },
    isAccessibleForFree: c.price_type === 'free',
    // Entrée libre = offre gratuite ; sinon le prix n'est pas connu du site,
    // on renvoie vers la billetterie si un lien existe.
    offers: {
      '@type': 'Offer',
      ...(c.price_type === 'free' && { price: 0, priceCurrency: 'EUR' }),
      availability: 'https://schema.org/InStock',
      url: ctx.offerUrl
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: ctx.image,
    description: ctx.description,
    url: ctx.url
  }
}
