import { getServiceClient } from '~/server/utils/superAdminClient'

/**
 * Plafonds quotidiens des emails que des tiers peuvent déclencher, communs à
 * toutes les instances du site (supabase/limites-envois.sql). Ils protègent
 * le quota de Resend (100 emails par jour en offre gratuite) : leur total
 * laisse toujours de quoi envoyer rappels, confirmations de séance, avis à
 * l'organiste et newsletter, qui ne sont pas plafonnés.
 */
export const PLAFONDS = {
  lien_moments: 30,
  confirmation_newsletter: 30,
  contact: 20
} as const

export type Reservation = 'ok' | 'delai' | 'quota'

/**
 * Réserve un envoi. 'delai' : le même destinataire (`cle`) en a reçu un il y a
 * moins de `delaiS` secondes ; 'quota' : la catégorie a atteint son plafond du
 * jour. Null tant que la migration n'est pas appliquée, ou si la base ne
 * répond pas : l'appelant garde alors sa limite en mémoire, et l'envoi n'est
 * pas bloqué pour autant.
 */
export async function reserverEnvoi(
  categorie: keyof typeof PLAFONDS, cle?: string, delaiS?: number
): Promise<Reservation | null> {
  const { data, error } = await getServiceClient().rpc('reserver_envoi', {
    p_categorie: categorie,
    p_limite_jour: PLAFONDS[categorie],
    p_cle: cle ?? null,
    p_delai: delaiS ? `${delaiS} seconds` : null
  })
  if (error) {
    // Fonction inconnue : migration pas encore appliquée, rien d'anormal.
    if (!['PGRST202', '42883'].includes(error.code ?? '')) console.error('[envois] réservation impossible :', error.message)
    return null
  }
  return data as Reservation
}
