<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'
import { fromApi, toApi } from '@/utils/date'
import { PRIORITY_OPTIONS } from '@/utils/task'

const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({
  // null = create a new task, otherwise the task to edit
  task: { type: Object, default: null },
  // Column a new task is created in
  columnId: { type: Number, default: null },
})

const store = useBoardStore()
const toast = useToast()

const isEdit = computed(() => props.task !== null)
const busy = ref(false)
const submitted = ref(false)

const form = reactive({
  title: '',
  description: '',
  dueDate: null,
  priority: 2,
})

const titleMissing = computed(() => submitted.value && !form.title.trim())

// Reset the form every time the dialog opens.
watch(visible, (open) => {
  if (!open) return
  submitted.value = false
  const t = props.task
  form.title = t?.title ?? ''
  form.description = t?.description ?? ''
  form.dueDate = fromApi(t?.due_date)
  form.priority = t?.priority ? Number(t.priority) : 2
})

// Without a previous value the picker takes the current time (e.g. 23:07).
// Noon is a more useful default for a freshly picked day.
const dueWasEmpty = ref(false)
function onDateSelect(date) {
  if (!dueWasEmpty.value) return
  dueWasEmpty.value = false
  const noon = new Date(date)
  noon.setHours(12, 0, 0, 0)
  form.dueDate = noon
}

async function save() {
  submitted.value = true
  if (!form.title.trim()) return

  const data = {
    title: form.title.trim(),
    description: form.description.trim(),
    due_date: toApi(form.dueDate),
    priority: form.priority,
  }

  busy.value = true
  try {
    if (isEdit.value) {
      await store.updateTask(props.task.id, data)
      toast.add({ severity: 'success', summary: 'Task updated', life: 2500 })
    } else {
      await store.createTask(props.columnId, data)
      toast.add({ severity: 'success', summary: 'Task created', life: 2500 })
    }
    visible.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not save task', detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="isEdit ? 'Edit task' : 'New task'"
    :style="{ width: '34rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <form id="task-form" class="flex flex-col gap-5 pt-1" @submit.prevent="save">
      <div class="flex flex-col gap-1.5">
        <label for="task-title" class="text-sm font-medium text-slate-700">Title</label>
        <InputText
          id="task-title"
          v-model="form.title"
          :invalid="titleMissing"
          placeholder="What needs to be done?"
          autofocus
          fluid
        />
        <Message v-if="titleMissing" severity="error" size="small" variant="simple">
          Please enter a title.
        </Message>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="task-description" class="text-sm font-medium text-slate-700">
          Description <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <Textarea
          id="task-description"
          v-model="form.description"
          rows="3"
          autoResize
          placeholder="Add some details…"
          fluid
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="task-due" class="text-sm font-medium text-slate-700">
          Due date <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <DatePicker
          v-model="form.dueDate"
          inputId="task-due"
          dateFormat="yy-mm-dd"
          showTime
          hourFormat="24"
          :stepMinute="15"
          showIcon
          iconDisplay="input"
          showButtonBar
          :manualInput="false"
          placeholder="No due date"
          fluid
          @show="dueWasEmpty = !form.dueDate"
          @date-select="onDateSelect"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-slate-700">Priority</span>
        <SelectButton
          v-model="form.priority"
          :options="PRIORITY_OPTIONS"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          fluid
        />
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button
        type="submit"
        form="task-form"
        :label="isEdit ? 'Save changes' : 'Create task'"
        icon="pi pi-check"
        :loading="busy"
      />
    </template>
  </Dialog>
</template>
