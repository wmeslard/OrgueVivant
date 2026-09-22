import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { aujourdhuiParis, chargerFermetures, chargerSeances } from '~/server/utils/moments'
import { plusMois } from '~/utils/moments'

/** Vue d'ensemble pour l'onglet Moments musicaux de l'admin. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const [candidatures, eleves, fermetures, seances, param] = await Promise.all([
    client.from('moments_candidatures').select('*').order('created_at', { ascending: false }),
    client.from('moments_eleves').select('*').order('nom'),
    chargerFermetures(client, plusMois(aujourdhui, -1), plusMois(aujourdhui, 12)),
    chargerSeances(client, plusMois(aujourdhui, -1), plusMois(aujourdhui, 12), 'toutes'),
    client.from('moments_parametres').select('jeton_candidature').eq('id', 1).maybeSingle()
  ])
  for (const r of [candidatures, eleves, param]) if (r.error) throw createError({ statusCode: 500, statusMessage: r.error.message })
  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
  return {
    aujourdhui,
    candidatures: candidatures.data ?? [],
    eleves: eleves.data ?? [],
    fermetures,
    seances,
    lienCandidature: param.data ? `${siteUrl}/moments-musicaux/candidature/${param.data.jeton_candidature}` : null
  }
})
