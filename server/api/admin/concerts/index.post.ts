import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'
import { TEASER_A_INSTALLER, colonneTeaserAbsente, normaliserTeaser } from '~/server/utils/teaser'

/** Les liens saisis dans l'admin ne peuvent être que http(s) : un `javascript:` stocké s'exécuterait chez les visiteurs. */
function assertHttpUrl(value: unknown, field: string) {
  if (value == null || value === '') return
  try {
    const u = new URL(String(value))
    if (u.protocol === 'http:' || u.protocol === 'https:') return
  } catch { /* invalide */ }
  throw createError({ statusCode: 400, statusMessage: `${field} : lien invalide (http ou https attendu)` })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id: _id, created_at, ...body } = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
  if (!body.date) throw createError({ statusCode: 400, statusMessage: 'Date requise' })
  if (!body.location) throw createError({ statusCode: 400, statusMessage: 'Lieu requis' })
  assertHttpUrl(body.external_link, 'external_link')
  assertHttpUrl(body.image_url, 'image_url')
  assertHttpUrl(body.programme_url, 'programme_url')
  normaliserTeaser(body)

  const client = getServiceClient()
  let { data, error } = await client.from('concerts').insert(body).select().single()
  // Colonne du teaser pas encore créée : sans teaser, le concert s'enregistre quand même.
  if (colonneTeaserAbsente(error)) {
    if (body.teaser_url) throw createError({ statusCode: 503, statusMessage: TEASER_A_INSTALLER })
    delete body.teaser_url
    ;({ data, error } = await client.from('concerts').insert(body).select().single())
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await revalidatePublicPages()
  return data
})
