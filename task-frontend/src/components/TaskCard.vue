<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { fromApi, formatDue } from '@/utils/date'
import { DEFAULT_COLUMN_COLOR, priorityOf } from '@/utils/task'

const props = defineProps({
  task: { type: Object, required: true },
  // Color of the column the task is in; the card shows it as a stripe.
  color: { type: String, default: null },
})
const emit = defineEmits(['edit', 'menu'])

const priority = computed(() => priorityOf(props.task.priority))
const due = computed(() => fromApi(props.task.due_date))
const isOverdue = computed(() => due.value !== null && due.value < new Date())
</script>

<template>
  <article
    class="group relative flex cursor-grab flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    tabindex="0"
    :data-task-id="task.id"
    @click="emit('edit', task)"
    @keydown.enter="emit('edit', task)"
  >
    <div class="absolute inset-y-0 left-0 w-1.5" :style="{ backgroundColor: color ?? DEFAULT_COLUMN_COLOR }" />

    <div class="flex flex-col gap-2 py-3 pr-2 pl-4">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-sm leading-snug font-semibold break-words text-slate-900">
          {{ task.title }}
        </h3>
        <Button
          icon="pi pi-ellipsis-v"
          text
          rounded
          severity="secondary"
          size="small"
          aria-label="Task actions"
          class="-mt-1.5 -mr-1 shrink-0"
          @click.stop="emit('menu', $event, task)"
        />
      </header>

      <p v-if="task.description" class="line-clamp-3 text-sm whitespace-pre-line text-slate-600">
        {{ task.description }}
      </p>

      <div v-if="priority || due" class="flex flex-wrap items-center gap-2 text-xs">
        <Tag v-if="priority" :value="priority.label" :severity="priority.severity" class="!text-xs" />
        <span
          v-if="due"
          class="flex items-center gap-1 font-medium"
          :class="isOverdue ? 'text-red-600' : 'text-slate-500'"
        >
          <i class="pi text-xs" :class="isOverdue ? 'pi-exclamation-circle' : 'pi-calendar'" />
          {{ formatDue(due) }}
        </span>
      </div>
    </div>
  </article>
</template>
