import { serverSupabaseUser } from '#supabase/server'

const hits = new Map<string, { count: number; reset: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10
const MAX_TEXT_LENGTH = 5000

// L'API gratuite de MyMemory refuse toute requête dont le paramètre `q`
// dépasse 500 caractères. On découpe donc le texte et on recolle ensuite.
const CHUNK_LIMIT = 450

interface MyMemoryResponse {
  responseStatus: number | string
  responseDetails?: string
  responseData?: { translatedText?: string }
}

/**
 * Découpe le texte en segments sous la limite de l'API, en coupant de
 * préférence sur une fin de phrase, sinon sur un espace. Les séparateurs sont
 * conservés pour que la concaténation reconstitue le texte d'origine.
 */
function splitIntoChunks(text: string, limit: number): string[] {
  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current) { chunks.push(current); current = '' }
  }

  const pieces = text.match(/[^.!?\n]*[.!?]+|\n+|[^.!?\n]+/g) ?? [text]

  for (const piece of pieces) {
    if (piece.length > limit) {
      flush()
      let rest = piece
      while (rest.length > limit) {
        let cut = rest.lastIndexOf(' ', limit)
        if (cut <= 0) cut = limit
        chunks.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      current = rest
    } else if (current.length + piece.length > limit) {
      flush()
      current = piece
    } else {
      current += piece
    }
  }

  flush()
  return chunks
}

async function translateChunk(text: string, email?: string): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', 'fr|en')
  if (email) url.searchParams.set('de', email)

  const res = await $fetch<MyMemoryResponse>(url.toString(), { timeout: 15_000 })

  // MyMemory renvoie 200 sous forme de nombre mais ses erreurs sous forme de
  // chaîne ('403'), d'où la normalisation avant comparaison.
  const status = Number(res?.responseStatus)
  if (status !== 200) {
    throw createError({
      statusCode: 502,
      statusMessage: `Traduction indisponible (${status}) : ${res?.responseDetails || 'réponse inattendue'}`
    })
  }

  const translated = res.responseData?.translatedText ?? ''

  // Quota journalier épuisé : MyMemory répond 200 en glissant l'avertissement
  // dans le texte traduit. Sans ce garde-fou on enregistrerait le message
  // d'erreur en guise de traduction anglaise.
  if (/MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS/i.test(translated)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Quota de traduction quotidien épuisé. Réessayez demain.'
    })
  }

  return translated
}

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

  const email = useRuntimeConfig().myMemoryEmail as string | undefined

  const out: string[] = []
  for (const chunk of splitIntoChunks(text, CHUNK_LIMIT)) {
    // On isole les espaces de bord : l'API les rogne, et sans ça les sauts de
    // ligne entre paragraphes disparaîtraient de la traduction.
    const [, pre, core, post] = chunk.match(/^(\s*)([\s\S]*?)(\s*)$/) as RegExpMatchArray
    if (!core) { out.push(chunk); continue }
    out.push(pre + await translateChunk(core, email) + post)
  }

  return { translated: out.join('') }
})
