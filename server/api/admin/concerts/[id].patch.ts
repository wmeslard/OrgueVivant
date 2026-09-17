import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'
import { revalidatePublicPages } from '~/server/utils/revalidate'

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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  const { id: _id, created_at, ...body } = await readBody(event)
  assertHttpUrl(body.external_link, 'external_link')
  assertHttpUrl(body.image_url, 'image_url')

  const client = getServiceClient()
  const { error } = await client.from('concerts').update(body).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await revalidatePublicPages()
  return { ok: true }
})
