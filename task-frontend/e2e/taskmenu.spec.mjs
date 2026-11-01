// The task menu's "Move to" entries point the way the task would move.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Task menu arrows', async ({ browser }) => {
  await resetMock()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const ensure = (cond, msg) => { if (!cond) throw new Error(msg) }
  // Icon of each "Move to" entry of the open menu, e.g. { 'To do': 'left', Done: 'right' }.
  const arrows = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('.p-menu .p-menu-item')]
          .map((item) => [item.innerText.trim(), item.querySelector('.pi-arrow-left') ? 'left' : item.querySelector('.pi-arrow-right') ? 'right' : null])
          .filter(([, arrow]) => arrow),
      ),
    )
  const openMenu = async (taskId) => {
    await page.locator(`[data-task-id="${taskId}"]`).getByRole('button', { name: 'Task actions' }).click()
    await page.locator('.p-menu').waitFor()
  }
  const closeMenu = async () => {
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-menu'))
  }

  await page.goto(`${BASE}/boards`)
  await page.locator('[data-task-id="3"]').waitFor()

  await test.step('a task in the middle column has arrows both ways', async () => {
    await openMenu(3)
    const found = await arrows()
    ensure(JSON.stringify(found) === '{"To do":"left","Done":"right"}', JSON.stringify(found))
    await page.screenshot({ path: `${test.info().outputDir}/tm-1-middle.png` })
    await closeMenu()
  })

  await test.step('a task in the first column only moves right', async () => {
    await openMenu(1)
    const found = await arrows()
    ensure(JSON.stringify(found) === '{"In progress":"right","Done":"right"}', JSON.stringify(found))
    await closeMenu()
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
