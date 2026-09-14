/**
 * Les deux églises, avec l'adresse et les coordonnées utilisées par les
 * données structurées (schema.org/Place). Adresses et positions reprises
 * des liens Google Maps du site (voir useMapsUrls).
 */
export const venues = {
  saint_maurice: {
    name: 'Église Saint-Maurice de Lille',
    streetAddress: 'Parvis Saint-Maurice',
    postalCode: '59800',
    latitude: 50.6357131,
    longitude: 3.0670094
  },
  saint_etienne: {
    name: 'Église Saint-Étienne de Lille',
    streetAddress: "47 rue de l'Hôpital Militaire",
    postalCode: '59000',
    latitude: 50.6351968,
    longitude: 3.0600039
  }
} as const

export type VenueId = keyof typeof venues
