import { getServiceClient } from '~/server/utils/superAdminClient'
import { cleActuelle, memeCle, professeurDuCookie } from '~/server/utils/moments'

/**
 * État d'un lien d'accès, pour la page qui l'accueille : la clé est-elle celle
 * en vigueur, et ce navigateur est-il déjà entré (auquel cas on l'envoie
 * directement dans l'espace) ?
 */
export default defineEventHandler(async (event) => {
  const { cle } = getQuery(event)
  const [actuelle, prof] = await Promise.all([cleActuelle(getServiceClient()), professeurDuCookie(event)])
  const valide = typeof cle === 'string' && !!actuelle && memeCle(cle, actuelle)
  return { valide, dejaEntre: valide && !!prof && prof !== 'desactive' }
})
