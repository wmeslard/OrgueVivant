<script setup lang="ts">
/**
 * Entrée de l'espace des professeurs, par le lien que l'association leur
 * transmet : …/moments-musicaux/acces/<clé>.
 *
 * Le lien suffit — ni compte, ni validation. Le professeur se présente une
 * fois, et ce navigateur s'en souvient. Sans clé, ou avec une clé qui n'est
 * plus en vigueur, la page explique comment obtenir le lien.
 */
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { espace } = useMomentsEspace()

const cle = computed(() => typeof route.params.cle === 'string' ? route.params.cle : '')
const desactive = computed(() => route.query.desactive === '1')

const { data: etat } = await useAsyncData(`moments-acces-${cle.value}`, () =>
  cle.value
    ? useRequestFetch()<{ valide: boolean; dejaEntre: boolean }>('/api/moments/acces', { query: { cle: cle.value } })
    : Promise.resolve({ valide: false, dejaEntre: false })
)

// Déjà entré avec ce lien depuis ce navigateur : directement dans l'espace.
if (etat.value?.dejaEntre) await navigateTo(localePath('/moments-musicaux/espace'), { replace: true })

useHead({
  title: `${t('momentsAcces.title')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const form = reactive({ prenom: '', nom: '', email: '', conservatoire: '' })
const envoi = ref(false)
const erreur = ref('')

async function entrer() {
  erreur.value = ''
  if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) { erreur.value = t('momentsAcces.errorRequired'); return }
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { erreur.value = t('momentsAcces.errorEmail'); return }
  envoi.value = true
  try {
    await $fetch('/api/moments/acces', { method: 'POST', body: { cle: cle.value, ...form } })
    espace.value = null
    await navigateTo(localePath('/moments-musicaux/espace'), { replace: true })
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
  } finally { envoi.value = false }
}
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background">
    <div class="mx-auto max-w-xl">
      <div class="mb-6 inline-flex items-center gap-3">
        <span class="h-[1px] w-8 bg-gold" />
        <span class="text-xs font-bold uppercase tracking-[0.4em] text-gold">{{ t('moments.eyebrow') }}</span>
      </div>

      <!-- Lien valide : le professeur se présente -->
      <template v-if="etat?.valide && !desactive">
        <h1 class="heading-section text-text-primary">{{ t('momentsAcces.title') }}</h1>
        <p class="mt-5 text-lg font-light leading-relaxed text-text-secondary">{{ t('momentsAcces.intro') }}</p>

        <form class="card-premium mt-10 space-y-5 p-7 md:p-10" @submit.prevent="entrer">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label class="label" for="prenom">{{ t('momentsAcces.firstName') }}</label>
              <input id="prenom" v-model="form.prenom" required maxlength="80" class="input" autocomplete="given-name">
            </div>
            <div>
              <label class="label" for="nom">{{ t('momentsAcces.lastName') }}</label>
              <input id="nom" v-model="form.nom" required maxlength="80" class="input" autocomplete="family-name">
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="email">{{ t('momentsAcces.email') }}</label>
              <input id="email" v-model="form.email" type="email" required maxlength="254" class="input" autocomplete="email">
              <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsAcces.emailHint') }}</p>
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="cons">
                {{ t('momentsAcces.school') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
              </label>
              <input id="cons" v-model="form.conservatoire" maxlength="160" class="input" autocomplete="organization">
            </div>
          </div>

          <p v-if="erreur" class="text-sm text-red-400">{{ erreur }}</p>

          <button type="submit" class="btn-premium-primary w-full md:w-auto" :disabled="envoi">
            <Icon v-if="envoi" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ t('momentsAcces.submit') }}
          </button>
        </form>
      </template>

      <!-- Pas de lien, lien périmé, ou accès coupé -->
      <template v-else>
        <h1 class="heading-section text-text-primary">
          {{ desactive ? t('momentsAcces.disabledTitle') : cle ? t('momentsAcces.invalidTitle') : t('momentsAcces.title') }}
        </h1>
        <p class="mt-5 text-lg font-light leading-relaxed text-text-secondary">
          {{ desactive ? t('momentsAcces.disabledText') : t('momentsAcces.noLinkText') }}
        </p>
        <NuxtLink :to="localePath('/contact')" class="btn-premium-secondary mt-10">{{ t('momentsAcces.contact') }}</NuxtLink>
      </template>
    </div>
  </div>
</template>
