import { getServiceClient } from '~/server/utils/superAdminClient'
import { modifierProfesseur, requireProfesseur } from '~/server/utils/moments'

/** Le professeur corrige ses propres coordonnées. */
export default defineEventHandler(async (event) => {
  const prof = await requireProfesseur(event)
  await modifierProfesseur(getServiceClient(), prof, await readBody<Record<string, unknown>>(event) ?? {})
  return { ok: true }
})
