import { getServiceClient } from '~/server/utils/superAdminClient'
import { champ, cleActuelle, marquerConnexion, memeCle, ouvrirAcces } from '~/server/utils/moments'

/**
 * Entrée dans l'espace des professeurs par le lien partagé. Le professeur se
 * présente ; son email le reconnaît s'il est déjà venu (depuis un autre
 * appareil, par exemple), sinon une fiche est créée. Le cookie posé ensuite
 * vaut accès jusqu'à ce que le lien soit régénéré.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const client = getServiceClient()
  const cle = await cleActuelle(client)
  if (!cle || typeof body?.cle !== 'string' || !memeCle(body.cle, cle))
    throw createError({ statusCode: 403, statusMessage: 'Ce lien n\'est plus valide. Demandez le nouveau à l\'association.' })

  const prenom = champ(body.prenom, 80)
  const nom = champ(body.nom, 80)
  const email = champ(body.email, 254).toLowerCase()
  const conservatoire = champ(body.conservatoire, 160)
  if (!prenom || !nom || !email) throw createError({ statusCode: 400, statusMessage: 'Prénom, nom et email requis' })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Email invalide' })

  const trouver = () => client.from('moments_professeurs').select('id, actif').eq('email', email).maybeSingle()
  let { data: prof } = await trouver()
  if (!prof) {
    const { data, error } = await client.from('moments_professeurs')
      .insert({ prenom, nom, email, conservatoire: conservatoire || null }).select('id, actif').single()
    // Deux entrées simultanées avec la même adresse : l'index unique en garde une.
    if (error?.code === '23505') prof = (await trouver()).data
    else if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    else prof = data
  }
  if (!prof) throw createError({ statusCode: 500, statusMessage: 'Enregistrement impossible' })
  if (!prof.actif) throw createError({ statusCode: 403, statusMessage: 'Votre accès a été désactivé. Écrivez-nous pour en savoir plus.' })

  ouvrirAcces(event, prof.id, cle)
  await marquerConnexion(client, prof.id)
  return { ok: true }
})
