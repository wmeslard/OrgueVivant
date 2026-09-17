import { Resend } from 'resend'
import { senderAddress } from '~/server/utils/sender'
import { verifyFormToken } from '~/server/utils/formToken'

// Limite par adresse IP, en mémoire : chaque instance Vercel a la sienne, c'est
// un filet de sécurité, pas une garantie. Le jeton signé, lui, tient partout.
const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 3_600_000
const MAX_PER_WINDOW = 5

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeHeader = (s: string) => s.replace(/[\r\n]/g, ' ').trim()

export default defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS })
  } else {
    if (entry.count >= MAX_PER_WINDOW)
      throw createError({ statusCode: 429, statusMessage: 'Trop de messages, réessayez plus tard.' })
    entry.count++
  }

  const body = await readBody<{ name?: string; email?: string; message?: string; token?: string; website?: string }>(event)

  // Pot de miel rempli : un robot. On répond comme si tout allait bien.
  if (body?.website) return { ok: true }
  // Jeton émis à l'affichage du formulaire (voir server/utils/formToken.ts).
  if (!verifyFormToken(body?.token))
    throw createError({ statusCode: 400, statusMessage: 'Formulaire expiré, rechargez la page.' })

  const name = body?.name?.trim()
  const email = body?.email?.trim()
  const message = body?.message?.trim()

  if (!name || !email || !message)
    throw createError({ statusCode: 400, statusMessage: 'Champs manquants' })

  if (name.length > 100)
    throw createError({ statusCode: 400, statusMessage: 'Nom trop long' })

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  if (message.length > 5000)
    throw createError({ statusCode: 400, statusMessage: 'Message trop long' })

  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    console.info('[contact] Resend non configuré — message reçu :', { name, email, message })
    return { ok: true, dev: true }
  }

  const resend = new Resend(config.resendApiKey)

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message)

  // Le SDK Resend ne lève pas d'exception quand l'API refuse l'envoi : le
  // refus arrive dans `error`, qu'il faut lire pour ne pas répondre « envoyé ».
  const { error: sendError } = await resend.emails.send({
    from: senderAddress(),
    to: config.contactTo || 'contact@orguevivant.fr',
    replyTo: `${sanitizeHeader(name)} <${sanitizeHeader(email)}>`,
    subject: `[Orgue Vivant] Message de ${sanitizeHeader(name)}`,
    html: `
      <p><strong>De :</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <hr/>
      <pre style="font-family:inherit;white-space:pre-wrap">${safeMessage}</pre>
    `
  }).catch(e => ({ error: e }))
  if (sendError) {
    console.error('[contact] envoi refusé :', sendError)
    throw createError({ statusCode: 500, statusMessage: 'Envoi du message impossible, réessayez plus tard.' })
  }

  return { ok: true }
})
