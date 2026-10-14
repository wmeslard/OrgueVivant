/** « Lumières de Saint-Maurice » → « lumieres-de-saint-maurice ». */
export function slug(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Nom d'une photo téléchargée : orgue-vivant-<album>-02.webp. */
export function nomFichierPhoto(album: string, index: number, url: string): string {
  const ext = url.split('?')[0].split('.').pop() || 'webp'
  return `orgue-vivant-${slug(album)}-${String(index + 1).padStart(2, '0')}.${ext}`
}

/**
 * Lien qui télécharge la photo au lieu de l'ouvrir : Supabase renvoie le
 * fichier en pièce jointe, sous ce nom, quand l'adresse porte `?download=`.
 */
export function lienTelechargement(url: string, nom: string): string {
  return `${url}?download=${encodeURIComponent(nom)}`
}
