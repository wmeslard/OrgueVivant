import { getServiceClient } from '~/server/utils/superAdminClient'
import { sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)

  if (!token || typeof token !== 'string' || token.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Token invalide' })
  }

  const client = getServiceClient()

  const { error } = await client
    .from('newsletter_subscribers')
    .delete()
    .eq('token', token)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la désinscription' })

  return sendRedirect(event, '/?unsubscribed=1', 302)
})
