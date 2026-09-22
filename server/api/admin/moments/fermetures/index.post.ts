import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { adresseAssociation, envoyerEmail, escapeHtml, quand } from '~/server/utils/moments'

/**
 * Période exceptionnelle d'indisponibilité de l'orgue. Les séances déjà
 * inscrites dans la période sont annulées, professeurs et élèves prévenus ;
 * les séances de Louis-Paul Courtois disparaissent simplement du calendrier.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ date_debut?: string; date_fin?: string; motif?: string }>(event)
  const debut = String(body?.date_debut ?? ''); const fin = String(body?.date_fin ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut)
    throw createError({ statusCode: 400, statusMessage: 'Dates invalides' })
  const motif = typeof body?.motif === 'string' ? body.motif.trim().slice(0, 200) : ''

  const client = getServiceClient()
  const { data, error } = await client.from('moments_fermetures')
    .insert({ date_debut: debut, date_fin: fin, motif: motif || null }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: touchees } = await client.from('moments_seances')
    .select('*, professeur:moments_professeurs(prenom, email)')
    .eq('statut', 'reservee').gte('date', debut).lte('date', fin)
  const annulees = (touchees ?? []) as any[]
  if (annulees.length) {
    await client.from('moments_seances')
      .update({ statut: 'annulee', annulee_par: 'admin', annulee_at: new Date().toISOString() })
      .in('id', annulees.map(s => s.id))
    await Promise.all(annulees.flatMap((s) => {
      const moment = quand(s.date, s.heure_debut.slice(0, 5), s.heure_fin.slice(0, 5))
      const corps = (prenom: string) => `
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>L'orgue de Saint-Maurice ne sera pas disponible le <strong>${escapeHtml(moment)}</strong>${motif ? ` (${escapeHtml(motif)})` : ''} : la séance de ${escapeHtml(s.eleve_prenom)} ${escapeHtml(s.eleve_nom)} est annulée, nous en sommes désolés.</p>
        <p>Un autre créneau peut être choisi depuis l'espace des professeurs. Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
        <p>L'équipe d'Orgue Vivant</p>`
      return [
        s.professeur && envoyerEmail({ to: s.professeur.email, subject: `Séance annulée — ${moment.split(',')[0]}`, html: corps(s.professeur.prenom) }),
        s.eleve_email && envoyerEmail({ to: s.eleve_email, subject: `Votre Moment musical du ${moment.split(',')[0]} est annulé`, html: corps(s.eleve_prenom) })
      ].filter(Boolean)
    }))
  }
  await revalidatePublicPages()
  return { ...data, seances_annulees: annulees.length }
})
