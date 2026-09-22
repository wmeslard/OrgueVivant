/** Espace des élèves organistes : compte connecté avec le rôle `eleve`. */
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  const role = (user.value?.app_metadata as Record<string, unknown> | undefined)?.role
  if (!user.value || role !== 'eleve') return navigateTo('/moments-musicaux/connexion')
})
