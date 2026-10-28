<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { fromApi, formatDue } from '@/utils/date'
import { DEFAULT_COLUMN_COLOR, priorityOf } from '@/utils/task'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  task: { type: Object, required: true },
  // Color of the column the task is in; the card shows it as a stripe.
  color: { type: String, default: null },
  // Shared boards: no editing, no menu, and the full description.
  readonly: { type: Boolean, default: false },
  // Neighbour columns ({ id, name }) for the move arrows, an alternative to drag & drop.
  leftColumn: { type: Object, default: null },
  rightColumn: { type: Object, default: null },
})
const emit = defineEmits(['open', 'menu', 'move'])

const priority = computed(() => priorityOf(props.task.priority))
const due = computed(() => fromApi(props.task.due_date))
const isOverdue = computed(() => due.value !== null && due.value < new Date())
const showArrows = computed(() => !props.readonly && (props.leftColumn || props.rightColumn))
const descriptionHtml = computed(() => renderMarkdown(props.task.description))

// A click on a link in the description follows the link instead of opening the task.
function onClick(event) {
  if (props.readonly || event.target.closest('a')) return
  emit('open', props.task)
}
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
    :class="readonly ? '' : 'cursor-grab transition hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md active:cursor-grabbing'"
    :tabindex="readonly ? undefined : 0"
    :data-task-id="task.id"
    @click="onClick"
    @keydown.enter.self="!readonly && emit('open', task)"
  >
    <div class="absolute inset-y-0 left-0 w-1.5" :style="{ backgroundColor: color ?? DEFAULT_COLUMN_COLOR }" />

    <div class="flex flex-col gap-2 py-3 pr-2 pl-4">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-sm leading-snug font-semibold break-words text-slate-900 dark:text-slate-100">
          {{ task.title }}
        </h3>
        <Button
          v-if="!readonly"
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

      <!-- Sanitized in renderMarkdown. -->
      <div v-if="descriptionHtml" class="markdown" :class="{ 'line-clamp-3': !readonly }" v-html="descriptionHtml" />

      <div v-if="priority || due || showArrows" class="flex flex-wrap items-center gap-2 text-xs">
        <!-- The gray "Low" tag has the card's color in dark mode, so it gets a lighter background. -->
        <Tag
          v-if="priority"
          :value="priority.label"
          :severity="priority.severity"
          class="!text-xs"
          :class="{ 'dark:bg-slate-700': priority.severity === 'secondary' }"
        />
        <span
          v-if="due"
          class="flex items-center gap-1 font-medium"
          :class="isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'"
        >
          <i class="pi text-xs" :class="isOverdue ? 'pi-exclamation-circle' : 'pi-calendar'" />
          {{ formatDue(due) }}
        </span>
        <!-- With a mouse the arrows show on hover or keyboard focus; on touch screens always. -->
        <div
          v-if="showArrows"
          class="-my-1 ml-auto flex transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
        >
          <Button
            v-if="leftColumn"
            icon="pi pi-chevron-left"
            text
            rounded
            severity="secondary"
            size="small"
            :aria-label="`Move to ${leftColumn.name}`"
            :title="`Move to ${leftColumn.name}`"
            @click.stop="emit('move', task, leftColumn.id)"
          />
          <Button
            v-if="rightColumn"
            icon="pi pi-chevron-right"
            text
            rounded
            severity="secondary"
            size="small"
            :aria-label="`Move to ${rightColumn.name}`"
            :title="`Move to ${rightColumn.name}`"
            @click.stop="emit('move', task, rightColumn.id)"
          />
        </div>
      </div>
    </div>
  </article>
</template>
