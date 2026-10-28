<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import TaskCard from '@/components/TaskCard.vue'

// Read-only board behind a share link. Works without login, so it uses plain fetch.
const route = useRoute()

const board = ref(null) // { name, columns, labels, tasks }
const status = ref('loading') // 'loading' | 'ok' | 'not-found' | 'error'

const tasksByColumn = computed(() => {
  const byColumn = Object.fromEntries((board.value?.columns ?? []).map((c) => [c.id, []]))
  for (const task of board.value?.tasks ?? []) byColumn[task.columnId]?.push(task)
  return byColumn
})

async function load(token) {
  status.value = 'loading'
  board.value = null
  try {
    const response = await fetch(`/api/share/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } })
    if (response.status === 404) {
      status.value = 'not-found'
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    board.value = await response.json()
    status.value = 'ok'
  } catch {
    status.value = 'error'
  }
}

const labelsOf = (task) => (board.value?.labels ?? []).filter((l) => task.labelIds?.includes(l.id))

watch(() => route.params.token, load, { immediate: true })
</script>

<template>
  <section class="flex flex-col gap-6 px-4 py-8">
    <div v-if="status === 'loading'" class="flex gap-4 overflow-hidden">
      <Skeleton v-for="n in 3" :key="n" width="18rem" height="20rem" borderRadius="0.75rem" class="shrink-0" />
    </div>

    <div
      v-else-if="status !== 'ok'"
      class="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-14 text-center"
    >
      <i class="pi pi-link text-4xl text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <template v-if="status === 'not-found'">
        <p class="font-medium text-slate-700 dark:text-slate-300">This link doesn't work anymore</p>
        <p class="text-sm text-slate-500 dark:text-slate-400">The board may no longer be shared, or the link was replaced by a new one.</p>
      </template>
      <template v-else>
        <p class="font-medium text-slate-700 dark:text-slate-300">Could not load the board</p>
        <p class="text-sm text-slate-500 dark:text-slate-400">Please try again later.</p>
      </template>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{{ board.name }}</h1>
        <Tag value="Read only" icon="pi pi-eye" severity="secondary" />
      </div>

      <div class="-mx-4 overflow-x-auto px-4 pb-4">
        <div class="flex items-start gap-4">
          <div
            v-for="column in board.columns"
            :key="column.id"
            :data-column-id="column.id"
            class="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 dark:bg-slate-900"
          >
            <header class="flex items-center gap-2 px-4 pt-3">
              <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{{ column.name }}</h2>
              <span class="rounded-full bg-white dark:bg-slate-800 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {{ tasksByColumn[column.id].length }}
              </span>
            </header>
            <div class="flex min-h-12 flex-col gap-2 p-2">
              <TaskCard
                v-for="task in tasksByColumn[column.id]"
                :key="task.id"
                :task="task"
                :color="column.color"
                :labels="labelsOf(task)"
                readonly
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
