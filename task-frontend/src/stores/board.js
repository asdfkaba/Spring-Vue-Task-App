import { defineStore } from 'pinia'
import { authFetch } from '@/api/actions.js'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

async function expectOk(response, action) {
  if (!response.ok) {
    const error = new Error(`${action} failed (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }
  return response
}

function sendJson(url, method, body) {
  return authFetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) })
}

/**
 * The user's boards, and the open board: columns in order, and per column the tasks in order.
 * Drag & drop changes the arrays in tasksByColumn / columns directly; the persist* actions
 * then tell the backend. If that fails, the caller reloads the board to undo the local change.
 */
export const useBoardStore = defineStore('board', {
  state: () => ({
    boards: [], // [{ id, name }] in creation order
    boardsLoaded: false,
    board: null, // the open board: { id, name }
    columns: [], // [{ id, name, color, position }]
    tasksByColumn: {}, // { [columnId]: [task, ...] }
    loading: false,
    loaded: false,
    requestedBoardId: null, // to ignore late answers after switching boards quickly
  }),

  getters: {
    columnById: (state) => (id) => state.columns.find((c) => c.id === id) ?? null,
    taskCount: (state) =>
      Object.values(state.tasksByColumn).reduce((sum, tasks) => sum + tasks.length, 0),
  },

  actions: {
    reset() {
      this.boards = []
      this.boardsLoaded = false
      this.closeBoard()
    },

    closeBoard() {
      this.board = null
      this.columns = []
      this.tasksByColumn = {}
      this.loaded = false
    },

    async fetchBoards() {
      this.boards = await (await expectOk(await authFetch('/api/boards'), 'Loading boards')).json()
      this.boardsLoaded = true
    },

    async fetchBoard(id) {
      // Switching boards: don't show the previous board while the new one loads.
      if (this.board?.id !== id) this.closeBoard()
      this.requestedBoardId = id
      this.loading = true
      try {
        const detail = await (await expectOk(await authFetch(`/api/boards/${id}`), 'Loading board')).json()
        if (this.requestedBoardId !== id) return

        const tasksByColumn = Object.fromEntries(detail.columns.map((c) => [c.id, []]))
        for (const task of detail.tasks) {
          tasksByColumn[task.columnId]?.push(task)
        }
        this.board = { id: detail.id, name: detail.name }
        this.columns = detail.columns
        this.tasksByColumn = tasksByColumn
        this.loaded = true
      } finally {
        if (this.requestedBoardId === id) this.loading = false
      }
    },

    async createBoard(name) {
      const response = await expectOk(await sendJson('/api/boards', 'POST', { name }), 'Creating board')
      const board = await response.json()
      this.boards.push(board)
      return board
    },

    async deleteBoard(id) {
      await expectOk(await authFetch(`/api/boards/${id}`, { method: 'DELETE' }), 'Deleting board')
      this.boards = this.boards.filter((b) => b.id !== id)
      if (this.board?.id === id) this.closeBoard()
    },

    // ---- Tasks ----

    findTask(id) {
      for (const [columnId, tasks] of Object.entries(this.tasksByColumn)) {
        const index = tasks.findIndex((t) => t.id === id)
        if (index !== -1) return { columnId: Number(columnId), index, task: tasks[index] }
      }
      return null
    },

    async createTask(columnId, data) {
      const response = await expectOk(
        await sendJson('/api/tasks', 'POST', { ...data, columnId }),
        'Creating task',
      )
      const task = await response.json()
      this.tasksByColumn[columnId].push(task)
      return task
    },

    // PUT replaces all editable fields, so send the current values plus the changes.
    async updateTask(id, changes) {
      const found = this.findTask(id)
      if (!found) throw new Error('Task not found')
      const { task } = found

      const payload = {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        ...changes,
      }
      const response = await expectOk(await sendJson(`/api/tasks/${id}`, 'PUT', payload), 'Updating task')
      const updated = await response.json()
      this.tasksByColumn[found.columnId].splice(found.index, 1, updated)
      return updated
    },

    async deleteTask(id) {
      await expectOk(await authFetch(`/api/tasks/${id}/delete`, { method: 'DELETE' }), 'Deleting task')
      const found = this.findTask(id)
      if (found) this.tasksByColumn[found.columnId].splice(found.index, 1)
    },

    // Moves a task locally (e.g. from a menu) and then saves it.
    async moveTask(id, columnId, index) {
      const found = this.findTask(id)
      if (!found) throw new Error('Task not found')
      this.tasksByColumn[found.columnId].splice(found.index, 1)
      this.tasksByColumn[columnId].splice(index, 0, found.task)
      await this.persistTaskMove(id)
    },

    // Saves the place the task now has in tasksByColumn (after drag & drop or moveTask).
    async persistTaskMove(id) {
      const found = this.findTask(id)
      if (!found) return
      found.task.columnId = found.columnId
      this.renumberTasks()
      await expectOk(
        await sendJson(`/api/tasks/${id}/move`, 'PATCH', { columnId: found.columnId, position: found.index }),
        'Moving task',
      )
    },

    renumberTasks() {
      for (const tasks of Object.values(this.tasksByColumn)) {
        tasks.forEach((t, i) => (t.position = i))
      }
    },

    // ---- Columns ----

    async addColumn(name, color) {
      const response = await expectOk(
        await sendJson(`/api/boards/${this.board.id}/columns`, 'POST', { name, color }),
        'Adding column',
      )
      const column = await response.json()
      this.columns.push(column)
      this.tasksByColumn[column.id] = []
      return column
    },

    // changes: any of { name, color, position }; color null removes the color.
    async updateColumn(id, changes) {
      const response = await expectOk(await sendJson(`/api/columns/${id}`, 'PATCH', changes), 'Updating column')
      const updated = await response.json()
      const index = this.columns.findIndex((c) => c.id === id)
      if (index !== -1) this.columns.splice(index, 1, { ...this.columns[index], ...updated })
      return updated
    },

    // Saves the place the column now has in columns (after drag & drop).
    async persistColumnMove(id) {
      const index = this.columns.findIndex((c) => c.id === id)
      if (index === -1) return
      this.columns.forEach((c, i) => (c.position = i))
      await expectOk(await sendJson(`/api/columns/${id}`, 'PATCH', { position: index }), 'Moving column')
    },

    // choice: { moveTo: columnId } or { deleteTasks: true }; not needed for an empty column.
    async deleteColumn(id, choice = {}) {
      const params = new URLSearchParams()
      if (choice.moveTo != null) params.set('moveTo', choice.moveTo)
      if (choice.deleteTasks) params.set('deleteTasks', 'true')
      const query = params.toString() ? `?${params}` : ''

      await expectOk(await authFetch(`/api/columns/${id}${query}`, { method: 'DELETE' }), 'Deleting column')

      const moved = this.tasksByColumn[id] ?? []
      if (choice.moveTo != null) {
        moved.forEach((t) => (t.columnId = choice.moveTo))
        this.tasksByColumn[choice.moveTo].push(...moved)
      }
      delete this.tasksByColumn[id]
      this.columns = this.columns.filter((c) => c.id !== id)
      this.columns.forEach((c, i) => (c.position = i))
      this.renumberTasks()
    },
  },
})
