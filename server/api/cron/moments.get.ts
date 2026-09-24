import { getServiceClient } from '~/server/utils/superAdminClient'
import { affecterOrganiste } from '~/server/utils/moments'

/**
 * Tâche quotidienne (vercel.json → crons) : affecte Louis-Paul Courtois aux
 * Moments musicaux sans inscrit, deux jours avant, et le prévient par email.
 *
 * Vercel envoie `Authorization: Bearer <CRON_SECRET>` quand la variable
 * CRON_SECRET est définie dans le projet ; elle est alors exigée. Sans elle,
 * l'appel reste sans danger : il ne fait que ce que la règle prévoit, et
 * n'envoie qu'un email par séance.
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (secret && getHeader(event, 'authorization') !== `Bearer ${secret}`)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const envoyes = await affecterOrganiste(getServiceClient())
  return { ok: true, envoyes }
})
