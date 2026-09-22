import { getServiceClient } from '~/server/utils/superAdminClient'
import { demainParis, envoyerEmail, escapeHtml, paragraphe, quand } from '~/server/utils/moments'

/**
 * Rappel de la veille aux élèves dont l'adresse a été renseignée.
 *
 * Déclenché par une tâche planifiée Vercel (voir vercel.json). L'appel est
 * authentifié par `CRON_SECRET`, que Vercel envoie en en-tête : sans lui, la
 * route est refusée — elle enverrait sinon des emails à la demande de
 * n'importe qui. L'horodatage `rappel_envoye_at` garantit un seul envoi.
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().cronSecret as string | undefined
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'CRON_SECRET non configuré' })
  const fourni = getRequestHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  if (fourni !== secret) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = getServiceClient()
  const demain = demainParis()
  const { data, error } = await client.from('moments_seances')
    .select('*').eq('statut', 'reservee').eq('date', demain)
    .not('eleve_email', 'is', null).is('rappel_envoye_at', null)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  let envoyes = 0
  for (const s of data ?? []) {
    const moment = quand(s.date, s.heure_debut.slice(0, 5), s.heure_fin.slice(0, 5))
    const ok = await envoyerEmail({
      to: s.eleve_email!,
      subject: `Demain, votre Moment musical à Saint-Maurice`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">C'est demain</h2>
        <p>Bonjour ${escapeHtml(s.eleve_prenom)},</p>
        <p>Votre Moment musical a lieu <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${s.programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(s.programme)}` : ''}
        <p>Belle musique à vous,<br>l'équipe d'Orgue Vivant</p>`
    })
    if (ok) {
      await client.from('moments_seances').update({ rappel_envoye_at: new Date().toISOString() }).eq('id', s.id)
      envoyes++
    }
  }
  return { date: demain, envoyes }
})
