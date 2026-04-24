import { requireSuperAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const client = getServiceClient()

  const { data, error } = await client.auth.admin.listUsers({ perPage: 200 })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data.users.map(u => ({
    id: u.id,
    email: u.email,
    role: (u.app_metadata as Record<string, unknown>)?.role ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at
  }))
})
