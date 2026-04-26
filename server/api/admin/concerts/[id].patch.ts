import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  const { id: _id, created_at, ...body } = await readBody(event)

  const client = getServiceClient()
  const { error } = await client.from('concerts').update(body).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
