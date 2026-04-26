<script setup lang="ts">
const supabase = useSupabaseClient()
const user    = useSupabaseUser()
const router  = useRouter()

const IDLE_MS        = 60 * 60 * 1000
const WARN_BEFORE_MS =  5 * 60 * 1000
const MAX_SESSION_MS =  8 * 60 * 60 * 1000
const HEARTBEAT_MS   = 30 * 1000

const KEY_ACTIVITY = 'ov_admin_activity'
const KEY_SESSION  = 'ov_admin_session_start'

const showWarning = ref(false)
const countdown   = ref(0)

const formattedCountdown = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

let heartbeat:    ReturnType<typeof setInterval> | null = null
let tickInterval: ReturnType<typeof setInterval> | null = null
let channel:      BroadcastChannel               | null = null

// ── Sign-out ──────────────────────────────────────────────────────────────────

async function doSignOut(reason = 'timeout') {
  if (heartbeat)    clearInterval(heartbeat)
  if (tickInterval) clearInterval(tickInterval)
  heartbeat = tickInterval = null
  localStorage.removeItem(KEY_ACTIVITY)
  localStorage.removeItem(KEY_SESSION)
  channel?.postMessage({ type: 'signout', reason })
  supabase.auth.signOut().catch(() => {})
  await router.push(`/admin/login?reason=${reason}`)
}

// ── Warning modal ─────────────────────────────────────────────────────────────

function openWarning(remainingMs: number) {
  countdown.value  = Math.floor(remainingMs / 1000)
  showWarning.value = true
  if (tickInterval) return
  tickInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(tickInterval!)
      tickInterval = null
    }
  }, 1000)
}

function closeWarning() {
  showWarning.value = false
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
}

// ── Activity tracking (throttled to 1/s, no timer management) ─────────────────

let lastThrottle = 0
function onActivity() {
  const now = Date.now()
  if (now - lastThrottle < 1000) return
  lastThrottle = now
  localStorage.setItem(KEY_ACTIVITY, String(now))
  if (showWarning.value) {
    closeWarning()
  }
}

function stayConnected() {
  onActivity()
}

// ── Heartbeat (sole timer — runs every 30s) ────────────────────────────────────

function checkAbsoluteSession(): boolean {
  const start = Number(localStorage.getItem(KEY_SESSION))
  if (start && Date.now() - start > MAX_SESSION_MS) {
    doSignOut('session_expired')
    return false
  }
  return true
}

function tick() {
  if (!checkAbsoluteSession()) return
  const last      = Number(localStorage.getItem(KEY_ACTIVITY))
  const remaining = IDLE_MS - (Date.now() - last)
  if (remaining <= 0) { doSignOut(); return }
  if (remaining < WARN_BEFORE_MS && !showWarning.value) openWarning(remaining)
  if (remaining >= WARN_BEFORE_MS && showWarning.value) closeWarning()
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

onMounted(() => {
  const signInTime = user.value?.last_sign_in_at
    ? new Date(user.value.last_sign_in_at).getTime()
    : Date.now()

  if (!localStorage.getItem(KEY_SESSION))  localStorage.setItem(KEY_SESSION,  String(signInTime))
  if (!localStorage.getItem(KEY_ACTIVITY)) localStorage.setItem(KEY_ACTIVITY, String(signInTime))

  if (!checkAbsoluteSession()) return

  const lastActivity = Number(localStorage.getItem(KEY_ACTIVITY))
  if (Date.now() - lastActivity > IDLE_MS) { doSignOut(); return }

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('ov_admin')
    channel.onmessage = (e) => {
      if (e.data?.type === 'signout') {
        if (heartbeat)    clearInterval(heartbeat)
        if (tickInterval) clearInterval(tickInterval)
        router.push('/admin/login')
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return
    tick()
  })

  EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
  heartbeat = setInterval(tick, HEARTBEAT_MS)
})

onBeforeUnmount(() => {
  if (heartbeat)    clearInterval(heartbeat)
  if (tickInterval) clearInterval(tickInterval)
  EVENTS.forEach(e => window.removeEventListener(e, onActivity))
  channel?.close()
})
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

  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="showWarning" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-2xl mx-4">
        <div class="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
          <Icon name="heroicons:clock" class="h-7 w-7 text-gold" />
        </div>
        <h2 class="mb-2 font-display text-2xl font-light text-text-primary">
          Session sur le point d'expirer
        </h2>
        <p class="mb-3 text-sm text-text-secondary">Déconnexion automatique dans</p>
        <div class="mb-6 font-display text-5xl font-light text-gold tabular-nums tracking-tight">
          {{ formattedCountdown }}
        </div>
        <div class="flex flex-col gap-3">
          <button class="btn-premium-primary" @click="stayConnected">
            Rester connecté
          </button>
          <button
            class="text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
            @click="doSignOut('manual')"
          >
            Se déconnecter maintenant
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
