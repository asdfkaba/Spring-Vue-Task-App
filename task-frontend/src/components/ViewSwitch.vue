<script setup>
import { onBeforeUnmount, ref } from 'vue'
import Button from 'primevue/button'

// Board/table switch plus the compact cards toggle (board view only). See useBoardViewPrefs.
// Labels only where the header has room for them; below that the buttons are icons.
const props = defineProps({
  view: { type: String, required: true }, // 'board' | 'table'
  compact: { type: Boolean, default: false },
  // From which width the labels show. Default: Tailwind's xl, as the board header also holds
  // Settings, Add column and New task; shared boards have room earlier.
  labelsFrom: { type: String, default: '80rem' },
})
const emit = defineEmits(['update:view', 'toggle-compact'])

const wideQuery = window.matchMedia(`(min-width: ${props.labelsFrom})`)
const wide = ref(wideQuery.matches)
const onChange = (event) => (wide.value = event.matches)
wideQuery.addEventListener('change', onChange)
onBeforeUnmount(() => wideQuery.removeEventListener('change', onChange))
</script>

<template>
  <div class="flex gap-2">
    <div role="group" aria-label="View" class="flex">
      <Button
        icon="pi pi-th-large"
        :label="wide ? 'Board' : undefined"
        :severity="view === 'board' ? undefined : 'secondary'"
        :outlined="view !== 'board'"
        aria-label="Board view"
        title="Board view"
        :aria-pressed="view === 'board'"
        class="!rounded-r-none"
        @click="emit('update:view', 'board')"
      />
      <Button
        icon="pi pi-table"
        :label="wide ? 'Table' : undefined"
        :severity="view === 'table' ? undefined : 'secondary'"
        :outlined="view !== 'table'"
        aria-label="Table view"
        title="Table view"
        :aria-pressed="view === 'table'"
        class="-ml-px !rounded-l-none"
        @click="emit('update:view', 'table')"
      />
    </div>
    <Button
      v-if="view === 'board'"
      icon="pi pi-list"
      :label="wide ? 'Compact' : undefined"
      :severity="compact ? undefined : 'secondary'"
      :outlined="!compact"
      aria-label="Compact cards"
      title="Compact cards"
      :aria-pressed="compact"
      @click="emit('toggle-compact')"
    />
  </div>
</template>
