<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const user = useSupabaseUser()
const isSuperAdmin = computed(() =>
  (user.value?.app_metadata as Record<string, unknown>)?.role === 'super_admin'
)

if (!isSuperAdmin.value) await navigateTo('/admin')

interface AdminUser {
  id: string
  email: string
  role: string | null
  created_at: string
  last_sign_in_at: string | null
}

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref<string | null>(null)

const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)
const inviteSuccess = ref('')
const inviteError = ref('')

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await $fetch<AdminUser[]>('/api/admin/users')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

await fetchUsers()

function openInviteModal() {
  inviteEmail.value = ''
  inviteSuccess.value = ''
  inviteError.value = ''
  showInviteModal.value = true
}

async function sendInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviting.value = true
  try {
    await $fetch('/api/admin/invite', { method: 'POST', body: { email: inviteEmail.value } })
    inviteSuccess.value = `Invitation envoyée à ${inviteEmail.value}`
    inviteEmail.value = ''
    await fetchUsers()
  } catch (e: any) {
    inviteError.value = e.data?.statusMessage || e.message
  } finally {
    inviting.value = false
  }
}

async function setRole(u: AdminUser, role: string | null) {
  saving.value = u.id
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { role } })
    u.role = role
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = null
  }
}

async function deleteUser(u: AdminUser) {
  if (!confirm(`Supprimer ${u.email} ?`)) return
  saving.value = u.id
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    users.value = users.value.filter(x => x.id !== u.id)
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = null
  }
}

function roleLabel(role: string | null) {
  if (role === 'super_admin') return 'Super admin'
  if (role === 'admin') return 'Admin'
  return 'Aucun'
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="container-apple py-20">
    <header class="mb-10">
      <div class="text-xs uppercase tracking-widest text-gold">Super Admin</div>
      <h1 class="heading-section mt-2">Gestion des comptes</h1>
      <div class="flex items-center gap-3 mt-4">
        <NuxtLink to="/admin" class="btn-ghost">← Dashboard</NuxtLink>
      </div>
    </header>

    <div v-if="error" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-600">
      {{ error }}
    </div>

    <button
      class="mb-4 text-sm text-gold hover:text-gold/70 transition-colors"
      @click="openInviteModal"
    >
      + Ajouter un utilisateur
    </button>

    <div class="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
      <table class="w-full text-left text-sm">
        <thead class="bg-ink-50 text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
          <tr>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Rôle</th>
            <th class="px-4 py-3">Dernière connexion</th>
            <th class="px-4 py-3">Créé le</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            class="border-t border-ink-100 dark:border-ink-800"
            :class="{ 'opacity-50': saving === u.id }"
          >
            <td class="px-4 py-3 font-medium">
              {{ u.email }}
              <span v-if="u.id === user?.id" class="ml-2 text-xs text-ink-400">(vous)</span>
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-bold"
                :class="{
                  'bg-gold/20 text-gold': u.role === 'super_admin',
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': u.role === 'admin',
                  'bg-ink-100 text-ink-500 dark:bg-ink-800': !u.role
                }"
              >
                {{ roleLabel(u.role) }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-500">{{ formatDate(u.last_sign_in_at) }}</td>
            <td class="px-4 py-3 text-ink-500">{{ formatDate(u.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <template v-if="u.id !== user?.id">
                <select
                  :value="u.role ?? ''"
                  :disabled="saving === u.id"
                  class="mr-3 rounded-lg border border-ink-200 bg-transparent px-2 py-1 text-xs dark:border-ink-700"
                  @change="setRole(u, ($event.target as HTMLSelectElement).value || null)"
                >
                  <option value="">Aucun</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
                <button
                  class="text-xs text-red-500 underline hover:text-red-700"
                  :disabled="saving === u.id"
                  @click="deleteUser(u)"
                >
                  Supprimer
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Invite modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showInviteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click.self="showInviteModal = false"
      >
        <div class="w-full max-w-md rounded-2xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 p-8 shadow-2xl">
          <div class="flex items-start justify-between mb-6">
            <div>
              <div class="text-xs uppercase tracking-widest text-gold font-bold">Super Admin</div>
              <h2 class="font-display text-2xl font-light mt-1">Envoyer une invitation</h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 transition-colors"
              @click="showInviteModal = false"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>

          <form @submit.prevent="sendInvite">
            <div class="mb-4">
              <label class="label">Adresse email</label>
              <input
                v-model="inviteEmail"
                type="email"
                required
                placeholder="email@exemple.com"
                class="input"
                :disabled="inviting || !!inviteSuccess"
              >
            </div>

            <div v-if="inviteError" class="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
              {{ inviteError }}
            </div>
            <div v-if="inviteSuccess" class="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
              {{ inviteSuccess }}
            </div>

            <div class="flex gap-3 justify-end">
              <button type="button" class="btn-ghost" @click="showInviteModal = false">
                {{ inviteSuccess ? 'Fermer' : 'Annuler' }}
              </button>
              <button
                v-if="!inviteSuccess"
                type="submit"
                class="btn-primary"
                :disabled="inviting"
              >
                {{ inviting ? '…' : 'Envoyer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>
