import type { Horaire, Musicien } from '~/utils/moments'

export interface SeanceProf {
  id: string
  date: string
  heure_debut: string
  heure_fin: string
  eleve_prenom: string
  eleve_nom: string
  eleve_email: string | null
  programme: string | null
  /** La personne entrée par le lien joue elle-même. */
  pour_soi?: boolean
  /** Tous les musiciens ; vide pour une séance en solo d'avant le jeu à plusieurs. */
  musiciens?: Musicien[] | null
  statut: 'reservee' | 'annulee'
}

export interface EspaceProfesseur {
  aujourdhui: string
  horizon: string
  professeur: { prenom: string; nom: string; email: string; conservatoire: string | null }
  /** Règles d'ouverture de l'orgue, par défaut et temporaires. */
  horaires: Horaire[]
  /** Créneaux déjà pris, tous professeurs confondus. */
  pris: { date: string; heure_debut: string; interprete: string; mien: boolean }[]
  /** Jeudis où Louis-Paul Courtois joue, faute d'inscrit. */
  affectes?: string[]
  mesSeances: SeanceProf[]
}

/**
 * État partagé de l'espace des professeurs : le tableau de bord et le
 * calendrier lisent les mêmes données, chargées une fois et rafraîchies après
 * chaque inscription ou annulation. Sans cela, passer d'une page à l'autre
 * relançait la requête et affichait brièvement un espace vide.
 */
export function useMomentsEspace() {
  const espace = useState<EspaceProfesseur | null>('moments-espace', () => null)
  const pending = useState<boolean>('moments-espace-pending', () => false)

  async function charger(force = false) {
    if (espace.value && !force) return espace.value
    pending.value = true
    try {
      // `useRequestFetch` transmet les cookies de la requête en cours : sans
      // eux, l'appel fait pendant le rendu serveur arriverait sans session et
      // l'API répondrait 401.
      espace.value = await useRequestFetch()<EspaceProfesseur>('/api/moments/espace')
    } finally {
      pending.value = false
    }
    return espace.value
  }

  const aVenir = computed(() =>
    (espace.value?.mesSeances ?? [])
      .filter(s => s.statut === 'reservee' && s.date >= (espace.value?.aujourdhui ?? ''))
      .sort((a, b) => a.date.localeCompare(b.date) || a.heure_debut.localeCompare(b.heure_debut))
  )

  const passees = computed(() =>
    (espace.value?.mesSeances ?? [])
      .filter(s => s.statut === 'reservee' && s.date < (espace.value?.aujourdhui ?? ''))
      .sort((a, b) => b.date.localeCompare(a.date))
  )

  /** Sortie de l'espace : le cookie d'accès est effacé, l'état aussi. */
  async function quitter() {
    await $fetch('/api/moments/acces', { method: 'DELETE' })
    espace.value = null
  }

  return { espace, pending, charger, quitter, aVenir, passees }
}
