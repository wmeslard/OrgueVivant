import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  aujourdhuiParis, chargerFermetures, chargerHoraires, chargerSeances, envoyerEmail, escapeHtml, paragraphe, quand
} from '~/server/utils/moments'
import { finCreneau, HORIZON_MOIS, plusMois, raisonNonReservable } from '~/utils/moments'

/**
 * Inscription faite par l'association pour le compte d'un professeur (au
 * téléphone, par exemple). Mêmes règles de créneau, sans le délai de deux jours.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{
    date?: string; heure_debut?: string; professeur_id?: string
    eleve_prenom?: string; eleve_nom?: string; eleve_email?: string; programme?: string
  }>(event)
  const date = String(body?.date ?? '')
  const debut = String(body?.heure_debut ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < aujourdhuiParis()) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  if (!/^\d{2}:\d{2}$/.test(debut)) throw createError({ statusCode: 400, statusMessage: 'Créneau invalide' })
  const elevePrenom = (body?.eleve_prenom ?? '').trim().slice(0, 80)
  const eleveNom = (body?.eleve_nom ?? '').trim().slice(0, 80)
  if (!elevePrenom || !eleveNom) throw createError({ statusCode: 400, statusMessage: 'Prénom et nom de l\'élève requis' })
  const eleveEmail = (body?.eleve_email ?? '').trim().slice(0, 254)
  const programme = (body?.programme ?? '').trim().slice(0, 600)

  const client = getServiceClient()
  const { data: prof } = await client.from('moments_professeurs').select('*').eq('id', body?.professeur_id).maybeSingle()
  if (!prof) throw createError({ statusCode: 404, statusMessage: 'Professeur introuvable' })

  const au = plusMois(aujourdhuiParis(), HORIZON_MOIS)
  const [horaires, fermetures, actives] = await Promise.all([
    chargerHoraires(client), chargerFermetures(client, date, date), chargerSeances(client, date, date)
  ])
  const pris = actives.map(s => ({ date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: '' }))
  // L'association n'est pas tenue par le délai de prévenance, mais par les
  // messes, les confessions et les créneaux déjà pris.
  const raison = raisonNonReservable(date, debut, { aujourdhui: date, horaires, fermetures, pris })
  if (raison && raison !== 'trop_tot') throw createError({ statusCode: 409, statusMessage: `Créneau indisponible (${raison}).` })
  if (date > au) throw createError({ statusCode: 409, statusMessage: 'Date hors de l\'horizon d\'inscription.' })

  const fin = finCreneau(debut)
  const { data, error } = await client.from('moments_seances').insert({
    date, heure_debut: debut, heure_fin: fin, professeur_id: prof.id,
    eleve_prenom: elevePrenom, eleve_nom: eleveNom, eleve_email: eleveEmail || null, programme: programme || null
  }).select().single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Ce créneau est déjà pris.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const moment = quand(date, debut, fin)
  await Promise.all([
    envoyerEmail({
      to: prof.email,
      subject: `${elevePrenom} ${eleveNom} — ${moment.split(',')[0]}`,
      html: `
        <p>Bonjour ${escapeHtml(prof.prenom)},</p>
        <p>L'association a inscrit <strong>${escapeHtml(elevePrenom)} ${escapeHtml(eleveNom)}</strong> le <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice.</p>
        ${programme ? `<p><strong>Programme</strong></p>${paragraphe(programme)}` : ''}
        <p>Vous retrouvez cette séance dans votre espace.</p>
        <p>L'équipe d'Orgue Vivant</p>`
    }),
    revalidatePublicPages()
  ])
  return data
})
