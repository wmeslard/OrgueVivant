import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'

/** Ajout d'une ligne à l'emploi du temps hebdomadaire de l'orgue. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const b = await readBody<{ jour_semaine?: number; type?: string; heure_debut?: string; heure_fin?: string; motif?: string }>(event)
  const jour = Number(b?.jour_semaine)
  if (!Number.isInteger(jour) || jour < 0 || jour > 6) throw createError({ statusCode: 400, statusMessage: 'Jour invalide' })
  if (b?.type !== 'ouverture' && b?.type !== 'blocage') throw createError({ statusCode: 400, statusMessage: 'Type invalide' })
  const debut = String(b?.heure_debut ?? ''); const fin = String(b?.heure_fin ?? '')
  if (!/^\d{2}:\d{2}$/.test(debut) || !/^\d{2}:\d{2}$/.test(fin) || fin <= debut)
    throw createError({ statusCode: 400, statusMessage: 'Heures invalides' })

  const { data, error } = await getServiceClient().from('moments_horaires')
    .insert({ jour_semaine: jour, type: b.type, heure_debut: debut, heure_fin: fin, motif: (b?.motif ?? '').trim().slice(0, 200) || null })
    .select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await revalidatePublicPages()
  return data
})
