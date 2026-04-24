import { createClient } from '@supabase/supabase-js'
import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requireSuperAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const role = (user.app_metadata as Record<string, unknown>)?.role
  if (role !== 'super_admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  return user
}

export function getServiceClient() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.supabaseServiceRoleKey as string
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Service role not configured' })
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
