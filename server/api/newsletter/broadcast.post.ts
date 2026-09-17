import { Resend } from 'resend'
import { senderAddress } from '~/server/utils/sender'
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
    .not('confirmed_at', 'is', null)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Impossible de récupérer les abonnés' })
  if (!subscribers?.length) return { ok: true, sent: 0 }

  const resend = new Resend(config.resendApiKey)
  const from = senderAddress()

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
  // Le SDK ne lève pas d'exception sur un refus de l'API : on lit `error`.
  const BATCH_SIZE = 100
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const { error: sendError } = await resend.batch.send(emails.slice(i, i + BATCH_SIZE)).catch(e => ({ error: e }))
    if (sendError) {
      console.error(`[newsletter] envoi refusé à partir du destinataire ${i + 1} :`, sendError)
      throw createError({ statusCode: 502, statusMessage: `Envoi refusé par Resend après ${i} destinataire(s) : ${sendError.message || 'erreur inconnue'}` })
    }
  }

  return { ok: true, sent: emails.length }
})
