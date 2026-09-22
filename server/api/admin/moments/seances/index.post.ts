import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { aujourdhuiParis, chargerFermetures, dateLongue, envoyerEmail, escapeHtml, paragraphe } from '~/server/utils/moments'
import { estDimanche, estFermee, estJeudiTitulaire, MOMENT_DEBUT, MOMENT_FIN } from '~/utils/moments'

/**
 * Réservation faite par l'association pour un élève (au téléphone, par
 * exemple). Mêmes règles de date que pour l'élève, sans le délai ni le
 * plafond de séances.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ date?: string; eleve_id?: string; programme?: string }>(event)
  const date = String(body?.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < aujourdhuiParis()) throw createError({ statusCode: 400, statusMessage: 'Date invalide' })
  if (estDimanche(date)) throw createError({ statusCode: 409, statusMessage: 'Pas de séance le dimanche.' })
  if (estJeudiTitulaire(date)) throw createError({ statusCode: 409, statusMessage: 'Ce jeudi est celui de l\'organiste titulaire.' })
  const programme = typeof body?.programme === 'string' ? body.programme.trim().slice(0, 600) : ''

  const client = getServiceClient()
  const { data: eleve } = await client.from('moments_eleves').select('*').eq('id', body?.eleve_id).maybeSingle()
  if (!eleve) throw createError({ statusCode: 404, statusMessage: 'Élève introuvable' })
  if (estFermee(date, await chargerFermetures(client, date, date))) throw createError({ statusCode: 409, statusMessage: 'L\'orgue est indisponible à cette date.' })

  const { data, error } = await client.from('moments_seances')
    .insert({ date, eleve_id: eleve.id, programme: programme || null }).select().single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Cette date est déjà réservée.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await Promise.all([
    envoyerEmail({
      to: eleve.email,
      subject: `Votre Moment musical du ${dateLongue(date)}`,
      html: `
        <p>Bonjour ${escapeHtml(eleve.prenom)},</p>
        <p>L'association a réservé pour vous une séance le <strong>${escapeHtml(dateLongue(date))}, de ${MOMENT_DEBUT.replace(':', ' h ')} à ${MOMENT_FIN.replace(':', ' h ')}</strong>, à l'orgue de chœur de l'église Saint-Maurice.</p>
        ${programme ? `<p><strong>Programme</strong></p>${paragraphe(programme)}` : ''}
        <p>Vous la retrouvez dans votre espace, où vous pouvez préciser le programme.</p>
        <p>L'équipe d'Orgue Vivant</p>`
    }),
    revalidatePublicPages()
  ])
  return data
})
