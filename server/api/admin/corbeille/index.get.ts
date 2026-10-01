import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { DELAI_CORBEILLE_JOURS, corbeilleAbsente, tableCorbeille } from '~/server/utils/corbeille'

/** Le contenu de la corbeille d'un type (concerts ou actualités), le plus récent d'abord. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const table = tableCorbeille(getQuery(event).type)
  const date = table === 'concerts' ? 'date' : 'published_at'
  const { data, error } = await getServiceClient().from(table)
    .select(`id, title, ${date}, deleted_at, deleted_by`)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (corbeilleAbsente(error)) return { installee: false, delaiJours: DELAI_CORBEILLE_JOURS, elements: [] }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return {
    installee: true,
    delaiJours: DELAI_CORBEILLE_JOURS,
    elements: (data ?? []).map((r: Record<string, string | null>) => ({
      id: r.id, title: r.title, date: r[date], deleted_at: r.deleted_at, deleted_by: r.deleted_by
    }))
  }
})
