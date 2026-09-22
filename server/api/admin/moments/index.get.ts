import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { aujourdhuiParis, chargerFermetures, chargerHoraires, chargerSeances, cleActuelle } from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

/**
 * Vue d'ensemble de l'onglet Moments musicaux. Contrairement au site public,
 * l'administration voit tout : le nom complet de l'élève, et le professeur qui
 * l'a inscrit.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const [professeurs, fermetures, seances, horaires, cle] = await Promise.all([
    client.from('moments_professeurs').select('*').order('nom'),
    chargerFermetures(client, plusMois(aujourdhui, -1), plusMois(aujourdhui, 12)),
    chargerSeances(client, plusMois(aujourdhui, -3), plusMois(aujourdhui, 12), 'toutes'),
    chargerHoraires(client),
    cleActuelle(client)
  ])
  if (professeurs.error) throw createError({ statusCode: 500, statusMessage: professeurs.error.message })
  // Adresse du déploiement consulté : sur une préversion, le lien y mène.
  const siteUrl = getRequestURL(event).origin
  return {
    aujourdhui,
    professeurs: professeurs.data ?? [],
    fermetures,
    seances,
    horaires,
    // Null tant que moments-musicaux-lien.sql n'est pas appliqué.
    lienProfesseurs: cle ? `${siteUrl}/moments-musicaux/acces/${cle}` : null
  }
})
