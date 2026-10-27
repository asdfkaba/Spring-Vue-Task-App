<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const boardStore = useBoardStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
// Full-width pages (the board with its sidebar) handle their own padding.
const fullWidth = computed(() => route.meta.fullWidth === true)
const toast = useToast()
const toastStore = useToastStore()

watch(
  () => toastStore.toasts,
  (newToasts) => {
    if (newToasts.length > 0) {
      toast.add(newToasts[0])
      toastStore.shiftToast()
    }
  },
  { deep: true },
)

function logout() {
  authStore.logout()
  boardStore.reset()
  router.push('/')
}

onMounted(async () => {
  await router.isReady()
  const route = router.currentRoute.value
  if (route.path === '/oauth2/callback') return

  const result = await authStore.checkLoginStatus()
  if (result.status === 'ok') {
    if (route.path === '/') router.push('/boards')
  } else if (result.status === 'unauthenticated') {
    router.push('/')
  } else if (result.status === 'backend-unreachable') {
    toast.add({ severity: 'warn', summary: 'Offline', detail: 'Backend not reachable' })
  } else if (result.status === 'error') {
    toast.add({ severity: 'error', summary: 'Unexpected error', detail: `Code ${result.code}` })
  }
})
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div class="mx-auto flex h-14 items-center justify-between gap-4 px-4" :class="fullWidth ? 'max-w-none' : 'max-w-6xl'">
        <RouterLink to="/boards" class="flex items-center gap-2 font-semibold text-slate-900">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <i class="pi pi-check-square" />
          </span>
          Task App
        </RouterLink>

        <div v-if="authStore.isAuthenticated" class="flex min-w-0 items-center gap-2">
          <span class="hidden truncate text-sm text-slate-500 sm:inline">
            <i class="pi pi-user mr-1.5 text-xs" />{{ authStore.user?.email }}
          </span>
          <Button label="Log out" icon="pi pi-sign-out" severity="secondary" text size="small" @click="logout" />
        </div>
      </div>
    </header>

    <main :class="fullWidth ? '' : 'mx-auto max-w-6xl px-4 py-8'">
      <RouterView />
    </main>

    <Toast position="bottom-right" />
    <ConfirmDialog :style="{ width: '26rem' }" :breakpoints="{ '640px': '95vw' }" />
  </div>
</template>
