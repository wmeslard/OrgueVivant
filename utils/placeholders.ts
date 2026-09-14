/**
 * Illustrations par défaut des concerts sans image.
 *
 * Six variations abstraites dans la langue graphique du site — montagne de
 * tuyaux, buffet à tourelle, rang en escalier, gros plan sur des bouches,
 * claviers, rosace. Les sources SVG sont à côté des WebP dans
 * public/img/placeholders/.
 *
 * Le choix est déterministe : un concert donné garde toujours la même
 * illustration, et deux concerts voisins en reçoivent en général des
 * différentes.
 */
export const placeholderCount = 6

/** Chemin public de l'illustration attribuée à un concert, d'après son identifiant. */
export function concertPlaceholder(id: string | null | undefined): string {
  let h = 0
  for (const c of String(id ?? '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `/img/placeholders/orgue-${(h % placeholderCount) + 1}.webp`
}
