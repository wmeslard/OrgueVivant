import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis } from '~/server/utils/moments'

/** Activation / désactivation d'un élève. Désactiver annule ses séances à venir. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { actif } = await readBody<{ actif?: boolean }>(event)
  if (typeof actif !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Valeur invalide' })
  const client = getServiceClient()
  const { error } = await client.from('moments_eleves').update({ actif }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!actif) {
    await client.from('moments_seances')
      .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() })
      .eq('eleve_id', id).eq('statut', 'reservee').gte('date', aujourdhuiParis())
    await revalidatePublicPages()
  }
  return { ok: true }
})
