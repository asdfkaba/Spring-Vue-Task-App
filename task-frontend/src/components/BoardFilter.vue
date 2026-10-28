<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import LabelPill from '@/components/LabelPill.vue'

// Search field and label filter above a board. "/" focuses the search, Esc clears it.
const text = defineModel('text', { type: String, default: '' })
const labelIds = defineModel('labelIds', { type: Array, default: () => [] })
defineProps({
  labels: { type: Array, default: () => [] }, // the board's labels
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['clear'])

const input = ref()

function focus() {
  input.value?.$el?.focus()
}
defineExpose({ focus })

function onEscape(event) {
  if (text.value) text.value = ''
  else event.target.blur()
}

// "/" anywhere on the page, unless the user is typing somewhere or a dialog is open.
function onKeydown(event) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target
  if (target.closest?.('input, textarea, select, [contenteditable="true"]')) return
  if (document.querySelector('.p-dialog')) return
  event.preventDefault()
  focus()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Default sizes on purpose: the installed theme (@primevue/themes 4.0) has no "small" MultiSelect. -->
  <div class="flex flex-wrap items-center gap-2" role="search">
    <IconField class="min-w-0 flex-1 sm:max-w-80 sm:flex-none">
      <!-- Centered explicitly: PrimeVue's negative margin for this is overridden here. -->
      <InputIcon class="pi pi-search !mt-0 -translate-y-1/2" />
      <InputText
        ref="input"
        v-model="text"
        placeholder="Search tasks…"
        aria-label="Search tasks"
        aria-keyshortcuts="/"
        fluid
        @keydown.esc.stop="onEscape"
      />
    </IconField>
    <MultiSelect
      v-if="labels.length"
      v-model="labelIds"
      :options="labels"
      optionLabel="name"
      optionValue="id"
      placeholder="Labels"
      ariaLabel="Filter by label"
      :maxSelectedLabels="1"
      selectedItemsLabel="{0} labels"
      :showToggleAll="false"
      class="w-32 sm:w-40"
    >
      <template #option="{ option }">
        <LabelPill :label="option" />
      </template>
    </MultiSelect>
    <Button
      v-if="active"
      label="Clear"
      icon="pi pi-times"
      text
      size="small"
      severity="secondary"
      @click="emit('clear')"
    />
  </div>
</template>
