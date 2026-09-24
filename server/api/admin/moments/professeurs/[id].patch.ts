import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis, modifierProfesseur, type Professeur } from '~/server/utils/moments'

/**
 * Fiche d'un professeur : coordonnées, ou activation / désactivation.
 * Désactiver annule les séances à venir de ses élèves.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const client = getServiceClient()

  if (body.actif === undefined) {
    const { data: prof } = await client.from('moments_professeurs').select('*').eq('id', id).maybeSingle()
    if (!prof) throw createError({ statusCode: 404, statusMessage: 'Professeur introuvable' })
    await modifierProfesseur(client, prof as Professeur, body)
    return { ok: true }
  }

  const { actif } = body
  if (typeof actif !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Valeur invalide' })
  const { error } = await client.from('moments_professeurs').update({ actif }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!actif) {
    await client.from('moments_seances')
      .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() })
      .eq('professeur_id', id).eq('statut', 'reservee').gte('date', aujourdhuiParis())
    await revalidatePublicPages()
  }
  return { ok: true }
})
