/**
 * Réduit une photo dans le navigateur avant l'envoi : une grande image pour la
 * visionneuse et une vignette pour les grilles, en WebP (en JPEG si le
 * navigateur ne sait pas écrire le WebP). Le décodage passe par le navigateur
 * lui-même : Safari lit les HEIC de l'iPhone, Chrome et Firefox non.
 */
export const COTE_GRANDE = 2000
export const COTE_VIGNETTE = 640

export interface PhotoReduite {
  grande: Blob
  vignette: Blob
  format: 'webp' | 'jpg'
  largeur: number
  hauteur: number
}

export class FormatIllisible extends Error {}

async function decoder(fichier: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(fichier)
  const img = new Image()
  img.src = url
  try {
    await img.decode()
  } catch {
    URL.revokeObjectURL(url)
    const heic = /\.(heic|heif)$/i.test(fichier.name) || /hei[cf]/i.test(fichier.type)
    throw new FormatIllisible(heic
      ? 'Photo HEIC illisible dans ce navigateur : ouvrez l\'admin dans Safari, ou exportez la photo en JPEG.'
      : 'Format d\'image non reconnu.')
  }
  return { img, url }
}

function versBlob(canvas: HTMLCanvasElement, type: string, qualite: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, qualite))
}

async function encoder(img: HTMLImageElement, cote: number, format: 'webp' | 'jpg'): Promise<{ blob: Blob; w: number; h: number }> {
  const echelle = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * echelle)
  const h = Math.round(img.naturalHeight * echelle)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await versBlob(canvas, format === 'webp' ? 'image/webp' : 'image/jpeg', format === 'webp' ? 0.84 : 0.86)
  canvas.width = canvas.height = 0
  if (!blob) throw new Error('Réduction de la photo impossible')
  return { blob, w, h }
}

export async function reduirePhoto(fichier: File): Promise<PhotoReduite> {
  const { img, url } = await decoder(fichier)
  try {
    let format: 'webp' | 'jpg' = 'webp'
    let grande = await encoder(img, COTE_GRANDE, format)
    // Un navigateur qui ne sait pas écrire le WebP rend du PNG : on passe au JPEG.
    if (grande.blob.type !== 'image/webp') {
      format = 'jpg'
      grande = await encoder(img, COTE_GRANDE, format)
    }
    const vignette = await encoder(img, COTE_VIGNETTE, format)
    return { grande: grande.blob, vignette: vignette.blob, format, largeur: grande.w, hauteur: grande.h }
  } finally {
    URL.revokeObjectURL(url)
  }
}
