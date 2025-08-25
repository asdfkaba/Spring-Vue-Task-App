<script setup>
import { reactive, ref, computed } from 'vue'

import { useTaskStore } from '@/stores/tasks'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Menu from 'primevue/menu'
import Badge from 'primevue/badge'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { format } from 'date-fns'


import { useRouter, useRoute } from 'vue-router'

const router = useRouter()

const store = useTaskStore()

let statusOptions = ["TODO", "IN_PROGRESS", "DONE"].map((status) => ({ name: status, value: status }));
const selectedStatus = ref('');

import { onMounted } from 'vue'

onMounted(() => {
    store.fetchTasks()
})

const menu = ref()

const selectedTask = ref()

const menuItems = [
  {
    label: 'Edit',
    icon: 'pi pi-pencil',
    command: () => editItem(selectedTask.value),
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => deleteItem(selectedTask.value),
  },
]

function showMenu(event, task) {
  selectedTask.value = task
  menu.value.show(event)
}

function formatDate(dateArray) {
  if (!dateArray) return '—'
  const date = new Date(...dateArray)
  return format(date, 'yyyy-MM-dd HH:mm')
}

function priorityLabel(priority) {
  return ['Low', 'Medium', 'High'][priority - 1] || 'Unknown'
}

function priorityColor(priority) {
  return [
    'text-green-600 font-semibold',
    'text-yellow-700 font-semibold',
    'text-red-600 font-semibold',
  ][priority - 1] || 'text-gray-500'
}

function statusSeverity(status) {
  switch (status) {
    case 'TODO': return 'secondary'
    case 'IN_PROGRESS': return 'info'
    case 'DONE': return 'success'
    default: return 'warning'
  }
}


function deleteItem(task) {
    store.deleteTask(task.id)
}

function editItem(task) {
  router.push({
    path: `/tasks/${task.id}/edit`,
    params: { itemId: task.id, task }
  })
}

function toggle(){}

const items = [{
          label: 'Reschedule',
        },
        {
          label: 'Mark Completed'
        },
        {
          label: 'Cancel Schedule'
        },
        {
          label: 'Generate Bill'
        },
]

</script>

<template>
  <div class="tasks">
    <Card v-for="task in store.tasks" :key="task.id" class="shadow-sm p-3 !bg-emerald-100">
      <template #header>
        <div class="flex justify-between items-start">
          <div class="font-semibold text-xl">{{ task.title }}</div>
          <Button 
            icon="pi pi-ellipsis-v"
            class="p-button-text p-button-plain p-0"
            @click="showMenu($event, task)"
          />
        </div>
      </template>

      <template #content>
        <p class="mb-2 text-gray-700">{{ task.description }}</p>

        <div class="flex flex-col text-sm text-gray-600 gap-1">
          <div><i class="pi pi-calendar-plus mr-2"></i>Created: {{ formatDate(task.created) }}</div>
          <div><i class="pi pi-calendar-minus mr-2"></i>Due: {{ formatDate(task.due_date) }}</div>
          <div>
            <i class="pi pi-flag mr-2"></i>
            Priority:
            <span :class="priorityColor(task.priority)">
              {{ priorityLabel(task.priority) }}
            </span>
          </div>
          <div>
            <i class="pi pi-check-circle mr-2"></i>
            Status: 
            <Badge :value="task.status" :severity="statusSeverity(task.status)" />
          </div>
        </div>
      </template>
    </Card>

    <Menu ref="menu" :model="menuItems" :popup="true" />
  </div>
<div class="create">
  <MyComponent/>
</div>
</template>

<style>
.tasks {
    display: grid;
    grid-gap: 1rem;
    box-sizing: border-box;
    width: 100%;
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 95vw), 1fr));
}
.task {
    display: grid;
    place-items: center;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    position: relative;
}

.task-delete {
    position: absolute !important;
    top: 5px;
    right: 5px;
}
.task-title {
    font-size: 1.5rem;
    text-align: center;
}
.create {
    grid-column: 1/-1;
    text-align: center;
    width: 100%;
}
.custom-button {
    width: 55px;
    font-size: x-small;
    font-weight: bolder;
    text-align: center;
    border: 1px solid red;
    border-radius: 4px;
    padding: 0.1rem 0.3rem;
    font-family: monospace;
}
.delete {
    border: 1px solid red;
}
.edit {
    border: 1px solid orange;
}
.action-buttons {
display: flex;
grid-gap: 0.3rem;
}
</style>

