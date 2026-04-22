import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; email?: string; message?: string }>(event)

  const name = body?.name?.trim()
  const email = body?.email?.trim()
  const message = body?.message?.trim()

  if (!name || !email || !message)
    throw createError({ statusCode: 400, statusMessage: 'Champs manquants' })

  if (!/^\S+@\S+\.\S+$/.test(email))
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  if (message.length > 5000)
    throw createError({ statusCode: 400, statusMessage: 'Message trop long' })

  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    console.info('[contact] Resend non configuré — message reçu :', { name, email, message })
    return { ok: true, dev: true }
  }

  const resend = new Resend(config.resendApiKey)

  await resend.emails.send({
    from: `Orgue Vivant <${config.contactFrom || 'contact@orgue-vivant.fr'}>`,
    to: config.contactTo || 'contact@orgue-vivant.fr',
    replyTo: `${name} <${email}>`,
    subject: `[Orgue Vivant] Message de ${name}`,
    html: `
      <p><strong>De :</strong> ${name} &lt;${email}&gt;</p>
      <hr/>
      <pre style="font-family:inherit;white-space:pre-wrap">${message}</pre>
    `
  })

  return { ok: true }
})
