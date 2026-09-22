import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  adresseAssociation, aujourdhuiParis, chargerFermetures, chargerSeances, dateLongue, envoyerEmail, escapeHtml, paragraphe, requireEleve
} from '~/server/utils/moments'
import { HORIZON_MOIS, MAX_SEANCES_A_VENIR, MOMENT_DEBUT, MOMENT_FIN, plusMois, raisonNonReservable } from '~/utils/moments'

const MESSAGES: Record<string, string> = {
  passe: 'Cette date est passée.',
  trop_tot: 'Réservez au moins deux jours à l\'avance.',
  trop_loin: `Les réservations sont ouvertes sur ${HORIZON_MOIS} mois.`,
  dimanche: 'Pas de séance le dimanche.',
  titulaire: 'Ce jeudi est celui de l\'organiste titulaire.',
  fermee: 'L\'orgue est indisponible à cette date.',
  prise: 'Cette date est déjà réservée.'
}

/** Réservation d'une séance par l'élève connecté (mode « réservation directe »). */
export default defineEventHandler(async (event) => {
  const eleve = await requireEleve(event)
  const body = await readBody<{ date?: string; programme?: string }>(event)
  const date = String(body?.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  const programme = typeof body?.programme === 'string' ? body.programme.trim().slice(0, 600) : ''

  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const au = plusMois(aujourdhui, HORIZON_MOIS)
  const [fermetures, actives] = await Promise.all([chargerFermetures(client, aujourdhui, au), chargerSeances(client, aujourdhui, au)])

  const raison = raisonNonReservable(date, { aujourdhui, fermetures, datesPrises: new Set(actives.map(s => s.date)) })
  if (raison) throw createError({ statusCode: 409, statusMessage: MESSAGES[raison] })
  if (actives.filter(s => s.eleve_id === eleve.id).length >= MAX_SEANCES_A_VENIR)
    throw createError({ statusCode: 409, statusMessage: `Vous avez déjà ${MAX_SEANCES_A_VENIR} séances à venir : annulez-en une pour en réserver une autre.` })

  const { data, error } = await client
    .from('moments_seances')
    .insert({ date, eleve_id: eleve.id, programme: programme || null })
    .select()
    .single()
  // L'index unique tranche les réservations simultanées sur la même date.
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: MESSAGES.prise })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const quand = `${dateLongue(date)}, de ${MOMENT_DEBUT.replace(':', ' h ')} à ${MOMENT_FIN.replace(':', ' h ')}`
  await Promise.all([
    envoyerEmail({
      to: eleve.email,
      subject: `Votre Moment musical du ${dateLongue(date)}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Séance réservée</h2>
        <p>Bonjour ${escapeHtml(eleve.prenom)},</p>
        <p>Votre séance est confirmée : <strong>${escapeHtml(quand)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(programme)}` : ''}
        <p>Vous pouvez modifier le programme ou annuler la séance depuis votre espace jusqu'à 48 h avant. Au-delà, écrivez-nous à ${escapeHtml(adresseAssociation())}.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    envoyerEmail({
      to: adresseAssociation(),
      subject: `[Moments musicaux] ${eleve.prenom} ${eleve.nom} — ${dateLongue(date)}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Nouvelle réservation</h2>
        <p><strong>${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong> (${escapeHtml(eleve.email)}) jouera le <strong>${escapeHtml(quand)}</strong>.</p>
        ${programme ? `<p><strong>Programme</strong></p>${paragraphe(programme)}` : ''}`
    }),
    revalidatePublicPages()
  ])
  return data
})
