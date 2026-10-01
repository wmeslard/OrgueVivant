import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { tableCorbeille } from '~/server/utils/corbeille'

/** Sort un concert ou une actualité de la corbeille : il revient sur le site tel quel. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ type?: string; id?: string }>(event)
  const table = tableCorbeille(body?.type)
  if (!body?.id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  const { data, error } = await getServiceClient().from(table)
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', body.id).not('deleted_at', 'is', null).select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'Introuvable : déjà restauré, ou effacé définitivement.' })
  await revalidatePublicPages()
  return { ok: true }
})
