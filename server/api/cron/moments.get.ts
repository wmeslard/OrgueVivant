import { getServiceClient } from '~/server/utils/superAdminClient'
import { envoyerRappels } from '~/server/utils/moments'

/**
 * Tâche quotidienne (vercel.json → crons) : envoie le rappel des séances du
 * lendemain aux personnes inscrites.
 *
 * Vercel envoie `Authorization: Bearer <CRON_SECRET>` quand la variable
 * CRON_SECRET est définie dans le projet ; elle est alors exigée. Sans elle,
 * l'appel reste sans danger : il ne fait que ce que la règle prévoit, et
 * n'envoie chaque email qu'une fois.
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (secret && getHeader(event, 'authorization') !== `Bearer ${secret}`)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const client = getServiceClient()
  const rappels = await envoyerRappels(client)
  return { ok: true, rappels }
})
