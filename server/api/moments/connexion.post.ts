import { entrerParLien } from '~/server/utils/moments'

/**
 * Fin de l'entrée par email : le professeur a ouvert le lien reçu et cliqué
 * sur « Ouvrir mon espace ». Un clic plutôt qu'une ouverture à l'arrivée sur
 * la page : les antivirus de messagerie qui visitent les liens ne le
 * consomment pas à sa place.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ jeton?: unknown }>(event)
  await entrerParLien(event, body?.jeton)
  return { ok: true }
})
