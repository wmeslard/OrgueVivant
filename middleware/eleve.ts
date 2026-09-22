/**
 * Espace des élèves organistes : compte connecté avec le rôle `eleve`.
 *
 * La destination demandée est passée à la page de connexion, qui y ramène
 * ensuite : un lien vers le calendrier de réservation envoyé par email mène
 * bien au calendrier, et non à l'accueil de l'espace.
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const role = (user.value?.app_metadata as Record<string, unknown> | undefined)?.role
  if (user.value && role === 'eleve') return
  const localePath = useLocalePath()
  return navigateTo({ path: localePath('/moments-musicaux/connexion'), query: { suite: to.fullPath } })
})
