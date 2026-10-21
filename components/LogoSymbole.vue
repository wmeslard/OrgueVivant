<script setup lang="ts">
/**
 * Symbole du logo, animé, pour l'en-tête. Au survol à la souris, chaque tuyau
 * respire à son propre rythme : le corps se tasse en s'élargissant, puis
 * s'étire en s'affinant, et la bouche lâche parfois une note à cet instant.
 * Au clic, une respiration plus ample, dans un ordre au hasard. Visuel
 * seulement. Rien ne bouge si le système du visiteur demande moins
 * d'animations ; au doigt, seul le clic anime (pas de survol).
 *
 * Le lien du logo (AppHeader) appelle survoler(), quitter() et jouer().
 */

// Géométrie exacte du symbole (repère 100 × 100, comme les logos vectoriels).
// Chaque tuyau en deux pièces : le corps, qui se déforme depuis la bouche, et
// le pied, qui reste en place.
const ARCHE = 'M10 96V47.929A48 48 0 0 1 50 3.971A48 48 0 0 1 90 47.929V96A2 2 0 0 1 86 96V48.073A44 44 0 0 0 50 8.031A44 44 0 0 0 14 48.073V96A2 2 0 0 1 10 96Z'
const TUYAUX = [
  { x: 35.5, corps: 'M29.5 42H41.5V67.723Q35.500 64.197 29.500 67.723Z', pied: 'M29.500 71.000L41.500 71.000L41.500 72.600L41.351 72.600L37.510 82.880L37.900 82.880L37.900 86.000L33.100 86.000L33.100 82.880L33.490 82.880L29.649 72.600L29.500 72.600Z' },
  { x: 50, corps: 'M44 30H56V67.723Q50.000 64.197 44.000 67.723Z', pied: 'M44.000 71.000L56.000 71.000L56.000 72.600L55.851 72.600L52.010 82.880L52.400 82.880L52.400 86.000L47.600 86.000L47.600 82.880L47.990 82.880L44.149 72.600L44.000 72.600Z' },
  { x: 64.5, corps: 'M58.5 42H70.5V67.723Q64.500 64.197 58.500 67.723Z', pied: 'M58.500 71.000L70.500 71.000L70.500 72.600L70.351 72.600L66.510 82.880L66.900 82.880L66.900 86.000L62.100 86.000L62.100 82.880L62.490 82.880L58.649 72.600L58.500 72.600Z' }
]
const VB = { x: 10, y: 3.9, l: 80, h: 94.2 }      // emprise du dessin
const BOUCHE = 68.6                               // milieu de la bouche, entre lèvre et pied
const LACHER = 0.42                               // instant du souffle où la note peut partir
const AMPLITUDE = 0.18
// Tempo propre à chaque tuyau (gauche, centre, droite) et sa variation d'un souffle à l'autre.
const RYTHMES = [{ periode: 1350, ecart: 0.3 }, { periode: 1950, ecart: 0.35 }, { periode: 1650, ecart: 0.4 }]

const NOTES = [
  // croche (deux fois : la plus fréquente), noire, doubles croches
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="8.5" cy="18.5" rx="4.6" ry="3.3" transform="rotate(-24 8.5 18.5)"/><rect x="12.1" y="3" width="1.7" height="15.4" rx=".6"/><path d="M13.8 3c.4 3.2 5.6 4.4 5.6 9.4 0 1.4-.4 2.6-1.1 3.6.4-3.8-1.9-5.9-4.5-6.6z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="8.5" cy="18.5" rx="4.6" ry="3.3" transform="rotate(-24 8.5 18.5)"/><rect x="12.1" y="3" width="1.7" height="15.4" rx=".6"/><path d="M13.8 3c.4 3.2 5.6 4.4 5.6 9.4 0 1.4-.4 2.6-1.1 3.6.4-3.8-1.9-5.9-4.5-6.6z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="8.5" cy="18.5" rx="4.6" ry="3.3" transform="rotate(-24 8.5 18.5)"/><rect x="12.1" y="3" width="1.7" height="15.4" rx=".6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="19.5" rx="4" ry="2.9" transform="rotate(-24 6 19.5)"/><ellipse cx="17" cy="16.5" rx="4" ry="2.9" transform="rotate(-24 17 16.5)"/><rect x="8.9" y="5" width="1.5" height="14.2"/><rect x="19.9" y="2" width="1.5" height="14.2"/><path d="M8.9 5 21.4 2v3.2L8.9 8.2z"/></svg>'
]

const marque = ref<HTMLElement>()
const calque = ref<HTMLElement>()
const corps: SVGPathElement[] = []

const hasard = (a: number, b: number) => a + Math.random() * (b - a)
const attendre = (ms: number) => new Promise(r => setTimeout(r, ms))
const reduit = () => import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches

// Un souffle : le corps se tasse en s'élargissant, s'étire en s'affinant,
// rebondit à peine et reprend sa forme.
function souffle(el: SVGPathElement, a: number, duree: number) {
  el.animate([
    { transform: 'scale(1, 1)', easing: 'cubic-bezier(.45, 0, .55, 1)' },
    { transform: `scale(${1 + a}, ${1 - a * 0.6})`, offset: LACHER, easing: 'cubic-bezier(.2, .7, .3, 1)' },
    { transform: `scale(${1 - a * 0.4}, ${1 + a * 0.55})`, offset: 0.62, easing: 'ease-in-out' },
    { transform: `scale(${1 + a * 0.1}, ${1 - a * 0.08})`, offset: 0.82, easing: 'ease-in-out' },
    { transform: 'scale(1, 1)' }
  ], { duration: duree })
}

