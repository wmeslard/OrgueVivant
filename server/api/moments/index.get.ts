import { aujourdhuiParis, calendrierPublic } from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

/**
 * Calendrier public des Moments musicaux : séances à venir sur `mois` mois
 * (3 par défaut, 12 au plus). Pas de donnée personnelle au-delà du prénom et
 * de l'initiale de la personne inscrite ; qui l'a inscrite n'en sort pas.
 */
export default defineEventHandler(async (event) => {
  const mois = Math.min(12, Math.max(1, Number(getQuery(event).mois) || 3))
  const du = aujourdhuiParis()
  // La séance du jour disparaît une fois terminée : « Prochaine · aujourd'hui »
  // ne doit pas rester affiché tout l'après-midi.
  const maintenant = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  const seances = (await calendrierPublic(du, plusMois(du, mois))).filter(s => s.date > du || s.fin > maintenant)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return { du, seances }
})
