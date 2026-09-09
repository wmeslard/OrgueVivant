import { Resend } from 'resend'
import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { concertHtml, newsHtml } from '~/server/utils/newsletterTemplates'
import type { NewsItem } from '~/composables/useNews'
import type { Concert } from '~/composables/useConcerts'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  // `subject` est optionnel : l'espace admin permet de le modifier, sinon on
  // retombe sur le libellé dérivé du titre.
  const { type, data, subject: customSubject } = await readBody<{
    type: 'concert' | 'news'
    data: Concert | NewsItem
    subject?: string
  }>(event)

  if (!type || !data) throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })

  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string

  if (!config.resendApiKey) {
    console.info('[broadcast] Resend non configuré — broadcast ignoré')
    return { ok: true, sent: 0, dev: true }
  }

  const client = getServiceClient()
  const { data: subscribers, error } = await client
    .from('newsletter_subscribers')
    .select('email, token:unsubscribe_token')

  if (error) throw createError({ statusCode: 500, statusMessage: 'Impossible de récupérer les abonnés' })
  if (!subscribers?.length) return { ok: true, sent: 0 }

  const resend = new Resend(config.resendApiKey)
  const from = `Orgue Vivant <${config.contactFrom || 'contact@orguevivant.fr'}>`

  const subject = customSubject?.trim() || (type === 'concert'
    ? `Nouveau concert : ${(data as Concert).title}`
    : `Actualité : ${(data as NewsItem).title}`)

  const emails = subscribers.map(sub => {
    const unsubUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.token}`
    const html = type === 'concert'
      ? concertHtml(data as Concert, unsubUrl, siteUrl)
      : newsHtml(data as NewsItem, unsubUrl, siteUrl)
    return { from, to: sub.email, subject, html }
  })

  // Resend plafonne chaque envoi groupé à 100 destinataires : au-delà, l'appel
  // échouerait en bloc. On découpe donc en lots.
  const BATCH_SIZE = 100
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    await resend.batch.send(emails.slice(i, i + BATCH_SIZE))
  }

  return { ok: true, sent: emails.length }
})
