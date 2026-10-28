// Browser titles: "Taskz" everywhere, the current content first.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Branding and browser titles', async ({ browser }) => {
  await resetMock()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const ensure = (cond, msg) => { if (!cond) throw new Error(msg) }
  const titleIs = async (expected) => {
    await page.waitForFunction((t) => document.title === t, expected, { timeout: 5000 }).catch(() => {})
    const actual = await page.title()
    ensure(actual === expected, `title "${actual}", expected "${expected}"`)
  }

  await test.step('app name in the header', async () => {
    await page.goto(`${BASE}/boards`)
    await page.locator('[data-task-id="1"]').waitFor()
    ensure((await page.getByRole('link', { name: 'Taskz' }).count()) === 1, 'header name')
    ensure(!(await page.content()).includes('Task App'), 'old name left')
  })

  await test.step('board title', async () => {
    await titleIs('My board · Taskz')
  })

  await test.step('open task, editing and new task', async () => {
    await page.locator('[data-task-id="1"] h3').click()
    await page.getByTestId('task-view').waitFor()
    await titleIs('Task A · My board · Taskz')
    await page.locator('.p-dialog').getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#task-title').fill('Renamed A')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByTestId('task-view').waitFor()
    await titleIs('Renamed A · My board · Taskz')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
    await titleIs('My board · Taskz')
    await page.getByRole('button', { name: 'New task' }).click()
    await titleIs('New task · My board · Taskz')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  await test.step('search and filter keep the title', async () => {
    await page.getByRole('textbox', { name: 'Search tasks' }).fill('task')
    await page.waitForTimeout(200)
    await titleIs('My board · Taskz')
    await page.getByRole('textbox', { name: 'Search tasks' }).fill('')
  })

  await test.step('shared board, its tasks and a broken link', async () => {
    await page.goto(`${BASE}/share/test-token`)
    await page.locator('[data-task-id="3"]').waitFor()
    await titleIs('My board (read only) · Taskz')
    await page.locator('[data-task-id="3"] h3').click()
    await page.getByTestId('task-view').waitFor()
    await titleIs('Task C · My board (read only) · Taskz')
    await page.goto(`${BASE}/share/my-board-${'A'.repeat(22)}`)
    await page.getByText("This link doesn't work anymore").waitFor()
    await titleIs('Link not working · Taskz')
  })

  await test.step('login and sign-in pages', async () => {
    const guest = await browser.newPage()
    // The mock is always logged in, so the login page redirects to the board; its title is set first.
    await guest.goto(`${BASE}/oauth2/callback`)
    ensure((await guest.title()) === 'Signing in · Taskz', `callback title "${await guest.title()}"`)
    await guest.close()
  })

  for (const context of browser.contexts()) await context.close()
})
