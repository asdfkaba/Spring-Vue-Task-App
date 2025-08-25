<script setup>
import { reactive, ref } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { Form } from '@primevue/forms';
import { FormField } from '@primevue/forms';


const store = useTaskStore()
const toast = useToast();

const busy = ref(false)
const fail = ref(false)
const visible = ref(false)

const taskTemplate = {
  title: '',
  description: '',
  due_date: null,
  priority: null,
  status: 'TODO'
}

const task = reactive({ ... taskTemplate })

const priorityOptions = [
  { label: 'Low', value: '1' },
  { label: 'Medium', value: '2' },
  { label: 'High', value: '3' }
]

const statusOptions = [
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' }
]

async function create() {
  console.log('Create task clicked')
  busy.value = true
  try {
    const payload = {
      ...task,
      priority: task.priority?.value ?? null,
      status: task.status?.value ?? null,
    }
    const success = await store.createTask({ ...payload })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Task created', life: 3000 })
    fail.value = !success
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Task creation failed', life: 3000 })
    fail.value = true
  } finally {
    visible.value = false
    busy.value = false
    Object.assign(task, taskTemplate)
  }
}
</script>

<template>
<Button label="Create Task" @click="visible = true" class="w-full !bg-emerald-500"/>
<Toast />
<Dialog v-model:visible="visible" modal header="Create Task" :style="{ width: '600px' }">
    <Form class="flex flex-col gap-4 w-full">
      <FormField label="Title" class="flex flex-col gap-1">
          <InputText v-model="task.title" class="w-full" placeholder="Title"/>
      </FormField>

      <FormField label="Description" class="flex flex-col gap-1">
          <Textarea v-model="task.description" rows="3" class="w-full" placeholder="Description"/>
      </FormField>

      <FormField label="Due Date" class="flex flex-col gap-1">
          <Calendar v-model="task.due_date" class="w-full" showIcon dateFormat="yy-mm-dd" placeholder="Due Date" />
      </FormField>

      <FormField label="Priority" class="flex flex-col gap-1">
          <Dropdown v-model="task.priority" :options="priorityOptions" class="w-full" optionLabel="label" placeholder="Priority"/>
      </FormField>

      <FormField label="Status" class="flex flex-col gap-1">
          <Dropdown v-model="task.status" :options="statusOptions" class="w-full" optionLabel="label" placeholder="Status"/>
      </FormField>

      <Button label="Create Task" @click="create" :loading="busy" class="w-full !bg-emerald-500" />
    </Form>
</Dialog>
</template>

<style>
.task {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
</style>

