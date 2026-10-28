// Labels: create, assign, show, rename, recolor, delete.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Labels', async ({ browser }) => {
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
  const state = async () => (await (await fetch(`${base}/api/__state`)).json())
  const card = (id) => page.locator(`[data-task-id="${id}"]`)
  const dialog = () => page.locator('.p-dialog').filter({ has: page.locator('#task-form, [data-testid="task-view"]') })
  const picker = () => page.getByTestId('label-picker')
  const pillTexts = (loc) => loc.locator('[data-label-pill]').allInnerTexts()

  async function openEditor(id) {
    await card(id).click()
    await page.getByTestId('task-view').waitFor()
    await dialog().getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#task-title').waitFor()
  }
  async function saveAndClose() {
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByTestId('task-view').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  }
  async function createLabel(name, colorIndex) {
    await picker().getByRole('button', { name: 'Create a label' }).click()
    const form = page.getByTestId('label-form')
    await form.getByRole('textbox', { name: 'Label name' }).fill(name)
    await form.getByRole('group', { name: 'Label color' }).getByRole('button').nth(colorIndex).click()
    await form.getByRole('button', { name: 'Create' }).click()
    await form.waitFor({ state: 'detached' })
  }

  await page.goto(`${base}/boards`)
  await page.getByText('Task A', { exact: true }).waitFor()

  await check(page, 'empty board: picker offers to create labels', async () => {
    await openEditor(1)
    expect((await dialog().getByText('No labels').count()) === 1, 'no "No labels" hint')
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().getByText('This board has no labels yet.').waitFor()
  })

  await check(page, 'creating labels selects them for the task', async () => {
    await createLabel('Urgent', 1) // red
    await createLabel('Vermittlungsvorschlag', 4) // green
    const s = await state()
    expect(JSON.stringify(s.labels.map((l) => [l.name, l.color])) === '[["Urgent","#ef4444"],["Vermittlungsvorschlag","#22c55e"]]', JSON.stringify(s.labels))
    const boxes = picker().getByRole('checkbox')
    expect((await boxes.count()) === 2 && (await boxes.nth(0).isChecked()) && (await boxes.nth(1).isChecked()), 'not both selected')
    await page.screenshot({ path: `${outDir}/lb-1-picker.png` })
  })

  await check(page, 'Enter in the label name does not submit the task', async () => {
    await picker().getByRole('button', { name: 'Create a label' }).click()
    await page.getByRole('textbox', { name: 'Label name' }).fill('Later')
    await page.getByRole('textbox', { name: 'Label name' }).press('Enter')
    await page.getByTestId('label-form').waitFor({ state: 'detached' })
    expect(await page.locator('#task-title').isVisible(), 'task form gone')
    expect((await state()).labels.some((l) => l.name === 'Later'), 'label not created')
    // "Later" got selected too; untick it
    await picker().locator('label', { hasText: 'Later' }).click()
    expect(!(await picker().getByRole('checkbox').nth(2).isChecked()), 'still checked')
  })

  await check(page, 'labels are saved with the task and shown on card and view', async () => {
    await dialog().getByRole('button', { name: 'Done' }).click()
    expect(JSON.stringify(await pillTexts(dialog().locator('form'))) === '["Urgent","Vermittlungsvorschlag"]', 'form pills')
    await saveAndClose()
    const s = await state()
    const ids = s.tasks.find((t) => t.id === 1).labelIds
    expect(ids.length === 2, JSON.stringify(ids))
    expect(JSON.stringify(await pillTexts(card(1))) === '["Urgent","Vermittlungsvorschlag"]', 'card pills')
    await card(1).click()
    const view = page.getByTestId('task-view')
    await view.waitFor()
    expect(JSON.stringify(await pillTexts(view)) === '["Urgent","Vermittlungsvorschlag"]', 'view pills')
    await page.screenshot({ path: `${outDir}/lb-2-view.png` })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  await check(page, 'pill text is readable on light and dark colors', async () => {
    const colors = await card(1).locator('[data-label-pill]').evaluateAll((els) => els.map((e) => getComputedStyle(e).color))
    // Whichever of white and dark slate has more contrast: dark on both red and green.
    expect(colors[0] === 'rgb(15, 23, 42)', `red pill text ${colors[0]}`)
    expect(colors[1] === 'rgb(15, 23, 42)', `green pill text ${colors[1]}`)
  })

  await check(page, 'renaming and recoloring updates every card', async () => {
    await openEditor(2)
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().getByRole('button', { name: 'Edit label Urgent' }).click()
    const form = page.getByTestId('label-form')
    await form.getByRole('textbox', { name: 'Label name' }).fill('Very urgent')
    await form.getByRole('group', { name: 'Label color' }).getByRole('button').nth(7).click() // violet
    await form.getByRole('button', { name: 'Save' }).click()
    await form.waitFor({ state: 'detached' })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    expect((await pillTexts(card(1)))[0] === 'Very urgent', 'card not renamed')
    const bg = await card(1).locator('[data-label-pill]').first().evaluate((e) => getComputedStyle(e).backgroundColor)
    expect(bg === 'rgb(139, 92, 246)', `color ${bg}`)
    // Task 2 was not changed by managing labels
    expect(((await state()).tasks.find((t) => t.id === 2).labelIds?.length ?? 0) === 0, 'task 2 changed')
  })

  await check(page, 'unsaved label selection is dropped when cancelling', async () => {
    await openEditor(2)
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().locator('label', { hasText: 'Later' }).click()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    expect(((await state()).tasks.find((t) => t.id === 2).labelIds ?? []).length === 0, 'saved without Save')
    expect((await pillTexts(card(2))).length === 0, 'card shows label')
  })

  await check(page, 'deleting a label asks, then removes it from tasks', async () => {
    await openEditor(2)
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().getByRole('button', { name: 'Edit label Very urgent' }).click()
    await page.getByTestId('label-form').getByRole('button', { name: 'Delete' }).click()
    const confirm = page.locator('.p-confirmdialog')
    await confirm.getByText('It is removed from 1 task.').waitFor()
    await confirm.getByRole('button', { name: 'Delete label' }).click()
    await page.waitForFunction(() => !document.querySelector('.p-confirmdialog'))
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    const s = await state()
    expect(!s.labels.some((l) => l.name === 'Very urgent'), 'label still there')
    expect(JSON.stringify(await pillTexts(card(1))) === '["Vermittlungsvorschlag"]', 'card still shows it')
  })

  await check(page, 'new task can get labels right away', async () => {
    await page.getByRole('button', { name: 'New task' }).click()
    await page.locator('#task-title').fill('Labeled new')
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().locator('label', { hasText: 'Later' }).click()
    await page.getByRole('button', { name: 'Create task' }).click()
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    const s = await state()
    const t = s.tasks.find((x) => x.title === 'Labeled new')
    const later = s.labels.find((l) => l.name === 'Later')
    expect(JSON.stringify(t.labelIds) === JSON.stringify([later.id]), JSON.stringify(t))
  })

  await check(page, 'shared board shows labels', async () => {
    const guest = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    await guest.goto(`${base}/share/test-token`)
    const c = guest.locator('[data-task-id="1"]')
    await c.waitFor()
    expect(JSON.stringify(await pillTexts(c)) === '["Vermittlungsvorschlag"]', 'shared pills')
    await guest.close()
  })

  await check(page, 'dark mode screenshots', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.screenshot({ path: `${outDir}/lb-3-dark-board.png` })
    await openEditor(1)
    await dialog().getByRole('button', { name: 'Edit labels' }).click()
    await picker().getByRole('button', { name: 'Edit label Later' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outDir}/lb-4-dark-picker.png` })
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
