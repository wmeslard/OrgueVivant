<script setup lang="ts">
const { t } = useI18n()
const accepted = useCookie<string | null>('ov_cookie_consent', { maxAge: 60 * 60 * 24 * 365 })
const ready = ref(false)
const visible = computed(() => ready.value && accepted.value !== 'accepted' && accepted.value !== 'declined')

onMounted(() => {
  setTimeout(() => { ready.value = true }, 800)
})

function accept() { accepted.value = 'accepted' }
function decline() { accepted.value = 'declined' }
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
          <NuxtLink to="/privacy" class="underline">{{ t('cookies.learnMore') }}</NuxtLink>
        </p>
        <div class="flex gap-2">
          <button class="btn-ghost !py-2 !px-4 !text-xs" @click="decline">{{ t('cookies.decline') }}</button>
          <button class="btn-primary !py-2 !px-4 !text-xs" @click="accept">{{ t('cookies.accept') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
