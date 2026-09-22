import { fermerAcces } from '~/server/utils/moments'

/** Sortie de l'espace des professeurs (ordinateur partagé d'un conservatoire, par exemple). */
export default defineEventHandler((event) => {
  fermerAcces(event)
  return { ok: true }
})
