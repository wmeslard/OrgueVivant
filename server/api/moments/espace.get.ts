import { getServiceClient } from '~/server/utils/superAdminClient'
import { aujourdhuiParis, chargerFermetures, chargerSeances, requireEleve } from '~/server/utils/moments'
import { HORIZON_MOIS, MAX_SEANCES_A_VENIR, plusMois, nomPublic } from '~/utils/moments'

/**
 * Tout ce dont l'espace élève a besoin en une requête : la période
 * réservable, les fermetures, les dates prises (avec le prénom de l'élève
 * qui les occupe) et les séances de l'élève connecté.
 */
export default defineEventHandler(async (event) => {
  const eleve = await requireEleve(event)
  const client = getServiceClient()
  const du = aujourdhuiParis()
  const au = plusMois(du, HORIZON_MOIS)
  const [fermetures, seances, miennes] = await Promise.all([
    chargerFermetures(client, du, au),
    chargerSeances(client, du, au),
    client.from('moments_seances').select('*').eq('eleve_id', eleve.id).order('date', { ascending: false }).limit(40)
  ])
  if (miennes.error) throw createError({ statusCode: 500, statusMessage: miennes.error.message })
  return {
    aujourdhui: du,
    horizon: au,
    maxAVenir: MAX_SEANCES_A_VENIR,
    eleve: { prenom: eleve.prenom, nom: eleve.nom, email: eleve.email },
    fermetures,
    prises: seances.map(s => ({
      date: s.date,
      interprete: s.eleve ? nomPublic(s.eleve.prenom, s.eleve.nom) : '',
      mienne: s.eleve_id === eleve.id
    })),
    mesSeances: miennes.data ?? []
  }
})
