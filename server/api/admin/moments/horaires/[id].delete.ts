import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { error } = await getServiceClient().from('moments_horaires').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await revalidatePublicPages()
  return { ok: true }
})
