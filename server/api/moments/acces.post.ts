import { getServiceClient } from '~/server/utils/superAdminClient'
import { champ, cleActuelle, envoyerLienConnexion, marquerConnexion, memeCle, ouvrirAcces } from '~/server/utils/moments'

/**
 * Entrée dans l'espace des professeurs par le lien partagé. Le professeur se
 * présente. Si son email n'a pas encore de fiche, elle est créée et l'accès
 * s'ouvre aussitôt. S'il en a une (venu depuis un autre appareil, par
 * exemple), un lien de connexion part à cette adresse : seule la personne qui
 * la lit entre. Le cookie posé ensuite vaut accès jusqu'à ce que le lien soit
 * régénéré.
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

  const colonnes = 'id, prenom, email, derniere_connexion_at'
  const trouver = () => client.from('moments_professeurs').select(colonnes).eq('email', email).maybeSingle()
  let { data: prof } = await trouver()
  let creee = false
  if (!prof) {
    const { data, error } = await client.from('moments_professeurs')
      .insert({ prenom, nom, email, conservatoire: conservatoire || null }).select(colonnes).single()
    // Deux entrées simultanées avec la même adresse : l'index unique en garde une.
    if (error?.code === '23505') prof = (await trouver()).data
    else if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    else { prof = data; creee = true }
  }
  if (!prof) throw createError({ statusCode: 500, statusMessage: 'Enregistrement impossible' })

  // Fiche existante : l'adresse saisie ne prouve rien, l'accès passe par la
  // boîte mail. Même réponse que la fiche soit active ou désactivée.
  if (!creee) {
    if (!await envoyerLienConnexion(prof, cle))
      throw createError({ statusCode: 502, statusMessage: 'L\'email de connexion n\'a pas pu partir. Réessayez dans quelques minutes, ou écrivez-nous.' })
    return { lienEnvoye: true }
  }

  ouvrirAcces(event, prof.id, cle)
  await marquerConnexion(client, prof.id)
  return { ok: true }
})
