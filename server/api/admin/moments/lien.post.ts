import { randomBytes } from 'node:crypto'
import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

/** Régénère le lien privé de candidature : l'ancien cesse de fonctionner aussitôt. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const jeton = randomBytes(24).toString('hex')
  const { error } = await getServiceClient()
    .from('moments_parametres')
    .upsert({ id: 1, jeton_candidature: jeton, updated_at: new Date().toISOString() })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')
  return { lienCandidature: `${siteUrl}/moments-musicaux/candidature/${jeton}` }
})
