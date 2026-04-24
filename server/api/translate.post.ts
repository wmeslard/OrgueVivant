import { serverSupabaseUser } from '#supabase/server'

const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10
const MAX_TEXT_LENGTH = 5000

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const now = Date.now()
  const key = user.id
  const entry = hits.get(key)
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS })
  } else {
    if (entry.count >= MAX_PER_WINDOW)
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    entry.count++
  }

  const { text } = await readBody<{ text: string }>(event)
  if (!text?.trim()) return { translated: '' }
  if (text.length > MAX_TEXT_LENGTH)
    throw createError({ statusCode: 400, statusMessage: 'Text too long' })

  const config = useRuntimeConfig()
  const email = config.myMemoryEmail

  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', 'fr|en')
  if (email) url.searchParams.set('de', email)

  const res = await $fetch<{ responseStatus: number; responseData: { translatedText: string } }>(url.toString())

  if (res.responseStatus !== 200) throw createError({ statusCode: 502, message: 'Translation failed' })

  return { translated: res.responseData.translatedText }
})
