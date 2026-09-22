import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  adresseAssociation, aujourdhuiParis, chargerHoraires, chargerSeances,
  envoyerEmail, escapeHtml, MESSAGES_REFUS, paragraphe, quand, requireProfesseur
} from '~/server/utils/moments'
import { finCreneau, HORIZON_MOIS, nomPublic, plusMois, raisonNonReservable } from '~/utils/moments'

/** Inscription d'un élève sur un créneau, par son professeur. */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const body = await readBody<{
    date?: string; heure_debut?: string
    eleve_prenom?: string; eleve_nom?: string; eleve_email?: string
    programme?: string
  }>(event)

  const date = String(body?.date ?? '')
  const debut = String(body?.heure_debut ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  if (!/^\d{2}:\d{2}$/.test(debut)) throw createError({ statusCode: 400, statusMessage: 'Créneau invalide' })

  const elevePrenom = (body?.eleve_prenom ?? '').trim().slice(0, 80)
  const eleveNom = (body?.eleve_nom ?? '').trim().slice(0, 80)
  if (!elevePrenom || !eleveNom) throw createError({ statusCode: 400, statusMessage: 'Prénom et nom de l\'élève requis' })
  const eleveEmail = (body?.eleve_email ?? '').trim().slice(0, 254)
  if (eleveEmail && !/^\S+@\S+\.\S+$/.test(eleveEmail)) throw createError({ statusCode: 400, statusMessage: 'Email de l\'élève invalide' })
  const programme = (body?.programme ?? '').trim().slice(0, 600)

  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const au = plusMois(aujourdhui, HORIZON_MOIS)
  const [horaires, actives] = await Promise.all([chargerHoraires(client), chargerSeances(client, aujourdhui, au)])
  const pris = actives.map(s => ({ date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: '' }))
  const raison = raisonNonReservable(date, debut, { aujourdhui, horaires, pris })
  if (raison) throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS[raison] })

  const fin = finCreneau(debut)
  const { data, error } = await client.from('moments_seances').insert({
    date, heure_debut: debut, heure_fin: fin, professeur_id: prof.id,
    eleve_prenom: elevePrenom, eleve_nom: eleveNom, eleve_email: eleveEmail || null,
    programme: programme || null
  }).select().single()
  // L'index unique tranche deux inscriptions simultanées sur le même créneau.
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS.pris })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const moment = quand(date, debut, fin)
  const eleve = `${elevePrenom} ${eleveNom}`
  await Promise.all([
    envoyerEmail({
      to: prof.email,
      subject: `${eleve} jouera le ${moment.split(',')[0]}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Inscription confirmée</h2>
        <p>Bonjour ${escapeHtml(prof.prenom)},</p>
        <p><strong>${escapeHtml(eleve)}</strong> est inscrit·e le <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(programme)}` : ''}
        <p>Le site annonce la séance au nom de « ${escapeHtml(nomPublic(elevePrenom, eleveNom))} ». Vous pouvez modifier le programme ou annuler depuis votre espace jusqu'à 48 h avant.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    eleveEmail && envoyerEmail({
      to: eleveEmail,
      subject: `Votre Moment musical du ${moment.split(',')[0]}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">À vous de jouer !</h2>
        <p>Bonjour ${escapeHtml(elevePrenom)},</p>
        <p>${escapeHtml(prof.prenom)} ${escapeHtml(prof.nom)} vous a inscrit·e pour un Moment musical : <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(programme)}` : ''}
        <p>Une demi-heure de musique, en entrée libre : le public entre et sort comme il veut. Pour toute question, adressez-vous à votre professeur ou à ${escapeHtml(adresseAssociation())}.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    envoyerEmail({
      to: adresseAssociation(),
      subject: `[Moments musicaux] ${eleve} — ${moment.split(',')[0]}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Nouvelle inscription</h2>
        <p><strong>${escapeHtml(eleve)}</strong> jouera le <strong>${escapeHtml(moment)}</strong>.</p>
        <p>Inscrit·e par ${escapeHtml(prof.prenom)} ${escapeHtml(prof.nom)} (${escapeHtml(prof.email)}).</p>
        ${programme ? `<p><strong>Programme</strong></p>${paragraphe(programme)}` : ''}`
    }),
    revalidatePublicPages()
  ])
  return data
})
