import { Marked } from 'marked'
import DOMPurify from 'dompurify'

// Task descriptions are Markdown (GitHub flavour). Shared boards show them to anyone with the
// link, so the HTML is always sanitized before it reaches v-html.
const marked = new Marked({ gfm: true, breaks: true })

// Task list checkboxes get their number, so a click can be mapped back to the item in the text.
// The numbering follows the same order as checkboxStates().
let checkboxCount = 0
marked.use({
  renderer: {
    checkbox({ checked }) {
      return `<input type="checkbox" data-task-index="${checkboxCount++}"${checked ? ' checked' : ''}>`
    },
  },
})
let checkboxesEnabled = false

// Links open in a new tab and don't give the target page access to ours.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
  // Task list items ("- [x]") are the only inputs we want. Display-only unless the caller handles clicks.
  if (node.tagName === 'INPUT') {
    if (node.getAttribute('type') !== 'checkbox') node.remove()
    else if (!checkboxesEnabled) node.setAttribute('disabled', '')
  }
})

const SANITIZE_OPTIONS = {
  // Images would load from foreign servers (tracking on shared boards) and break the card layout.
  FORBID_TAGS: ['img', 'style', 'form', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['style', 'class', 'id'],
  ADD_ATTR: ['target'],
}

// clickableCheckboxes: leave the checkboxes enabled; the caller handles clicks via data-task-index.
export function renderMarkdown(text, { clickableCheckboxes = false } = {}) {
  if (!text) return ''
  checkboxCount = 0
  checkboxesEnabled = clickableCheckboxes
  try {
    return DOMPurify.sanitize(marked.parse(text), SANITIZE_OPTIONS)
  } finally {
    checkboxesEnabled = false
  }
}

// Checked state of every task list item, in the order they are rendered: [false, true, …]
export function checkboxStates(text) {
  if (!text) return []
  const states = []
  marked.walkTokens(marked.lexer(text), (token) => {
    if (token.type === 'list_item' && token.task) states.push(token.checked)
  })
  return states
}

// Task list items as a tree, in rendered order: [{ index, checked, parent, children }].
// A sub-item is a task item anywhere below another one (also below a plain bullet in between).
function checklistItems(text) {
  const items = []
  const visit = (tokens, parent) => {
    for (const token of tokens ?? []) {
      if (token.type === 'list') {
        for (const item of token.items) {
          if (item.task) {
            const node = { index: items.length, checked: item.checked, parent, children: [] }
            items.push(node)
            parent?.children.push(node)
            visit(item.tokens, node)
          } else {
            visit(item.tokens, parent)
          }
        }
      } else {
        visit(token.tokens, parent)
      }
    }
  }
  visit(marked.lexer(text), null)
  return items
}

// Lines that may hold a task list item: list marker (also in block quotes), then [ ] or [x].
const ITEM_LINE = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])(\].*)$/

// The line of checkbox number `index`: the one whose change flips exactly that checkbox when
// rendered, so look-alikes in code blocks are skipped. -1 if there is none.
function checkboxLine(lines, index) {
  const wanted = checkboxStates(lines.join('\n')).map((checked, i) => (i === index ? !checked : checked)).join()
  for (let i = 0; i < lines.length; i++) {
    const match = ITEM_LINE.exec(lines[i])
    if (!match) continue
    const candidate = [...lines.slice(0, i), flip(match), ...lines.slice(i + 1)]
    if (checkboxStates(candidate.join('\n')).join() === wanted) return i
  }
  return -1
}

const flip = (match) => match[1] + (match[2] === ' ' ? 'x' : ' ') + match[3]

/**
 * Ticks or unticks checkbox number `index` and keeps nested lists consistent: its sub-items
 * follow it, and each parent is ticked exactly when all its sub-items are.
 * Returns { description, line } with line the 0-based line of the clicked item, or null if the
 * checkbox can't be found. Only checkbox marks change in the text.
 */
export function applyCheckbox(text, index) {
  const items = checklistItems(text)
  const clicked = items[index]
  if (!clicked || items.length !== checkboxStates(text).length) return null

  const target = !clicked.checked
  const wanted = items.map((item) => item.checked)
  const setAll = (item) => {
    wanted[item.index] = target
    item.children.forEach(setAll)
  }
  setAll(clicked)
  for (let parent = clicked.parent; parent; parent = parent.parent) {
    wanted[parent.index] = parent.children.every((child) => wanted[child.index])
  }

  const lines = text.split('\n')
  let clickedLine = -1
  for (const item of items) {
    if (wanted[item.index] === item.checked) continue
    const line = checkboxLine(lines, item.index)
    if (line === -1) return null
    lines[line] = flip(ITEM_LINE.exec(lines[line]))
    if (item === clicked) clickedLine = line
  }
  return { description: lines.join('\n'), line: clickedLine }
}
