<script setup>
import Button from 'primevue/button'

// Board/table switch plus the compact cards toggle (board view only). See useBoardViewPrefs.
defineProps({
  view: { type: String, required: true }, // 'board' | 'table'
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:view', 'toggle-compact'])
</script>

<template>
  <div class="flex gap-2">
    <div role="group" aria-label="View" class="flex">
      <Button
        icon="pi pi-th-large"
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
      :severity="compact ? undefined : 'secondary'"
      :outlined="!compact"
      aria-label="Compact cards"
      title="Compact cards"
      :aria-pressed="compact"
      @click="emit('toggle-compact')"
    />
  </div>
</template>
