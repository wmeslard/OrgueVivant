import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, dateLongue, envoyerEmail, escapeHtml } from '~/server/utils/moments'

/**
 * Période d'indisponibilité de l'orgue. Les séances d'élèves déjà réservées
 * dans la période sont annulées et les élèves prévenus ; celles du titulaire
 * disparaissent simplement du calendrier.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ date_debut?: string; date_fin?: string; motif?: string }>(event)
  const debut = String(body?.date_debut ?? ''); const fin = String(body?.date_fin ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut)
    throw createError({ statusCode: 400, statusMessage: 'Dates invalides' })
  const motif = typeof body?.motif === 'string' ? body.motif.trim().slice(0, 200) : ''

  const client = getServiceClient()
  const { data, error } = await client.from('moments_fermetures').insert({ date_debut: debut, date_fin: fin, motif: motif || null }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: touchees } = await client
    .from('moments_seances')
    .select('id, date, eleve:moments_eleves(prenom, email)')
    .eq('statut', 'reservee').gte('date', debut).lte('date', fin)
  const annulees = (touchees ?? []) as unknown as { id: string; date: string; eleve: { prenom: string; email: string } | null }[]
  if (annulees.length) {
    await client.from('moments_seances')
      .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() })
      .in('id', annulees.map(s => s.id))
    await Promise.all(annulees.filter(s => s.eleve).map(s => envoyerEmail({
      to: s.eleve!.email,
      subject: `Votre Moment musical du ${dateLongue(s.date)} est annulé`,
      html: `
        <p>Bonjour ${escapeHtml(s.eleve!.prenom)},</p>
        <p>L'orgue de Saint-Maurice ne sera pas disponible le <strong>${escapeHtml(dateLongue(s.date))}</strong>${motif ? ` (${escapeHtml(motif)})` : ''} : votre séance est annulée, nous en sommes désolés.</p>
        <p>Vous pouvez choisir une autre date depuis votre espace. Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
        <p>L'équipe d'Orgue Vivant</p>`
    })))
  }
  await revalidatePublicPages()
  return { ...data, seances_annulees: annulees.length }
})
