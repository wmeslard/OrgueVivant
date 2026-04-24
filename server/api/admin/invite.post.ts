import { requireSuperAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const { email } = await readBody<{ email: string }>(event)

  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email))
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string
  const client = getServiceClient()

  const { error } = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth-setup`
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
