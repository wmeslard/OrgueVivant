<script setup lang="ts">
/**
 * Notice d'information, pas de recueil de consentement : le site ne dépose que
 * des cookies techniques (langue, et cette notice), exemptés de consentement.
 * Proposer « Accepter / Refuser » pour des cookies qu'on ne peut pas refuser
 * serait trompeur ; on informe, et on retient que la notice a été lue.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const seen = useCookie<string | null>('ov_cookie_consent', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
const ready = ref(false)
const visible = computed(() => ready.value && !seen.value)
onMounted(() => {
  setTimeout(() => { ready.value = true }, 800)
})
function dismiss() { seen.value = 'seen' }
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-apple"
    enter-from-class="opacity-0 translate-y-8"
    enter-to-class="opacity-100 translate-y-0"
  >
    <div
      v-if="visible"
      class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-2xl border border-ink-200 bg-white/95 p-5 shadow-xl backdrop-blur-xl dark:border-ink-700 dark:bg-ink-900/95"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <p class="flex-1 text-sm text-ink-700 dark:text-ink-300">
          {{ t('cookies.message') }}
          <NuxtLink :to="localePath('/privacy')" class="underline">{{ t('cookies.learnMore') }}</NuxtLink>
        </p>
        <button class="btn-primary shrink-0 !py-2 !px-4 !text-xs" @click="dismiss">{{ t('cookies.ok') }}</button>
      </div>
    </div>
  </Transition>
</template>
