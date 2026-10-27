<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import Skeleton from 'primevue/skeleton'
import Menu from 'primevue/menu'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'
import TaskCard from '@/components/TaskCard.vue'
import TaskFormDialog from '@/components/TaskFormDialog.vue'
import ColumnDialog from '@/components/ColumnDialog.vue'
import ColumnDeleteDialog from '@/components/ColumnDeleteDialog.vue'
import BoardList from '@/components/BoardList.vue'
import BoardDialog from '@/components/BoardDialog.vue'
import BoardDeleteDialog from '@/components/BoardDeleteDialog.vue'

const store = useBoardStore()
const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

function showError(summary, err) {
  toast.add({ severity: 'error', summary, detail: err.message, life: 5000 })
}

// localStorage can be unavailable (private mode, blocked storage); the page works without it.
function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered then.
  }
}

const LAST_BOARD_KEY = 'lastBoardId'

function handleLoadError(summary, err) {
  if (err.name === 'AuthError') {
    router.push('/')
    return
  }
  showError(summary, err)
}

// Opens the board from the URL slug. Without one, it opens the last used board, or else the first one.
// The board list maps the slug to the id the API works with.
async function openBoardFromRoute() {
  if (route.name !== 'board') return
  try {
    if (!store.boardsLoaded) await store.fetchBoards()
  } catch (err) {
    handleLoadError('Could not load boards', err)
    return
  }

  const slug = route.params.slug
  if (!slug) {
    const last = Number(readStorage(LAST_BOARD_KEY))
    const target = store.boards.find((b) => b.id === last) ?? store.boards[0]
    if (target) {
      router.replace({ name: 'board', params: { slug: target.slug } })
    } else {
      store.closeBoard()
    }
    return
  }

  const board = store.boards.find((b) => b.slug === slug)
  if (!board) {
    toast.add({ severity: 'warn', summary: 'Board not found', life: 4000 })
    router.replace({ name: 'board' })
    return
  }

  writeStorage(LAST_BOARD_KEY, String(board.id))
  try {
    await store.fetchBoard(board.id)
  } catch (err) {
    if (err.status === 404) {
      // Deleted in the meantime, e.g. in another tab.
      store.boardsLoaded = false
      router.replace({ name: 'board' })
      return
    }
    handleLoadError('Could not load board', err)
  }
}

watch(() => route.params.slug, openBoardFromRoute, { immediate: true })

// Puts the open board back to the server state, e.g. after a failed move.
async function load() {
  if (!store.board) return
  try {
    await store.fetchBoard(store.board.id)
  } catch (err) {
    handleLoadError('Could not load board', err)
  }
}

// ---- Sidebar ----
const SIDEBAR_KEY = 'boardSidebarCollapsed'
const sidebarCollapsed = ref(readStorage(SIDEBAR_KEY) === '1')
watch(sidebarCollapsed, (collapsed) => writeStorage(SIDEBAR_KEY, collapsed ? '1' : '0'))

// On small screens the board list opens as a drawer instead.
const drawerVisible = ref(false)

const boardDialogVisible = ref(false)
const deleteBoardVisible = ref(false)
const deletingBoard = ref(null)

function openCreateBoard() {
  drawerVisible.value = false
  boardDialogVisible.value = true
}

function askDeleteBoard(board) {
  drawerVisible.value = false
  deletingBoard.value = board
  deleteBoardVisible.value = true
}

function onBoardDeleted(board) {
  if (route.params.slug === board.slug) router.replace({ name: 'board' })
}

// ---- Drag & drop ----
// The draggable lists already changed the store arrays when "end" fires, so only the
// backend is left. If that fails, reloading the board puts everything back.

async function onTaskDragEnd(event) {
  if (event.from === event.to && event.oldIndex === event.newIndex) return
  try {
    await store.persistTaskMove(Number(event.item.dataset.taskId))
  } catch (err) {
    showError('Could not move task', err)
    await load()
  }
}

async function onColumnDragEnd(event) {
  if (event.oldIndex === event.newIndex) return
  try {
    await store.persistColumnMove(Number(event.item.dataset.columnId))
  } catch (err) {
    showError('Could not move column', err)
    await load()
  }
}