// La note sort de la bouche du tuyau i, s'écarte vers l'extérieur, puis monte en ondulant.
function note(i: number, montee = 0.55) {
  if (!marque.value || !calque.value) return
  const { width: L, height: H } = marque.value.getBoundingClientRect()
  const taille = Math.max(9, H * 0.16)
  const x = (TUYAUX[i].x - VB.x) / VB.l * L - taille * 0.35      // la tête de la note sur la bouche
  const y = (BOUCHE - VB.y) / VB.h * H - taille * 0.77
  const sens = i === 0 ? -1 : i === 2 ? 1 : (Math.random() < 0.5 ? -1 : 1)
  const sortie = H * 0.11 * sens * hasard(0.85, 1.15)
  const haut = H * montee * hasard(0.85, 1.15)
  const onde = H * 0.04 * (Math.random() < 0.5 ? -1 : 1)
  const el = document.createElement('span')
  el.className = 'note'
  el.style.width = el.style.height = `${taille}px`
  el.innerHTML = NOTES[Math.floor(Math.random() * NOTES.length)]
  calque.value.appendChild(el)
  el.animate([
    { transform: `translate(${x}px, ${y}px) scale(0.25) rotate(0deg)`, opacity: 0 },
    { transform: `translate(${x + sortie * 0.75}px, ${y - H * 0.04}px) scale(0.9) rotate(${sens * 8}deg)`, opacity: 1, offset: 0.16 },
    { transform: `translate(${x + sortie * 1.25 + onde}px, ${y - haut * 0.55}px) scale(1) rotate(${sens * 14}deg)`, opacity: 0.9, offset: 0.58 },
    { transform: `translate(${x + sortie * 1.55 - onde}px, ${y - haut}px) scale(0.85) rotate(${sens * 22}deg)`, opacity: 0 }
  ], { duration: hasard(1500, 1800), easing: 'cubic-bezier(.22, .61, .36, 1)' }).onfinish = () => el.remove()
}

// Survol : chaque tuyau boucle de son côté, départ au hasard. Un souffle sur
// deux environ lâche une note, parfois deux d'affilée. Chaque survol a son
// numéro : les boucles d'un survol précédent s'arrêtent au lieu de se superposer.
let survol = 0
let dedans = false
async function boucle(i: number, actif: () => boolean) {
  await attendre(hasard(0, 1400))
  while (actif()) {
    const R = RYTHMES[i]
    const d = R.periode * hasard(1 - R.ecart, 1 + R.ecart)
    souffle(corps[i], AMPLITUDE * hasard(0.7, 1.15), d)
    if (Math.random() < 0.55) {
      setTimeout(() => actif() && note(i), d * hasard(LACHER, LACHER + 0.08))
      if (Math.random() < 0.15) setTimeout(() => actif() && note(i), d * (LACHER + 0.15))
    }
    await attendre(d + hasard(0, 900))
  }
}

function survoler(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || dedans || reduit() || corps.length < 3) return
  dedans = true
  const n = ++survol
  for (let i = 0; i < 3; i++) boucle(i, () => dedans && survol === n)
}

function quitter() {
  dedans = false
}

// Clic : une respiration plus ample, tuyaux dans un ordre et à des instants
// au hasard ; deux ou trois d'entre eux lâchent une note.
function jouer() {
  if (reduit() || corps.length < 3) return
  const ordre = [0, 1, 2].sort(() => Math.random() - 0.5)
  const chanteurs = new Set(ordre.slice(0, Math.random() < 0.5 ? 2 : 3))
  for (const i of ordre) {
    setTimeout(() => {
      const d = hasard(820, 1000)
      souffle(corps[i], (AMPLITUDE + 0.06) * hasard(0.9, 1.1), d)
      if (chanteurs.has(i)) setTimeout(() => note(i, 0.65), d * hasard(LACHER, LACHER + 0.08))
    }, hasard(0, 280))
  }
}

onBeforeUnmount(() => { dedans = false; survol++ })

defineExpose({ survoler, quitter, jouer })
</script>

<template>
  <span ref="marque" class="relative block aspect-[80/94.2] h-8 shrink-0 text-gold md:h-9">
    <svg viewBox="10 3.9 80 94.2" class="block h-full w-full overflow-visible" aria-hidden="true">
      <path fill="currentColor" :d="ARCHE" />
      <template v-for="(t, i) in TUYAUX" :key="i">
        <path :ref="el => { if (el) corps[i] = el as SVGPathElement }" class="corps" fill="currentColor" :d="t.corps" />
        <path fill="currentColor" :d="t.pied" />
      </template>
    </svg>
    <span ref="calque" class="pointer-events-none absolute inset-0" />
  </span>
</template>

<style scoped>
/* Le corps se déforme depuis la bouche : le pied ne bouge pas. */
.corps { transform-box: fill-box; transform-origin: 50% 100%; }
:deep(.note) { position: absolute; left: 0; top: 0; color: #E2C68E; opacity: 0; will-change: transform, opacity; }
/* Un liseré couleur du fond détache la note du tuyau doré qu'elle croise en sortant. */
:deep(.note svg) { display: block; width: 100%; height: 100%; overflow: visible; stroke: #0B0B0C; stroke-width: 1.8px; paint-order: stroke; stroke-linejoin: round; }
</style>
