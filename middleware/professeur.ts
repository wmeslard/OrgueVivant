/**
 * Espace des professeurs : compte connecté avec le rôle `professeur`. Les
 * administrateurs y accèdent aussi, pour dépanner un professeur au téléphone.
 *
 * La destination demandée est passée à la page de connexion, qui y ramène
 * ensuite : un lien vers le calendrier mène bien au calendrier.
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const role = (user.value?.app_metadata as Record<string, unknown> | undefined)?.role
  if (user.value && (role === 'professeur' || role === 'admin' || role === 'super_admin')) return
  const localePath = useLocalePath()
  return navigateTo({ path: localePath('/moments-musicaux/connexion'), query: { suite: to.fullPath } })
})
