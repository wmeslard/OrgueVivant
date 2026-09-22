import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { regenererCle } from '~/server/utils/moments'

/**
 * Nouveau lien pour les professeurs. L'ancien cesse aussitôt de fonctionner,
 * et les navigateurs entrés avec lui perdent l'accès : il faudra leur
 * transmettre le nouveau. Les séances déjà inscrites ne changent pas.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const cle = await regenererCle(getServiceClient())
  return { lienProfesseurs: `${getRequestURL(event).origin}/moments-musicaux/acces/${cle}` }
})
