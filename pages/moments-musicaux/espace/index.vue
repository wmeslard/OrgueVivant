<script setup lang="ts">
/**
 * Tableau de bord de l'élève : ses prochaines séances, et l'accès au
 * calendrier de réservation. C'est la page qu'il ouvre pour vérifier ses dates,
 * le plus souvent depuis un téléphone ; le calendrier, plus dense, a sa page.
 */
import { annulable, MOMENT_DEBUT, MOMENT_FIN } from '~/utils/moments'

definePageMeta({ middleware: 'eleve', layout: 'default' })

const { t, locale } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const { show: showToast } = useToast()
const { espace, charger, aVenir, passees } = useMomentsEspace()

await charger()

useHead({
  title: `${t('momentsEspace.dashboardTitle')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const busy = ref(false)
const edition = ref<{ id: string; date: string; programme: string | null } | null>(null)
const erreur = ref('')

function jourLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function enregistrer() {
  if (!edition.value) return
  busy.value = true; erreur.value = ''
  try {
    await $fetch(`/api/moments/seances/${edition.value.id}`, { method: 'PATCH', body: { programme: edition.value.programme ?? '' } })
    edition.value = null
    await charger(true)
    showToast(t('momentsEspace.saved'), { type: 'success' })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
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
    showToast(e?.data?.statusMessage || t('momentsCandidature.errorGeneric'), { type: 'error' })
  } finally { busy.value = false }
}

async function logout() {
  await supabase.auth.signOut()
  await navigateTo(localePath('/moments-musicaux/connexion'))
}
</script>

<template>
  <div class="container-premium py-16 md:py-20 bg-background">
    <header class="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.3em] text-gold">{{ t('moments.eyebrow') }}</div>
        <h1 class="heading-section mt-3 text-text-primary">{{ t('momentsEspace.dashboardTitle') }}</h1>
        <p v-if="espace" class="mt-2 text-sm text-text-secondary">
          {{ espace.eleve.prenom }} {{ espace.eleve.nom }} · {{ t('moments.place') }}
        </p>
      </div>
      <button class="btn-premium-secondary md:w-auto" @click="logout">{{ t('momentsEspace.logout') }}</button>
    </header>

    <!-- Aucune séance : on invite directement à en choisir une -->
    <div v-if="!aVenir.length" class="card-premium p-8 text-center md:p-12">
      <Icon name="heroicons:calendar-days" class="mx-auto h-9 w-9 text-gold" />
      <p class="mx-auto mt-5 max-w-md text-text-secondary">{{ t('momentsEspace.emptyCta') }}</p>
      <NuxtLink :to="localePath('/moments-musicaux/espace/reserver')" class="btn-premium-primary mx-auto mt-8">
        {{ t('momentsEspace.bookDate') }}
      </NuxtLink>
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.mySessions') }}</h2>
        <NuxtLink :to="localePath('/moments-musicaux/espace/reserver')" class="btn-premium-primary md:w-auto">
          {{ t('momentsEspace.bookDate') }}
        </NuxtLink>
      </div>

      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="s in aVenir" :key="s.id" class="card-premium p-6">
          <div class="font-display text-xl font-light leading-tight text-text-primary">{{ jourLong(s.date) }}</div>
          <div class="mt-1 text-sm text-text-secondary">
            {{ MOMENT_DEBUT.replace(':', ' h ') }} – {{ MOMENT_FIN.replace(':', ' h ') }}
          </div>
          <p v-if="s.programme" class="mt-4 text-sm font-light leading-relaxed text-text-secondary">{{ s.programme }}</p>
          <div class="mt-5 flex gap-4 border-t border-white/5 pt-4 text-xs">
            <button class="text-gold underline-offset-4 hover:underline" @click="edition = { ...s }">
              {{ t('momentsEspace.programme') }}
            </button>
            <button v-if="annulable(s.date)" class="text-text-secondary underline-offset-4 hover:underline" :disabled="busy" @click="annuler(s)">
              {{ t('momentsEspace.cancelSession') }}
            </button>
          </div>
        </li>
      </ul>
      <p class="mt-5 text-xs text-text-secondary">{{ t('momentsEspace.cancelDeadline') }}</p>
    </template>

    <section v-if="passees.length" class="mt-14 border-t border-white/5 pt-8">
      <h2 class="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{{ t('momentsEspace.history') }}</h2>
      <ul class="space-y-1.5 text-sm text-text-secondary">
        <li v-for="s in passees.slice(0, 12)" :key="s.id">
          {{ jourLong(s.date) }}<span v-if="s.programme"> — {{ s.programme }}</span>
        </li>
      </ul>
    </section>

    <!-- Programme d'une séance -->
    <Teleport to="body">
      <div v-if="edition" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" @click.self="edition = null">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(edition.date) }}</h2>
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
