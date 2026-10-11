import { getServiceClient } from '~/server/utils/superAdminClient'

/**
 * Désinscription en un clic (RFC 8058) : le bouton « Se désabonner » de la
 * messagerie poste `List-Unsubscribe=One-Click` à l'adresse de l'en-tête
 * List-Unsubscribe des envois groupés. Personne ne voit la réponse, d'où
 * l'absence de redirection (le lien du pied de mail reste en GET).
 */
export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  if (!token || typeof token !== 'string' || token.length < 10)
    throw createError({ statusCode: 400, statusMessage: 'Lien invalide' })

  const { error } = await getServiceClient()
    .from('newsletter_subscribers')
    .delete()
    .eq('unsubscribe_token', token)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la désinscription' })

  return { ok: true }
})
