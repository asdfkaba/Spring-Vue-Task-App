<script setup>
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';


const taskStore = useTaskStore()
const authStore = useAuthStore()


const router = useRouter()
const toast = useToast()
const toastStore = useToastStore()

watch(() => toastStore.toasts, (newToasts) => {
  if (newToasts.length > 0) {
    const nextToast = newToasts[0]
    toast.add(nextToast)
    toastStore.shiftToast()
  }
}, { deep: true })

function logout() {
  authStore.logout()
  taskStore.logout()
  router.push('/')
}

onMounted(async () => {
  console.log("App.vue onMounted")
  await router.isReady() // ensure the route is fully loaded
  const route = router.currentRoute.value
  console.log(route.path)
  if (route.path === '/oauth2/callback') return

  console.log("checkLoginStatus")
  const result = await authStore.checkLoginStatus()
  if (result.status === 'ok') {
    if (route.path === '/') {
    	router.push('/tasks')
    }
  } else if (result.status === 'unauthenticated') {
    router.push('/')
  } else if (result.status === 'backend-unreachable') {
    toast.add({
      severity: 'warn',
      summary: 'Offline',
      detail: 'Backend not reachable',
    })
  } else if (result.status === 'error') {
    toast.add({
      severity: 'error',
      summary: 'Unexpected Error',
      detail: `Code ${result.code}`,
    })
  }
})

</script>

<template> 
  <div class="app-container">
    <div class="header-container">
      <div class="header !mb-10">Task App</div>
      <div v-if="authStore.isAuthenticated" style="justify-items: center;">
	<ButtonGroup>
	  <Button :label="authStore.user.email" icon="pi pi-user" size="small"/>
	  <Button label="Logout" @click="logout" severity="warn" size="small"/>
	</ButtonGroup>
      </div>
    </div>

    <Toast />
    
    <div class="content">
      <div v-if="authStore.isAuthenticated" class="user">
      </div>
      <RouterView />
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: sans-serif;
  width: 100%;
}

@media only screen and (min-width: 1001px) {
    .app-container {
        margin: 0.5rem auto;
        min-width: 1000px;
        width: 100%;
    }
}

@media only screen and (max-width: 1000px) {
    .app-container {
        margin: 0.5rem 0.3rem;
	width: 100%;
    }
}

.header-container {
    display: grid;
    place-content: center;
    text-align: center;
}

.header {
  font-size: 3rem;
  border-bottom: 5px solid green;
  display: inline-block;
}


.logout {
  position: absolute;
  top: 0;
  right: 0;
}

.content {
  display: flex;
  flex-flow: wrap;
  gap: 1rem;
}

</style>
