<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const open = ref(false)

const nav = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/concerts', label: t('nav.concerts') },
  { to: '/about', label: t('nav.about') },
  { to: '/contact', label: t('nav.contact') }
])

watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink-100/60 bg-white/70 backdrop-blur-xl dark:border-ink-800/60 dark:bg-ink-950/70">
    <div class="container-apple flex h-16 items-center justify-between">
      <NuxtLink to="/" class="font-display text-xl tracking-tight">
        Orgue<span class="text-accent">·</span>Vivant
      </NuxtLink>

      <nav class="hidden gap-8 md:flex">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="text-sm text-ink-600 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
          active-class="!text-ink-900 dark:!text-ink-50"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2">
        <LanguageToggle />
        <DarkModeToggle />
        <button
          class="md:hidden rounded-full p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
          :aria-label="t('nav.menu')"
          @click="open = !open"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition ease-apple duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-apple duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="border-t border-ink-100 md:hidden dark:border-ink-800">
        <nav class="container-apple flex flex-col py-4">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="py-3 text-base text-ink-700 dark:text-ink-300"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>
