import { ref, watch } from 'vue'
import { readStorage, writeStorage } from '@/utils/storage'

/**
 * Board or table view and compact cards, remembered per board on this device (localStorage).
 * getId returns the key of the open board, e.g. its id or a share link key; null while none is open.
 */
export function useBoardViewPrefs(getId) {
  const view = ref('board') // 'board' | 'table'
  const compact = ref(false)

  watch(
    getId,
    (id) => {
      view.value = id != null && readStorage(`boardView:${id}`) === 'table' ? 'table' : 'board'
      compact.value = id != null && readStorage(`compactCards:${id}`) === '1'
    },
    { immediate: true },
  )

  function setView(value) {
    view.value = value
    const id = getId()
    if (id != null) writeStorage(`boardView:${id}`, value)
  }

  function toggleCompact() {
    compact.value = !compact.value
    const id = getId()
    if (id != null) writeStorage(`compactCards:${id}`, compact.value ? '1' : '0')
  }

  return { view, compact, setView, toggleCompact }
}
