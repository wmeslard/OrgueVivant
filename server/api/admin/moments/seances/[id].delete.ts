import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, dateLongue, envoyerEmail, escapeHtml } from '~/server/utils/moments'

/** Annulation d'une séance par l'association ; l'élève est prévenu. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { motif } = await readBody<{ motif?: string }>(event).catch(() => ({ motif: '' }))
  const texte = typeof motif === 'string' ? motif.trim().slice(0, 500) : ''
  const client = getServiceClient()
  const { data: s } = await client.from('moments_seances')
    .select('id, date, statut, eleve:moments_eleves(prenom, email)').eq('id', id).maybeSingle()
  if (!s || s.statut !== 'reservee') throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  const { error } = await client.from('moments_seances')
    .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const eleve = s.eleve as unknown as { prenom: string; email: string } | null
  await Promise.all([
    eleve && envoyerEmail({
      to: eleve.email,
      subject: `Votre Moment musical du ${dateLongue(s.date)} est annulé`,
      html: `
        <p>Bonjour ${escapeHtml(eleve.prenom)},</p>
        <p>Votre séance du <strong>${escapeHtml(dateLongue(s.date))}</strong> est annulée par l'association${texte ? ` : ${escapeHtml(texte)}` : ''}.</p>
        <p>Vous pouvez choisir une autre date depuis votre espace. Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
        <p>L'équipe d'Orgue Vivant</p>`
    }),
    revalidatePublicPages()
  ])
  return { ok: true }
})
