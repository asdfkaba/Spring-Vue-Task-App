import { computed, ref } from 'vue'

// Light or dark look. "system" follows the OS setting and is the default.
// index.html applies the stored choice before the app loads, so the page doesn't flash white.
const STORAGE_KEY = 'theme'
const CHOICES = ['system', 'light', 'dark']

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function readChoice() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return CHOICES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const choice = ref(readChoice())
const prefersDark = ref(systemDark.matches)
systemDark.addEventListener('change', (e) => {
  prefersDark.value = e.matches
  apply()
})

const isDark = computed(() => choice.value === 'dark' || (choice.value === 'system' && prefersDark.value))

function apply() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function setChoice(value) {
  choice.value = value
  try {
    if (value === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Not remembered then.
  }
  apply()
}

export function useTheme() {
  return {
    choice,
    isDark,
    // system → light → dark → system
    cycle: () => setChoice(CHOICES[(CHOICES.indexOf(choice.value) + 1) % CHOICES.length]),
  }
}
