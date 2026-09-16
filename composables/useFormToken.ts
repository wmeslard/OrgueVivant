/**
 * Jeton anti-robot des formulaires publics (voir server/utils/formToken.ts).
 *
 * Demandé une seule fois, au montage, pour que le délai mesuré soit celui d'un
 * vrai visiteur. À la soumission, on attend si nécessaire que le jeton ait
 * l'âge minimal exigé par le serveur, plutôt que d'essuyer un refus : un
 * visiteur dont l'adresse est pré-remplie valide parfois en moins de 3 s.
 */
const MIN_AGE_MS = 3_200 // un peu plus que le minimum côté serveur

export function useFormToken() {
  let token: Promise<string> | null = null
  let receivedAt = 0

  function request() {
    token ??= $fetch<{ token: string }>('/api/form-token').then((r) => {
      receivedAt = Date.now()
      return r.token
    })
    return token
  }

  onMounted(() => { request().catch(() => { token = null }) })

  /** Le jeton, une fois assez ancien pour être accepté. */
  async function ready() {
    const value = await request()
    const wait = MIN_AGE_MS - (Date.now() - receivedAt)
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    return value
  }

  /** À appeler après un refus : un jeton rejeté ne sert plus. */
  function reset() { token = null }

  return { ready, reset }
}
