<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { Form } from '@primevue/forms'
import { FormField } from '@primevue/forms'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const taskId = route.params.itemId
const busy = ref(false)
const taskForm = reactive({
  title: '',
  description: '',
  due_date: null,
  priority: null,
  status: null,
})

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

onMounted(async () => {
  const task = await store.getTaskById(taskId)
  if (!task) {
    toast.add({ severity: 'error', summary: 'Not found', detail: 'Task not found', life: 3000 })
    router.push('/tasks')
    return
  }

  taskForm.title = task.title
  taskForm.description = task.description
  taskForm.due_date = task.due_date
  taskForm.priority = priorityOptions.find(p => p.value === String(task.priority)) || null
  taskForm.status = statusOptions.find(s => s.value === task.status) || null
})

async function update() {
  busy.value = true
  try {
    const updatedTask = {
      id: taskId,
      title: taskForm.title,
      description: taskForm.description,
      due_date: taskForm.due_date,
      priority: taskForm.priority?.value ?? null,
      status: taskForm.status?.value ?? null,
    }

    const success = await store.updateTask(updatedTask)
    if (success) {
      toast.add({ severity: 'success', summary: 'Updated', detail: 'Task updated successfully', life: 3000 })
      router.push('/tasks')
    } else {
      throw new Error('Update failed')
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update task', life: 3000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Toast />
  <Form class="flex flex-col gap-4 w-full">
    <FormField label="Title">
      <InputText v-model="taskForm.title" class="w-full" />
    </FormField>

    <FormField label="Description">
      <Textarea v-model="taskForm.description" rows="3" class="w-full" />
    </FormField>

    <FormField label="Due Date">
      <Calendar v-model="taskForm.due_date" class="w-full" showIcon dateFormat="yy-mm-dd" />
    </FormField>

    <FormField label="Priority">
      <Dropdown v-model="taskForm.priority" :options="priorityOptions" optionLabel="label" class="w-full" />
    </FormField>

    <FormField label="Status">
      <Dropdown v-model="taskForm.status" :options="statusOptions" optionLabel="label" class="w-full" />
    </FormField>

    <Button label="Update Task" @click="update" :loading="busy" class="w-full" />
    <router-link to="/tasks" class="text-center block mt-4 underline">Cancel</router-link>
  </Form>
</template>

