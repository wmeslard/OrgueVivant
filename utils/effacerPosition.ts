/**
 * Efface la position GPS d'une photo sans toucher à l'image : le fichier garde
 * sa taille, son format et ses pixels, seules les coordonnées deviennent des
 * zéros. Les originaux des albums sont publics et téléchargeables : sans cela,
 * ils diraient où chaque photo a été prise.
 *
 * - EXIF (JPEG, HEIC, WebP) : le répertoire GPS de chaque bloc TIFF précédé de
 *   « Exif\0\0 » est vidé, ses valeurs comprises. L'orientation et les autres
 *   informations restent.
 * - XMP : les attributs et éléments de position (drones DJI notamment, qui y
 *   écrivent latitude, longitude et altitude) sont remplacés par des zéros de
 *   même longueur.
 *
 * Tout se fait sur place, octet pour octet : aucune longueur ni adresse interne
 * ne change, si bien que les boîtes d'un HEIC restent valides.
 */
const EXIF = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // « Exif\0\0 »
const TAILLES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

function chercher(b: Uint8Array, motif: number[], depuis: number): number {
  outer: for (let i = depuis; i <= b.length - motif.length; i++) {
    for (let j = 0; j < motif.length; j++) if (b[i + j] !== motif[j]) continue outer
    return i
  }
  return -1
}

/** Vide le répertoire GPS du bloc TIFF qui commence à `t`. Vrai s'il y en avait un. */
function effacerGpsTiff(b: Uint8Array, t: number): boolean {
  const le = b[t] === 0x49 && b[t + 1] === 0x49
  if (!le && !(b[t] === 0x4d && b[t + 1] === 0x4d)) return false
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const u16 = (o: number) => v.getUint16(t + o, le)
  const u32 = (o: number) => v.getUint32(t + o, le)
  const dans = (o: number, n: number) => o >= 0 && t + o + n <= b.length
  if (!dans(0, 8)) return false
  const ifd0 = u32(4)
  if (!dans(ifd0, 2)) return false
  const n = u16(ifd0)
  for (let k = 0; k < n; k++) {
    const e = ifd0 + 2 + k * 12
    if (!dans(e, 12) || u16(e) !== 0x8825) continue
    const gps = u32(e + 8)
    if (!dans(gps, 2)) return false
    const m = u16(gps)
    for (let j = 0; j < m; j++) {
      const g = gps + 2 + j * 12
      if (!dans(g, 12)) break
      const taille = (TAILLES[u16(g + 2)] ?? 1) * u32(g + 4)
      // Valeur hors de l'entrée : zéros à l'adresse indiquée.
      if (taille > 4) { const o = u32(g + 8); if (dans(o, taille)) b.fill(0, t + o, t + o + taille) }
      b.fill(0, t + g, t + g + 12)
    }
    v.setUint16(t + gps, 0, le)
    return true
  }
  return false
}

const XMP_GPS = /(?:Gps(?:Latitude|Longitude|Longtitude|Altitude)|AbsoluteAltitude|RelativeAltitude|exif:GPS[A-Za-z]+)(?:="([^"]*)"|>([^<]*)<)/g

/** Remplace par des zéros les valeurs de position écrites en XMP. */
function effacerGpsXmp(b: Uint8Array): boolean {
  if (chercher(b, [0x3c, 0x78, 0x3a, 0x78, 0x6d, 0x70, 0x6d, 0x65, 0x74, 0x61], 0) < 0) return false // « <x:xmpmeta »
  // latin1 : un caractère par octet, les indices du texte sont ceux du fichier.
  const texte = new TextDecoder('latin1').decode(b)
  let touche = false
  for (const m of texte.matchAll(XMP_GPS)) {
    const valeur = m[1] ?? m[2] ?? ''
    if (!valeur) continue
    const debut = m.index! + m[0].length - valeur.length - 1
    b.fill(0x30, debut, debut + valeur.length) // « 0 »
    touche = true
  }
  return touche
}

/** La photo sans sa position ; le fichier d'origine tel quel s'il n'en avait pas. */
export async function sansPosition(fichier: File): Promise<Blob> {
  const b = new Uint8Array(await fichier.arrayBuffer())
  let touche = false
  for (let i = chercher(b, EXIF, 0); i >= 0; i = chercher(b, EXIF, i + EXIF.length)) {
    try { touche = effacerGpsTiff(b, i + EXIF.length) || touche } catch { /* bloc illisible : on passe */ }
  }
  touche = effacerGpsXmp(b) || touche
  return touche ? new Blob([b], { type: fichier.type }) : fichier
}

/** Extension et type MIME d'origine, d'après le nom du fichier ou son type. */
export function formatOriginal(fichier: File): { ext: string; type: string } | null {
  const ext = (fichier.name.split('.').pop() || '').toLowerCase()
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', tif: 'image/tiff', tiff: 'image/tiff'
  }
  if (types[ext]) return { ext, type: types[ext] }
  const parType = Object.entries(types).find(([, t]) => t === fichier.type)
  return parType ? { ext: parType[0], type: parType[1] } : null
}
