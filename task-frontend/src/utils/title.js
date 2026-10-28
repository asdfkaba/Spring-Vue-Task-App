import { watchEffect } from 'vue'

export const APP_NAME = 'Taskz'

// "Bewerbungen · Taskz": the most specific part first, so tabs stay tellable apart.
export function formatTitle(...parts) {
  return [...parts.filter(Boolean), APP_NAME].join(' · ')
}

/**
 * Keeps document.title up to date for a view. getParts returns the title parts without the
 * app name, e.g. () => [task?.title, board?.name]; empty parts are left out.
 */
export function usePageTitle(getParts) {
  watchEffect(() => {
    document.title = formatTitle(...getParts())
  })
}
