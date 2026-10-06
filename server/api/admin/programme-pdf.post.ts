import { requireAdmin, getServiceClient } from '~/server/utils/superAdminClient'

/**
 * Autorisation d'envoi du PDF d'un programme de concert. Le navigateur de
 * l'admin envoie ensuite le fichier directement à Supabase avec ce jeton : le
 * PDF ne transite pas par une fonction Vercel, limitée à 4,5 Mo par requête.
 * L'espace n'accepte que des PDF de 20 Mo au plus (supabase/programmes-concerts.sql).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getServiceClient()
  const chemin = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
  const { data, error } = await client.storage.from('concert-programmes').createSignedUploadUrl(chemin)
  if (error) {
    const absent = /not found/i.test(error.message)
    throw createError({
      statusCode: absent ? 503 : 500,
      statusMessage: absent
        ? 'Le stockage des programmes n\'est pas encore créé : exécutez supabase/programmes-concerts.sql dans Supabase.'
        : error.message
    })
  }
  const { data: publique } = client.storage.from('concert-programmes').getPublicUrl(chemin)
  return { chemin, jeton: data.token, url: publique.publicUrl }
})
