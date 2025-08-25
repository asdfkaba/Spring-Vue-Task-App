import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
history: createWebHistory(import.meta.env.BASE_URL),
routes: [
    {
        path: '/',
        name: 'Login',
        component: () => import('../views/LoginView.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/tasks',
        name: 'tasks',
        // route level code-splitting
        // this generates a separate chunk (About.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import('../views/TasksView.vue'),
        meta: { requiresAuth: true }

    },
    {
        path: '/tasks/:itemId',
        props: true,
        component: () => import('@/views/TaskView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/tasks/:itemId/edit',
        props: true,
        component: () => import('@/views/TaskEditView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/tasks/create',
        component: () => import('@/views/CreateTaskView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/oauth2/callback',
        component: () => import('@/auth/OAuthCallback.vue'),
        meta: { requiresAuth: false }
    },
]
})



export default router
