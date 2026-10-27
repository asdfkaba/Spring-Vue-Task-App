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
      component: () => import('../views/BoardView.vue'),
      // The board scrolls sideways, so it uses the full window width.
      meta: { requiresAuth: true, fullWidth: true },
    },
    {
      path: '/oauth2/callback',
      component: () => import('@/auth/OAuthCallback.vue'),
      meta: { requiresAuth: false },
    },
    // Old create/edit/detail pages are now dialogs on the board at /tasks.
    { path: '/:pathMatch(.*)*', redirect: '/tasks' },
  ],
})

export default router
