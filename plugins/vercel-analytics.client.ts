import { injectAnalytics } from '@vercel/analytics/nuxt/runtime'

/**
 * Statistiques Vercel (sans cookie). L'adresse d'entrée dans l'espace des
 * Moments musicaux contient la clé du lien partagé : elle est masquée avant
 * l'envoi, pour ne jamais apparaître dans le tableau de bord.
 */
export default defineNuxtPlugin(() => {
  injectAnalytics({
    beforeSend: event => ({ ...event, url: event.url.replace(/(\/moments-musicaux\/acces\/)[^/?#]+/, '$1…') })
  })
})
