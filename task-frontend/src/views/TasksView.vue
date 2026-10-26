<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Skeleton from 'primevue/skeleton'
import Menu from 'primevue/menu'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useTaskStore } from '@/stores/tasks'
import { fromApi } from '@/utils/date'
import { STATUS_OPTIONS } from '@/utils/task'
import TaskCard from '@/components/TaskCard.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'

const store = useTaskStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const statusFilter = ref('OPEN')
const search = ref('')
const sortBy = ref('due')

const sortOptions = [
  { label: 'Due date', value: 'due' },
  { label: 'Priority', value: 'priority' },
  { label: 'Newest first', value: 'created' },
]

function countFor(filter) {
  return store.tasks.filter((t) => matchesStatus(t, filter)).length
}

function matchesStatus(task, filter) {
  if (filter === 'ALL') return true
  if (filter === 'OPEN') return task.status !== 'DONE'
  return task.status === filter
}

const filterOptions = computed(() => [
  { label: 'Open', value: 'OPEN', count: countFor('OPEN') },
  ...STATUS_OPTIONS.map((s) => ({ label: s.label, value: s.value, count: countFor(s.value) })),
  { label: 'All', value: 'ALL', count: store.tasks.length },
])

// Tasks without a date go last when sorting by due date.
function dueTime(task) {
  return fromApi(task.due_date)?.getTime() ?? Infinity
}

const visibleTasks = computed(() => {
  const query = search.value.trim().toLowerCase()
  const list = store.tasks.filter(
    (t) =>
      matchesStatus(t, statusFilter.value) &&
      (!query ||
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)),
  )
  const sorters = {
    due: (a, b) => dueTime(a) - dueTime(b),
    priority: (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || dueTime(a) - dueTime(b),
    created: (a, b) => (fromApi(b.created)?.getTime() ?? 0) - (fromApi(a.created)?.getTime() ?? 0),
  }
  return [...list].sort(sorters[sortBy.value])
})

// Create/edit dialog
const dialogVisible = ref(false)
const editingTask = ref(null)

function openCreate() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task) {
  editingTask.value = task
  dialogVisible.value = true
}

// Per-card action menu
const menu = ref()
const menuTask = ref(null)
const menuItems = computed(() => {
  const task = menuTask.value
  if (!task) return []
  const statusItems = STATUS_OPTIONS.filter((s) => s.value !== task.status).map((s) => ({
    label: `Mark as ${s.label.toLowerCase()}`,
    icon: s.icon,
    command: () => changeStatus(task, s.value),
  }))
  return [
    { label: 'Edit', icon: 'pi pi-pencil', command: () => openEdit(task) },
    ...statusItems,
    { separator: true },
    { label: 'Delete', icon: 'pi pi-trash', class: 'text-red-600', command: () => askDelete(task) },
  ]
})

function showMenu(event, task) {
  menuTask.value = task
  menu.value.toggle(event)
}

async function changeStatus(task, status) {
  try {
    await store.updateTask(task.id, { status })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not update task', detail: err.message, life: 5000 })
  }
}

function askDelete(task) {
  confirm.require({
    header: 'Delete task?',
    message: `"${task.title}" will be deleted permanently.`,
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await store.deleteTask(task.id)
        toast.add({ severity: 'success', summary: 'Task deleted', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Could not delete task', detail: err.message, life: 5000 })
      }
    },
  })
}

async function load() {
  try {
    await store.fetchTasks()
  } catch (err) {
    if (err.name === 'AuthError') {
      router.push('/')
      return
    }
    toast.add({ severity: 'error', summary: 'Could not load tasks', detail: err.message, life: 5000 })
  }
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">My tasks</h1>
        <p class="text-sm text-slate-500">
          {{ countFor('OPEN') }} open · {{ countFor('DONE') }} done
        </p>
      </div>
      <Button label="New task" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="-mx-1 overflow-x-auto px-1 pb-1">
        <SelectButton
          v-model="statusFilter"
          :options="filterOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          class="whitespace-nowrap"
        >
          <template #option="{ option }">
            <span>{{ option.label }}</span>
            <span class="ml-1 text-xs opacity-60">{{ option.count }}</span>
          </template>
        </SelectButton>
      </div>

      <div class="flex gap-2">
        <IconField class="min-w-0 flex-1 lg:w-64 lg:flex-none">
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" placeholder="Search tasks" fluid />
        </IconField>
        <Select
          v-model="sortBy"
          :options="sortOptions"
          optionLabel="label"
          optionValue="value"
          aria-label="Sort by"
          class="w-40 shrink-0"
        />
      </div>
    </div>

    <div v-if="store.loading && !store.loaded" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="n in 6" :key="n" height="11rem" borderRadius="0.75rem" />
    </div>

    <div v-else-if="visibleTasks.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TaskCard
        v-for="task in visibleTasks"
        :key="task.id"
        :task="task"
        @edit="openEdit"
        @menu="showMenu"
      />
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <i class="pi pi-inbox text-4xl text-slate-300" />
      <template v-if="store.tasks.length === 0">
        <p class="font-medium text-slate-700">No tasks yet</p>
        <p class="text-sm text-slate-500">Create your first task to get started.</p>
        <Button label="New task" icon="pi pi-plus" class="mt-2" @click="openCreate" />
      </template>
      <template v-else>
        <p class="font-medium text-slate-700">No matching tasks</p>
        <p class="text-sm text-slate-500">Try a different filter or search term.</p>
      </template>
    </div>

    <Menu ref="menu" :model="menuItems" popup />
    <TaskFormDialog v-model:visible="dialogVisible" :task="editingTask" />
  </section>
</template>
