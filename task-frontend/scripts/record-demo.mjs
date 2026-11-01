// Records the README demo video against the mock API (e2e/mock-server.mjs) with sample data.
// Usage (after `npx vite build`): node scripts/record-demo.mjs <output.webm>
// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's own. Needs ffmpeg, which
// shrinks Playwright's recording (about 7 MB) to a fifth at nearly the same quality.
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from '@playwright/test'

const output = path.resolve(process.argv[2] ?? 'demo.webm')
const PORT = 4997
const BASE = `http://localhost:${PORT}`
const SIZE = { width: 1280, height: 800 }

// ---- Sample data ----

async function api(method, url, body) {
  const response = await fetch(`${BASE}/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${url}: HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}

// Due dates are wall-clock time without a zone, like the backend expects.
function dueIn(days, hour) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00:00`
}

async function seed() {
  await api('POST', '/__reset')
  await api('PATCH', '/boards/1', { name: 'Job hunt' })

  // The mock starts with three tasks; park them in a column that is then deleted with them.
  const scratch = await api('POST', '/boards/1/columns', { name: 'Scratch' })
  for (const id of [1, 2, 3]) await api('PATCH', `/tasks/${id}/move`, { columnId: scratch.id, position: 0 })
  await api('DELETE', `/columns/${scratch.id}?deleteTasks=true`)

  await api('PATCH', '/columns/10', { name: 'Wishlist', color: '#64748b' })
  await api('PATCH', '/columns/11', { name: 'Applied', color: '#3b82f6' })
  await api('PATCH', '/columns/12', { name: 'Interview', color: '#f59e0b' })
  const offer = await api('POST', '/boards/1/columns', { name: 'Offer', color: '#22c55e' })
  const columns = { wishlist: 10, applied: 11, interview: 12, offer: offer.id }

  const label = async (name, color) => (await api('POST', '/boards/1/labels', { name, color })).id
  const remote = await label('Remote', '#3b82f6')
  const hybrid = await label('Hybrid', '#8b5cf6')
  const startup = await label('Startup', '#f59e0b')
  const topPick = await label('Top pick', '#ef4444')

  const template = '## Steps\n- [ ] Research the company\n- [ ] Tailor CV\n- [ ] Cover letter\n- [ ] Send application'
  await api('PUT', '/boards/1/task-template', { template })

  const task = (column, title, description, due, labelIds) =>
    api('POST', '/tasks', { columnId: columns[column], title, description, due_date: due, labelIds })

  await task('wishlist', 'Acme Corp – Backend Engineer',
    'Kotlin and Spring, payments team.\n\n- [x] Research the company\n- [ ] Tailor CV\n- [ ] Cover letter\n- [ ] Send application',
    dueIn(3, 18), [remote, topPick])
  await task('wishlist', 'Nimbus Labs – Platform Engineer', 'Kubernetes, small team, Series A.', null, [startup, remote])
  await task('wishlist', 'Globex – Java Developer', 'Referral from Sam.', dueIn(9, 12), [hybrid])
  await task('applied', 'Initech – Senior Developer',
    'Applied via the careers page.\n\n- [x] Research the company\n- [x] Tailor CV\n- [x] Cover letter\n- [x] Send application',
    dueIn(6, 9), [hybrid])
  await task('applied', 'Umbrella – DevOps Engineer', 'Waiting for an answer.', null, [remote])
  await task('interview', 'Hooli – Software Engineer',
    'Second round with the team lead.\n\n## Prepare\n- [x] System design recap\n- [ ] Questions for the team\n  - [ ] On-call\n  - [ ] Growth path',
    dueIn(1, 10), [topPick, hybrid])
  await task('offer', 'Stark Industries – Tech Lead', 'Offer until Friday.', dueIn(4, 17), [startup])
}

// ---- A visible cursor (videos don't show the real one) ----

const CURSOR_SCRIPT = `
  // Four columns need the room of the board sidebar.
  if (localStorage.getItem('boardSidebarCollapsed') === null) localStorage.setItem('boardSidebarCollapsed', '1')
  window.addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div')
    dot.style.cssText = 'position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
      'background:rgba(15,23,42,.35);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);' +
      'pointer-events:none;z-index:2147483647;transition:transform .12s;transform:translate(-100px,-100px)'
    document.body.appendChild(dot)
    let x = -100, y = -100, scale = 1
    const place = () => (dot.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')')
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; place() }, true)
    window.addEventListener('mousedown', () => { scale = 0.7; place() }, true)
    window.addEventListener('mouseup', () => { scale = 1; place() }, true)
  })
`

// ---- Recording ----

const server = spawn('node', ['e2e/mock-server.mjs', 'dist', String(PORT)], { stdio: 'ignore' })
const videoDir = fs.mkdtempSync(path.join(path.dirname(output), '.demo-video-'))
let browser
try {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/api/__state`)
      break
    } catch {
      await sleep(100)
    }
  }
  await seed()

  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const context = await browser.newContext({
    viewport: SIZE,
    colorScheme: 'light',
    recordVideo: { dir: videoDir, size: SIZE },
  })
  await context.addInitScript(CURSOR_SCRIPT)
  const page = await context.newPage()

  let mouse = { x: SIZE.width / 2, y: SIZE.height / 2 }
  async function glide(x, y, steps = 25) {
    await page.mouse.move(x, y, { steps })
    mouse = { x, y }
  }
  async function clickOn(locator, { pause = 350 } = {}) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    await glide(box.x + box.width / 2, box.y + box.height / 2)
    await sleep(150)
    await page.mouse.down()
    await sleep(60)
    await page.mouse.up()
    await sleep(pause)
  }
  async function type(text) {
    await page.keyboard.type(text, { delay: 45 })
  }

  await page.goto(`${BASE}/boards`)
  await page.getByText('Acme Corp – Backend Engineer').waitFor()
  await glide(640, 420, 1)
  await sleep(1800)

  // Open a task and tick a checklist item.
  await clickOn(page.locator('[data-task-id] h3', { hasText: 'Acme Corp' }))
  await page.getByTestId('task-view').waitFor()
  await sleep(1200)
  await clickOn(page.getByTestId('task-description').locator('input[type="checkbox"]').nth(1))
  await sleep(700)
  await clickOn(page.getByTestId('task-description').locator('input[type="checkbox"]').nth(2))
  await sleep(1000)
  await clickOn(page.locator('.p-dialog-footer').getByRole('button', { name: 'Close' }))
  await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  await sleep(800)

  // New task: starts with the board's template.
  await clickOn(page.getByRole('button', { name: 'New task' }))
  await page.locator('#task-title').waitFor()
  await sleep(500)
  await type('Wayne Enterprises – Backend Developer')
  await sleep(700)
  await clickOn(page.getByRole('button', { name: 'Edit labels' }))
  await clickOn(page.getByTestId('label-picker').getByText('Remote', { exact: true }))
  await clickOn(page.getByRole('button', { name: 'Done', exact: true }))
  await sleep(500)
  await clickOn(page.getByRole('button', { name: 'Create task' }))
  await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  await sleep(1200)

  // Drag a task to the next column.
  const card = await page.locator('[data-task-id]', { hasText: 'Initech' }).boundingBox()
  const target = await page.locator('[data-task-id]', { hasText: 'Hooli' }).boundingBox()
  await glide(card.x + 80, card.y + 20)
  await sleep(200)
  await page.mouse.down()
  const steps = 30
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await page.mouse.move(card.x + 80 + (target.x + 80 - card.x - 80) * t, card.y + 20 + (target.y + target.height + 30 - card.y - 20) * t)
    await sleep(25)
  }
  await sleep(250)
  await page.mouse.up()
  await sleep(1300)

  // Search.
  await clickOn(page.getByRole('textbox', { name: 'Search tasks' }))
  await type('remote')
  await sleep(1800)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await sleep(700)

  // Compact cards.
  await clickOn(page.getByRole('button', { name: 'Compact cards' }))
  await sleep(1800)
  await clickOn(page.getByRole('button', { name: 'Compact cards' }))
  await sleep(600)

  // Table view: sort by due date and change a status.
  await clickOn(page.getByRole('button', { name: 'Table view' }))
  await page.getByTestId('task-table').waitFor()
  await sleep(1300)
  await clickOn(page.getByTestId('task-table').locator('thead th').filter({ hasText: 'Due' }))
  await sleep(1300)
  await clickOn(page.getByRole('combobox', { name: 'Status of Nimbus Labs – Platform Engineer' }))
  await sleep(500)
  await clickOn(page.getByRole('option', { name: 'Applied' }))
  await sleep(1500)
  await clickOn(page.getByRole('button', { name: 'Board view' }))
  await sleep(1000)

  // Board settings.
  await clickOn(page.getByRole('button', { name: 'Board settings' }))
  await page.getByTestId('board-settings').waitFor()
  await sleep(1000)
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 120)
    await sleep(120)
  }
  await sleep(1200)
  await clickOn(page.getByRole('button', { name: 'Back to board' }))
  await sleep(900)

  // Dark mode: system (light here) -> light -> dark.
  const theme = page.getByRole('button', { name: /^Theme:/ })
  await clickOn(theme, { pause: 150 })
  await clickOn(theme)
  await sleep(2200)

  const video = page.video()
  await context.close()
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', await video.path(), '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', output])
  console.log(`Saved ${output}`)
} finally {
  await browser?.close()
  server.kill()
  fs.rmSync(videoDir, { recursive: true, force: true })
}
