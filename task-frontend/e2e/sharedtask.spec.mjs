// Shared board: tasks open read-only.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Shared board opens tasks read-only', async ({ browser }) => {
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

  const long = ['# Details', 'Some **bold** text.', '', ...Array.from({ length: 12 }, (_, i) => `- point ${i + 1}`), '', '[spec](https://example.com/spec)', '', 'Last line'].join('\n')
  // A label and a long description on task 1, so the dialog has something to show.
  const label = await (await fetch(`${base}/api/boards/1/labels`, { method: 'POST', body: JSON.stringify({ name: 'Vermittlungsvorschlag', color: '#22c55e' }) })).json()
  await fetch(`${base}/api/tasks/1`, { method: 'PUT', body: JSON.stringify({ title: 'Task A', description: long, due_date: '2030-05-01T12:00:00', labelIds: [label.id] }) })
  const before = JSON.stringify((await state()).tasks)

  await page.goto(`${base}/share/test-token`)
  const card = (id) => page.locator(`[data-task-id="${id}"]`)
  await card(1).waitFor()
  const view = () => page.getByTestId('task-view')
  const closed = () => page.waitForFunction(() => !document.querySelector('.p-dialog'))

  await check(page, 'cards are clamped and look clickable, without edit controls', async () => {
    const [shown, full] = await card(1).locator('.markdown').evaluate((el) => [el.clientHeight, el.scrollHeight])
    expect(shown < full / 2, `description not cut: ${shown} of ${full}px`)
    expect((await card(1).evaluate((el) => getComputedStyle(el).cursor)) === 'pointer', 'cursor')
    expect((await page.getByRole('button', { name: 'Task actions' }).count()) === 0, 'menu shown')
    expect((await page.getByRole('button', { name: /^Move to/ }).count()) === 0, 'arrows shown')
  })

  await check(page, 'click opens the full task, read-only', async () => {
    await card(1).locator('h3').click()
    await view().waitFor()
    expect((await view().locator('h2').innerText()) === 'Task A', 'title')
    const text = await view().innerText()
    for (const part of ['To do', 'Vermittlungsvorschlag', 'May 1 2030, 12:00', 'point 12', 'Last line']) {
      expect(text.includes(part), `missing ${part}`)
    }
    const dialog = page.locator('.p-dialog')
    expect((await dialog.getByRole('group', { name: 'Dialog mode' }).count()) === 0, 'mode toggle shown')
    expect((await dialog.getByRole('button', { name: 'Edit', exact: true }).count()) === 0, 'edit button')
    expect((await dialog.locator('input, textarea').count()) === 0, 'form fields shown')
    await page.screenshot({ path: `${outDir}/st-1-dialog.png` })
  })

  await check(page, 'links in the dialog open a new tab', async () => {
    const [popup] = await Promise.all([context.waitForEvent('page'), view().getByRole('link', { name: 'spec' }).click()])
    expect(popup.url().startsWith('https://example.com/spec'), popup.url())
    await popup.close()
    await page.locator('.p-dialog-footer').getByRole('button', { name: 'Close' }).click()
    await closed()
  })

  await check(page, 'no description: no "Add one"', async () => {
    await card(2).click()
    await view().waitFor()
    expect((await view().getByText('No description.').count()) === 1, 'text missing')
    expect((await view().getByRole('button', { name: 'Add one' }).count()) === 0, '"Add one" shown')
    await page.keyboard.press('Escape')
    await closed()
  })

  await check(page, 'keyboard: Enter on a card opens it', async () => {
    await card(3).focus()
    await page.keyboard.press('Enter')
    await view().waitFor()
    expect((await view().locator('h2').innerText()) === 'Task C', 'wrong task')
    await page.keyboard.press('Escape')
    await closed()
  })

  await check(page, 'nothing was changed on the server', async () => {
    expect(JSON.stringify((await state()).tasks) === before, 'tasks changed')
  })

  await check(page, 'phone and dark mode', async () => {
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' })).newPage()
    await phone.goto(`${base}/share/test-token`)
    await phone.locator('[data-task-id="1"] h3').tap()
    await phone.getByTestId('task-view').waitFor()
    await phone.waitForTimeout(300)
    const box = await phone.locator('.p-dialog').boundingBox()
    expect(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, JSON.stringify(box))
    await phone.screenshot({ path: `${outDir}/st-2-phone-dark.png` })
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
