<script setup lang="ts">
const { t } = useI18n()

const form = reactive({ name: '', email: '', message: '' })
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const error = ref('')

useHead({
  title: `${t('nav.contact')} — Orgue Vivant`,
  meta: [{ name: 'description', content: t('seo.contactDesc') }]
})

async function submit() {
  error.value = ''
  if (!form.name || !form.email || !form.message) {
    error.value = t('contact.errorRequired')
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    error.value = t('contact.errorEmail')
    return
  }

  status.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    status.value = 'success'
    form.name = ''; form.email = ''; form.message = ''
  } catch (e: any) {
    status.value = 'error'
    error.value = e?.data?.message || t('contact.errorGeneric')
  }
}
</script>

<template>
  <div class="container-premium py-16 md:py-24 bg-background">
    <div class="mx-auto max-w-4xl">
      <div class="grid lg:grid-cols-2 gap-12">
        <div class="animate-fade-up">
          <div class="inline-flex items-center gap-3 mb-6">
            <span class="h-[1px] w-8 bg-gold"></span>
            <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">
              {{ t('contact.eyebrow') }}
            </span>
          </div>
          <h1 class="heading-section text-text-primary mb-5">{{ t('contact.title') }}</h1>
          <p class="text-xl text-text-secondary font-light leading-relaxed mb-8">{{ t('contact.subtitle') }}</p>

          <div class="space-y-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center shrink-0">
                <Icon name="heroicons:envelope" class="w-6 h-6 text-gold" />
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Email</div>
                <div class="text-text-primary">contact@orgue-vivant.fr</div>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center shrink-0">
                <Icon name="heroicons:map-pin" class="w-6 h-6 text-gold" />
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Bureau</div>
                <div class="text-text-primary">Lille, France</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-premium p-8 md:p-12 bg-surface animate-fade-up">
          <form class="space-y-6" @submit.prevent="submit">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-2 block" for="name">{{ t('contact.name') }}</label>
              <input id="name" v-model="form.name" type="text" required class="w-full bg-background border border-white/5 rounded-xl px-6 py-4 text-text-primary focus:border-gold focus:outline-none transition-all">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-2 block" for="email">{{ t('contact.email') }}</label>
              <input id="email" v-model="form.email" type="email" required class="w-full bg-background border border-white/5 rounded-xl px-6 py-4 text-text-primary focus:border-gold focus:outline-none transition-all">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-2 block" for="message">{{ t('contact.message') }}</label>
              <textarea id="message" v-model="form.message" required rows="5" class="w-full bg-background border border-white/5 rounded-xl px-6 py-4 text-text-primary focus:border-gold focus:outline-none transition-all resize-none" />
            </div>

            <div v-if="error" class="rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-sm text-red-400">
              {{ error }}
            </div>
            <div v-if="status === 'success'" class="rounded-xl bg-gold/10 border border-gold/20 px-6 py-4 text-sm text-gold">
              {{ t('contact.success') }}
            </div>

            <button type="submit" :disabled="status === 'sending'" class="btn-premium-primary w-full !h-14">
              <Icon v-if="status === 'sending'" name="heroicons:arrow-path" class="w-5 h-5 animate-spin mr-2" />
              {{ status === 'sending' ? t('contact.sending') : t('contact.send') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
