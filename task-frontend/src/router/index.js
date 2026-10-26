import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('../views/TasksView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/oauth2/callback',
      component: () => import('@/auth/OAuthCallback.vue'),
      meta: { requiresAuth: false },
    },
    // Old create/edit/detail pages are now dialogs on /tasks.
    { path: '/:pathMatch(.*)*', redirect: '/tasks' },
  ],
})

export default router
