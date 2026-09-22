import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { adresseAssociation, envoyerEmail, escapeHtml, paragraphe } from '~/server/utils/moments'

/**
 * Décision sur une candidature.
 *
 * Acceptée : création (ou réactivation) du compte élève, rôle `eleve`, fiche
 * dans moments_eleves, et email avec le message de l'association et le lien
 * qui permet de définir son mot de passe. Le lien est généré par Supabase mais
 * envoyé par nos soins, pour un message dans nos mots et notre charte.
 *
 * Refusée : email avec le message. La candidature reste consultable six mois.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { decision, message } = await readBody<{ decision?: string; message?: string }>(event)
  if (decision !== 'acceptee' && decision !== 'refusee') throw createError({ statusCode: 400, statusMessage: 'Décision invalide' })
  const texte = typeof message === 'string' ? message.trim().slice(0, 4000) : ''

  const client = getServiceClient()
  const { data: c } = await client.from('moments_candidatures').select('*').eq('id', id).maybeSingle()
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Candidature introuvable' })
  if (c.statut !== 'en_attente') throw createError({ statusCode: 409, statusMessage: 'Candidature déjà traitée' })

  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')

  if (decision === 'refusee') {
    await envoyerEmail({
      to: c.email,
      subject: 'Votre candidature aux Moments musicaux',
      html: `
        <p>Bonjour ${escapeHtml(c.prenom)},</p>
        ${texte ? paragraphe(texte) : '<p>Nous ne pouvons malheureusement pas retenir votre candidature pour le moment. Merci de l\'intérêt que vous portez aux Moments musicaux.</p>'}
        <p>L'équipe d'Orgue Vivant</p>`
    }, { strict: true })
    await client.from('moments_candidatures')
      .update({ statut: 'refusee', message_reponse: texte || null, decided_at: new Date().toISOString() }).eq('id', id)
    return { ok: true }
  }

  // Compte Supabase : invitation pour une adresse nouvelle ; lien de connexion
  // si un compte existe déjà (ancien élève, ou administrateur qui candidate).
  const redirectTo = `${siteUrl}/auth-setup`
  let lien = await client.auth.admin.generateLink({ type: 'invite', email: c.email, options: { redirectTo } })
  if (lien.error) lien = await client.auth.admin.generateLink({ type: 'magiclink', email: c.email, options: { redirectTo } })
  if (lien.error || !lien.data.user) throw createError({ statusCode: 500, statusMessage: lien.error?.message ?? 'Création du compte impossible' })
  const user = lien.data.user
  const meta = (user.app_metadata as Record<string, unknown>) ?? {}
  // Un administrateur garde son rôle : l'espace élève lui est ouvert par sa fiche.
  if (meta.role !== 'admin' && meta.role !== 'super_admin') {
    const { error } = await client.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, role: 'eleve' } })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }
  const { error: errEleve } = await client.from('moments_eleves').upsert({
    id: user.id, candidature_id: c.id, prenom: c.prenom, nom: c.nom, email: c.email, actif: true
  })
  if (errEleve) throw createError({ statusCode: 500, statusMessage: errEleve.message })

  await envoyerEmail({
    to: c.email,
    subject: 'Bienvenue aux Moments musicaux',
    html: `
      <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Candidature retenue</h2>
      <p>Bonjour ${escapeHtml(c.prenom)},</p>
      ${texte ? paragraphe(texte) : '<p>Nous avons le plaisir de retenir votre candidature : vous pourrez jouer lors des Moments musicaux, à l\'orgue de chœur de l\'église Saint-Maurice.</p>'}
      <p>Pour choisir vos dates, activez d'abord votre accès en définissant un mot de passe :</p>
      <p style="margin:22px 0"><a href="${lien.data.properties.action_link}" style="background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Activer mon accès</a></p>
      <p style="font-size:13px;color:#666">Ce lien est personnel et n'est valable que quelques jours. Ensuite, connectez-vous sur <a href="${siteUrl}/moments-musicaux/connexion">${siteUrl}/moments-musicaux/connexion</a> avec votre email et votre mot de passe.</p>
      <p>Une séance dure une demi-heure, de 13 h 15 à 13 h 45, un jour de votre choix hors dimanche. Votre prénom et l'initiale de votre nom seront affichés sur le site et dans l'agenda des Moments musicaux.</p>
      <p>Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
      <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
  }, { strict: true })

  await client.from('moments_candidatures')
    .update({ statut: 'acceptee', message_reponse: texte || null, decided_at: new Date().toISOString() }).eq('id', id)
  return { ok: true, eleve_id: user.id }
})
