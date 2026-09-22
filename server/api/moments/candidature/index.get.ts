import { getServiceClient } from '~/server/utils/superAdminClient'

/**
 * Le lien de candidature est-il valable ? Le jeton vient de l'URL privée ;
 * la page ne montre le formulaire qu'après cette vérification, et ne
 * révèle rien de plus qu'un oui ou un non.
 */
export default defineEventHandler(async (event) => {
  const jeton = String(getQuery(event).jeton ?? '')
  if (!/^[0-9a-f]{48}$/.test(jeton)) return { valide: false }
  const { data } = await getServiceClient().from('moments_parametres').select('jeton_candidature').eq('id', 1).maybeSingle()
  return { valide: !!data && data.jeton_candidature === jeton }
})
