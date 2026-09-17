/**
 * Œuf de Pâques : la signature B-A-C-H (Si♭, La, Do, Si).
 *
 * Deux façons de la jouer : taper les lettres au clavier n'importe où sur le
 * site (plugins/bach.client.ts), ou, sur tout écran, un appui long sur le
 * point doré du logo qui ouvre un mini-clavier de quatre touches
 * (components/BachClavier.vue). `progress` compte les notes justes, `found`
 * reste vrai pour la session une fois le motif complet.
 */
const MOTIF = 'bach'
const NOTES: Record<string, number> = { b: 466.16, a: 440, c: 523.25, h: 493.88 }

let ctx: AudioContext | null = null
let lastAt = 0

/** Une note dans un timbre d'orgue simple : fondamentale et trois harmoniques. */
function joue(freq: number, duree = 0.9) {
  try {
    ctx ??= new AudioContext()
    const t0 = ctx.currentTime
    const sortie = ctx.createGain()
    sortie.gain.setValueAtTime(0.0001, t0)
    sortie.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04)
    sortie.gain.setValueAtTime(0.07, t0 + duree - 0.35)
    sortie.gain.exponentialRampToValueAtTime(0.0001, t0 + duree)
    sortie.connect(ctx.destination)
    for (const [rang, niveau] of [[1, 1], [2, 0.45], [3, 0.22], [4, 0.1]] as const) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.frequency.value = freq * rang
      g.gain.value = niveau
      osc.connect(g).connect(sortie)
      osc.start(t0)
      osc.stop(t0 + duree)
    }
  } catch { /* pas d'audio : l'effet visuel suffit */ }
}

export function useBach() {
  const progress = useState<number>('bach-progress', () => 0)
  const found = useState<boolean>('bach-found', () => false)

  /** Une lettre jouée ; vrai si elle était attendue. */
  function saisir(lettre: string) {
    if (found.value) return true
    const l = lettre.toLowerCase()
    if (!(l in NOTES)) { progress.value = 0; return false }
    const now = Date.now()
    if (now - lastAt > 2500) progress.value = 0   // trop de silence : on repart
    lastAt = now
    joue(NOTES[l])
    if (l === MOTIF[progress.value]) {
      progress.value += 1
      if (progress.value === MOTIF.length) found.value = true
      return true
    }
    progress.value = l === MOTIF[0] ? 1 : 0
    return false
  }

  return { progress, found, saisir, lettres: MOTIF.split('') }
}
