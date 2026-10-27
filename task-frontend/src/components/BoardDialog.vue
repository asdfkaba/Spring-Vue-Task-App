<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'

const MAX_NAME_LENGTH = 50

// Creates a board and opens it.
const visible = defineModel('visible', { type: Boolean, default: false })

const store = useBoardStore()
const router = useRouter()
const toast = useToast()

const name = ref('')
const busy = ref(false)
const submitted = ref(false)
const nameMissing = computed(() => submitted.value && !name.value.trim())

watch(visible, (open) => {
  if (!open) return
  name.value = ''
  submitted.value = false
})

async function save() {
  submitted.value = true
  if (!name.value.trim()) return
  busy.value = true
  try {
    const board = await store.createBoard(name.value.trim())
    visible.value = false
    router.push({ name: 'board', params: { id: board.id } })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not create board', detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="New board"
    :style="{ width: '26rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <form id="board-form" class="flex flex-col gap-1.5 pt-1" @submit.prevent="save">
      <label for="board-name" class="text-sm font-medium text-slate-700">Name</label>
      <InputText
        id="board-name"
        v-model="name"
        :maxlength="MAX_NAME_LENGTH"
        :invalid="nameMissing"
        placeholder="e.g. Side project"
        autofocus
        fluid
      />
      <Message v-if="nameMissing" severity="error" size="small" variant="simple">Please enter a name.</Message>
      <p class="text-xs text-slate-500">The board starts with the columns To do, In progress and Done.</p>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button type="submit" form="board-form" label="Create board" icon="pi pi-check" :loading="busy" />
    </template>
  </Dialog>
</template>
