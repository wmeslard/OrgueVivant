<script setup lang="ts">
/**
 * En-tête des onglets d'administration : titre, compte connecté, et les deux
 * actions qui doivent rester accessibles partout — gestion des comptes (super
 * administrateur) et déconnexion. Il était recopié dans chaque page, et
 * manquait à celle des Moments musicaux.
 */
defineProps<{ titre?: string }>()

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const isSuperAdmin = computed(() =>
  (user.value?.app_metadata as Record<string, unknown>)?.role === 'super_admin'
)

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <header class="mb-10 flex items-center justify-between">
    <div>
      <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
      <h1 class="heading-section mt-2">{{ titre ?? t('admin.dashboard') }}</h1>
      <p v-if="user" class="mt-2 text-sm text-ink-500">{{ user.email }}</p>
    </div>
    <div class="flex gap-2">
      <NuxtLink v-if="isSuperAdmin" to="/admin/users" class="btn-ghost">
        Gestion des comptes
      </NuxtLink>
      <button class="btn-ghost" @click="logout">{{ t('admin.logout') }}</button>
    </div>
  </header>
</template>
