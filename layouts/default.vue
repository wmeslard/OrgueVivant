<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <ClientOnly>
      <CookieBanner />
    </ClientOnly>
  </div>
</template>
