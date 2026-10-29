<script setup>
import { computed } from 'vue'
import LabelPill from '@/components/LabelPill.vue'
import { formatDue, formatShort, fromApi } from '@/utils/date'
import { DEFAULT_COLUMN_COLOR } from '@/utils/task'
import { renderMarkdown } from '@/utils/markdown'

// Everything about a task, read-only. Used by the task dialog and on shared boards.
const props = defineProps({
  task: { type: Object, required: true },
  column: { type: Object, default: null }, // { name, color }
  labels: { type: Array, default: () => [] }, // the task's labels as { id, name, color }
  // Offers "Add one" when there is no description, and makes the checkboxes clickable.
  canEdit: { type: Boolean, default: false },
  // A checkbox click is being saved; further clicks wait.
  checking: { type: Boolean, default: false },
})
// toggle-checkbox: (index) of the clicked task list item, see utils/markdown toggleCheckbox()
const emit = defineEmits(['edit', 'toggle-checkbox'])

const due = computed(() => fromApi(props.task.due_date))
const isOverdue = computed(() => due.value !== null && due.value < new Date())
const created = computed(() => fromApi(props.task.created))
const edited = computed(() => fromApi(props.task.edited))
const descriptionHtml = computed(() =>
  renderMarkdown(props.task.description, { clickableCheckboxes: props.canEdit }),
)

// The box shows the saved state: the click is undone here and the parent saves the change.
function onDescriptionClick(event) {
  const box = event.target.closest('input[data-task-index]')
  if (!box || !props.canEdit) return
  event.preventDefault()
  if (!props.checking) emit('toggle-checkbox', Number(box.dataset.taskIndex))
}
</script>

<template>
  <article class="flex flex-col gap-4 pt-1" data-testid="task-view">
    <h2 class="text-xl font-semibold break-words text-slate-900 dark:text-slate-100">{{ task.title }}</h2>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span v-if="column" class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :style="{ backgroundColor: column.color ?? DEFAULT_COLUMN_COLOR }"
          aria-hidden="true"
        />
        {{ column.name }}
      </span>
      <span v-if="labels.length" class="flex flex-wrap gap-1" aria-label="Labels">
        <LabelPill v-for="label in labels" :key="label.id" :label="label" />
      </span>
      <span
        v-if="due"
        class="flex items-center gap-1.5 font-medium"
        :class="isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'"
      >
        <i class="pi text-xs" :class="isOverdue ? 'pi-exclamation-circle' : 'pi-calendar'" aria-hidden="true" />
        {{ formatDue(due) }}
      </span>
    </div>

    <!-- Sanitized in renderMarkdown. -->
    <div
      v-if="descriptionHtml"
      class="markdown markdown-large border-t border-slate-200 pt-4 dark:border-slate-800"
      :class="{ 'opacity-60': checking }"
      :aria-busy="checking"
      data-testid="task-description"
      @click="onDescriptionClick"
      v-html="descriptionHtml"
    />
    <p v-else class="border-t border-slate-200 pt-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
      No description.
      <button v-if="canEdit" type="button" class="text-blue-600 hover:underline dark:text-blue-400" @click="emit('edit')">
        Add one
      </button>
    </p>

    <p v-if="created || edited" class="text-xs text-slate-400 dark:text-slate-500">
      <span v-if="created">Created {{ formatShort(created) }}</span>
      <span v-if="created && edited"> · </span>
      <span v-if="edited">Edited {{ formatShort(edited) }}</span>
    </p>
  </article>
</template>
