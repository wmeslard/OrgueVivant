import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Jeton anti-robot pour les formulaires publics : un horodatage signé, émis
 * quand la page s'affiche, exigé à la soumission.
 *
 * Il oblige à charger la page (les scripts qui postent directement sur l'API
 * n'en ont pas) et permet de refuser les envois trop rapides pour un humain.
 * Aucun état côté serveur : la signature suffit, ce qui convient aux fonctions
 * sans mémoire partagée de Vercel.
 *
 * La clé est dérivée de la clé de service Supabase par HMAC avec une étiquette
 * fixe : commune à toutes les instances, jamais exposée, et sa fuite éventuelle
 * ne révèle rien de la clé d'origine.
 */
function key() {
  const source = useRuntimeConfig().supabaseServiceRoleKey as string | undefined
  if (!source) throw createError({ statusCode: 500, statusMessage: 'Clé de signature absente' })
  return createHmac('sha256', source).update('orgue-vivant:form-token').digest()
}

function sign(payload: string) {
  return createHmac('sha256', key()).update(payload).digest('base64url')
}

export function issueFormToken(): string {
  const issued = Date.now().toString(36)
  return `${issued}.${sign(issued)}`
}

/** Vrai si le jeton est authentique et émis dans la fenêtre [minAge, maxAge]. */
export function verifyFormToken(token: unknown, { minAgeMs = 1_500, maxAgeMs = 12 * 3_600_000 } = {}): boolean {
  if (typeof token !== 'string') return false
  const [issued, sig] = token.split('.')
  if (!issued || !sig) return false
  const expected = sign(issued)
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false
  const age = Date.now() - parseInt(issued, 36)
  return age >= minAgeMs && age <= maxAgeMs
}
