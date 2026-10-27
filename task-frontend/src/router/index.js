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
      // Without an id the view opens the last used (or first) board.
      path: '/boards/:id?',
      name: 'board',
      component: () => import('../views/BoardView.vue'),
      // Sidebar and board use the full window width.
      meta: { requiresAuth: true, fullWidth: true },
    },
    // Old URL of the task list.
    { path: '/tasks', redirect: '/boards' },
    {
      path: '/oauth2/callback',
      component: () => import('@/auth/OAuthCallback.vue'),
      meta: { requiresAuth: false },
    },
    // Old create/edit/detail pages are now dialogs on the board.
    { path: '/:pathMatch(.*)*', redirect: '/boards' },
  ],
})

export default router
