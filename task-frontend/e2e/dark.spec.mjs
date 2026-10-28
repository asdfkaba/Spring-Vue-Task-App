// Dark mode: toggle, persistence, system preference, no flash, screenshots.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Dark mode', async ({ browser }) => {
  const base = BASE
  const outDir = test.info().outputDir
  await resetMock()

  const errors = []
  async function check(...args) {
    const fn = args.pop()
    await test.step(args.pop(), fn)
  }
  function expect(cond, msg) {
    if (!cond) throw new Error(msg)
  }
  const isDark = (p) => p.evaluate(() => document.documentElement.classList.contains('dark'))
  const bodyBg = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const themeButton = (p) => p.getByRole('button', { name: /^Theme:/ })

  // ---- light system, user toggles ----
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: 'light' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}/boards`)
  await page.getByText('Task A', { exact: true }).waitFor()

  await check(page, 'starts light on a light system', async () => {
    expect(!(await isDark(page)), 'dark class set')
    expect((await themeButton(page).getAttribute('aria-label')) === 'Theme: system', await themeButton(page).getAttribute('aria-label'))
  })

  await check(page, 'toggle cycles system → light → dark', async () => {
    await themeButton(page).click()
    expect((await themeButton(page).getAttribute('aria-label')) === 'Theme: light', 'not light')
    expect(!(await isDark(page)), 'dark in light')
    await themeButton(page).click()
    expect((await themeButton(page).getAttribute('aria-label')) === 'Theme: dark', 'not dark')
    expect(await isDark(page), 'no dark class')
    const bg = await bodyBg(page)
    expect(bg === 'oklch(0.129 0.042 264.695)' || bg.startsWith('rgb(2, 6, 23)'), `body ${bg}`)
  })

  await check(page, 'primevue follows (button and dialog are dark)', async () => {
    await page.locator('[data-task-id="1"]').click()
    const dialog = page.locator('.p-dialog')
    await dialog.waitFor()
    await page.waitForTimeout(300)
    const bg = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)
    // slate-900, not zinc-900
    expect(bg === 'rgb(15, 23, 42)', `dialog ${bg}`)
    await page.screenshot({ path: `${outDir}/dark-2-dialog.png` })
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('button', { name: 'preview' }).click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${outDir}/dark-3-preview.png` })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  await check(page, 'choice survives reload without a white flash', async () => {
    // The class must be there before the app's module script runs.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        window.__darkAtDomReady = document.documentElement.classList.contains('dark')
      })
    })
    await page.reload()
    await page.getByText('Task A', { exact: true }).waitFor()
    expect(await page.evaluate(() => window.__darkAtDomReady), 'not dark at DOMContentLoaded')
    expect(await isDark(page), 'lost after reload')
    await page.screenshot({ path: `${outDir}/dark-1-board.png` })
  })

  await check(page, 'task menu and column dialog in dark', async () => {
    await page.locator('[data-task-id="1"]').getByRole('button', { name: 'Task actions' }).click()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${outDir}/dark-4-menu.png` })
    await page.mouse.click(700, 600)
    await page.waitForFunction(() => !document.querySelector('.p-menu'))
    const column = page.locator('[data-column-id="10"]')
    await column.getByRole('button', { name: 'Column actions' }).click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.locator('.p-dialog').waitFor()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${outDir}/dark-5-column-dialog.png` })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  await check(page, 'back to system follows the light OS again', async () => {
    await themeButton(page).click()
    expect((await themeButton(page).getAttribute('aria-label')) === 'Theme: system', 'not system')
    expect(!(await isDark(page)), 'still dark')
    expect((await page.evaluate(() => localStorage.getItem('theme'))) === null, 'system stored')
  })

  await check(page, 'system mode reacts to OS changes live', async () => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(100)
    expect(await isDark(page), 'did not switch to dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForTimeout(100)
    expect(!(await isDark(page)), 'did not switch back')
  })

  await check(page, 'explicit light wins over a dark OS', async () => {
    await themeButton(page).click() // light
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(100)
    expect(!(await isDark(page)), 'went dark')
    await themeButton(page).click() // dark
    await themeButton(page).click() // system
  })

  // ---- dark system, fresh visitor ----
  const dctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: 'dark' })
  const dpage = await dctx.newPage()
  dpage.on('pageerror', (e) => errors.push(e.message))
  await dpage.goto(`${base}/boards`)
  await dpage.getByText('Task A', { exact: true }).waitFor()

  await check(dpage, 'dark OS gives dark app by default', async () => {
    expect(await isDark(dpage), 'not dark')
  })

  await check(dpage, 'shared board and login in dark', async () => {
    await dpage.goto(`${base}/share/test-token`)
    await dpage.getByText('Read only').waitFor()
    await dpage.screenshot({ path: `${outDir}/dark-6-shared.png` })
    await dpage.goto(`${base}/`)
    await dpage.waitForTimeout(800)
    await dpage.screenshot({ path: `${outDir}/dark-7-root.png` })
  })

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' })
  const mpage = await mctx.newPage()
  mpage.on('pageerror', (e) => errors.push(e.message))
  await mpage.goto(`${base}/boards`)
  await mpage.getByText('Task A', { exact: true }).waitFor()
  await check(mpage, 'phone layout in dark', async () => {
    expect(await isDark(mpage), 'not dark')
    await mpage.screenshot({ path: `${outDir}/dark-8-phone.png` })
    await mpage.getByRole('button', { name: /boards/i }).first().tap().catch(() => {})
    await mpage.waitForTimeout(500)
    await mpage.screenshot({ path: `${outDir}/dark-9-phone-drawer.png` })
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
