import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { mettreALaCorbeille } from '~/server/utils/corbeille'

/** Met l'actualité à la corbeille : elle quitte le site, restaurable trente jours. */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  await mettreALaCorbeille(getServiceClient(), 'news', id, user.email)
  await revalidatePublicPages()
  return { ok: true }
})
