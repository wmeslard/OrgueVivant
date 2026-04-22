<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const open = ref(false)
const isScrolled = ref(false)

const nav = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/concerts', label: t('nav.concerts') },
  { to: '/about', label: t('nav.about') },
  { to: '/contact', label: t('nav.contact') }
])

onMounted(() => {
  window.addEventListener('scroll', () => {
    isScrolled.value = window.scrollY > 20
  })
})

watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header 
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-apple"
    :class="[
      isScrolled ? 'h-[72px] md:h-[84px] glass' : 'h-[80px] md:h-[100px] bg-transparent'
    ]"
  >
    <div class="container-premium flex h-full items-center justify-between">
      <NuxtLink to="/" class="group flex items-center gap-2 font-display text-2xl tracking-tight">
        <span class="transition-colors duration-300 group-hover:text-gold">Orgue</span>
        <span class="text-gold">·</span>
        <span class="transition-colors duration-300 group-hover:text-gold">Vivant</span>
      </NuxtLink>

      <nav class="hidden gap-10 lg:flex">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="relative text-sm font-medium tracking-wide text-text-secondary transition-opacity hover:opacity-70 group"
          active-class="!text-text-primary"
        >
          {{ item.label }}
          <span class="absolute -bottom-1 left-0 h-[1px] w-0 bg-gold transition-all duration-300 group-hover:w-full" :class="{ 'w-full': route.path === item.to }"></span>
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-6">
        <div class="hidden items-center gap-4 md:flex">
          <LanguageToggle />
          <DarkModeToggle />
        </div>
        
        <button
          class="lg:hidden flex flex-col gap-1.5 p-2"
          :aria-label="t('nav.menu')"
          @click="open = !open"
        >
          <span class="h-0.5 w-6 bg-text-primary transition-transform duration-300" :class="{ 'translate-y-2 rotate-45': open }"></span>
          <span class="h-0.5 w-6 bg-text-primary transition-opacity duration-300" :class="{ 'opacity-0': open }"></span>
          <span class="h-0.5 w-6 bg-text-primary transition-transform duration-300" :class="{ '-translate-y-2 -rotate-45': open }"></span>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition ease-apple duration-500"
      enter-from-class="opacity-0 translate-y-[-20px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-apple duration-400"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-20px]"
    >
      <div v-if="open" class="fixed inset-0 top-0 z-[-1] bg-background/95 backdrop-blur-2xl lg:hidden">
        <nav class="flex h-full flex-col items-center justify-center gap-8 text-center">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="font-display text-4xl text-text-primary"
            @click="open = false"
          >
            {{ item.label }}
          </NuxtLink>
          <div class="mt-8 flex gap-6">
            <LanguageToggle />
            <DarkModeToggle />
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
