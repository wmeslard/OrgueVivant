export default defineEventHandler(async (event) => {
  const { text } = await readBody<{ text: string }>(event)
  if (!text?.trim()) return { translated: '' }

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
