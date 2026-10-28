// Serves the built frontend and an in-memory imitation of the board API, for the browser tests.
// It mimics the Spring backend closely enough for the UI; the backend has its own tests.
// Usage: node e2e/mock-server.mjs <dist-dir> <port>
// POST /api/__reset restores the start state; GET /api/__state shows the current state.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const [distDir, port] = process.argv.slice(2)

let nextId
const board = { id: 1, name: 'My board', slug: 'my-board' }
let columns
let labels
// History like the backend: newest first per task, only changed fields.
let events
let eventId
const colName = (id) => columns.find((c) => c.id === id)?.name
const labelNames = (ids) => labels.filter((l) => (ids ?? []).includes(l.id)).map((l) => l.name).sort()
// LocalDateTime like the backend: local time without zone.
const localNow = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19) }
function record(task, type, changes) {
  events.unshift({ id: eventId++, taskId: task.id, type, at: localNow(), user: 'Alice', changes })
}
// Share link like the backend: a key (22 chars) plus the board slug in front; OLD_UUID imitates a pre-slug link.
const OLD_UUID = '13d72268-5904-431b-b410-f348df9ec414'
let share // { key, created }
let shareRequests
const newKey = () => Array.from({ length: 22 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[Math.floor(Math.random() * 64)]).join('')
let tasks
let log

function reset() {
  nextId = 100
  columns = [
    { id: 10, name: 'To do', color: '#64748b', position: 0 },
    { id: 11, name: 'In progress', color: '#3b82f6', position: 1 },
    { id: 12, name: 'Done', color: '#22c55e', position: 2 },
  ]
  labels = []
  events = []
  eventId = 1
  share = null
  shareRequests = []
  tasks = [
    { id: 1, title: 'Task A', description: 'first', due_date: null, created: null, edited: null, columnId: 10, position: 0 },
    { id: 2, title: 'Task B', description: null, due_date: [2026, 1, 1, 12, 0], created: null, edited: null, columnId: 10, position: 1 },
    { id: 3, title: 'Task C', description: null, due_date: null, created: '2026-08-01T10:00:00', edited: null, columnId: 11, position: 0 },
  ]
  log = []
}
reset()

const inColumn = (id) => tasks.filter((t) => t.columnId === id).sort((a, b) => a.position - b.position)
const renumber = (list) => list.forEach((t, i) => (t.position = i))
const sortedColumns = () => [...columns].sort((a, b) => a.position - b.position)

function api(method, url, body) {
  const u = new URL(url, 'http://x')
  const p = u.pathname.replace(/^\/api/, '')
  let m
  if (method === 'GET' && p === '/auth/status') return [200, { email: 'alice@example.com', name: 'Alice' }]
  if (method === 'GET' && p === '/boards') return [200, [{ id: 1, name: board.name, slug: board.slug }]]
  if (method === 'GET' && p === '/boards/1') {
    const cols = sortedColumns()
    const ts = cols.flatMap((c) => inColumn(c.id))
    return [200, { ...board, columns: cols, labels, tasks: ts }]
  }
  if (method === 'POST' && p === '/boards/1/columns') {
    const c = { id: nextId++, name: body.name.trim(), color: body.color ?? null, position: columns.length }
    columns.push(c)
    return [201, c]
  }
  if ((m = p.match(/^\/columns\/(\d+)$/))) {
    const col = columns.find((c) => c.id === +m[1])
    if (!col) return [404, {}]
    if (method === 'PATCH') {
      if ('name' in body) col.name = body.name
      if ('color' in body) col.color = body.color
      if ('position' in body) {
        const list = sortedColumns().filter((c) => c !== col)
        list.splice(Math.min(body.position, list.length), 0, col)
        list.forEach((c, i) => (c.position = i))
      }
      return [200, col]
    }
    if (method === 'DELETE') {
      const own = inColumn(col.id)
      const moveTo = u.searchParams.get('moveTo')
      const deleteTasks = u.searchParams.get('deleteTasks') === 'true'
      if (columns.length === 1) return [409, {}]
      if (own.length && !moveTo && !deleteTasks) return [409, {}]
      if (moveTo) {
        let next = inColumn(+moveTo).length
        own.forEach((t) => { t.columnId = +moveTo; t.position = next++ })
      } else if (deleteTasks) {
        tasks = tasks.filter((t) => t.columnId !== col.id)
      }
      columns = columns.filter((c) => c !== col)
      sortedColumns().forEach((c, i) => (c.position = i))
      return [204, null]
    }
  }
  if (method === 'POST' && p === '/boards/1/labels') {
    if (!body.name?.trim() || !/^#[0-9a-f]{6}$/i.test(body.color ?? '')) return [400, {}]
    const l = { id: nextId++, name: body.name.trim(), color: body.color.toLowerCase() }
    labels.push(l)
    return [201, l]
  }
  if ((m = p.match(/^\/labels\/(\d+)$/))) {
    const l = labels.find((x) => x.id === +m[1])
    if (!l) return [404, {}]
    if (method === 'PATCH') {
      if (body.name != null) l.name = body.name.trim()
      if (body.color != null) l.color = body.color.toLowerCase()
      return [200, l]
    }
    if (method === 'DELETE') {
      labels = labels.filter((x) => x !== l)
      tasks.forEach((t) => (t.labelIds = (t.labelIds ?? []).filter((id) => id !== l.id)))
      return [204, null]
    }
  }
  if (method === 'POST' && p === '/tasks') {
    if (!body.columnId) return [400, {}]
    const t = { id: nextId++, title: body.title, description: body.description, due_date: body.due_date, created: null, edited: null, columnId: body.columnId, position: inColumn(body.columnId).length, labelIds: body.labelIds ?? [] }
    tasks.push(t)
    record(t, 'created', { title: t.title, column: colName(t.columnId) })
    return [201, t]
  }
  if ((m = p.match(/^\/tasks\/(\d+)\/move$/)) && method === 'PATCH') {
    const t = tasks.find((x) => x.id === +m[1])
    if (body.columnId !== t.columnId) record(t, 'moved', { column: [colName(t.columnId), colName(body.columnId)] })
    const source = inColumn(t.columnId).filter((x) => x !== t)
    const target = body.columnId === t.columnId ? source : inColumn(body.columnId)
    target.splice(Math.min(body.position, target.length), 0, t)
    t.columnId = body.columnId
    renumber(source)
    renumber(target)
    return [200, t]
  }
  if ((m = p.match(/^\/tasks\/(\d+)\/history$/)) && method === 'GET') {
    return [200, events.filter((e) => e.taskId === +m[1]).map(({ taskId, ...e }) => e)]
  }
  if (method === 'GET' && p === '/boards/1/share') return share ? [200, { path: `${board.slug}-${share.key}`, created: share.created }] : [204, null]
  if (method === 'POST' && p === '/boards/1/share') {
    share = { key: newKey(), created: '2026-10-28T20:00:00' }
    return [201, { path: `${board.slug}-${share.key}`, created: share.created }]
  }
  if (method === 'DELETE' && p === '/boards/1/share') { share = null; return [204, null] }
  if (method === 'GET' && (m = p.match(/^\/share\/(.+)$/)) && m[1] !== 'test-token') {
    const ref = decodeURIComponent(m[1])
    shareRequests.push(ref)
    const ok = share && (ref === OLD_UUID || ref === share.key || (ref.length > 23 && ref.endsWith('-' + share.key)))
    if (!ok) return [404, {}]
    const cols = sortedColumns()
    return [200, { name: board.name, path: `${board.slug}-${share.key}`, columns: cols, labels, tasks: cols.flatMap((c) => inColumn(c.id)) }]
  }
  if (method === 'GET' && p === '/share/test-token') {
    const cols = sortedColumns()
    return [200, { name: board.name, columns: cols, labels, tasks: cols.flatMap((c) => inColumn(c.id)) }]
  }
  if ((m = p.match(/^\/tasks\/(\d+)$/)) && method === 'PUT') {
    const t = tasks.find((x) => x.id === +m[1])
    if (body.labelIds && body.labelIds.some((id) => !labels.some((l) => l.id === id))) return [400, {}]
    const before = { title: t.title, description: t.description || null, due_date: t.due_date ?? null, labels: labelNames(t.labelIds) }
    Object.assign(t, { title: body.title, description: body.description, due_date: body.due_date })
    if (body.labelIds) t.labelIds = [...body.labelIds].sort((a, b) => a - b)
    const after = { title: t.title, description: t.description || null, due_date: t.due_date ?? null, labels: labelNames(t.labelIds) }
    const changes = {}
    for (const f of ['title', 'description', 'due_date']) if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) changes[f] = [before[f], after[f]]
    const added = after.labels.filter((n) => !before.labels.includes(n))
    const removed = before.labels.filter((n) => !after.labels.includes(n))
    if (added.length) changes.labelsAdded = added
    if (removed.length) changes.labelsRemoved = removed
    if (Object.keys(changes).length) record(t, 'updated', changes)
    t.edited = localNow()
    return [200, t]
  }
  return [404, {}]
}

const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : null
      // Test hook: add an event as older backends wrote it (e.g. a priority change).
      if (req.url === '/api/__event' && req.method === 'POST') {
        events.unshift({ id: eventId++, at: '2026-09-01T10:00:00', user: 'Alice', ...body })
        res.writeHead(204)
        res.end()
        return
      }
      if (req.url === '/api/__reset' && req.method === 'POST') {
        reset()
        res.writeHead(204)
        res.end()
        return
      }
      if (req.url === '/api/__state') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ share, shareRequests, columns: sortedColumns(), labels, tasks: sortedColumns().flatMap((c) => inColumn(c.id)), log }))
        return
      }
      if (req.method !== 'GET') log.push({ method: req.method, url: req.url, body })
      const [status, out] = api(req.method, req.url, body)
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(out === null ? '' : JSON.stringify(out))
    })
    return
  }
  let file = path.join(distDir, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(distDir, 'index.html')
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(+port, () => console.log(`mock on ${port}`))
