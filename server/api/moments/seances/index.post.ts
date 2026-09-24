import { getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import {
  adresseAssociation, aujourdhuiParis, chargerAffectations, chargerHoraires, chargerSeances, desaffecter, envoyerEmail,
  escapeHtml, insererSeance, lireMusiciens, MESSAGES_REFUS, paragraphe, quand, requireProfesseur
} from '~/server/utils/moments'
import { finCreneau, HORIZON_MOIS, nomsComplets, nomsPublics, plusMois, raisonNonReservable } from '~/utils/moments'

/**
 * Inscription sur un jeudi, de un à quatre musiciens. La personne entrée par
 * le lien joue elle-même (`pour_soi` : le premier musicien est alors elle, avec
 * le nom de sa fiche) ou inscrit quelqu'un.
 */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  const body = await readBody<Record<string, unknown>>(event)
  const pourSoi = body?.pour_soi === true

  const date = String(body?.date ?? '')
  const debut = String(body?.heure_debut ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  if (!/^\d{2}:\d{2}$/.test(debut)) throw createError({ statusCode: 400, statusMessage: 'Créneau invalide' })

  const musiciens = lireMusiciens(body, pourSoi ? prof : undefined)
  // L'email facultatif de la personne inscrite, pour sa confirmation (anciens formulaires).
  const eleveEmail = pourSoi ? '' : String(body?.eleve_email ?? '').trim().slice(0, 254)
  if (eleveEmail && !/^\S+@\S+\.\S+$/.test(eleveEmail)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  const programme = String(body?.programme ?? '').trim().slice(0, 600)

  const client = getServiceClient()
  const aujourdhui = aujourdhuiParis()
  const au = plusMois(aujourdhui, HORIZON_MOIS)
  const [horaires, actives, affectations] = await Promise.all([
    chargerHoraires(client), chargerSeances(client, aujourdhui, au), chargerAffectations(client, date, date)
  ])
  const pris = actives.map(s => ({ date: s.date, heure_debut: s.heure_debut.slice(0, 5), interprete: '' }))
  // Les inscriptions restent ouvertes jusqu'à ce que Louis-Paul Courtois soit affecté.
  const raison = raisonNonReservable(date, debut, { aujourdhui, horaires, pris, affectes: affectations.map(a => a.date) })
  if (raison) throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS[raison] })

  const fin = finCreneau(debut)
  const { data, error } = await insererSeance(client, {
    date, heure_debut: debut, heure_fin: fin, professeur_id: prof.id,
    eleve_email: eleveEmail || null, programme: programme || null,
    ...(pourSoi && { pour_soi: true })
  }, musiciens)
  // L'index unique tranche deux inscriptions simultanées sur le même créneau.
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: MESSAGES_REFUS.pris })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Affecté au même instant par la tâche quotidienne : l'inscription l'emporte, il est libéré.
  await desaffecter(client, date, `${nomsComplets(musiciens)} ${musiciens.length > 1 ? 'joueront' : 'jouera'}`)

  const moment = quand(date, debut, fin)
  const jour = moment.split(',')[0]
  const seul = musiciens.length === 1
  const qui = nomsComplets(musiciens)
  const composition = nomsComplets(musiciens, true)
  const surLeSite = `<p>Le site annonce la séance au nom de « ${escapeHtml(nomsPublics(musiciens).replaceAll(' ', ' '))} ». Vous pouvez modifier le programme ou annuler depuis votre espace jusqu'à 48 h avant.</p>`
  const programmeHtml = programme ? `<p><strong>Programme annoncé</strong></p>${paragraphe(programme)}` : ''
  const [premier] = musiciens
  await Promise.all([
    envoyerEmail({
      to: prof.email,
      subject: pourSoi ? `Votre Moment musical du ${jour}` : `${qui} ${seul ? 'jouera' : 'joueront'} le ${jour}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">${pourSoi ? 'À vous de jouer !' : 'Inscription confirmée'}</h2>
        <p>Bonjour ${escapeHtml(prof.prenom)},</p>
        <p>${pourSoi
          ? `Vous êtes inscrit·e pour un Moment musical : <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.`
          : `<strong>${escapeHtml(composition)}</strong> ${seul ? 'est inscrit·e' : 'sont inscrits'} le <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.`}</p>
        ${pourSoi && !seul ? `<p>Musiciens : <strong>${escapeHtml(composition)}</strong>.</p>` : ''}
        ${programmeHtml}
        ${surLeSite}
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    eleveEmail && envoyerEmail({
      to: eleveEmail,
      subject: `Votre Moment musical du ${jour}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">À vous de jouer !</h2>
        <p>Bonjour ${escapeHtml(premier.prenom)},</p>
        <p>${escapeHtml(prof.prenom)} ${escapeHtml(prof.nom)} vous a inscrit·e pour un Moment musical : <strong>${escapeHtml(moment)}</strong>, à l'orgue de chœur de l'église Saint-Maurice de Lille.</p>
        ${seul ? '' : `<p>Musiciens : <strong>${escapeHtml(composition)}</strong>.</p>`}
        ${programmeHtml}
        <p>Une demi-heure de musique, en entrée libre : le public entre et sort comme il veut. Pour toute question, adressez-vous à la personne qui vous a inscrit·e ou à ${escapeHtml(adresseAssociation())}.</p>
        <p>À bientôt,<br>l'équipe d'Orgue Vivant</p>`
    }),
    envoyerEmail({
      to: adresseAssociation(),
      subject: `[Moments musicaux] ${qui} — ${jour}`,
      html: `
        <h2 style="font-weight:300;font-size:22px;margin:0 0 16px">Nouvelle inscription</h2>
        <p><strong>${escapeHtml(composition)}</strong> ${seul ? 'jouera' : 'joueront'} le <strong>${escapeHtml(moment)}</strong>.</p>
        <p>${pourSoi ? `Inscription personnelle (${escapeHtml(prof.email)}).` : `Inscrit·e par ${escapeHtml(prof.prenom)} ${escapeHtml(prof.nom)} (${escapeHtml(prof.email)}).`}</p>
        ${programme ? `<p><strong>Programme</strong></p>${paragraphe(programme)}` : ''}`
    }),
    revalidatePublicPages()
  ])
  return data
})
