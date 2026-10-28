// Removing a due date.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Removing a due date', async ({ browser }) => {
  const base = BASE
  const outDir = test.info().outputDir
  await resetMock()

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  async function check(...args) {
    const fn = args.pop()
    await test.step(args.pop(), fn)
  }
  const expect = (c, m) => { if (!c) throw new Error(m) }
  const api = (path, method, body) => fetch(`${base}/api${path}`, { method, body: body && JSON.stringify(body) }).then((r) => r.json())
  const dueOf = async (id) => (await api('/__state', 'GET')).tasks.find((t) => t.id === id).due_date
  const removeButton = () => page.getByRole('button', { name: 'Remove due date' })

  await api('/tasks/1', 'PUT', { title: 'Task A', description: 'first', due_date: '2030-05-01T12:00:00' })

  async function openEditor(id) {
    await page.locator(`[data-task-id="${id}"] h3`).click()
    await page.getByTestId('task-view').waitFor()
    await page.locator('.p-dialog').getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#task-title').waitFor()
  }
  async function saveAndClose() {
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByTestId('task-view').waitFor()
  }

  await page.goto(`${base}/boards`)
  await page.locator('[data-task-id="1"]').waitFor()

  await check('"Remove" next to the field removes the date', async () => {
    await openEditor(1)
    expect((await page.locator('#task-due').inputValue()) === '2030-05-01 12:00', 'date not loaded')
    await removeButton().click()
    expect((await page.locator('#task-due').inputValue()) === '', 'field not empty')
    expect((await removeButton().count()) === 0, 'button still shown')
    await page.screenshot({ path: `${outDir}/dd-1-removed.png` })
    await saveAndClose()
    expect((await dueOf(1)) === null, `saved ${await dueOf(1)}`)
    expect(!(await page.getByTestId('task-view').innerText()).includes('2030'), 'view still shows date')
  })

  await check('history says the due date was removed', async () => {
    await page.getByTestId('task-history').getByRole('button', { name: 'History' }).click()
    await page.getByTestId('task-history').getByText('Removed the due date').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    expect(!(await page.locator('[data-task-id="1"]').innerText()).includes('2030'), 'card still shows date')
  })

  await check('"Clear" in the calendar removes the date too', async () => {
    // Task B has a due date from the start.
    await openEditor(2)
    expect((await page.locator('#task-due').inputValue()) !== '', 'no date to clear')
    await page.locator('#task-due').click()
    await page.locator('.p-datepicker-panel .p-datepicker-buttonbar').getByRole('button', { name: 'Clear' }).click()
    await page.waitForTimeout(200)
    expect((await page.locator('#task-due').inputValue()) === '', `field shows ${await page.locator('#task-due').inputValue()}`)
    await saveAndClose()
    expect((await dueOf(2)) === null, `saved ${JSON.stringify(await dueOf(2))}`)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  await check('no Remove button without a date; setting one shows it', async () => {
    await openEditor(3)
    expect((await removeButton().count()) === 0, 'button without date')
    await page.locator('#task-due').click()
    await page.locator('.p-datepicker-panel td:not(.p-datepicker-other-month) span', { hasText: /^15$/ }).first().click()
    // With time selection the calendar stays open; click outside to close it.
    const footer = await page.locator('.p-dialog-footer').boundingBox()
    await page.mouse.click(footer.x + 10, footer.y + footer.height / 2)
    await page.locator('.p-datepicker-panel').waitFor({ state: 'detached' })
    expect((await removeButton().count()) === 1, 'button missing after picking a date')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
