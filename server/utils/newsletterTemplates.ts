import type { NewsItem } from '~/composables/useNews'
import type { Concert } from '~/composables/useConcerts'
import { artistNames } from '~/utils/artists'

/**
 * Gabarits des emails de la newsletter.
 *
 * Extraits du point d'entrée de diffusion pour que la prévisualisation de
 * l'espace admin rende exactement le même HTML que ce qui part réellement :
 * deux implémentations auraient fini par diverger.
 *
 * Les visuels sont affichés en entier, à largeur fixe et hauteur automatique :
 * `object-fit` n'est pas supporté par Outlook, et un recadrage en bandeau
 * amputait les affiches, qui sont au format 4:5.
 */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Échappe le texte puis convertit les sauts de ligne en <br>.
 * `white-space: pre-wrap` serait plus simple mais Outlook, qui utilise le
 * moteur de rendu de Word, ne le gère pas : les paragraphes y arrivaient
 * collés d'un seul bloc.
 */
function escapeHtmlWithBreaks(s: string) {
  return escapeHtml(s).replace(/\r\n|\r|\n/g, '<br>')
}

export function concertHtml(concert: Concert, unsubscribeUrl: string, siteUrl: string) {
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
        <tr><td align="center" style="padding:36px 40px 8px">
          <img src="${siteUrl}/img/logo/horizontal-dore-600.png" alt="Orgue Vivant" width="200" style="width:200px;max-width:60%;height:auto;display:block;margin:0 auto">
        </td></tr>
        <tr><td style="padding:16px 40px 0">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">Nouveau concert</p>
        </td></tr>
        ${concert.image_url ? `<tr><td align="center" style="padding:28px 40px 0"><img src="${escapeHtml(concert.image_url)}" alt="" width="280" style="width:280px;max-width:100%;height:auto;border-radius:8px;display:block"></td></tr>` : ''}
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase">${escapeHtml(date)}</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#ffffff;line-height:1.3">${escapeHtml(concert.title)}</h1>
          ${artistNames(concert.artists) ? `<p style="margin:0 0 12px;font-size:14px;color:#999">🎵 ${escapeHtml(artistNames(concert.artists))}</p>` : ''}
          <p style="margin:0 0 24px;font-size:14px;color:#999">📍 ${concert.location === 'saint_maurice' ? 'Église Saint-Maurice' : 'Église Saint-Étienne'} · ${concert.price_type === 'free' ? 'Entrée libre' : 'Payant'}</p>
          ${concert.description ? `<p style="margin:0 0 32px;font-size:15px;color:#cccccc;line-height:1.7">${escapeHtmlWithBreaks(concert.description)}</p>` : ''}
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

export function newsHtml(news: NewsItem, unsubscribeUrl: string, siteUrl: string) {
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
        <tr><td align="center" style="padding:36px 40px 8px">
          <img src="${siteUrl}/img/logo/horizontal-dore-600.png" alt="Orgue Vivant" width="200" style="width:200px;max-width:60%;height:auto;display:block;margin:0 auto">
        </td></tr>
        <tr><td style="padding:16px 40px 0">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">Actualité</p>
        </td></tr>
        ${news.image_url ? `<tr><td align="center" style="padding:28px 40px 0"><img src="${escapeHtml(news.image_url)}" alt="" width="280" style="width:280px;max-width:100%;height:auto;border-radius:8px;display:block"></td></tr>` : ''}
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase">${escapeHtml(date)}</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:300;color:#ffffff;line-height:1.3">${escapeHtml(news.title)}</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#cccccc;line-height:1.7">${escapeHtmlWithBreaks(news.body)}</p>
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
