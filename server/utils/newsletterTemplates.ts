import type { NewsItem } from '~/composables/useNews'
import type { Concert } from '~/composables/useConcerts'
import { artistNames } from '~/utils/artists'

/**
 * Gabarits des emails du site (confirmation d'inscription, concert, actualité).
 *
 * Extraits du point d'entrée de diffusion pour que la prévisualisation de
 * l'espace admin rende exactement le même HTML que ce qui part réellement :
 * deux implémentations auraient fini par diverger.
 *
 * Tous partagent le même châssis, aux couleurs et polices de la charte. Les
 * polices viennent de Google Fonts : Apple Mail, iOS et la plupart des clients
 * les affichent ; Gmail et Outlook retombent sur Georgia et Helvetica, cités
 * en repli. Les visuels sont affichés en entier, à largeur fixe et hauteur
 * automatique : `object-fit` n'est pas supporté par Outlook, et un recadrage
 * en bandeau amputait les affiches, qui sont au format 4:5.
 */

const BG = '#0B0B0C'
const CARD = '#121214'
const LINE = '#26262a'
const TEXT = '#F6F2EA'
const MUTED = '#B8B5AE'
const FAINT = '#7c7a75'
const GOLD = '#C6A56A'
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
const SANS = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=Inter:wght@400;500;600&display=swap'

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

/* Briques, dans l'ordre où elles apparaissent dans un email. */

const overline = (text: string) =>
  `<p style="margin:0 0 20px;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:${GOLD}">${text}</p>`

const visual = (url: string) =>
  `<img src="${escapeHtml(url)}" alt="" width="280" style="width:280px;max-width:100%;height:auto;border-radius:12px;display:block;margin:0 auto 32px">`

const dateLine = (text: string) =>
  `<p style="margin:0 0 14px;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${GOLD}">${escapeHtml(text)}</p>`

const title = (text: string) =>
  `<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:32px;font-weight:300;line-height:1.2;letter-spacing:-0.01em;color:${TEXT}">${escapeHtml(text)}</h1>`

const detail = (html: string) =>
  `<p style="margin:0 0 8px;font-family:${SANS};font-size:14px;line-height:1.6;color:${MUTED}">${html}</p>`

const paragraph = (html: string, margin = '0 0 32px') =>
  `<p style="margin:${margin};font-family:${SANS};font-size:15px;line-height:1.7;color:${MUTED}">${html}</p>`

/** Bouton principal du site : pilule crème, texte sombre. */
const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:17px 30px;background:${TEXT};color:${BG};text-decoration:none;border-radius:100px;font-family:${SANS};font-size:15px;font-weight:500;line-height:20px">${label}</a>`

const small = (html: string) =>
  `<p style="margin:28px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${FAINT}">${html}</p>`

/**
 * Châssis commun : fond sombre, carte centrée, logo, contenu, pied de page.
 * `preheader` est le texte d'aperçu affiché par les clients à côté du sujet.
 */
function shell(opts: { subject: string; preheader: string; content: string; footer: string; siteUrl: string }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(opts.subject)}</title>
  <!--[if !mso]><!--><link href="${FONTS_URL}" rel="stylesheet"><!--<![endif]-->
  <style>
    @import url('${FONTS_URL}');
    body { margin:0; padding:0; background:${BG}; }
    @media (max-width:620px) { .pad { padding-left:24px !important; padding-right:24px !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background:${BG}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${LINE};border-radius:24px">
        <tr><td align="center" style="padding:40px 40px 0">
          <a href="${opts.siteUrl}" style="text-decoration:none"><img src="${opts.siteUrl}/img/logo/horizontal-dore-600.png" alt="Orgue Vivant" width="200" style="width:200px;max-width:60%;height:auto;display:block;margin:0 auto"></a>
        </td></tr>
        <tr><td class="pad" style="padding:40px 40px 44px">
          ${opts.content}
        </td></tr>
        <tr><td class="pad" style="padding:24px 40px 32px;border-top:1px solid ${LINE}">
          <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.8;letter-spacing:0.02em;text-align:center;color:${FAINT}">
            ${opts.footer}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const footerLink = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="color:${FAINT};text-decoration:underline">${label}</a>`

const ADDRESS = 'Association Orgue Vivant · Concerts d\'orgue à Lille<br>19 Parvis Saint-Maurice, 59800 Lille'

export function concertHtml(concert: Concert, unsubscribeUrl: string, siteUrl: string) {
  const date = new Date(`${concert.date}T${concert.time || '20:00'}`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const artists = artistNames(concert.artists)
  const venue = concert.location === 'saint_maurice' ? 'Église Saint-Maurice' : 'Église Saint-Étienne'
  const price = concert.price_type === 'free' ? 'Entrée libre — participation libre' : 'Payant'
  const url = concert.id ? `${siteUrl}/concerts/${concert.id}` : `${siteUrl}/concerts`
  return shell({
    subject: concert.title,
    preheader: `${date} · ${venue}`,
    siteUrl,
    content: [
      overline('Nouveau concert'),
      concert.image_url ? visual(concert.image_url) : '',
      dateLine(date),
      title(concert.title),
      artists ? detail(`Avec ${escapeHtml(artists)}`) : '',
      detail(`${venue} · ${price}`),
      concert.description ? paragraph(escapeHtmlWithBreaks(concert.description), '24px 0 32px') : '<div style="height:24px"></div>',
      button(url, 'Voir le concert')
    ].join('\n'),
    footer: `${ADDRESS}<br>${footerLink(unsubscribeUrl, 'Se désabonner')}`
  })
}

export function newsHtml(news: NewsItem, unsubscribeUrl: string, siteUrl: string) {
  const date = new Date(news.published_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  return shell({
    subject: news.title,
    preheader: news.body.slice(0, 140),
    siteUrl,
    content: [
      overline('Actualité'),
      news.image_url ? visual(news.image_url) : '',
      dateLine(date),
      title(news.title),
      paragraph(escapeHtmlWithBreaks(news.body)),
      button(siteUrl, 'Voir le site')
    ].join('\n'),
    footer: `${ADDRESS}<br>${footerLink(unsubscribeUrl, 'Se désabonner')}`
  })
}

/** Email de confirmation d'inscription : un seul bouton, le lien en clair dessous. */
export function confirmHtml(confirmUrl: string, siteUrl: string) {
  const url = escapeHtml(confirmUrl)
  return shell({
    subject: 'Confirmez votre inscription à la newsletter',
    preheader: 'Un clic pour recevoir les dates des concerts, les artistes et les actualités du festival.',
    siteUrl,
    content: [
      overline('Newsletter'),
      title('Confirmez votre inscription'),
      paragraph('Un clic, et vous recevrez les dates des concerts, les artistes et les actualités du festival. Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement ce message : rien ne sera envoyé.'),
      button(confirmUrl, 'Confirmer mon inscription'),
      small(`Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${url}" style="color:${GOLD};word-break:break-all">${url}</a>`)
    ].join('\n'),
    footer: `${ADDRESS}<br>${footerLink(siteUrl, 'orguevivant.fr')}`
  })
}
