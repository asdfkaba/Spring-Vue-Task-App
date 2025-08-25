import './assets/main.css'
import 'primeicons/primeicons.css';



import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ToastService from 'primevue/toastservice';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';


import App from './App.vue'
import router from './router'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from './stores/auth'
import MyComponent from './views/CreateTaskView.vue'


const app = createApp(App)

app.component('MyComponent', MyComponent)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

const store = useTaskStore()

app.use(router)
app.use(ToastService);
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.mount('#tasks')

