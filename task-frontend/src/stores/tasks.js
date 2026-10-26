import { defineStore } from 'pinia'
import { authFetch } from '@/api/actions.js'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

async function expectOk(response, action) {
  if (!response.ok) {
    throw new Error(`${action} failed (HTTP ${response.status})`)
  }
  return response
}

export const useTaskStore = defineStore('storeId', {
  state: () => ({
    tasks: [],
    loading: false,
    loaded: false,
  }),

  actions: {
    logout() {
      this.tasks = []
      this.loaded = false
    },

    async fetchTasks() {
      this.loading = true
      try {
        const response = await expectOk(await authFetch('/api/tasks'), 'Loading tasks')
        this.tasks = await response.json()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async createTask(data) {
      const response = await expectOk(
        await authFetch('/api/tasks', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        }),
        'Creating task',
      )
      const task = await response.json()
      this.tasks.push(task)
      return task
    },

    // PUT replaces all editable fields, so send the current values plus the changes.
    async updateTask(id, changes) {
      const original = this.tasks.find((t) => t.id === id)
      if (!original) throw new Error('Task not found')

      const payload = {
        title: original.title,
        description: original.description,
        due_date: original.due_date,
        priority: original.priority,
        status: original.status,
        ...changes,
      }

      const response = await expectOk(
        await authFetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        }),
        'Updating task',
      )
      const updated = await response.json()
      const index = this.tasks.findIndex((t) => t.id === id)
      this.tasks.splice(index, 1, updated)
      return updated
    },

    async deleteTask(id) {
      await expectOk(
        await authFetch(`/api/tasks/${id}/delete`, { method: 'DELETE' }),
        'Deleting task',
      )
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },
  },
})
