<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'

// Deleting a board removes all its columns and tasks, so the name has to be typed to confirm.
const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({ board: { type: Object, default: null } })
const emit = defineEmits(['deleted'])

const store = useBoardStore()
const toast = useToast()

const typedName = ref('')
const busy = ref(false)
const nameMatches = computed(() => props.board !== null && typedName.value === props.board.name)

watch(visible, (open) => {
  if (open) typedName.value = ''
})

async function confirmDelete() {
  if (!nameMatches.value) return
  busy.value = true
  try {
    await store.deleteBoard(props.board.id)
    toast.add({ severity: 'success', summary: 'Board deleted', life: 2500 })
    visible.value = false
    emit('deleted', props.board)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not delete board', detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Delete board"
    :style="{ width: '28rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <form v-if="board" id="board-delete-form" class="flex flex-col gap-5 pt-1" @submit.prevent="confirmDelete">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        <strong class="text-slate-900 dark:text-slate-100">{{ board.name }}</strong> will be deleted with all its columns and tasks.
        This cannot be undone.
      </p>
      <div class="flex flex-col gap-1.5">
        <label for="board-delete-confirm" class="text-sm text-slate-700 dark:text-slate-300">
          To confirm, type <strong class="font-semibold text-slate-900 dark:text-slate-100 select-all">{{ board.name }}</strong>
        </label>
        <InputText id="board-delete-confirm" v-model="typedName" autocomplete="off" fluid />
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button
        type="submit"
        form="board-delete-form"
        label="Delete board"
        icon="pi pi-trash"
        severity="danger"
        :disabled="!nameMatches"
        :loading="busy"
      />
    </template>
  </Dialog>
</template>
