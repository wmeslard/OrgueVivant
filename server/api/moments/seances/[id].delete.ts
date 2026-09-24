import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, affecterOrganiste, envoyerEmail, escapeHtml, quand, requireProfesseur } from '~/server/utils/moments'
import { annulable, DELAI_ANNULATION_H, musiciensDe, nomsComplets } from '~/utils/moments'

/** Le professeur annule une inscription, au plus tard 48 h avant. */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const id = getRouterParam(event, 'id')
  const client = getServiceClient()
  const { data: s } = await client.from('moments_seances')
    .select('*').eq('id', id).eq('professeur_id', prof.id).eq('statut', 'reservee').maybeSingle()
  if (!s) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  if (!annulable(s.date, s.heure_debut.slice(0, 5)))
    throw createError({ statusCode: 409, statusMessage: `Une séance ne peut plus être annulée moins de ${DELAI_ANNULATION_H} h avant. Écrivez-nous à ${adresseAssociation()}.` })

  const { error } = await client.from('moments_seances')
    .update({ statut: 'annulee', annulee_par: 'professeur', annulee_at: new Date().toISOString() }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const moment = quand(s.date, s.heure_debut.slice(0, 5), s.heure_fin.slice(0, 5))
  await Promise.all([
    envoyerEmail({
      to: adresseAssociation(),
      subject: `[Moments musicaux] Annulation — ${nomsComplets(musiciensDe(s))}, ${moment.split(',')[0]}`,
      html: `<p><strong>${escapeHtml(prof.prenom)} ${escapeHtml(prof.nom)}</strong> a annulé l'inscription de ${escapeHtml(nomsComplets(musiciensDe(s)))} du <strong>${escapeHtml(moment)}</strong>. Le créneau est de nouveau libre.</p>`
    }),
    s.eleve_email && envoyerEmail({
      to: s.eleve_email,
      subject: `Votre Moment musical du ${moment.split(',')[0]} est annulé`,
      html: `<p>Bonjour ${escapeHtml(s.eleve_prenom)},</p><p>Votre séance du <strong>${escapeHtml(moment)}</strong> a été annulée par la personne qui vous avait inscrit·e.</p><p>L'équipe d'Orgue Vivant</p>`
    }),
    revalidatePublicPages()
  ])
  // Annulée à moins de trois jours : Louis-Paul Courtois reprend la séance.
  await affecterOrganiste(client)
  return { ok: true }
})
