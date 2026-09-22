<script setup lang="ts">
/**
 * Porte d'entrée des professeurs : demande d'accès, et lien vers la connexion
 * pour ceux qui en ont déjà un.
 *
 * L'adresse est publique et lisible — c'est la validation par l'association,
 * non le secret d'un lien, qui protège l'inscription des élèves. Elle peut
 * donc être diffusée aux conservatoires, par mail ou sur papier.
 */
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl

const form = reactive({ prenom: '', nom: '', email: '', telephone: '', conservatoire: '', message: '' })
const website = ref('')          // pot de miel : jamais affiché, jamais rempli par un humain
const formToken = useFormToken()
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const error = ref('')

useHead({
  title: `${t('momentsDemande.title')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('momentsDemande.subtitle') }]
})
useSeoMeta({
  ogTitle: `${t('momentsDemande.title')} — Orgue Vivant`,
  ogDescription: t('momentsDemande.subtitle'),
  ogUrl: `${siteUrl}${localePath('/moments-musicaux/professeurs')}`,
  ogType: 'website'
})

async function submit() {
  error.value = ''
  if (!form.prenom || !form.nom || !form.email || !form.message) {
    error.value = t('momentsDemande.errorRequired'); return
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email)) { error.value = t('momentsDemande.errorEmail'); return }

  status.value = 'sending'
  try {
    await $fetch('/api/moments/demandes', { method: 'POST', body: { ...form, website: website.value, token: await formToken.ready() } })
    status.value = 'success'
  } catch (e: any) {
    status.value = 'error'
    formToken.reset(e)
    error.value = e?.data?.statusMessage || t('momentsDemande.errorGeneric')
  }
}
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background">
    <div class="mx-auto max-w-2xl">
      <div v-if="status === 'success'" class="card-premium p-8 text-center md:p-12">
        <Icon name="heroicons:check-circle" class="mx-auto h-9 w-9 text-gold" />
        <p class="mx-auto mt-5 max-w-md text-lg font-light leading-relaxed text-text-primary">
          {{ t('momentsDemande.success') }}
        </p>
      </div>

      <template v-else>
        <div class="mb-10">
          <div class="mb-6 inline-flex items-center gap-3">
            <span class="h-[1px] w-8 bg-gold" />
            <span class="text-xs font-bold uppercase tracking-[0.4em] text-gold">{{ t('moments.eyebrow') }}</span>
          </div>
          <h1 class="heading-section text-text-primary">{{ t('momentsDemande.title') }}</h1>
          <p class="mt-5 text-lg font-light leading-relaxed text-text-secondary">{{ t('momentsDemande.subtitle') }}</p>
          <p class="mt-5 text-sm text-text-secondary">
            {{ t('momentsDemande.already') }}
            <NuxtLink :to="localePath('/moments-musicaux/espace')" class="text-gold underline-offset-4 hover:underline">
              {{ t('momentsDemande.signIn') }}
            </NuxtLink>
          </p>
        </div>

        <form class="card-premium space-y-5 p-7 md:p-10" @submit.prevent="submit">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ t('momentsDemande.request') }}</h2>

          <!-- Pot de miel : hors flux, invisible, jamais rempli par un humain -->
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" class="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true">

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label class="label" for="prenom">{{ t('momentsDemande.firstName') }}</label>
              <input id="prenom" v-model="form.prenom" required maxlength="80" class="input" autocomplete="given-name">
            </div>
            <div>
              <label class="label" for="nom">{{ t('momentsDemande.lastName') }}</label>
              <input id="nom" v-model="form.nom" required maxlength="80" class="input" autocomplete="family-name">
            </div>
            <div>
              <label class="label" for="email">{{ t('momentsDemande.email') }}</label>
              <input id="email" v-model="form.email" type="email" required maxlength="254" class="input" autocomplete="email">
            </div>
            <div>
              <label class="label" for="tel">
                {{ t('momentsDemande.phone') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsDemande.optional') }})</span>
              </label>
              <input id="tel" v-model="form.telephone" type="tel" maxlength="40" class="input" autocomplete="tel">
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="cons">
                {{ t('momentsDemande.school') }}
                <span class="ml-1 font-normal text-text-secondary">({{ t('momentsDemande.optional') }})</span>
              </label>
              <input id="cons" v-model="form.conservatoire" maxlength="160" class="input">
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="message">{{ t('momentsDemande.message') }}</label>
              <textarea id="message" v-model="form.message" rows="6" required maxlength="4000" class="input resize-y leading-relaxed" />
              <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsDemande.messageHint') }}</p>
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

          <button type="submit" class="btn-premium-primary w-full md:w-auto" :disabled="status === 'sending'">
            <Icon v-if="status === 'sending'" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ status === 'sending' ? t('momentsDemande.sending') : t('momentsDemande.send') }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
