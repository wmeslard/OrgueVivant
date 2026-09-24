import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  adresseAssociation, aujourdhuiParis, chargerHoraires, chargerSeances, envoyerEmail, escapeHtml,
  MESSAGES_REFUS, paragraphe, quand
} from '~/server/utils/moments'
import { finCreneau, HORIZON_MOIS, plusMois, raisonNonReservable } from '~/utils/moments'

/**
 * Inscription faite par l'association elle-même (au téléphone, par exemple) :
 * pas de professeur, pas de délai de prévenance, mais les mêmes créneaux. Si
 * l'élève a une adresse, il reçoit la confirmation.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{
    date?: string; heure_debut?: string
    eleve_prenom?: string; eleve_nom?: string; eleve_email?: string; programme?: string
  }>(event)
  const date = String(body?.date ?? '')
  const debut = String(body?.heure_debut ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  if (!/^\d{2}:\d{2}$/.test(debut)) throw createError({ statusCode: 400, statusMessage: 'Créneau invalide' })
  const elevePrenom = (body?.eleve_prenom ?? '').trim().slice(0, 80)
  const eleveNom = (body?.eleve_nom ?? '').trim().slice(0, 80)
  if (!elevePrenom || !eleveNom) throw createError({ statusCode: 400, statusMessage: 'Prénom et nom requis' })
  const eleveEmail = (body?.eleve_email ?? '').trim().slice(0, 254)
  if (eleveEmail && !/^\S+@\S+\.\S+$/.test(eleveEmail)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  const programme = (body?.programme ?? '').trim().slice(0, 600)

  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const [horaires, actives] = await Promise.all([
    chargerHoraires(client), chargerSeances(client, aujourdhui, plusMois(aujourdhui, HORIZON_MOIS))
  ])
  const pris = actives.map(s => ({ date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: '' }))
  const raison = raisonNonReservable(date, debut, { aujourdhui, delaiJours: 0, horaires, pris })
  if (raison) throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS[raison] })

  const fin = finCreneau(debut)
  const { data, error } = await client.from('moments_seances').insert({
    date, heure_debut: debut, heure_fin: fin, professeur_id: null,
    eleve_prenom: elevePrenom, eleve_nom: eleveNom, eleve_email: eleveEmail || null, programme: programme || null
  }).select().single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS.pris })
  // Colonne professeur_id encore obligatoire : migration pas appliquée.
  if (error?.code === '23502')
    throw createError({ statusCode: 503, statusMessage: 'Exécutez supabase/moments-musicaux-regles.sql dans Supabase pour inscrire sans professeur.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const moment = quand(date, debut, fin)
  await Promise.all([
    eleveEmail && envoyerEmail({
      to: eleveEmail,
      subject: `Votre Moment musical du ${moment.split(',')[0]}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">À vous de jouer !</h2>
        <p>Bonjour ${escapeHtml(elevePrenom)},</p>
        <p>Vous êtes inscrit·e pour un Moment musical : <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(programme)}` : ''}
        <p>Une demi-heure de musique, en entrée libre : le public entre et sort comme il veut. Pour toute question : ${escapeHtml(adresseAssociation())}.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    revalidatePublicPages()
  ])
  return data
})
