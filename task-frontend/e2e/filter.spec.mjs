// Search and label filter.
import { test } from '@playwright/test'
import { BASE, resetMock } from './support.mjs'

test('Search and label filter', async ({ browser }) => {
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
  const api = (path, method, body) => fetch(`${base}/api${path}`, { method, body: body && JSON.stringify(body) }).then((r) => (r.status === 204 ? null : r.json()))
  const state = () => api('/__state', 'GET')

  // Setup: two labels, a German title, a description-only match, a fourth task in "To do".
  const urgent = await api('/boards/1/labels', 'POST', { name: 'Urgent', color: '#ef4444' })
  const vermittlung = await api('/boards/1/labels', 'POST', { name: 'Vermittlungsvorschlag', color: '#22c55e' })
  await api('/tasks/1', 'PUT', { title: 'Java Backend bei Hüttl', description: 'Spring Boot', labelIds: [vermittlung.id] })
  await api('/tasks/2', 'PUT', { title: 'Müller GmbH', description: 'Remote möglich, Kotlin', due_date: [2026, 1, 1, 12, 0], labelIds: [urgent.id] })
  await api('/tasks/3', 'PUT', { title: 'Task C', description: null, labelIds: [urgent.id, vermittlung.id] })
  const d = await api('/tasks', 'POST', { title: 'Python Data', description: 'pandas', columnId: 10 })

  const visibleTitles = (p = page) => p.locator('[data-task-id]:visible h3').allInnerTexts()
  const search = (p = page) => p.getByRole('textbox', { name: 'Search tasks' })
  const badge = (columnId, p = page) => p.locator(`[data-column-id="${columnId}"] header span.rounded-full`).innerText()

  await page.goto(`${base}/boards`)
  await page.getByText('Task C', { exact: true }).waitFor()

  await check(page, 'typing filters cards, counts and URL', async () => {
    await search().fill('java')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Java Backend bei Hüttl"]', JSON.stringify(await visibleTitles()))
    expect((await badge(10)) === '1 / 3', `badge ${await badge(10)}`)
    expect((await badge(11)) === '0 / 1', `badge ${await badge(11)}`)
    expect((await page.getByText('1 of 4 tasks match').count()) === 1, 'header count')
    expect(new URL(page.url()).searchParams.get('q') === 'java', page.url())
    expect((await page.locator('[data-task-id="1"] mark').innerText()) === 'Java', 'highlight')
    expect((await page.locator('[data-column-id="11"]').getByText('No matches').count()) === 1, 'no matches note')
    await page.screenshot({ path: `${outDir}/fi-1-search.png` })
  })

  await check(page, 'accents and umlauts are ignored, highlight keeps them', async () => {
    await search().fill('muller')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Müller GmbH"]', JSON.stringify(await visibleTitles()))
    expect((await page.locator('[data-task-id="2"] mark').innerText()) === 'Müller', 'highlight')
    await search().fill('HUTTL')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Java Backend bei Hüttl"]', 'case/umlaut')
  })

  await check(page, 'words may match in different fields, all must match', async () => {
    await search().fill('java vermittlung')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Java Backend bei Hüttl"]', JSON.stringify(await visibleTitles()))
    await search().fill('java kotlin')
    await page.waitForTimeout(150)
    expect((await visibleTitles()).length === 0, 'should match nothing')
  })

  await check(page, 'description-only match says so', async () => {
    await search().fill('kotlin')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Müller GmbH"]', JSON.stringify(await visibleTitles()))
    expect((await page.locator('[data-task-id="2"]').getByText('Match in description').count()) === 1, 'hint missing')
    await search().fill('müller')
    await page.waitForTimeout(150)
    expect((await page.locator('[data-task-id="2"]').getByText('Match in description').count()) === 0, 'hint on title match')
  })

  await check(page, 'label filter shows tasks with any of the chosen labels and combines with text', async () => {
    await search().fill('')
    expect((await page.getByRole('combobox', { name: 'Filter by label' }).count()) === 1, 'label filter has no accessible name')
    await page.locator('.p-multiselect').click()
    await page.locator('.p-multiselect-option', { hasText: 'Urgent' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    expect(JSON.stringify((await visibleTitles()).sort()) === '["Müller GmbH","Task C"]', JSON.stringify(await visibleTitles()))
    expect(new URL(page.url()).searchParams.get('labels') === String(urgent.id), page.url())
    await page.locator('.p-multiselect').click()
    await page.locator('.p-multiselect-option', { hasText: 'Vermittlungsvorschlag' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    expect((await visibleTitles()).length === 3, `any-of: ${JSON.stringify(await visibleTitles())}`)
    await search().fill('task')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Task C"]', `with text: ${JSON.stringify(await visibleTitles())}`)
    await page.screenshot({ path: `${outDir}/fi-2-labels.png` })
  })

  await check(page, 'reload keeps the filter, Clear removes it', async () => {
    await page.reload()
    await page.locator('[data-task-id="3"]').waitFor()
    await page.waitForTimeout(300)
    expect(JSON.stringify(await visibleTitles()) === '["Task C"]', `after reload: ${JSON.stringify(await visibleTitles())}`)
    expect((await search().inputValue()) === 'task', 'search text lost')
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.waitForTimeout(150)
    expect((await visibleTitles()).length === 4, 'not all visible')
    expect(new URL(page.url()).search === '', page.url())
  })

  await check(page, '"No label" filter shows tasks without labels, alone or with others', async () => {
    await page.locator('.p-multiselect').click()
    await page.locator('.p-multiselect-option', { hasText: 'No label' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles()) === '["Python Data"]', JSON.stringify(await visibleTitles()))
    expect(new URL(page.url()).searchParams.get('labels') === 'none', page.url())
    await page.locator('.p-multiselect').click()
    await page.locator('.p-multiselect-option', { hasText: 'Urgent' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    expect(JSON.stringify((await visibleTitles()).sort()) === '["Müller GmbH","Python Data","Task C"]', JSON.stringify(await visibleTitles()))
    await page.reload()
    await page.locator('[data-task-id="3"]').waitFor()
    await page.waitForTimeout(300)
    expect((await visibleTitles()).length === 3, `after reload: ${JSON.stringify(await visibleTitles())}`)
    await page.screenshot({ path: `${outDir}/fi-5-nolabel.png` })
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.waitForTimeout(150)
  })

  await check(page, '"/" focuses the search, Esc clears and then leaves it', async () => {
    await page.locator('h1').click()
    await page.keyboard.press('/')
    expect(await search().evaluate((el) => el === document.activeElement), 'not focused')
    await page.keyboard.type('python')
    await page.waitForTimeout(150)
    expect((await visibleTitles()).length === 1, 'not filtered')
    await page.keyboard.press('Escape')
    expect((await search().inputValue()) === '', 'not cleared')
    expect(await search().evaluate((el) => el === document.activeElement), 'lost focus on first Esc')
    await page.keyboard.press('Escape')
    expect(!(await search().evaluate((el) => el === document.activeElement)), 'still focused')
  })

  await check(page, 'drag & drop while filtered keeps the full order', async () => {
    // To do holds: Java(1), Müller(2), Python(d). Hide Müller, then drag Python above Java.
    await search().fill('a') // matches Java and Python (and Task C elsewhere), not Müller GmbH
    await page.waitForTimeout(150)
    const titles = await page.locator('[data-column-id="10"] [data-task-id]:visible h3').allInnerTexts()
    expect(JSON.stringify(titles) === '["Java Backend bei Hüttl","Python Data"]', JSON.stringify(titles))
    const from = await page.locator(`[data-task-id="${d.id}"]`).boundingBox()
    const to = await page.locator('[data-task-id="1"]').boundingBox()
    await page.mouse.move(from.x + 60, from.y + 15)
    await page.mouse.down()
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(from.x + 60, from.y + 15 + ((to.y + 5 - from.y - 15) * i) / 15)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()
    await page.waitForTimeout(500)
    const s = await state()
    const todo = s.tasks.filter((t) => t.columnId === 10).sort((a, b) => a.position - b.position).map((t) => t.title)
    expect(todo.length === 3 && todo[0] === 'Python Data', `server order ${JSON.stringify(todo)}`)
    expect(todo.indexOf('Python Data') < todo.indexOf('Java Backend bei Hüttl'), 'visible order not kept')
    const shown = await page.locator('[data-column-id="10"] [data-task-id]:visible h3').allInnerTexts()
    expect(JSON.stringify(shown) === '["Python Data","Java Backend bei Hüttl"]', `shown ${JSON.stringify(shown)}`)
    await search().fill('')
    await page.waitForTimeout(150)
    const all = await page.locator('[data-column-id="10"] [data-task-id] h3').allInnerTexts()
    expect(JSON.stringify(all) === JSON.stringify(todo), `UI ${JSON.stringify(all)} vs server ${JSON.stringify(todo)}`)
  })

  await check(page, 'dialogs: "/" types normally inside the task form', async () => {
    await page.locator('[data-task-id="1"] h3').click()
    await page.getByTestId('task-view').waitFor()
    await page.locator('.p-dialog').getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('#task-title').click()
    await page.keyboard.press('End')
    await page.keyboard.type('/x')
    expect((await page.locator('#task-title').inputValue()).endsWith('/x'), 'slash swallowed')
    expect(!(await search().evaluate((el) => el === document.activeElement)), 'search stole focus')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.p-dialog'))
  })

  // ---- Phone ----
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  phone.on('pageerror', (e) => errors.push(e.message))
  await phone.goto(`${base}/boards`)
  await phone.locator('[data-task-id="1"]').waitFor()
  await check(phone, 'phone: search row opens from the header and filters tabs', async () => {
    expect((await search(phone).count()) === 0, 'search row visible without opening')
    await phone.getByRole('button', { name: 'Search', exact: true }).tap()
    await search(phone).waitFor()
    expect(await search(phone).evaluate((el) => el === document.activeElement), 'not focused')
    await search(phone).fill('müller')
    await phone.waitForTimeout(200)
    const tabs = (await phone.locator('nav[aria-label="Columns"] button[data-tab-column-id]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
    expect(tabs[0] === 'To do 1 / 3', JSON.stringify(tabs))
    // Closing the row keeps an active filter visible.
    await phone.getByRole('button', { name: 'Search', exact: true }).tap()
    expect(await search(phone).isVisible(), 'row hidden while filter active')
    expect(!(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'sideways scroll')
    await phone.screenshot({ path: `${outDir}/fi-3-phone.png` })
  })

  // ---- Shared board ----
  await check(page, 'shared board can be searched and filtered', async () => {
    const guest = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    await guest.goto(`${base}/share/test-token`)
    await guest.locator('[data-task-id="1"]').waitFor()
    await search(guest).fill('pandas')
    await guest.waitForTimeout(150)
    expect(JSON.stringify(await visibleTitles(guest)) === '["Python Data"]', JSON.stringify(await visibleTitles(guest)))
    expect((await guest.locator(`[data-task-id="${d.id}"]`).getByText('Match in description').count()) === 1, 'hint')
    await guest.locator('.p-multiselect').click()
    await guest.locator('.p-multiselect-option', { hasText: 'Urgent' }).click()
    await guest.keyboard.press('Escape')
    await search(guest).fill('')
    await guest.waitForTimeout(150)
    expect(JSON.stringify((await visibleTitles(guest)).sort()) === '["Müller GmbH","Task C"]', JSON.stringify(await visibleTitles(guest)))
    await guest.screenshot({ path: `${outDir}/fi-4-shared.png` })
    await guest.close()
  })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  for (const context of browser.contexts()) await context.close()
})
