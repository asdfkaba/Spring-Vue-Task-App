<script setup>
import { computed, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import LabelPill from '@/components/LabelPill.vue'
import { COLUMN_COLOR_PRESETS } from '@/utils/task'

// Name and color of a new or existing label. Lives inside the task form, so Enter must not submit that.
const MAX_NAME_LENGTH = 30

const props = defineProps({
  label: { type: Object, default: null }, // null = new label
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'delete', 'cancel'])

const name = ref(props.label?.name ?? '')
const color = ref(props.label?.color ?? COLUMN_COLOR_PRESETS[6])
const nameInput = ref()
const preview = computed(() => ({ name: name.value.trim() || 'Label', color: color.value }))
const canSave = computed(() => name.value.trim().length > 0 && !props.busy)

onMounted(() => nameInput.value?.$el?.focus())

function save() {
  if (canSave.value) emit('save', { name: name.value.trim(), color: color.value })
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800/60" data-testid="label-form">
    <div class="flex items-center gap-2">
      <LabelPill :label="preview" class="shrink-0" />
      <InputText
        ref="nameInput"
        v-model="name"
        :maxlength="MAX_NAME_LENGTH"
        aria-label="Label name"
        placeholder="Label name"
        size="small"
        fluid
        @keydown.enter.prevent="save"
      />
    </div>
    <div class="flex flex-wrap gap-1.5" role="group" aria-label="Label color">
      <button
        v-for="preset in COLUMN_COLOR_PRESETS"
        :key="preset"
        type="button"
        class="h-6 w-6 rounded-full"
        :class="{ 'ring-2 ring-slate-900 ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-800': color === preset }"
        :style="{ backgroundColor: preset }"
        :aria-label="`Color ${preset}`"
        :aria-pressed="color === preset"
        @click="color = preset"
      />
    </div>
    <div class="flex items-center gap-1">
      <Button
        v-if="label"
        label="Delete"
        icon="pi pi-trash"
        severity="danger"
        text
        size="small"
        :disabled="busy"
        @click="emit('delete')"
      />
      <span class="flex-1" />
      <Button label="Cancel" severity="secondary" text size="small" @click="emit('cancel')" />
      <Button :label="label ? 'Save' : 'Create'" size="small" :disabled="!canSave" :loading="busy" @click="save" />
    </div>
  </div>
</template>
