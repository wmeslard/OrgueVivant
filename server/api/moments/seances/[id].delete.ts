import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, dateLongue, envoyerEmail, escapeHtml, requireEleve } from '~/server/utils/moments'
import { annulable, DELAI_ANNULATION_H } from '~/utils/moments'

/** L'élève annule une de ses séances, au plus tard 48 h avant. */
export default defineEventHandler(async (event) => {
  const eleve = await requireEleve(event)
  const id = getRouterParam(event, 'id')
  const client = getServiceClient()
  const { data: seance } = await client
    .from('moments_seances').select('*').eq('id', id).eq('eleve_id', eleve.id).eq('statut', 'reservee').maybeSingle()
  if (!seance) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  if (!annulable(seance.date))
    throw createError({ statusCode: 409, statusMessage: `Une séance ne peut plus être annulée moins de ${DELAI_ANNULATION_H} h avant. Écrivez-nous à ${adresseAssociation()}.` })

  const { error } = await client
    .from('moments_seances')
    .update({ statut: 'annulee', annulee_par: 'eleve', annulee_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await Promise.all([
    envoyerEmail({
      to: adresseAssociation(),
      subject: `[Moments musicaux] Annulation — ${eleve.prenom} ${eleve.nom}, ${dateLongue(seance.date)}`,
      html: `<p><strong>${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong> a annulé sa séance du <strong>${escapeHtml(dateLongue(seance.date))}</strong>. La date est de nouveau libre.</p>`
    }),
    revalidatePublicPages()
  ])
  return { ok: true }
})
