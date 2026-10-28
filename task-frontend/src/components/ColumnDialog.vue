<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'
import { COLUMN_COLOR_PRESETS } from '@/utils/task'

const MAX_NAME_LENGTH = 50

const visible = defineModel('visible', { type: Boolean, default: false })
// null = add a new column, otherwise the column to edit
const props = defineProps({ column: { type: Object, default: null } })

const store = useBoardStore()
const toast = useToast()

const isEdit = computed(() => props.column !== null)
const busy = ref(false)
const submitted = ref(false)
const form = reactive({ name: '', color: null })

const nameMissing = computed(() => submitted.value && !form.name.trim())
const isCustomColor = computed(() => form.color !== null && !COLUMN_COLOR_PRESETS.includes(form.color))

watch(visible, (open) => {
  if (!open) return
  submitted.value = false
  form.name = props.column?.name ?? ''
  form.color = props.column?.color ?? null
})

async function save() {
  submitted.value = true
  const name = form.name.trim()
  if (!name) return

  busy.value = true
  try {
    if (isEdit.value) {
      await store.updateColumn(props.column.id, { name, color: form.color })
    } else {
      await store.addColumn(name, form.color)
    }
    visible.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Could not save column', detail: err.message, life: 5000 })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="isEdit ? 'Edit column' : 'New column'"
    :style="{ width: '26rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <form id="column-form" class="flex flex-col gap-5 pt-1" @submit.prevent="save">
      <div class="flex flex-col gap-1.5">
        <label for="column-name" class="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
        <InputText
          id="column-name"
          v-model="form.name"
          :maxlength="MAX_NAME_LENGTH"
          :invalid="nameMissing"
          placeholder="e.g. Review"
          autofocus
          fluid
        />
        <Message v-if="nameMissing" severity="error" size="small" variant="simple">
          Please enter a name.
        </Message>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Color <span class="font-normal text-slate-400 dark:text-slate-500">(marks the tasks in this column)</span>
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500"
            :class="{ 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2 dark:ring-offset-slate-900': form.color === null }"
            title="No color"
            aria-label="No color"
            @click="form.color = null"
          >
            <i class="pi pi-ban text-xs" />
          </button>
          <button
            v-for="preset in COLUMN_COLOR_PRESETS"
            :key="preset"
            type="button"
            class="h-8 w-8 rounded-full"
            :class="{ 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2 dark:ring-offset-slate-900': form.color === preset }"
            :style="{ backgroundColor: preset }"
            :title="preset"
            :aria-label="`Color ${preset}`"
            @click="form.color = preset"
          />
          <label
            class="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            :class="{ 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2 dark:ring-offset-slate-900': isCustomColor }"
            :style="isCustomColor ? { backgroundColor: form.color } : {}"
            title="Custom color"
          >
            <i v-if="!isCustomColor" class="pi pi-palette text-xs" />
            <input
              type="color"
              class="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom color"
              :value="form.color ?? '#64748b'"
              @input="form.color = $event.target.value"
            />
          </label>
        </div>
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button
        type="submit"
        form="column-form"
        :label="isEdit ? 'Save' : 'Add column'"
        icon="pi pi-check"
        :loading="busy"
      />
    </template>
  </Dialog>
</template>
