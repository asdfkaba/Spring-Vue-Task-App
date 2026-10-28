import { Marked } from 'marked'
import DOMPurify from 'dompurify'

// Task descriptions are Markdown (GitHub flavour). Shared boards show them to anyone with the
// link, so the HTML is always sanitized before it reaches v-html.
const marked = new Marked({ gfm: true, breaks: true })

// Links open in a new tab and don't give the target page access to ours.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
  // Task list items ("- [x]") are the only inputs we want, and they are display-only.
  if (node.tagName === 'INPUT') {
    if (node.getAttribute('type') === 'checkbox') node.setAttribute('disabled', '')
    else node.remove()
  }
})

const SANITIZE_OPTIONS = {
  // Images would load from foreign servers (tracking on shared boards) and break the card layout.
  FORBID_TAGS: ['img', 'style', 'form', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['style', 'class', 'id'],
  ADD_ATTR: ['target'],
}

export function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text), SANITIZE_OPTIONS)
}
