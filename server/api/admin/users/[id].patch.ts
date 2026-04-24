import { requireSuperAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  const me = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  if (id === me.id) throw createError({ statusCode: 400, statusMessage: 'Cannot change your own role' })

  const { role } = await readBody<{ role: string | null }>(event)
  const allowed = [null, 'admin', 'super_admin']
  if (!allowed.includes(role)) throw createError({ statusCode: 400, statusMessage: 'Invalid role' })

  const client = getServiceClient()
  const { data: existing } = await client.auth.admin.getUserById(id)
  const currentMeta = (existing?.user?.app_metadata as Record<string, unknown>) ?? {}

  const { error } = await client.auth.admin.updateUserById(id, {
    app_metadata: { ...currentMeta, role: role ?? undefined }
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})
