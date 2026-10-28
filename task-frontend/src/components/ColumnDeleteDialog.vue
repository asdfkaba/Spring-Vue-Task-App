<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'

// Only used for columns that still have tasks; empty columns get a simple confirmation.
const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({ column: { type: Object, default: null } })

const store = useBoardStore()
const toast = useToast()

const action = ref('move') // 'move' | 'delete'
const targetId = ref(null)
const typedName = ref('')
const busy = ref(false)

const taskCount = computed(() => (props.column ? (store.tasksByColumn[props.column.id]?.length ?? 0) : 0))
const otherColumns = computed(() => store.columns.filter((c) => c.id !== props.column?.id))
const nameMatches = computed(() => props.column !== null && typedName.value === props.column.name)
const canDelete = computed(
  () => nameMatches.value && (action.value === 'delete' || targetId.value !== null),
)

watch(visible, (open) => {
  if (!open) return
  action.value = 'move'
  targetId.value = otherColumns.value[0]?.id ?? null
  typedName.value = ''
})

async function confirmDelete() {
  if (!canDelete.value) return
  busy.value = true
  try {
    const choice = action.value === 'move' ? { moveTo: targetId.value } : { deleteTasks: true }
    await store.deleteColumn(props.column.id, choice)
    toast.add({ severity: 'success', summary: 'Column deleted', life: 2500 })
    visible.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not delete column', detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Delete column"
    :style="{ width: '28rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <form v-if="column" id="column-delete-form" class="flex flex-col gap-5 pt-1" @submit.prevent="confirmDelete">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        <strong class="text-slate-900 dark:text-slate-100">{{ column.name }}</strong> still has
        {{ taskCount }} {{ taskCount === 1 ? 'task' : 'tasks' }}. What should happen to
        {{ taskCount === 1 ? 'it' : 'them' }}?
      </p>

      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <RadioButton v-model="action" inputId="delete-action-move" value="move" />
          <label for="delete-action-move" class="text-sm text-slate-700 dark:text-slate-300">Move to</label>
          <Select
            v-model="targetId"
            :options="otherColumns"
            optionLabel="name"
            optionValue="id"
            :disabled="action !== 'move'"
            aria-label="Target column"
            class="ml-1 min-w-0 flex-1"
            size="small"
          />
        </div>
        <div class="flex items-center gap-2">
          <RadioButton v-model="action" inputId="delete-action-delete" value="delete" />
          <label for="delete-action-delete" class="text-sm text-red-700 dark:text-red-400">
            Delete {{ taskCount === 1 ? 'the task' : `all ${taskCount} tasks` }}
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="delete-confirm-name" class="text-sm text-slate-700 dark:text-slate-300">
          To confirm, type <strong class="font-semibold text-slate-900 dark:text-slate-100 select-all">{{ column.name }}</strong>
        </label>
        <InputText id="delete-confirm-name" v-model="typedName" autocomplete="off" fluid />
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button
        type="submit"
        form="column-delete-form"
        label="Delete column"
        icon="pi pi-trash"
        severity="danger"
        :disabled="!canDelete"
        :loading="busy"
      />
    </template>
  </Dialog>
</template>
