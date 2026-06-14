<script setup lang="ts">
defineProps<{ error: { statusCode: number; statusMessage?: string } }>()
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
    <div class="animate-fade-up">
      <p class="text-[10px] uppercase tracking-[0.4em] text-gold font-bold mb-6">
        {{ error.statusCode === 404 ? '404' : 'Erreur' }}
      </p>
      <h1 class="font-display text-5xl md:text-7xl font-light text-text-primary mb-6">
        {{ error.statusCode === 404 ? 'Page introuvable.' : 'Une erreur est survenue.' }}
      </h1>
      <p class="text-text-secondary font-light text-lg mb-12 max-w-md mx-auto">
        {{ error.statusCode === 404
          ? 'La page que vous cherchez n\'existe pas ou a été déplacée.'
          : error.statusMessage || 'Merci de réessayer.' }}
      </p>
      <NuxtLink to="/" class="btn-premium-primary inline-flex">
        Retour à l'accueil
      </NuxtLink>
    </div>
  </div>
</template>
