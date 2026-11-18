// Les pages mises en cache par Vercel (ISR, et leur _payload.json) sont
// servies telles quelles à tous les visiteurs pendant une heure. Rendues avec
// les cookies de la personne qui déclenche leur génération, elles emportaient
// sa session Supabase (jetons, e-mail) dans le HTML mis en cache, et leurs
// requêtes partaient avec ses droits. On les rend donc toujours comme pour un
// visiteur anonyme ; le navigateur relit la session après le chargement.
export default defineEventHandler((event) => {
  const rules = getRouteRules(event)
  if (!rules.isr && !rules.cache) return

  delete event.node.req.headers.cookie
  delete event.node.req.headers.authorization
  // h3 peut avoir déjà copié les en-têtes : on retire aussi de cette copie.
  event.headers.delete('cookie')
  event.headers.delete('authorization')
})
