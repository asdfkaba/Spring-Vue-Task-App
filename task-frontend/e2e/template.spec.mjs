// Task template: one default description per board for new tasks.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

const TEMPLATE = '## Steps\n- [ ] Cover letter\n- [ ] CV'

test('Task template', async ({ browser }) => {
  await resetMock()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const ensure = (cond, msg) => { if (!cond) throw new Error(msg) }
  const state = async () => (await fetch(`${BASE}/api/__state`)).json()
  const templateDialog = () => page.locator('.p-dialog').filter({ hasText: 'Task template' })
  const closed = () => page.waitForFunction(() => !document.querySelector('.p-dialog'))

  await page.goto(`${BASE}/boards`)
  await page.locator('[data-task-id="1"]').waitFor()

  await test.step('the board starts without a template; new tasks start empty', async () => {
    await page.getByRole('button', { name: 'New task' }).click()
    await page.locator('#task-title').waitFor()
    ensure((await page.locator('#task-description').inputValue()) === '', 'not empty')
    await page.keyboard.press('Escape')
    await closed()
  })

  await test.step('setting the template with preview', async () => {
    await page.getByRole('button', { name: 'Task template' }).click()
    await templateDialog().waitFor()
    ensure((await page.locator('#task-template').inputValue()) === '', 'not empty')
    await page.locator('#task-template').fill(`\n${TEMPLATE}\n\n`)
    await templateDialog().getByRole('button', { name: 'preview' }).click()
    ensure((await page.getByTestId('template-preview').locator('input[type="checkbox"]').count()) === 2, 'preview')
    await page.screenshot({ path: `${test.info().outputDir}/tp-1-dialog.png` })
    await templateDialog().getByRole('button', { name: 'Save' }).click()
    await closed()
    ensure((await state()).board.taskTemplate === TEMPLATE, JSON.stringify((await state()).board.taskTemplate))
  })

  await test.step('a new task starts with the template and can change it', async () => {
    await page.getByRole('button', { name: 'New task' }).click()
    await page.locator('#task-title').fill('Firma XY')
    ensure((await page.locator('#task-description').inputValue()) === TEMPLATE, 'not prefilled')
    await page.locator('#task-description').fill(TEMPLATE + '\n- [ ] Portfolio')
    await page.getByRole('button', { name: 'Create task' }).click()
    await closed()
    const created = (await state()).tasks.find((t) => t.title === 'Firma XY')
    ensure(created.description === TEMPLATE + '\n- [ ] Portfolio', created.description)
    ensure((await page.locator(`[data-task-id="${created.id}"]`).getByTestId('checklist-progress').innerText()).trim() === '0/3', 'progress')
  })

  await test.step('closing an untouched new task does not ask about unsaved changes', async () => {
    await page.getByRole('button', { name: 'New task' }).click()
    await page.locator('#task-title').waitFor()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await closed()
    ensure((await page.locator('.p-confirmdialog').count()) === 0, 'asked')
  })

  await test.step('editing an existing task keeps its description', async () => {
    await page.locator('[data-task-id="1"] h3').click()
    await page.getByTestId('task-view').waitFor()
    await page.locator('.p-dialog').getByRole('button', { name: 'Edit', exact: true }).click()
    ensure((await page.locator('#task-description').inputValue()) === 'first', 'replaced')
    await page.keyboard.press('Escape')
    await closed()
  })

  await test.step('the template survives a reload', async () => {
    await page.reload()
    await page.locator('[data-task-id="1"]').waitFor()
    await page.getByRole('button', { name: 'Task template' }).click()
    ensure((await page.locator('#task-template').inputValue()) === TEMPLATE, 'lost')
  })

  await test.step('emptying it removes the template', async () => {
    await page.locator('#task-template').fill('   ')
    await templateDialog().getByRole('button', { name: 'Save' }).click()
    await page.locator('.p-toast').getByText('Template removed').waitFor()
    await closed()
    ensure((await state()).board.taskTemplate === null, 'still set')
    await page.getByRole('button', { name: 'New task' }).click()
    ensure((await page.locator('#task-description').inputValue()) === '', 'still prefilled')
    await page.keyboard.press('Escape')
    await closed()
  })

  await test.step('dark mode', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.getByRole('button', { name: 'Task template' }).click()
    await page.locator('#task-template').fill(TEMPLATE)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${test.info().outputDir}/tp-2-dark.png` })
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
