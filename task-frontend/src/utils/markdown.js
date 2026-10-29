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

// Lines that may hold a task list item: list marker (also in block quotes), then [ ] or [x].
const ITEM_LINE = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])(\].*)$/

/**
 * The text with checkbox number `index` ticked or unticked, or null if it can't be found.
 * Only one line changes. A line counts only if changing it flips exactly that checkbox when
 * rendered, so look-alikes in code blocks are skipped.
 */
export function toggleCheckbox(text, index) {
  const before = checkboxStates(text)
  if (index < 0 || index >= before.length) return null
  const wanted = before.map((checked, i) => (i === index ? !checked : checked)).join()
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = ITEM_LINE.exec(lines[i])
    if (!match) continue
    const mark = match[2] === ' ' ? 'x' : ' '
    const candidate = [...lines.slice(0, i), match[1] + mark + match[3], ...lines.slice(i + 1)].join('\n')
    if (checkboxStates(candidate).join() === wanted) return candidate
  }
  return null
}
