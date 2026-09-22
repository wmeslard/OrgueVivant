import { aujourdhuiParis, calendrierPublic } from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

/**
 * Calendrier public des Moments musicaux : séances du titulaire et des
 * élèves, à venir, sur `mois` mois (3 par défaut, 12 au plus). Pas de donnée
 * personnelle au-delà du prénom et de l'initiale.
 */
export default defineEventHandler(async (event) => {
  const mois = Math.min(12, Math.max(1, Number(getQuery(event).mois) || 3))
  const du = aujourdhuiParis()
  const seances = await calendrierPublic(du, plusMois(du, mois))
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return { du, seances }
})
