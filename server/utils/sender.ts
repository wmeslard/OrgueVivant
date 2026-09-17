/**
 * Expéditeur des e-mails du site. CONTACT_FROM accepte une adresse nue
 * (« contact@orguevivant.fr ») ou la forme complète (« Orgue Vivant <…> ») ;
 * sans variable, l'adresse de contact de l'association.
 */
export function senderAddress() {
  const from = (useRuntimeConfig().contactFrom as string | undefined)?.trim()
  if (!from) return 'Orgue Vivant <contact@orguevivant.fr>'
  return from.includes('<') ? from : `Orgue Vivant <${from}>`
}
