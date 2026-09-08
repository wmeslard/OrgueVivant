import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const client = getServiceClient()
  const { data, error } = await client
    .from('newsletter_subscribers')
    .select('id, email, subscribed_at')
    .order('subscribed_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { count: data?.length ?? 0, subscribers: data ?? [] }
})
