import { Resend } from 'resend'
import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import type { NewsItem } from '~/composables/useNews'
import type { Concert } from '~/composables/useConcerts'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function concertHtml(concert: Concert, unsubscribeUrl: string, siteUrl: string) {
  const date = new Date(`${concert.date}T${concert.time || '20:00'}`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;color:#e5e5e5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a">
        <tr><td style="padding:40px 40px 0">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">Orgue Vivant · Nouveau concert</p>
        </td></tr>
        ${concert.image_url ? `<tr><td style="padding:24px 40px 0"><img src="${escapeHtml(concert.image_url)}" alt="" style="width:100%;height:240px;object-fit:cover;border-radius:8px"></td></tr>` : ''}
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase">${escapeHtml(date)}</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#ffffff;line-height:1.3">${escapeHtml(concert.title)}</h1>
          ${concert.artists ? `<p style="margin:0 0 12px;font-size:14px;color:#999">🎵 ${escapeHtml(concert.artists)}</p>` : ''}
          <p style="margin:0 0 24px;font-size:14px;color:#999">📍 ${concert.location === 'saint_maurice' ? 'Église Saint-Maurice' : 'Église Saint-Étienne'} · ${concert.price_type === 'free' ? 'Entrée libre' : 'Payant'}</p>
          ${concert.description ? `<p style="margin:0 0 32px;font-size:15px;color:#cccccc;line-height:1.7">${escapeHtml(concert.description)}</p>` : ''}
          <a href="${siteUrl}/concerts" style="display:inline-block;padding:14px 28px;background:#c9a84c;color:#000;text-decoration:none;border-radius:100px;font-size:13px;font-weight:600;letter-spacing:1px">Voir le programme</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a">
          <p style="margin:0;font-size:11px;color:#555;text-align:center">
            Orgue Vivant · Concerts d'orgues à Lille<br>
            <a href="${unsubscribeUrl}" style="color:#555;text-decoration:underline">Se désabonner</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function newsHtml(news: NewsItem, unsubscribeUrl: string, siteUrl: string) {
  const date = new Date(news.published_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;color:#e5e5e5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a">
        <tr><td style="padding:40px 40px 0">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">Orgue Vivant · Actualité</p>
        </td></tr>
        ${news.image_url ? `<tr><td style="padding:24px 40px 0"><img src="${escapeHtml(news.image_url)}" alt="" style="width:100%;height:240px;object-fit:cover;border-radius:8px"></td></tr>` : ''}
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase">${escapeHtml(date)}</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#ffffff;line-height:1.3">${escapeHtml(news.title)}</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#cccccc;line-height:1.7;white-space:pre-wrap">${escapeHtml(news.body)}</p>
          <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;background:#c9a84c;color:#000;text-decoration:none;border-radius:100px;font-size:13px;font-weight:600;letter-spacing:1px">Voir le site</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a">
          <p style="margin:0;font-size:11px;color:#555;text-align:center">
            Orgue Vivant · Concerts d'orgues à Lille<br>
            <a href="${unsubscribeUrl}" style="color:#555;text-decoration:underline">Se désabonner</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { type, data } = await readBody<{ type: 'concert' | 'news'; data: Concert | NewsItem }>(event)

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
    .select('email, token')

  if (error) throw createError({ statusCode: 500, statusMessage: 'Impossible de récupérer les abonnés' })
  if (!subscribers?.length) return { ok: true, sent: 0 }

  const resend = new Resend(config.resendApiKey)
  const from = `Orgue Vivant <${config.contactFrom || 'contact@orgue-vivant.fr'}>`

  const subject = type === 'concert'
    ? `Nouveau concert : ${(data as Concert).title}`
    : `Actualité : ${(data as NewsItem).title}`

  const emails = subscribers.map(sub => {
    const unsubUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.token}`
    const html = type === 'concert'
      ? concertHtml(data as Concert, unsubUrl, siteUrl)
      : newsHtml(data as NewsItem, unsubUrl, siteUrl)
    return { from, to: sub.email, subject, html }
  })

  await resend.batch.send(emails)

  return { ok: true, sent: emails.length }
})
