<script setup lang="ts">
/**
 * Espace du professeur, sur une seule page : le calendrier des créneaux — un
 * clic sur un créneau libre inscrit un élève — et, à côté, la liste de ses
 * prochaines séances. Souvent ouverte depuis un téléphone : sur petit écran,
 * le calendrier passe au-dessus, les créneaux et la liste en dessous.
 */
import type { FicheEleve } from '~/components/MomentsCreneaux.vue'
import { annulable, heureFr } from '~/utils/moments'

definePageMeta({ middleware: 'professeur', layout: 'default' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger, quitter, aVenir, passees } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.dashboardTitle')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

// ── Calendrier et inscription ────────────────────────────────────────────────
const calendrier = ref<{ choisir: (date: string) => void } | null>(null)
const contexte = computed(() => ({
  aujourdhui: espace.value?.aujourdhui ?? '',
  horaires: espace.value?.horaires ?? [],
  pris: espace.value?.pris ?? []
}))
const envoyer = (fiche: FicheEleve) => $fetch('/api/moments/seances', { method: 'POST', body: fiche })
async function inscrit() {
  await charger(true)
  showToast(t('momentsEspace.booked'), { type: 'success' })
}

function formater(date: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', options)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const jourLong = (date: string) => formater(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const jourCourt = (date: string) => formater(date, { weekday: 'short', day: 'numeric', month: 'short' })

// ── Séances inscrites ────────────────────────────────────────────────────────
const busy = ref(false)
const erreur = ref('')
const edition = ref<{ id: string; date: string; heure_debut: string; programme: string | null } | null>(null)

async function enregistrer() {
  if (!edition.value) return
  busy.value = true; erreur.value = ''
  try {
    await $fetch(`/api/moments/seances/${edition.value.id}`, { method: 'PATCH', body: { programme: edition.value.programme ?? '' } })
    edition.value = null
    await charger(true)
    showToast(t('momentsEspace.saved'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
  } finally { busy.value = false }
}

async function annuler(s: { id: string }) {
  if (!confirm(t('momentsEspace.confirmCancel'))) return
  busy.value = true
  try {
    await $fetch(`/api/moments/seances/${s.id}`, { method: 'DELETE' })
    edition.value = null
    await charger(true)
    showToast(t('momentsEspace.cancelled'), { type: 'success' })
  } catch (e: any) {
    showToast(e?.data?.statusMessage || t('momentsAcces.errorGeneric'), { type: 'error' })
  } finally { busy.value = false }
}

async function logout() {
  await quitter()
  await navigateTo(localePath('/moments-musicaux'))
}
</script>

<template>
  <div class="container-premium py-16 md:py-20 bg-background">
    <header class="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="heading-section mt-3 text-text-primary">{{ t('momentsEspace.dashboardTitle') }}</h1>
        <p v-if="espace" class="mt-2 text-sm text-text-secondary">
          {{ espace.professeur.prenom }} {{ espace.professeur.nom }} · {{ t('moments.place') }}
        </p>
      </div>
      <button class="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline" @click="logout">
        {{ t('momentsEspace.logout') }}
      </button>
    </header>

    <p class="mb-6 max-w-3xl text-sm text-text-secondary">{{ t('momentsEspace.chooseDateHint') }}</p>

    <MomentsCreneaux v-if="espace" ref="calendrier" :contexte="contexte" :envoyer="envoyer" @inscrit="inscrit" @echec="charger(true)">
      <template #colonne>
        <!-- Mes prochaines séances -->
        <section class="card-premium p-6 md:p-8">
          <h2 class="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.mySessions') }}</h2>
          <p v-if="!aVenir.length" class="text-sm text-text-secondary">{{ t('momentsEspace.emptyCta') }}</p>
          <ul v-else class="divide-y divide-white/5">
            <li v-for="s in aVenir" :key="s.id" class="py-3 first:pt-0 last:pb-0">
              <button class="w-full text-left" @click="calendrier?.choisir(s.date)">
                <div class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="text-text-primary">{{ jourCourt(s.date) }} · {{ heureFr(s.heure_debut) }}</span>
                  <span class="truncate text-gold">{{ s.eleve_prenom }} {{ s.eleve_nom }}</span>
                </div>
                <p v-if="s.programme" class="mt-1 truncate text-xs text-text-secondary">{{ s.programme }}</p>
              </button>
              <div class="mt-2 flex gap-4 text-xs">
                <button class="text-gold underline-offset-4 hover:underline" @click="edition = { ...s }; erreur = ''">
                  {{ t('momentsEspace.edit') }}
                </button>
                <button
                  v-if="annulable(s.date, s.heure_debut)"
                  class="text-text-secondary underline-offset-4 hover:underline"
                  :disabled="busy"
                  @click="annuler(s)"
                >
                  {{ t('momentsEspace.cancelSession') }}
                </button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </MomentsCreneaux>

    <section v-if="passees.length" class="mt-14 border-t border-white/5 pt-8">
      <h2 class="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.history') }}</h2>
      <ul class="space-y-1.5 text-sm text-text-secondary">
        <li v-for="s in passees.slice(0, 12)" :key="s.id">
          {{ jourLong(s.date) }} · {{ heureFr(s.heure_debut) }} — {{ s.eleve_prenom }} {{ s.eleve_nom }}
        </li>
      </ul>
    </section>

    <!-- Programme d'une séance -->
    <Teleport to="body">
      <div v-if="edition" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" @click.self="edition = null">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(edition.date) }}</h2>
          <p class="mt-1 text-sm text-text-secondary">{{ heureFr(edition.heure_debut) }}</p>
          <label class="label mt-6" for="prog">{{ t('momentsEspace.programme') }}</label>
          <textarea id="prog" v-model="edition.programme" rows="3" maxlength="600" class="input resize-y" />
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>
          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-ghost" @click="edition = null">{{ t('momentsEspace.cancel') }}</button>
            <button class="btn-primary" :disabled="busy" @click="enregistrer">
              <Icon v-if="busy" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ t('momentsEspace.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
