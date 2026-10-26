<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { fromApi, formatDue, formatShort } from '@/utils/date'
import { priorityOf, statusOf } from '@/utils/task'

const props = defineProps({ task: { type: Object, required: true } })
const emit = defineEmits(['edit', 'menu'])

const status = computed(() => statusOf(props.task.status))
const priority = computed(() => priorityOf(props.task.priority))
const isDone = computed(() => props.task.status === 'DONE')
const due = computed(() => fromApi(props.task.due_date))
const created = computed(() => fromApi(props.task.created))
const isOverdue = computed(() => !isDone.value && due.value !== null && due.value < new Date())
</script>

<template>
  <article
    class="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    :class="{ 'opacity-70': isDone }"
    tabindex="0"
    @click="emit('edit', task)"
    @keydown.enter="emit('edit', task)"
  >
    <div class="absolute inset-y-0 left-0 w-1" :class="priority?.bar ?? 'bg-slate-200'" />

    <div class="flex flex-1 flex-col gap-3 py-4 pr-3 pl-5">
      <header class="flex items-start justify-between gap-2">
        <h3
          class="text-base leading-snug font-semibold break-words text-slate-900"
          :class="{ 'text-slate-500 line-through': isDone }"
        >
          {{ task.title }}
        </h3>
        <Button
          icon="pi pi-ellipsis-v"
          text
          rounded
          severity="secondary"
          size="small"
          aria-label="Task actions"
          class="-mt-1 shrink-0"
          @click.stop="emit('menu', $event, task)"
        />
      </header>

      <p v-if="task.description" class="line-clamp-3 text-sm whitespace-pre-line text-slate-600">
        {{ task.description }}
      </p>

      <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Tag :value="status.label" :severity="status.severity" :icon="status.icon" />
        <Tag v-if="priority" :value="priority.label" :severity="priority.severity" />
      </div>

      <footer class="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
        <span
          v-if="due"
          class="flex items-center gap-1.5 font-medium"
          :class="isOverdue ? 'text-red-600' : 'text-slate-600'"
        >
          <i class="pi" :class="isOverdue ? 'pi-exclamation-circle' : 'pi-calendar'" />
          {{ isOverdue ? 'Overdue · ' : '' }}{{ formatDue(due) }}
        </span>
        <span v-else class="text-slate-400">No due date</span>
        <span v-if="created" class="text-slate-400">Created {{ formatShort(created) }}</span>
      </footer>
    </div>
  </article>
</template>
