import { serverSupabaseClient } from '#supabase/server'

/**
 * Fiches concert à inclure dans le sitemap. Lecture avec la clé publique :
 * la politique RLS expose déjà les concerts à tous les visiteurs, inutile
 * d'élever les droits. `_i18nTransform` laisse le module produire la
 * variante anglaise et les liens hreflang entre les deux.
 */
export default defineSitemapEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('concerts').select('id').order('date', { ascending: false })
  if (error) {
    console.warn('[sitemap] concerts indisponibles :', error.message)
    return []
  }
  return (data ?? []).map(c => ({ loc: `/concerts/${c.id}`, _i18nTransform: true }))
})
