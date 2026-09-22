<script setup lang="ts">
/**
 * Candidature des élèves organistes, derrière un lien privé.
 *
 * La page n'est ni dans le menu, ni dans le sitemap, et porte `noindex` : elle
 * n'est accessible qu'avec le jeton distribué par l'association, vérifié côté
 * serveur avant l'affichage du formulaire.
 */
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const jeton = String(route.params.jeton ?? '')

const { data: lien } = await useFetch<{ valide: boolean }>('/api/moments/candidature', { query: { jeton } })

const form = reactive({
  prenom: '', nom: '', email: '', telephone: '',
  conservatoire: '', professeur: '', niveau: '',
  presentation: '', repertoire: '', consentement_publication: false
})
const website = ref('')          // pot de miel : jamais affiché, jamais rempli par un humain
const formToken = useFormToken()
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const error = ref('')

useHead({
  title: `${t('momentsCandidature.title')} — Orgue Vivant`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

async function submit() {
  error.value = ''
  if (!form.prenom || !form.nom || !form.email || !form.presentation) {
    error.value = t('momentsCandidature.errorRequired'); return
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email)) { error.value = t('momentsCandidature.errorEmail'); return }
  if (!form.consentement_publication) { error.value = t('momentsCandidature.errorConsent'); return }

  status.value = 'sending'
  try {
    await $fetch('/api/moments/candidature', {
      method: 'POST',
      body: { ...form, jeton, website: website.value, token: await formToken.ready() }
    })
    status.value = 'success'
  } catch (e: any) {
    status.value = 'error'
    formToken.reset(e)
    error.value = e?.data?.statusMessage || t('momentsCandidature.errorGeneric')
  }
}
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background">
    <div class="mx-auto max-w-2xl">
      <div v-if="!lien?.valide" class="card-premium p-8 text-center md:p-12">
        <Icon name="heroicons:link-slash" class="mx-auto h-8 w-8 text-text-secondary" />
        <p class="mt-4 text-text-secondary">{{ t('momentsCandidature.invalidLink') }}</p>
        <NuxtLink :to="localePath('/contact')" class="btn-premium-secondary mx-auto mt-7">{{ t('nav.contact') }}</NuxtLink>
      </div>

      <div v-else-if="status === 'success'" class="card-premium p-8 text-center md:p-12">
        <Icon name="heroicons:check-circle" class="mx-auto h-9 w-9 text-gold" />
        <h1 class="heading-section mt-5 text-3xl">{{ t('momentsCandidature.success') }}</h1>
        <NuxtLink :to="localePath('/concerts')" class="btn-premium-secondary mx-auto mt-8">{{ t('nav.concerts') }}</NuxtLink>
      </div>

      <template v-else>
        <div class="mb-10">
          <div class="mb-6 inline-flex items-center gap-3">
            <span class="h-[1px] w-8 bg-gold" />
            <span class="text-xs font-bold uppercase tracking-[0.4em] text-gold">{{ t('moments.eyebrow') }}</span>
          </div>
          <h1 class="heading-section text-text-primary">{{ t('momentsCandidature.title') }}</h1>
          <p class="mt-5 text-lg font-light leading-relaxed text-text-secondary">
            {{ t('momentsCandidature.subtitle') }}
          </p>
          <p class="mt-3 text-sm text-text-secondary">{{ t('moments.schedule') }} · {{ t('moments.place') }}</p>
        </div>

        <form class="card-premium space-y-5 p-7 md:p-10" @submit.prevent="submit">
          <!-- Pot de miel : hors flux, invisible, jamais rempli par un humain -->
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" class="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true">

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label class="label" for="prenom">{{ t('momentsCandidature.firstName') }}</label>
              <input id="prenom" v-model="form.prenom" required maxlength="80" class="input" autocomplete="given-name">
            </div>
            <div>
              <label class="label" for="nom">{{ t('momentsCandidature.lastName') }}</label>
              <input id="nom" v-model="form.nom" required maxlength="80" class="input" autocomplete="family-name">
            </div>
            <div>
              <label class="label" for="email">{{ t('momentsCandidature.email') }}</label>
              <input id="email" v-model="form.email" type="email" required maxlength="254" class="input" autocomplete="email">
            </div>
            <div>
              <label class="label" for="tel">
                {{ t('momentsCandidature.phone') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsCandidature.optional') }})</span>
              </label>
              <input id="tel" v-model="form.telephone" type="tel" maxlength="40" class="input" autocomplete="tel">
            </div>
            <div>
              <label class="label" for="cons">
                {{ t('momentsCandidature.school') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsCandidature.optional') }})</span>
              </label>
              <input id="cons" v-model="form.conservatoire" maxlength="160" class="input">
            </div>
            <div>
              <label class="label" for="prof">
                {{ t('momentsCandidature.teacher') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsCandidature.optional') }})</span>
              </label>
              <input id="prof" v-model="form.professeur" maxlength="120" class="input">
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="niveau">
                {{ t('momentsCandidature.level') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsCandidature.optional') }})</span>
              </label>
              <input id="niveau" v-model="form.niveau" maxlength="120" class="input">
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="presentation">{{ t('momentsCandidature.presentation') }}</label>
              <textarea id="presentation" v-model="form.presentation" rows="6" required maxlength="4000" class="input resize-y leading-relaxed" />
              <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsCandidature.presentationHint') }}</p>
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="repertoire">
                {{ t('momentsCandidature.repertoire') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsCandidature.optional') }})</span>
              </label>
              <textarea id="repertoire" v-model="form.repertoire" rows="3" maxlength="2000" class="input resize-y" />
            </div>
          </div>

          <label class="flex items-start gap-3 text-sm text-text-secondary">
            <input v-model="form.consentement_publication" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-gold">
            <span>{{ t('momentsCandidature.consent') }}</span>
          </label>

          <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

          <button type="submit" class="btn-premium-primary w-full md:w-auto" :disabled="status === 'sending'">
            <Icon v-if="status === 'sending'" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ status === 'sending' ? t('momentsCandidature.sending') : t('momentsCandidature.send') }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