// ---- Task dialog ----
const taskDialogVisible = ref(false)
const editingTask = ref(null)
const newTaskColumnId = ref(null)

function openCreateTask(columnId) {
  editingTask.value = null
  newTaskColumnId.value = columnId
  taskDialogVisible.value = true
}

function openEditTask(task) {
  editingTask.value = task
  taskDialogVisible.value = true
}

// ---- Task menu ----
const taskMenu = ref()
const menuTask = ref(null)
const taskMenuItems = computed(() => {
  const task = menuTask.value
  if (!task) return []
  const targets = store.columns
    .filter((c) => c.id !== task.columnId)
    .map((c) => ({ label: c.name, icon: 'pi pi-arrow-right', command: () => moveTaskTo(task, c.id) }))
  return [
    { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTask(task) },
    ...(targets.length ? [{ label: 'Move to', items: targets }] : []),
    { separator: true },
    { label: 'Delete', icon: 'pi pi-trash', class: 'text-red-600', command: () => askDeleteTask(task) },
  ]
})

function showTaskMenu(event, task) {
  menuTask.value = task
  taskMenu.value.toggle(event)
}

// The menu puts the task at the end of the target column.
async function moveTaskTo(task, columnId) {
  try {
    await store.moveTask(task.id, columnId, store.tasksByColumn[columnId].length)
  } catch (err) {
    showError('Could not move task', err)
    await load()
  }
}

function askDeleteTask(task) {
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
        showError('Could not delete task', err)
      }
    },
  })
}

// ---- Columns ----
const columnDialogVisible = ref(false)
const editingColumn = ref(null)
const deleteDialogVisible = ref(false)
const deletingColumn = ref(null)

function openAddColumn() {
  editingColumn.value = null
  columnDialogVisible.value = true
}

function openEditColumn(column) {
  editingColumn.value = column
  columnDialogVisible.value = true
}

const columnMenu = ref()
const menuColumn = ref(null)
const columnMenuItems = computed(() => {
  const column = menuColumn.value
  if (!column) return []
  return [
    { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditColumn(column) },
    { separator: true },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      class: 'text-red-600',
      // The backend keeps at least one column per board.
      disabled: store.columns.length === 1,
      command: () => askDeleteColumn(column),
    },
  ]
})

function showColumnMenu(event, column) {
  menuColumn.value = column
  columnMenu.value.toggle(event)
}

