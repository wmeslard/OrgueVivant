import { getServiceClient } from '~/server/utils/superAdminClient'
import {
  aujourdhuiParis, chargerAffectations, chargerHoraires, chargerSeances, marquerConnexion, requireProfesseur
} from '~/server/utils/moments'
import { HORIZON_MOIS, musiciensDe, nomsPublics, plusMois } from '~/utils/moments'

/**
 * Tout ce dont l'espace d'inscription a besoin en une requête : les horaires
 * de l'orgue (règles par défaut et temporaires), les créneaux déjà pris (avec
 * les seuls prénoms), les jeudis où Louis-Paul Courtois est affecté, et ses
 * propres inscriptions.
 */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const client = getServiceClient()
  const du = aujourdhuiParis()
  const au = plusMois(du, HORIZON_MOIS)
  const [horaires, seances, affectations, miennes] = await Promise.all([
    chargerHoraires(client),
    chargerSeances(client, du, au),
    chargerAffectations(client, du, au),
    client.from('moments_seances').select('*').eq('professeur_id', prof.id)
      .order('date', { ascending: false }).order('heure_debut').limit(80),
    marquerConnexion(client, prof.id)
  ])
  if (miennes.error) throw createError({ statusCode: 500, statusMessage: miennes.error.message })
  return {
    aujourdhui: du,
    horizon: au,
    professeur: { prenom: prof.prenom, nom: prof.nom, email: prof.email, conservatoire: prof.conservatoire },
    horaires,
    pris: seances.map(s => ({
      date: s.date,
      heure_debut: s.heure_debut.slice(0, 5),
      interprete: nomsPublics(musiciensDe(s)),
      mien: s.professeur_id === prof.id
    })),
    affectes: affectations.map(a => a.date),
    mesSeances: miennes.data ?? []
  }
})
