/**
 * Revalidation ISR à la demande (Vercel).
 *
 * Les pages publiques sont servies depuis le cache CDN de Vercel (routeRules `isr`).
 * Une requête portant l'en-tête `x-prerender-revalidate: <bypassToken>` force Vercel
 * à régénérer la page et à remplacer la version en cache.
 *
 * Le token est injecté au build via `nitro.vercel.config.bypassToken` (nuxt.config.ts)
 * et lu ici via `runtimeConfig.vercelBypassToken`. Les deux viennent de VERCEL_BYPASS_TOKEN.
 */

// Les deux langues : sans les chemins /en, la version anglaise des listes
// restait servie depuis le cache jusqu'à une heure après un enregistrement.
export const PUBLIC_ISR_PATHS = [
  '/', '/concerts', '/news', '/moments-musicaux',
  '/en', '/en/concerts', '/en/news', '/en/moments-musicaux'
] as const

export async function revalidatePublicPages(paths: readonly string[] = PUBLIC_ISR_PATHS) {
  const config = useRuntimeConfig()
  const token = config.vercelBypassToken as string | undefined
  if (!token) return // dev local ou token non configuré : rien à purger

  const base = (config.public.siteUrl as string).replace(/\/$/, '')

  // Le navigateur hydrate une page ISR avec ses données, servies à part
  // (_payload.json) et mises en cache par Vercel sous leur adresse complète,
  // identifiant du build compris. Ne purger que la page laissait ces données
  // vieilles d'une heure au plus : le HTML était à jour, l'affichage non.
  const buildId = (config.app as { buildId?: string }).buildId
  const urls = paths.flatMap(path =>
    buildId ? [path, `${path === '/' ? '' : path}/_payload.json?${buildId}`] : [path])

  await Promise.allSettled(
    urls.map(async (path) => {
      try {
        const res = await fetch(base + path, {
          method: 'GET',
          headers: { 'x-prerender-revalidate': token },
          cache: 'no-store'
        })
        if (!res.ok) console.warn(`[revalidate] ${path} → HTTP ${res.status}`)
      } catch (e) {
        console.warn(`[revalidate] ${path} failed`, e)
      }
    })
  )
}
