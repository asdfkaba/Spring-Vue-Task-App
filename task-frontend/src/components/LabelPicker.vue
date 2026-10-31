<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import LabelForm from '@/components/LabelForm.vue'
import LabelPill from '@/components/LabelPill.vue'
import { useBoardStore } from '@/stores/board'

// Picks the labels of a task and manages the board's labels (create, rename, recolor, delete).
// Label changes are saved right away; which labels the task has is saved with the task.
// Without selectable (board settings) it only manages the labels.
const selected = defineModel({ type: Array, default: () => [] }) // label ids
defineProps({ selectable: { type: Boolean, default: true } })

const store = useBoardStore()
const confirm = useConfirm()
const toast = useToast()

const editingId = ref(null) // label being edited, 'new' for a new one
const busy = ref(false)

function toggle(id, on) {
  const ids = on ? [...selected.value, id] : selected.value.filter((x) => x !== id)
  selected.value = ids.sort((a, b) => a - b)
}

async function run(action, errorSummary) {
  busy.value = true
  try {
    await action()
    editingId.value = null
  } catch (err) {
    toast.add({ severity: 'error', summary: errorSummary, detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}

function create({ name, color }) {
  // A new label is meant for this task, so select it.
  return run(async () => toggle((await store.addLabel(name, color)).id, true), 'Could not create label')
}

function update(label, changes) {
  return run(() => store.updateLabel(label.id, changes), 'Could not save label')
}

function askDelete(label) {
  const uses = Object.values(store.tasksByColumn)
    .flat()
    .filter((t) => t.labelIds?.includes(label.id)).length
  confirm.require({
    header: `Delete label “${label.name}”?`,
    message:
      uses === 0
        ? 'No task uses it.'
        : `It is removed from ${uses} ${uses === 1 ? 'task' : 'tasks'}. This cannot be undone.`,
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Delete label', severity: 'danger' },
    accept: () =>
      run(async () => {
        await store.deleteLabel(label.id)
        toggle(label.id, false)
      }, 'Could not delete label'),
  })
}
</script>

<template>
  <div class="flex flex-col gap-1 rounded-md border border-slate-200 p-2 dark:border-slate-700" data-testid="label-picker">
    <p v-if="store.labels.length === 0 && editingId !== 'new'" class="px-1 py-1 text-sm text-slate-500 dark:text-slate-400">
      This board has no labels yet.
    </p>

    <template v-for="label in store.labels" :key="label.id">
      <LabelForm
        v-if="editingId === label.id"
        :label="label"
        :busy="busy"
        @save="update(label, $event)"
        @delete="askDelete(label)"
        @cancel="editingId = null"
      />
      <div v-else class="flex items-center gap-1">
        <div v-if="!selectable" class="flex min-w-0 flex-1 items-center px-1 py-1">
          <LabelPill :label="label" />
        </div>
        <label
          v-else
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Checkbox
            :modelValue="selected.includes(label.id)"
            binary
            :inputId="`label-${label.id}`"
            @update:modelValue="toggle(label.id, $event)"
          />
          <LabelPill :label="label" />
        </label>
        <Button
          icon="pi pi-pencil"
          text
          rounded
          severity="secondary"
          size="small"
          :aria-label="`Edit label ${label.name}`"
          @click="editingId = label.id"
        />
      </div>
    </template>

    <LabelForm v-if="editingId === 'new'" :busy="busy" @save="create" @cancel="editingId = null" />
    <Button
      v-else
      label="Create a label"
      icon="pi pi-plus"
      text
      size="small"
      severity="secondary"
      class="self-start"
      @click="editingId = 'new'"
    />
  </div>
</template>
