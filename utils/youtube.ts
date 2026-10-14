/**
 * Identifiant (11 caractères) d'une vidéo YouTube d'après son lien : Short,
 * vidéo, youtu.be ou intégration. Null pour tout autre lien. Sert à l'admin
 * (vérifier le lien saisi) comme au site (construire le lecteur).
 */
export function idYoutube(lien: string | null | undefined): string | null {
  if (!lien) return null
  let u: URL
  try { u = new URL(lien.trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const hote = u.hostname.replace(/^(www|m)\./, '')
  let id: string | null = null
  if (hote === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
  else if (hote === 'youtube.com' || hote === 'youtube-nocookie.com') {
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)
    id = m ? m[1] : u.searchParams.get('v')
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}
