import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, affecterOrganiste, envoyerEmail, escapeHtml, quand } from '~/server/utils/moments'
import { musiciensDe, nomsComplets } from '~/utils/moments'

/**
 * Annulation d'une séance par l'association ; les personnes inscrites sont
 * prévenues. À moins de deux jours, Louis-Paul Courtois reprend la séance.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { motif } = await readBody<{ motif?: string }>(event).catch(() => ({ motif: '' }))
  const texte = typeof motif === 'string' ? motif.trim().slice(0, 500) : ''
  const client = getServiceClient()
  const { data: s } = await client.from('moments_seances')
    .select('*, professeur:moments_professeurs(prenom, email)').eq('id', id).maybeSingle()
  if (!s || s.statut !== 'reservee') throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  const { error } = await client.from('moments_seances')
    .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const prof = s.professeur as unknown as { prenom: string; email: string } | null
  const moment = quand(s.date, s.heure_debut.slice(0, 5), s.heure_fin.slice(0, 5))
  const corps = (prenom: string) => `
    <p>Bonjour ${escapeHtml(prenom)},</p>
    <p>La séance de <strong>${escapeHtml(nomsComplets(musiciensDe(s)))}</strong>, prévue le <strong>${escapeHtml(moment)}</strong>, est annulée par l'association${texte ? ` : ${escapeHtml(texte)}` : ''}.</p>
    <p>Un autre jeudi peut être choisi depuis l'espace d'inscription. Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
    <p>L'équipe d'Orgue Vivant</p>`
  await Promise.all([
    prof && envoyerEmail({ to: prof.email, subject: `Séance annulée — ${moment.split(',')[0]}`, html: corps(prof.prenom) }),
    s.eleve_email && envoyerEmail({ to: s.eleve_email, subject: `Votre Moment musical du ${moment.split(',')[0]} est annulé`, html: corps(s.eleve_prenom) }),
    revalidatePublicPages()
  ])
  await affecterOrganiste(client)
  return { ok: true }
})
