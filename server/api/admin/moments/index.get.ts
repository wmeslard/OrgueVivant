import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import {
  aujourdhuiParis, chargerAffectations, chargerHoraires, chargerSeances, cleActuelle, emailOrganiste
} from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

/**
 * Vue d'ensemble de l'onglet Moments musicaux. Contrairement au site public,
 * l'administration voit tout : les noms complets, qui a inscrit, et les
 * jeudis où Louis-Paul Courtois est affecté.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const [professeurs, seances, horaires, cle, affectations, email] = await Promise.all([
    client.from('moments_professeurs').select('*').order('nom'),
    chargerSeances(client, plusMois(aujourdhui, -3), plusMois(aujourdhui, 12), 'toutes'),
    chargerHoraires(client),
    cleActuelle(client),
    chargerAffectations(client, aujourdhui, plusMois(aujourdhui, 12)),
    emailOrganiste(client)
  ])
  if (professeurs.error) throw createError({ statusCode: 500, statusMessage: professeurs.error.message })
  // Adresse du déploiement consulté : sur une préversion, le lien y mène.
  const siteUrl = getRequestURL(event).origin
  return {
    aujourdhui,
    professeurs: professeurs.data ?? [],
    seances,
    horaires,
    affectations,
    emailOrganiste: email,
    // Null tant que moments-musicaux-lien.sql n'est pas appliqué.
    lienProfesseurs: cle ? `${siteUrl}/moments-musicaux/acces/${cle}` : null
  }
})
