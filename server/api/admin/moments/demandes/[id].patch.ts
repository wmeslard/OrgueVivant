import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { adresseAssociation, envoyerEmail, escapeHtml, paragraphe } from '~/server/utils/moments'

/**
 * Décision sur une demande d'accès.
 *
 * Acceptée : création (ou réactivation) du compte professeur, rôle
 * `professeur`, fiche dans moments_professeurs, et email contenant le lien
 * qui ouvre l'accès. Le lien est produit par Supabase mais envoyé par nos
 * soins, pour un message dans nos mots et notre charte.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { decision, message } = await readBody<{ decision?: string; message?: string }>(event)
  if (decision !== 'acceptee' && decision !== 'refusee') throw createError({ statusCode: 400, statusMessage: 'Décision invalide' })
  const texte = typeof message === 'string' ? message.trim().slice(0, 4000) : ''

  const client = getServiceClient()
  const { data: d } = await client.from('moments_demandes').select('*').eq('id', id).maybeSingle()
  if (!d) throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  if (d.statut !== 'en_attente') throw createError({ statusCode: 409, statusMessage: 'Demande déjà traitée' })

  const siteUrl = (useRuntimeConfig().public.siteUrl as string).replace(/\/$/, '')

  if (decision === 'refusee') {
    await envoyerEmail({
      to: d.email,
      subject: 'Votre demande d\'accès aux Moments musicaux',
      html: `
        <p>Bonjour ${escapeHtml(d.prenom)},</p>
        ${texte ? paragraphe(texte) : '<p>Nous ne pouvons malheureusement pas donner suite à votre demande pour le moment. Merci de l\'intérêt que vous portez aux Moments musicaux.</p>'}
        <p>L'équipe d'Orgue Vivant</p>`
    }, { strict: true })
    await client.from('moments_demandes')
      .update({ statut: 'refusee', message_reponse: texte || null, decided_at: new Date().toISOString() }).eq('id', id)
    return { ok: true }
  }

  // Invitation pour une adresse nouvelle ; lien de connexion si le compte existe
  // déjà (ancien professeur, ou administrateur qui enseigne aussi).
  const redirectTo = `${siteUrl}/moments-musicaux/espace`
  let lien = await client.auth.admin.generateLink({ type: 'invite', email: d.email, options: { redirectTo } })
  if (lien.error) lien = await client.auth.admin.generateLink({ type: 'magiclink', email: d.email, options: { redirectTo } })
  if (lien.error || !lien.data.user) throw createError({ statusCode: 500, statusMessage: lien.error?.message ?? 'Création du compte impossible' })
  const user = lien.data.user
  const meta = (user.app_metadata as Record<string, unknown>) ?? {}
  // Un administrateur garde son rôle : sa fiche lui ouvre l'espace professeur.
  if (meta.role !== 'admin' && meta.role !== 'super_admin') {
    const { error } = await client.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, role: 'professeur' } })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }
  const { error: errProf } = await client.from('moments_professeurs').upsert({
    id: user.id, demande_id: d.id, prenom: d.prenom, nom: d.nom, email: d.email,
    conservatoire: d.conservatoire, actif: true
  })
  if (errProf) throw createError({ statusCode: 500, statusMessage: errProf.message })

  await envoyerEmail({
    to: d.email,
    subject: 'Votre accès aux Moments musicaux est ouvert',
    html: `
      <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Bienvenue, ${escapeHtml(d.prenom)}</h2>
      ${texte ? paragraphe(texte) : '<p>Votre accès à l\'espace des professeurs est ouvert : vous pouvez désormais inscrire vos élèves aux Moments musicaux, à l\'orgue de chœur de l\'église Saint-Maurice.</p>'}
      <p style="margin:22px 0"><a href="${lien.data.properties.action_link}" style="background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Ouvrir mon espace</a></p>
      <p style="font-size:13px;color:#666">Ce lien est personnel. Par la suite, connectez-vous sur <a href="${siteUrl}/moments-musicaux/espace">${siteUrl}/moments-musicaux/espace</a> : vous pourrez recevoir un lien de connexion par email, ou définir un mot de passe depuis votre espace.</p>
      <p>Vous choisissez un créneau libre dans le calendrier, vous indiquez le prénom et le nom de l'élève, et c'est inscrit. Le site annonce la séance au nom de « Prénom N. ».</p>
      <p>Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
      <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
  }, { strict: true })

  await client.from('moments_demandes')
    .update({ statut: 'acceptee', message_reponse: texte || null, decided_at: new Date().toISOString() }).eq('id', id)
  return { ok: true, professeur_id: user.id }
})