// Columns with tasks need the full dialog (move or delete the tasks, type the name).
function askDeleteColumn(column) {
  if (store.tasksByColumn[column.id]?.length) {
    deletingColumn.value = column
    deleteDialogVisible.value = true
    return
  }
  confirm.require({
    header: 'Delete column?',
    message: `The empty column "${column.name}" will be deleted.`,
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await store.deleteColumn(column.id)
      } catch (err) {
        showError('Could not delete column', err)
      }
    },
  })
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)]">
    <aside
      class="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-slate-200 bg-white md:flex"
      :class="sidebarCollapsed ? 'w-12 items-center py-3' : 'w-64 p-3'"
    >
      <Button
        v-if="sidebarCollapsed"
        icon="pi pi-angle-double-right"
        text
        rounded
        severity="secondary"
        aria-label="Show boards"
        title="Show boards"
        @click="sidebarCollapsed = false"
      />
      <template v-else>
        <div class="mb-2 flex items-center justify-between pl-3">
          <span class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Boards</span>
          <Button
            icon="pi pi-angle-double-left"
            text
            rounded
            severity="secondary"
            size="small"
            aria-label="Hide boards"
            title="Hide boards"
            @click="sidebarCollapsed = true"
          />
        </div>
        <BoardList @create="openCreateBoard" @delete="askDeleteBoard" />
      </template>
    </aside>

    <Drawer v-model:visible="drawerVisible" header="Boards" class="!w-72">
      <BoardList @create="openCreateBoard" @delete="askDeleteBoard" @navigate="drawerVisible = false" />
    </Drawer>

    <section class="flex min-w-0 flex-1 flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex items-start gap-2">
          <Button
            icon="pi pi-bars"
            text
            rounded
            severity="secondary"
            aria-label="Show boards"
            class="-ml-2 md:!hidden"
            @click="drawerVisible = true"
          />
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
              {{ store.board?.name ?? 'Boards' }}
            </h1>
            <p v-if="store.loaded" class="text-sm text-slate-500">
              {{ store.taskCount }} {{ store.taskCount === 1 ? 'task' : 'tasks' }} ·
              {{ store.columns.length }} {{ store.columns.length === 1 ? 'column' : 'columns' }}
            </p>
          </div>
        </div>
        <Button
          v-if="store.columns.length"
          label="New task"
          icon="pi pi-plus"
          @click="openCreateTask(store.columns[0].id)"
        />
      </div>

      <div
        v-if="store.boardsLoaded && store.boards.length === 0"
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
      >
        <i class="pi pi-th-large text-4xl text-slate-300" />
        <p class="font-medium text-slate-700">No boards yet</p>
        <p class="text-sm text-slate-500">Create a board to start collecting tasks.</p>
        <Button label="Create your first board" icon="pi pi-plus" class="mt-2" @click="openCreateBoard" />
      </div>

      <div v-else-if="store.loading && !store.loaded" class="flex gap-4 overflow-hidden">
        <Skeleton v-for="n in 3" :key="n" width="18rem" height="20rem" borderRadius="0.75rem" class="shrink-0" />
      </div>

      <div v-else-if="store.loaded" class="-mx-4 overflow-x-auto px-4 pb-4">
        <div class="flex items-start gap-4">
          <VueDraggable
            v-model="store.columns"
            handle=".column-handle"
            :animation="150"
            ghostClass="opacity-40"
            class="flex items-start gap-4"
            @end="onColumnDragEnd"
          >
            <div
              v-for="column in store.columns"
              :key="column.id"
              :data-column-id="column.id"
              class="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100"
            >
              <header class="flex items-center gap-1 px-2 pt-2">
                <button
                  type="button"
                  class="column-handle flex h-8 w-6 cursor-grab items-center justify-center text-slate-400 hover:text-slate-600 active:cursor-grabbing"
                  aria-label="Drag to reorder column"
                  title="Drag to reorder"
                >
                  <i class="pi pi-bars text-xs" />
                </button>
                <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{{ column.name }}</h2>
                <span class="rounded-full bg-white px-2 text-xs font-medium text-slate-500">
                  {{ store.tasksByColumn[column.id].length }}
                </span>
                <Button
                  icon="pi pi-ellipsis-h"
                  text
                  rounded
                  severity="secondary"
                  size="small"
                  aria-label="Column actions"
                  @click="showColumnMenu($event, column)"
                />
              </header>

              <VueDraggable
                v-model="store.tasksByColumn[column.id]"
                group="tasks"
                :animation="150"
                :delay="150"
                :delayOnTouchOnly="true"
                ghostClass="opacity-40"
                class="flex min-h-16 flex-col gap-2 p-2"
                @end="onTaskDragEnd"
              >
                <TaskCard
                  v-for="task in store.tasksByColumn[column.id]"
                  :key="task.id"
                  :task="task"
                  :color="column.color"
                  @edit="openEditTask"
                  @menu="showTaskMenu"
                />
              </VueDraggable>

              <Button
                label="Add task"
                icon="pi pi-plus"
                text
                severity="secondary"
                size="small"
                class="mx-2 mb-2 justify-start"
                @click="openCreateTask(column.id)"
              />
            </div>
          </VueDraggable>

          <button
            type="button"
            class="flex h-12 w-72 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            @click="openAddColumn"
          >
            <i class="pi pi-plus text-xs" />
            Add column
          </button>
        </div>
      </div>

      <Menu ref="taskMenu" :model="taskMenuItems" popup />
      <Menu ref="columnMenu" :model="columnMenuItems" popup />
      <TaskFormDialog v-model:visible="taskDialogVisible" :task="editingTask" :columnId="newTaskColumnId" />
      <ColumnDialog v-model:visible="columnDialogVisible" :column="editingColumn" />
      <ColumnDeleteDialog v-model:visible="deleteDialogVisible" :column="deletingColumn" />
      <BoardDialog v-model:visible="boardDialogVisible" />
      <BoardDeleteDialog v-model:visible="deleteBoardVisible" :board="deletingBoard" @deleted="onBoardDeleted" />
    </section>
  </div>
</template>
