import { serverSupabaseUser } from '#supabase/server'
import { sendRedirect, getRequestURL } from 'h3'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (!path.startsWith('/admin')) return
  if (path === '/admin/login' || path.startsWith('/admin/login')) return

  try {
    const user = await serverSupabaseUser(event)
    if (!user) return sendRedirect(event, '/admin/login', 302)
  } catch {
    return sendRedirect(event, '/admin/login', 302)
  }
})
