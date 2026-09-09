import { requireAdmin } from '~/server/utils/superAdminClient'
import { concertHtml, newsHtml } from '~/server/utils/newsletterTemplates'
import type { NewsItem } from '~/composables/useNews'
import type { Concert } from '~/composables/useConcerts'

/**
 * Rend l'email tel qu'il sera envoyé, à partir des champs édités dans l'admin.
 * Le même module de gabarits que la diffusion est utilisé : ce qui est
 * prévisualisé est donc exactement ce qui partira.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { type, data } = await readBody<{
    type: 'concert' | 'news'
    data: Concert | NewsItem
  }>(event)

  if (!type || !data) throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })

  const siteUrl = useRuntimeConfig().public.siteUrl as string
  // Lien de désinscription factice : la prévisualisation ne cible aucun abonné.
  const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=apercu`

  const html = type === 'concert'
    ? concertHtml(data as Concert, unsubscribeUrl, siteUrl)
    : newsHtml(data as NewsItem, unsubscribeUrl, siteUrl)

  return { html }
})
