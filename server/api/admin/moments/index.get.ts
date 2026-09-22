import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { aujourdhuiParis, chargerFermetures, chargerHoraires, chargerSeances } from '~/server/utils/moments'
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
  const [demandes, professeurs, fermetures, seances, horaires] = await Promise.all([
    client.from('moments_demandes').select('*').order('created_at', { ascending: false }),
    client.from('moments_professeurs').select('*').order('nom'),
    chargerFermetures(client, plusMois(aujourdhui, -1), plusMois(aujourdhui, 12)),
    chargerSeances(client, plusMois(aujourdhui, -3), plusMois(aujourdhui, 12), 'toutes'),
    chargerHoraires(client)
  ])
  for (const r of [demandes, professeurs]) if (r.error) throw createError({ statusCode: 500, statusMessage: r.error.message })
  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
  return {
    aujourdhui,
    demandes: demandes.data ?? [],
    professeurs: professeurs.data ?? [],
    fermetures,
    seances,
    horaires,
    lienProfesseurs: `${siteUrl}/moments-musicaux/professeurs`
  }
})
