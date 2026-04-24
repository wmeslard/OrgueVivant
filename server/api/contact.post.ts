import { Resend } from 'resend'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeHeader = (s: string) => s.replace(/[\r\n]/g, ' ').trim()

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; email?: string; message?: string }>(event)

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

  await resend.emails.send({
    from: `Orgue Vivant <${config.contactFrom || 'contact@orgue-vivant.fr'}>`,
    to: config.contactTo || 'contact@orgue-vivant.fr',
    replyTo: `${sanitizeHeader(name)} <${sanitizeHeader(email)}>`,
    subject: `[Orgue Vivant] Message de ${sanitizeHeader(name)}`,
    html: `
      <p><strong>De :</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <hr/>
      <pre style="font-family:inherit;white-space:pre-wrap">${safeMessage}</pre>
    `
  })

  return { ok: true }
})
