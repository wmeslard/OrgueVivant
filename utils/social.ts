/**
 * Réseaux sociaux de l'association — source unique pour le pied de page, la
 * page contact et les données structurées (`sameAs`).
 */
export const socialLinks = [
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/orguevivant' },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/orgue.vivant' }
] as const

export type SocialId = typeof socialLinks[number]['id']
