import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id: _id, created_at, ...body } = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
  if (!body.date) throw createError({ statusCode: 400, statusMessage: 'Date requise' })
  if (!body.location) throw createError({ statusCode: 400, statusMessage: 'Lieu requis' })

  const client = getServiceClient()
  const { data, error } = await client.from('concerts').insert(body).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
