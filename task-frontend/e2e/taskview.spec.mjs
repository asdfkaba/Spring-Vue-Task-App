// Task dialog with view and edit mode.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Task dialog: view and edit', async ({ browser }) => {
  const base = BASE
  const outDir = test.info().outputDir
  await resetMock()

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  await context.route(/example\.com/, (r) => r.fulfill({ body: 'external' }))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  async function check(...args) {
    const fn = args.pop()
    await test.step(args.pop(), fn)
  }
  const expect = (c, m) => { if (!c) throw new Error(m) }
  const state = async () => (await (await fetch(`${base}/api/__state`)).json())
  const card = (id) => page.locator(`[data-task-id="${id}"]`)
  const dialog = () => page.locator('.p-dialog')
  const view = () => page.getByTestId('task-view')
  const modeButton = (name) => dialog().getByRole('button', { name, exact: true })
  const closed = () => page.waitForFunction(() => !document.querySelector('.p-dialog'))
  async function close() {
    await page.waitForFunction(() => !document.querySelector('.p-confirmdialog'))
    await page.keyboard.press('Escape')
    await closed()
  }

  const long = [
    '# Overview',
    'This task has a **long** description.',
    '',
    ...Array.from({ length: 30 }, (_, i) => `- point ${i + 1}`),
    '',
    '## Links',
    '[spec](https://example.com/spec)',
    '',
    'Last line',
  ].join('\n')
  await fetch(`${base}/api/tasks/1`, {
    method: 'PUT',
    body: JSON.stringify({ title: 'Task A', description: long, due_date: '2030-05-01T12:00:00' }),
  })

  await page.goto(`${base}/boards`)
  await page.getByText('Task A', { exact: true }).waitFor()

  await check(page, 'card click opens the view', async () => {
    await card(1).click()
    await view().waitFor()
    expect((await dialog().locator('.p-dialog-title').count()) === 0, 'title still shown')
    // The toggle spans the header, apart from the close button.
    const toggle = await dialog().getByRole('group', { name: 'Dialog mode' }).boundingBox()
    const box = await dialog().boundingBox()
    expect(toggle.width > box.width * 0.75, `toggle ${toggle.width} of ${box.width}`)
    expect((await view().locator('h2').first().innerText()) === 'Task A', 'title')
    const meta = await view().innerText()
    for (const part of ['To do', 'May 1 2030, 12:00']) expect(meta.includes(part), `missing ${part}`)
    for (const gone of ['High', 'Medium', 'Low', 'Priority']) expect(!meta.includes(gone), `priority still shown: ${gone}`)
    expect((await page.locator('#task-description').count()) === 0, 'editor visible')
    expect((await modeButton('View').getAttribute('aria-pressed')) === 'true', 'view not pressed')
    expect(await dialog().locator('.p-dialog-footer').getByRole('button', { name: 'Close' }).isVisible(), 'no Close')
  })

  await check(page, 'view shows the whole description with graded headings', async () => {
    const md = view().locator('.markdown')
    expect((await md.locator('li').count()) === 30, 'not all items')
    expect((await md.getByText('Last line').count()) === 1, 'end missing')
    const h1 = await md.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    const p = await md.locator('p').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(h1 > p, `h1 ${h1} not larger than text ${p}`)
    // Long content scrolls inside the dialog, the dialog itself fits the window.
    const box = await dialog().boundingBox()
    expect(box.y >= 0 && box.y + box.height <= 900, `dialog ${JSON.stringify(box)}`)
    await page.screenshot({ path: `${outDir}/tv-1-view.png` })
  })

  await check(page, 'link in the view opens a tab and keeps the dialog', async () => {
    const [popup] = await Promise.all([context.waitForEvent('page'), view().getByRole('link', { name: 'spec' }).click()])
    expect(popup.url().startsWith('https://example.com/spec'), popup.url())
    await popup.close()
    expect(await view().isVisible(), 'dialog closed')
  })

  await check(page, 'edit from view, save returns to the view with new data', async () => {
    await modeButton('Edit').click()
    await page.locator('#task-title').waitFor()
    expect((await modeButton('Edit').getAttribute('aria-pressed')) === 'true', 'edit not pressed')
    expect(await page.locator('#task-title').evaluate((el) => el === document.activeElement), 'title not focused')
    expect((await page.locator('#task-description').inputValue()) === long, 'description not loaded')
    expect((await dialog().getByText('Priority').count()) === 0, 'priority field in the form')
    await page.locator('#task-title').fill('Task A renamed')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await view().waitFor()
    expect((await view().locator('h2').first().innerText()) === 'Task A renamed', 'view not updated')
    expect((await state()).tasks.find((t) => t.id === 1).title === 'Task A renamed', 'not saved')
    expect((await card(1).locator('h3').innerText()) === 'Task A renamed', 'card not updated')
  })

  await check(page, 'switching back with unsaved changes asks first', async () => {
    await modeButton('Edit').click()
    await page.locator('#task-title').fill('Unsaved title')
    await modeButton('View').click()
    const confirm = page.locator('.p-confirmdialog')
    await confirm.getByText('Discard changes?').waitFor()
    await confirm.getByRole('button', { name: 'Keep editing' }).click()
    await page.waitForFunction(() => !document.querySelector('.p-confirmdialog'))
    expect((await page.locator('#task-title').inputValue()) === 'Unsaved title', 'edit lost')
    expect((await modeButton('Edit').getAttribute('aria-pressed')) === 'true', 'toggle shows View while still editing')
    await modeButton('View').click()
    await confirm.getByRole('button', { name: 'Discard' }).click()
    await view().waitFor()
    expect((await view().locator('h2').first().innerText()) === 'Task A renamed', 'discarded text shown')
    await modeButton('Edit').click()
    expect((await page.locator('#task-title').inputValue()) === 'Task A renamed', 'form kept discarded text')
  })

  await check(page, 'no question without changes, cancel goes back to view', async () => {
    await modeButton('View').click()
    await view().waitFor()
    expect((await page.locator('.p-confirmdialog').count()) === 0, 'asked without changes')
    await modeButton('Edit').click()
    await dialog().getByRole('button', { name: 'Cancel' }).click()
    await view().waitFor()
    await close()
  })

  await check(page, 'menu Edit opens the editor directly and Save closes', async () => {
    await card(2).getByRole('button', { name: 'Task actions' }).click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.locator('#task-title').waitFor()
    expect((await modeButton('Edit').getAttribute('aria-pressed')) === 'true', 'not in edit')
    await page.locator('#task-title').fill('Task B edited')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await closed()
    expect((await state()).tasks.find((t) => t.id === 2).title === 'Task B edited', 'not saved')
  })

  await check(page, 'menu Edit can still switch to the view', async () => {
    await card(2).getByRole('button', { name: 'Task actions' }).click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.locator('#task-title').waitFor()
    await modeButton('View').click()
    await view().waitFor()
    expect((await view().getByText('No description.').count()) === 1, 'empty description text')
    await close()
  })

  await check(page, '"Add one" opens the editor', async () => {
    await card(2).click()
    await view().getByRole('button', { name: 'Add one' }).click()
    await page.locator('#task-description').waitFor()
    await close()
  })

  await check(page, 'new task has no mode toggle', async () => {
    await page.getByRole('button', { name: 'New task' }).click()
    await page.locator('#task-title').waitFor()
    expect((await dialog().locator('.p-dialog-title').innerText()) === 'New task', 'header')
    expect((await dialog().getByRole('group', { name: 'Dialog mode' }).count()) === 0, 'toggle shown')
    await page.locator('#task-title').fill('Brand new')
    await page.getByRole('button', { name: 'Create task' }).click()
    await closed()
    expect((await state()).tasks.some((t) => t.title === 'Brand new'), 'not created')
  })

  await check(page, 'dark view', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await card(1).click()
    await view().waitFor()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outDir}/tv-2-dark.png` })
    await close()
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
  })

  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  phone.on('pageerror', (e) => errors.push(e.message))
  await phone.goto(`${base}/boards`)
  await phone.locator('[data-task-id="1"]').waitFor()
  await check(phone, 'phone: view fits the screen', async () => {
    await phone.locator('[data-task-id="1"] h3').tap()
    await phone.getByTestId('task-view').waitFor()
    await phone.waitForTimeout(300)
    const box = await phone.locator('.p-dialog').boundingBox()
    expect(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, JSON.stringify(box))
    await phone.screenshot({ path: `${outDir}/tv-3-phone.png` })
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
