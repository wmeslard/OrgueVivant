import { requireSuperAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  const me = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })

  const client = getServiceClient()
  const { error } = await client.auth.admin.deleteUser(id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})
