/**
 * Liens externes de l'association — source unique pour le pied de page, la
 * page contact et les données structurées.
 *
 * `kind` distingue les profils sociaux (repris dans `sameAs`, qui décrit
 * l'identité de l'association) de la page d'adhésion, qui n'en fait pas partie.
 */
export const socialLinks = [
  { id: 'facebook', name: 'Facebook', kind: 'social', url: 'https://www.facebook.com/orguevivant' },
  { id: 'instagram', name: 'Instagram', kind: 'social', url: 'https://www.instagram.com/orgue.vivant' },
  { id: 'helloasso', name: 'HelloAsso', kind: 'support', url: 'https://www.helloasso.com/associations/orgue-vivant/adhesions/orgue-vivant-adhesion' }
] as const

export type SocialId = typeof socialLinks[number]['id']
