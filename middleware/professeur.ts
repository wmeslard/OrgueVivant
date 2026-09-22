/**
 * Espace des professeurs : il faut être entré par le lien que l'association
 * transmet (cookie posé par /api/moments/acces). Sans lui — ou si le lien a
 * été régénéré depuis — on arrive sur la page qui explique comment l'obtenir.
 *
 * Le chargement sert de vérification : l'espace est lu ici une fois, puis
 * repris tel quel par les pages.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { charger } = useMomentsEspace()
  try {
    await charger()
  } catch (e: any) {
    const status = e?.statusCode ?? e?.response?.status
    if (status !== 401 && status !== 403) throw e
    const localePath = useLocalePath()
    return navigateTo({ path: localePath('/moments-musicaux/acces'), query: status === 403 ? { desactive: '1' } : undefined })
  }
})
