<script setup>
import { computed } from 'vue'
import { labelTextColor } from '@/utils/task'

// A label as a small colored pill.
const props = defineProps({ label: { type: Object, required: true } }) // { name, color }
const style = computed(() => ({ backgroundColor: props.label.color, color: labelTextColor(props.label.color) }))
</script>

<template>
  <span
    data-label-pill
    class="inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-xs leading-tight font-medium"
    :style="style"
  >
    {{ label.name }}
  </span>
</template>
