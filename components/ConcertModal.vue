<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'
import { artistList, artistTiles, type Artist } from '~/utils/artists'

const props = defineProps<{ concert: Concert | null, startTile?: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { locale, t } = useI18n()
const { downloadIcs } = useIcs()

const description = computed(() => {
  if (!props.concert) return ''
  if (locale.value === 'en' && props.concert.description_en) return props.concert.description_en
  return props.concert.description
})

// ── Tuiles : la fiche du concert, puis une tuile par artiste ────────────────

const artists = computed(() => artistList(props.concert?.artists))

const tiles = computed(() => artistTiles(props.concert?.artists))

/** Position de la tuile d'un artiste dans le rail, ou 0 s'il n'en a pas.
 *  La comparaison porte sur le nom : `tiles` reconstruit ses objets, une
 *  égalité de référence serait toujours fausse. */
function tileOf(a: Artist) {
  const i = tiles.value.findIndex(t => t.name === a.name)
  return i < 0 ? 0 : i + 1
}

/** Avec plusieurs tuiles, une hauteur commune évite que le cadre change de
 *  taille d'un défilement à l'autre. Seul, un concert garde la hauteur libre
 *  qu'il avait avant l'arrivée du carrousel. */
const frameHeight = computed(() =>
  tiles.value.length ? 'h-[90vh]' : (props.concert?.image_url ? 'lg:h-[90vh]' : ''))

const scroller = ref<HTMLElement>()
const slide = ref(0)
const slideCount = computed(() => 1 + tiles.value.length)

/** Décalage de chaque tuile dans le rail. Les tuiles étant plus étroites que
 *  le conteneur — pour laisser dépasser la suivante — on ne peut pas déduire
 *  la position d'une simple multiplication par la largeur visible. */
function offsets() {
  const el = scroller.value
  if (!el) return []
  const kids = Array.from(el.children).slice(0, slideCount.value) as HTMLElement[]
  const base = kids[0]?.offsetLeft ?? 0
  return kids.map(k => k.offsetLeft - base)
}

let anim = 0

/** `scroll-snap-type: mandatory` neutralise `scrollTo({ behavior: 'smooth' })` :
 *  le navigateur ramène aussitôt le rail sur la tuile aimantée, et le trajet
 *  n'a pas lieu. On anime donc soi-même, l'aimantation levée le temps du
 *  déplacement — elle ne sert qu'au geste manuel. */
function goTo(i: number) {
  const el = scroller.value
  const cible = Math.max(0, Math.min(i, slideCount.value - 1))
  const to = offsets()[cible]
  if (!el || to === undefined) return
  slide.value = cible

  cancelAnimationFrame(anim)
  // Onglet masqué : `requestAnimationFrame` est gelé, l'animation n'avancerait
  // pas et l'aimantation resterait suspendue. Idem si l'animation est refusée.
  const direct = !import.meta.client || document.hidden
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (direct) {
    el.scrollLeft = to
    el.style.scrollSnapType = ''
    return
  }

  const from = el.scrollLeft
  const début = performance.now()
  const durée = 420
  el.style.scrollSnapType = 'none'

  const pas = (maintenant: number) => {
    const t = Math.min(1, (maintenant - début) / durée)
    el.scrollLeft = from + (to - from) * (1 - (1 - t) ** 3)
    if (t < 1) anim = requestAnimationFrame(pas)
    else el.style.scrollSnapType = ''
  }
  anim = requestAnimationFrame(pas)
}

// ── Glisser à la souris ─────────────────────────────────────────────────────
// Le tactile et le trackpad défilent déjà nativement ; la souris, elle, n'a que
// la molette. On lui ajoute le cliquer-glisser.

let drag: { x: number, left: number, moved: boolean } | null = null
const dragged = ref(false)

function onPointerDown(e: PointerEvent) {
  const el = scroller.value
  if (!el || e.pointerType !== 'mouse' || e.button !== 0 || slideCount.value < 2) return
  // Un clic qui vise un lien ou un bouton doit rester un clic.
  if ((e.target as HTMLElement).closest('a, button, input, textarea, select')) return
  drag = { x: e.clientX, left: el.scrollLeft, moved: false }
  dragged.value = false
}

function onPointerMove(e: PointerEvent) {
  const el = scroller.value
  if (!drag || !el) return
  const dx = e.clientX - drag.x
  if (!drag.moved) {
    if (Math.abs(dx) <= 4) return
    drag.moved = dragged.value = true
    // La capture n'est prise qu'une fois le glissement avéré. L'élément qui
    // capture le pointeur reçoit aussi le `click` final : la prendre dès le
    // `pointerdown` le ferait viser le rail au lieu de la tuile, privant un
    // simple clic de sa cible — et refermant le détail.
    el.setPointerCapture(e.pointerId)
    el.style.scrollSnapType = 'none'
    el.style.userSelect = 'none'
  }
  el.scrollLeft = drag.left - dx
  e.preventDefault()
}

function onPointerUp() {
  const el = scroller.value
  if (!drag || !el) return
  const moved = drag.moved
  drag = null
  if (!moved) return
  el.style.userSelect = ''
  // La cible se lit avant de rendre la main à l'aimantation : rétablie trop
  // tôt, elle déplacerait le rail et l'on mesurerait sa décision, pas la nôtre.
  // `goTo` rétablit `scroll-snap-type` en fin de trajet.
  goTo(nearestIndex())
}

/** Un clic à côté des tuiles referme, comme sur le fond de la fenêtre — sauf
 *  s'il conclut un glissement. Le navigateur émet en effet un `click` sur
 *  l'ancêtre commun du départ et de l'arrivée : glisser d'une tuile à l'autre
 *  vise donc le rail lui-même, et refermait le détail. */
function onBackdropClick(e: MouseEvent) {
  if (dragged.value) { dragged.value = false; return }
  if (e.target === e.currentTarget) emit('close')
}

/** Une tuile voisine se rejoint aussi d'un simple clic. En phase de capture,
 *  pour que le clic n'aille pas actionner un bouton de la tuile visée. */
function onCardClick(i: number, e: MouseEvent) {
  if (dragged.value) { dragged.value = false; e.preventDefault(); e.stopPropagation(); return }
  if (i === nearestIndex()) return
  e.preventDefault()
  e.stopPropagation()
  goTo(i)
}

/** Tuile la plus proche de la position actuelle. Se calcule à la demande
 *  plutôt que de se fier à `slide`, qui peut avoir pris du retard. */
function nearestIndex() {
  const el = scroller.value
  const o = offsets()
  if (!el || !o.length) return 0
  let best = 0
  for (let i = 1; i < o.length; i++) {
    if (Math.abs(o[i]! - el.scrollLeft) < Math.abs(o[best]! - el.scrollLeft)) best = i
  }
  return best
}

// ── Indice « il reste du texte plus bas » ───────────────────────────────────
// Une flèche discrète, affichée seulement quand le panneau déborde et qu'on
// n'en a pas encore atteint le bas.

const overflowing = ref<Record<number, boolean>>({})
const atBottom = ref<Record<number, boolean>>({})

const MARGE = 24

function measurePanels() {
  const el = scroller.value
  if (!el) return
  const o: Record<number, boolean> = {}
  const b: Record<number, boolean> = {}
  el.querySelectorAll<HTMLElement>('[data-panel]').forEach((p, i) => {
    o[i] = p.scrollHeight - p.clientHeight > MARGE
    b[i] = p.scrollHeight - p.scrollTop - p.clientHeight < MARGE
  })
  overflowing.value = o
  atBottom.value = b
}

function onPanelScroll(i: number, e: Event) {
  const p = e.target as HTMLElement
  atBottom.value = {
    ...atBottom.value,
    [i]: p.scrollHeight - p.scrollTop - p.clientHeight < MARGE
  }
}

/** L'index se déduit de la position, pour suivre aussi le défilement fait à la
 *  main ou au trackpad, et pas seulement les clics sur les flèches. */
function onScroll() {
  slide.value = nearestIndex()
}


// Chaque ouverture repart de la fiche du concert, sauf si l'appelant demande
// une tuile précise — un clic sur un nom d'artiste, depuis la page d'accueil.
watch(() => [props.concert?.id, props.startTile], () => {
  if (!props.concert) return
  slide.value = props.startTile ?? 0
  nextTick(() => {
    const el = scroller.value
    if (el) el.scrollLeft = offsets()[slide.value] ?? 0
    measurePanels()
  })
})

const modalRef = ref<HTMLElement>()
const { activate: trapActivate, deactivate: trapDeactivate } = useFocusTrap(modalRef)

const location = computed(() => props.concert?.location ?? '')
const { directionsUrl, placeUrl } = useMapsUrls(location)

const safeExternalLink = computed(() => {
  const raw = props.concert?.external_link
  if (!raw) return ''
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
})

const formattedDate = computed(() => {
  if (!props.concert) return ''
  const d = new Date(`${props.concert.date}T${props.concert.time || '20:00'}`)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
})

watch(() => props.concert, (val) => {
  if (val) nextTick(trapActivate)
  else trapDeactivate()
})

// Scroll lock
watch(() => props.concert, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
  cancelAnimationFrame(anim)
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <!-- Le fond fait un fondu ; le cadre, lui, monte légèrement en se dépliant.
       `[&>div]` vise le cadre, seul enfant direct du fond. -->
  <Transition
    enter-active-class="transition duration-400 ease-apple [&>div]:transition-transform [&>div]:duration-400 [&>div]:ease-apple"
    enter-from-class="opacity-0 [&>div]:scale-[0.96] [&>div]:translate-y-4"
    enter-to-class="opacity-100 [&>div]:scale-100 [&>div]:translate-y-0"
    leave-active-class="transition duration-250 ease-apple [&>div]:transition-transform [&>div]:duration-250 [&>div]:ease-apple"
    leave-from-class="opacity-100 [&>div]:scale-100"
    leave-to-class="opacity-0 [&>div]:scale-[0.98]"
  >
    <div
      v-if="concert"
      class="fixed inset-0 z-[100] overflow-hidden bg-background/95 backdrop-blur-xl flex items-center justify-center py-4 md:py-8"
      @click="onBackdropClick"
    >
      <!-- Le conteneur est transparent : ce sont les tuiles, posées côte à côte,
           qui portent le cadre. On défile de l'une à l'autre. -->
      <div
        ref="modalRef"
        class="relative flex max-h-[90vh] w-full flex-col"
        :class="frameHeight"
        style="--card: min(1400px, 100vw - 3rem)"
        @click.stop
      >
        <div class="relative flex min-h-0 w-full flex-1">
          <!-- Rail : une tuile par écran, la suivante dépasse pour se signaler.
               `dragstart` est neutralisé, sinon empoigner une photo lancerait le
               glisser-déposer natif du navigateur au lieu de faire défiler. -->
          <div
            ref="scroller"
            class="flex min-h-0 w-full flex-1 snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-hidden px-[calc((100vw-var(--card))/2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            :class="slideCount > 1 ? 'cursor-grab' : ''"
            @scroll.passive="onScroll"
            @click="onBackdropClick"
            @dragstart.prevent
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <!-- Tuile 1 : le concert -->
            <div
              class="relative flex h-full shrink-0 w-[var(--card)] snap-center flex-col overflow-hidden rounded-[28px] border border-text-primary/10 bg-surface shadow-2xl lg:flex-row"
              @click.capture="onCardClick(0, $event)"
            >
              <ConcertTileControls
                :index="0" :slide="slide" :count="slideCount"
                @go="goTo" @close="$emit('close')"
              />
              <!-- Image (desktop uniquement) -->
              <div v-if="concert.image_url" class="hidden lg:block lg:w-[72vh] lg:max-w-[52%] shrink-0 overflow-hidden">
                <img
                  :src="concert.image_url"
                  :alt="concert.title"
                  class="h-full w-full object-cover"
                >
              </div>

              <!-- Contenu scrollable -->
              <div class="relative flex min-h-0 flex-1">
                <div data-panel class="h-full w-full overflow-y-auto p-7 md:p-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @scroll.passive="onPanelScroll(0, $event)">
                <div class="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-3">
                  {{ formattedDate }}
                </div>
                <h2 class="font-display text-3xl md:text-4xl font-light leading-tight text-text-primary">
                  {{ concert.title }}
                </h2>

                <div class="mt-7 space-y-5">
                  <!-- Lieu + Tarif -->
                  <div class="grid grid-cols-2 gap-6 border-b border-text-primary/5 pb-5">
                    <div>
                      <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.location') }}</dt>
                      <dd class="text-text-primary flex items-center gap-2 text-sm">
                        <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold shrink-0" />
                        <a
                          :href="placeUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="hover:text-gold hover:underline underline-offset-2 transition-colors duration-200"
                        >{{ t(`locations.${concert.location}`) }}</a>
                      </dd>
                    </div>
                    <div>
                      <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.price') }}</dt>
                      <dd class="text-text-primary flex items-center gap-2 text-sm">
                        <Icon name="heroicons:ticket" class="w-4 h-4 text-gold shrink-0" />
                        {{ concert.price_type === 'free' ? t('modal.freeLong') : t('modal.paid') }}
                      </dd>
                    </div>
                  </div>

                  <!-- Artistes + Durée -->
                  <div v-if="artists.length || concert.duration" class="grid grid-cols-2 gap-6 border-b border-text-primary/5 pb-5">
                    <div v-if="artists.length">
                      <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.artists') }}</dt>
                      <!-- Chaque artiste ayant une tuile y renvoie au clic. -->
                      <dd class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <button
                          v-for="(a, i) in artists"
                          :key="i"
                          type="button"
                          :disabled="!tileOf(a)"
                          class="text-left italic text-text-primary enabled:underline enabled:decoration-gold/40 enabled:underline-offset-4 enabled:transition-colors enabled:hover:text-gold disabled:cursor-default"
                          @click="goTo(tileOf(a))"
                        >{{ a.name }}</button>
                      </dd>
                    </div>
                    <div v-if="concert.duration">
                      <dt class="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5 font-bold">{{ t('modal.duration') }}</dt>
                      <dd class="text-text-primary text-sm">{{ concert.duration }}</dd>
                    </div>
                  </div>

                  <!-- Description -->
                  <div v-if="description">
                    <p class="text-sm leading-relaxed text-text-secondary font-light whitespace-pre-wrap">
                      {{ description }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="pt-2 flex flex-wrap gap-3">
                    <a
                      v-if="safeExternalLink"
                      :href="safeExternalLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-premium-primary !h-11 !w-auto !px-7"
                    >
                      {{ t('modal.book') }}
                    </a>
                    <button class="btn-premium-secondary !h-11 !w-auto !px-7 flex items-center gap-2" @click="downloadIcs(concert)">
                      <Icon name="heroicons:calendar" class="w-4 h-4 text-gold" />
                      <span>{{ t('modal.addToCalendar') }}</span>
                    </button>
                    <a
                      :href="directionsUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-premium-secondary !h-11 !w-auto !px-7 flex items-center gap-2"
                    >
                      <Icon name="heroicons:map-pin" class="w-4 h-4 text-gold" />
                      <span>{{ t('modal.directions') }}</span>
                    </a>
                  </div>
                </div>
                </div>
                <!-- Indice discret : il reste du texte plus bas. -->
                <div
                  v-if="overflowing[0] && !atBottom[0]"
                  class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-surface via-surface/70 to-transparent pb-3 pt-10"
                >
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round"
                    class="h-4 w-4 text-text-secondary/50"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Tuiles suivantes : un artiste par tuile -->
            <div
              v-for="(a, i) in tiles"
              :key="i"
              class="relative flex h-full shrink-0 w-[var(--card)] snap-center flex-col overflow-hidden rounded-[28px] border border-text-primary/10 bg-surface shadow-2xl lg:flex-row"
              @click.capture="onCardClick(i + 1, $event)"
            >
              <ConcertTileControls
                :index="i + 1" :slide="slide" :count="slideCount"
                @go="goTo" @close="$emit('close')"
              />
              <div v-if="a.image_url" class="hidden lg:block lg:w-[72vh] lg:max-w-[52%] shrink-0 overflow-hidden">
                <img :src="a.image_url" :alt="a.name" class="h-full w-full object-cover">
              </div>
              <div class="relative flex min-h-0 flex-1">
                <div data-panel class="h-full w-full overflow-y-auto p-7 md:p-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @scroll.passive="onPanelScroll(i + 1, $event)">
                <!-- Sous `lg`, la photo flotte à droite : le nom reste en haut à
                     gauche et le texte s'écoule à sa suite en la contournant. -->
                <img
                  v-if="a.image_url"
                  :src="a.image_url"
                  :alt="a.name"
                  class="float-right mb-4 ml-5 mt-9 aspect-[4/5] w-28 rounded-xl object-cover sm:ml-6 sm:mt-0 sm:w-40 md:w-52 lg:hidden"
                >
                <div class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
                  {{ t('modal.artist') }}
                </div>
                <h2 class="font-display text-3xl font-light leading-tight text-text-primary md:text-4xl">
                  {{ a.name }}
                </h2>
                <p
                  v-if="a.bio"
                  class="mt-5 whitespace-pre-wrap text-sm font-light leading-relaxed text-text-secondary"
                >
                  {{ a.bio }}
                </p>
                <button
                  class="btn-premium-secondary clear-both mt-8 !h-11 !w-auto !px-7 flex items-center gap-2"
                  @click="goTo(0)"
                >
                  <Icon name="heroicons:arrow-left" class="h-4 w-4 text-gold" />
                  <span>{{ t('modal.backToConcert') }}</span>
                </button>
                </div>
                <!-- Indice discret : il reste du texte plus bas. -->
                <div
                  v-if="overflowing[i + 1] && !atBottom[i + 1]"
                  class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-surface via-surface/70 to-transparent pb-3 pt-10"
                >
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round"
                    class="h-4 w-4 text-text-secondary/50"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pastilles de position, sous les tuiles -->
        <div v-if="slideCount > 1" class="flex shrink-0 items-center justify-center gap-2 pt-5">
          <button
            v-for="i in slideCount"
            :key="i"
            type="button"
            class="h-2 w-2 rounded-full transition-colors duration-300"
            :class="slide === i - 1 ? 'bg-gold' : 'bg-text-primary/25 hover:bg-text-primary/50'"
            :aria-current="slide === i - 1"
            :aria-label="t('modal.goToTile', { n: i })"
            @click="goTo(i - 1)"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>
