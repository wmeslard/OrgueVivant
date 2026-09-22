import { getServiceClient } from '~/server/utils/superAdminClient'
import {
  aujourdhuiParis, chargerHoraires, chargerSeances, marquerConnexion, requireProfesseur
} from '~/server/utils/moments'
import { HORIZON_MOIS, nomPublic, plusMois } from '~/utils/moments'

/**
 * Tout ce dont l'espace du professeur a besoin en une requête : les horaires
 * de l'orgue (règles par défaut et temporaires), les créneaux déjà pris (avec
 * le seul prénom de l'élève) et ses propres inscriptions.
 */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const client = getServiceClient()
  const du = aujourdhuiParis()
  const au = plusMois(du, HORIZON_MOIS)
  const [horaires, seances, miennes] = await Promise.all([
    chargerHoraires(client),
    chargerSeances(client, du, au),
    client.from('moments_seances').select('*').eq('professeur_id', prof.id)
      .order('date', { ascending: false }).order('heure_debut').limit(80),
    marquerConnexion(client, prof.id)
  ])
  if (miennes.error) throw createError({ statusCode: 500, statusMessage: miennes.error.message })
  return {
    aujourdhui: du,
    horizon: au,
    professeur: { prenom: prof.prenom, nom: prof.nom, email: prof.email },
    horaires,
    pris: seances.map(s => ({
      date: s.date,
      heure_debut: s.heure_debut.slice(0, 5),
      interprete: nomPublic(s.eleve_prenom, s.eleve_nom),
      mien: s.professeur_id === prof.id
    })),
    mesSeances: miennes.data ?? []
  }
})
