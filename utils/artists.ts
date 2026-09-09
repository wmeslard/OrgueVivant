/**
 * Artistes d'un concert.
 *
 * Le champ `concerts.artists` était une simple ligne de texte ; il est devenu
 * une liste structurée, un artiste par entrée, avec photo et présentation.
 * Ces deux helpers sont volontairement sans dépendance à Nuxt afin d'être
 * utilisables aussi bien dans les composants que dans le code serveur.
 */
export interface Artist {
  name: string
  image_url?: string
  bio?: string
}

/**
 * Normalise le champ en liste exploitable.
 *
 * La forme texte est encore acceptée : elle correspond aux concerts saisis
 * avant la migration, et permet de déployer le code avant de convertir la
 * colonne sans que l'affichage passe par un état cassé.
 */
export function artistList(value: unknown): Artist[] {
  if (typeof value === 'string') {
    const name = value.trim()
    return name ? [{ name }] : []
  }
  if (!Array.isArray(value)) return []
  return value
    .filter((a): a is Artist => !!a && typeof a.name === 'string' && !!a.name.trim())
    .map(a => ({ name: a.name.trim(), image_url: a.image_url || '', bio: a.bio || '' }))
}

/** Ligne courte « A, B et C », pour les listes, les cartes et les emails. */
export function artistNames(value: unknown, locale = 'fr'): string {
  const names = artistList(value).map(a => a.name)
  if (names.length < 2) return names[0] ?? ''
  const last = names[names.length - 1]
  return `${names.slice(0, -1).join(', ')} ${locale === 'en' ? 'and' : 'et'} ${last}`
}

/**
 * Variante destinée aux formulaires : normalise le format sans écarter les
 * lignes encore vides. `artistList` les filtre, ce qui convient à l'affichage
 * mais empêche d'ajouter un artiste — la ligne neuve disparaîtrait avant
 * d'avoir pu être remplie. Le tri définitif se fait à l'enregistrement.
 */
export function artistDraft(value: unknown): Artist[] {
  if (typeof value === 'string') {
    const name = value.trim()
    return name ? [{ name, image_url: '', bio: '' }] : []
  }
  return Array.isArray(value) ? value.filter((a): a is Artist => !!a) : []
}
