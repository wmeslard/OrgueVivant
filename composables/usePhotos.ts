/**
 * Albums photos publiés, lus avec la clé publique : la politique RLS
 * (supabase/photos.sql) ne laisse voir que les albums publiés et leurs photos.
 * Les adresses des fichiers se calculent sans requête.
 */
export interface AlbumPublic {
  id: string
  titre: string
  date: string | null
  concert_id: string | null
  nombre: number
  /** Vignette de couverture ; à défaut, celle de la première photo. */
  couverture: string | null
  /**
   * Vignette et taille intermédiaire de la couverture, avec leur largeur réelle :
   * le navigateur prend la seconde sur un écran haute définition seulement.
   */
  couverture_srcset: string | null
}

export interface PhotoPublique {
  id: string
  /** Copie d'affichage (WebP, 2000 px). */
  url: string
  url_vignette: string
  /** Fichier d'origine, en pleine définition : zoom et téléchargement. Absent pour les premières photos. */
  url_originale: string | null
  legende: string | null
  largeur: number | null
  hauteur: number | null
}

interface LignePhoto {
  id: string; album_id: string; chemin: string; chemin_vignette: string
  chemin_original?: string | null; chemin_moyenne?: string | null
  legende: string | null; largeur: number | null; hauteur: number | null; ordre: number
}

export function usePhotos() {
  const supabase = useSupabaseClient()
  const adresse = (chemin: string) => supabase.storage.from('photos').getPublicUrl(chemin).data.publicUrl

  async function albums(): Promise<AlbumPublic[]> {
    const [a, p] = await Promise.all([
      supabase.from('photo_albums').select('id, titre, date, concert_id, couverture_id')
        .order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
      // Toutes les colonnes : chemin_moyenne n'existe qu'une fois supabase/photos-moyenne.sql exécuté.
      supabase.from('photos').select('*').order('ordre')
    ])
    if (a.error) throw a.error
    if (p.error) throw p.error
    const photos = (p.data ?? []) as LignePhoto[]
    const srcset = (x: LignePhoto) => {
      if (!x.chemin_moyenne) return null
      const l = x.largeur ?? 1, h = x.hauteur ?? 1, cote = Math.max(l, h)
      return `${adresse(x.chemin_vignette)} ${Math.round(l * 640 / cote)}w, ${adresse(x.chemin_moyenne)} ${Math.round(l * 1280 / cote)}w`
    }
    return (a.data ?? []).map((album) => {
      const siennes = photos.filter(x => x.album_id === album.id)
      const couverture = siennes.find(x => x.id === album.couverture_id) ?? siennes[0]
      return {
        id: album.id, titre: album.titre, date: album.date, concert_id: album.concert_id,
        nombre: siennes.length,
        couverture: couverture ? adresse(couverture.chemin_vignette) : null,
        couverture_srcset: couverture ? srcset(couverture) : null
      }
    }).filter(album => album.nombre > 0)
  }

  async function album(id: string) {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null
    const [a, p] = await Promise.all([
      supabase.from('photo_albums').select('id, titre, date, concert_id, couverture_id').eq('id', id).maybeSingle(),
      supabase.from('photos').select('*').eq('album_id', id).order('ordre').order('created_at')
    ])
    if (a.error) throw a.error
    if (p.error) throw p.error
    if (!a.data) return null
    const photos: PhotoPublique[] = ((p.data ?? []) as LignePhoto[]).map(x => ({
      id: x.id, url: adresse(x.chemin), url_vignette: adresse(x.chemin_vignette),
      url_originale: x.chemin_original ? adresse(x.chemin_original) : null,
      legende: x.legende, largeur: x.largeur, hauteur: x.hauteur
    }))
    let concert: { id: string; title: string; title_en?: string | null } | null = null
    if (a.data.concert_id) {
      const { data } = await supabase.from('concerts').select('id, title, title_en').eq('id', a.data.concert_id).maybeSingle()
      concert = data
    }
    const couverture = photos.find(x => x.id === a.data!.couverture_id) ?? photos[0] ?? null
    return { album: a.data, photos, concert, couverture }
  }

  return { albums, album }
}
