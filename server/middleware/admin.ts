import { serverSupabaseUser } from '#supabase/server'
import { sendRedirect, getRequestURL } from 'h3'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (!path.startsWith('/admin')) return
  if (path === '/admin/login' || path.startsWith('/admin/login')) return
  if (path === '/auth-setup' || path.startsWith('/auth-setup')) return

  try {
    const user = await serverSupabaseUser(event)
    if (!user) return sendRedirect(event, '/admin/login', 302)

    const role = (user.app_metadata as Record<string, unknown>)?.role
    if (role !== 'admin' && role !== 'super_admin') return sendRedirect(event, '/admin/login', 302)
    if (path.startsWith('/admin/users') && role !== 'super_admin') return sendRedirect(event, '/admin/concerts', 302)
  } catch {
    return sendRedirect(event, '/admin/login', 302)
  }
})
