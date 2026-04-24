export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/admin/login')

  const role = (user.value.app_metadata as Record<string, unknown>)?.role
  if (role !== 'admin' && role !== 'super_admin') return navigateTo('/admin/login')
})
