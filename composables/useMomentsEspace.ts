import type { Fermeture } from '~/utils/moments'

export interface SeanceEleve {
  id: string
  date: string
  programme: string | null
  statut: 'reservee' | 'annulee'
}

export interface EspaceEleve {
  aujourdhui: string
  horizon: string
  maxAVenir: number
  eleve: { prenom: string; nom: string; email: string }
  fermetures: Fermeture[]
  /** Dates déjà réservées, toutes personnes confondues. */
  prises: { date: string; interprete: string; mienne: boolean }[]
  mesSeances: SeanceEleve[]
}

/**
 * État partagé de l'espace élève : le tableau de bord et le calendrier de
 * réservation lisent les mêmes données, chargées une fois et rafraîchies après
 * chaque réservation ou annulation. Sans cela, passer d'une page à l'autre
 * relançait la requête et affichait brièvement un espace vide.
 */
export function useMomentsEspace() {
  const espace = useState<EspaceEleve | null>('moments-espace', () => null)
  const pending = useState<boolean>('moments-espace-pending', () => false)

  async function charger(force = false) {
    if (espace.value && !force) return espace.value
    pending.value = true
    try {
      // `useRequestFetch` transmet les cookies de la requête en cours : sans
      // eux, l'appel fait pendant le rendu serveur arriverait sans session et
      // l'API répondrait 401.
      espace.value = await useRequestFetch()<EspaceEleve>('/api/moments/espace')
    } finally {
      pending.value = false
    }
    return espace.value
  }

  const aVenir = computed(() =>
    (espace.value?.mesSeances ?? [])
      .filter(s => s.statut === 'reservee' && s.date >= (espace.value?.aujourdhui ?? ''))
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  const passees = computed(() =>
    (espace.value?.mesSeances ?? [])
      .filter(s => s.statut === 'reservee' && s.date < (espace.value?.aujourdhui ?? ''))
      .sort((a, b) => b.date.localeCompare(a.date))
  )

  const quotaAtteint = computed(() => !!espace.value && aVenir.value.length >= espace.value.maxAVenir)

  return { espace, pending, charger, aVenir, passees, quotaAtteint }
}
