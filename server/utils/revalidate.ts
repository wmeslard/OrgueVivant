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

export const PUBLIC_ISR_PATHS = ['/', '/concerts', '/news'] as const

export async function revalidatePublicPages(paths: readonly string[] = PUBLIC_ISR_PATHS) {
  const config = useRuntimeConfig()
  const token = config.vercelBypassToken as string | undefined
  if (!token) return // dev local ou token non configuré : rien à purger

  const base = (config.public.siteUrl as string).replace(/\/$/, '')

  await Promise.allSettled(
    paths.map(async (path) => {
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
