import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { matchTask, NO_LABEL, searchTerms } from '@/utils/search'

/**
 * Search text and label filter of a board, kept in the URL (?q=java&labels=3,7,none), so a reload,
 * the back button or a bookmark keep them. labelsOf(task) gives the task's labels as { id, name }.
 */
export function useBoardFilter(labelsOf) {
  const route = useRoute()
  const router = useRouter()

  function setQuery(changes) {
    const query = { ...route.query, ...changes }
    for (const key of Object.keys(query)) if (!query[key]) delete query[key]
    router.replace({ query })
  }

  const text = computed({
    get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
    set: (value) => setQuery({ q: value || undefined }),
  })

  // "none" in the URL is NO_LABEL in code.
  const labelIds = computed({
    get: () =>
      String(route.query.labels ?? '')
        .split(',')
        .filter(Boolean) // Number('') would be 0, which is NO_LABEL
        .map((part) => (part === 'none' ? NO_LABEL : Number(part)))
        .filter((id) => id === NO_LABEL || (Number.isInteger(id) && id > 0)),
    set: (ids) =>
      setQuery({ labels: ids.length ? ids.map((id) => (id === NO_LABEL ? 'none' : id)).join(',') : undefined }),
  })

  const terms = computed(() => searchTerms(text.value))
  const active = computed(() => terms.value.length > 0 || labelIds.value.length > 0)

  // { matches, inTitle, inDescription } for a task; everything matches without a filter.
  function match(task) {
    return active.value ? matchTask(task, labelsOf(task), terms.value, labelIds.value) : { matches: true }
  }

  function clear() {
    setQuery({ q: undefined, labels: undefined })
  }

  return { text, labelIds, terms, active, match, clear }
}
