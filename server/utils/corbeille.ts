import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Corbeille des concerts et des actualités (voir supabase/corbeille.sql).
 * Supprimer pose une date de suppression ; la politique de lecture publique
 * masque alors la ligne partout. Elle reste restaurable trente jours, puis une
 * tâche quotidienne de Supabase l'efface — même délai que dans le script SQL.
 */
export const DELAI_CORBEILLE_JOURS = 30

export const TABLES_CORBEILLE = ['concerts', 'news'] as const
export type TableCorbeille = typeof TABLES_CORBEILLE[number]

export function tableCorbeille(valeur: unknown): TableCorbeille {
  if (!TABLES_CORBEILLE.includes(valeur as TableCorbeille)) throw createError({ statusCode: 400, statusMessage: 'Type inconnu' })
  return valeur as TableCorbeille
}

/** Colonnes de la corbeille absentes : corbeille.sql n'a pas encore été exécuté. */
export const corbeilleAbsente = (error: { code?: string } | null) => ['42703', 'PGRST204'].includes(error?.code ?? '')

export async function mettreALaCorbeille(client: SupabaseClient, table: TableCorbeille, id: string, par: string | undefined) {
  const { data, error } = await client.from(table)
    .update({ deleted_at: new Date().toISOString(), deleted_by: par ?? null })
    .eq('id', id).is('deleted_at', null).select('id')
  // Sans les colonnes, on refuse plutôt que d'effacer pour de bon.
  if (corbeilleAbsente(error)) throw createError({ statusCode: 503, statusMessage: 'La corbeille n\'est pas encore installée : exécutez supabase/corbeille.sql dans Supabase.' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'Introuvable, ou déjà dans la corbeille.' })
}
