<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useBoardStore } from '@/stores/board'
import { fromApi, formatShort } from '@/utils/date'

// Creates, shows and revokes the read-only share link of a board.
const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({ board: { type: Object, default: null } }) // { id, name }

const store = useBoardStore()
const confirm = useConfirm()
const toast = useToast()

const share = ref(null) // { token, created } or null
const loading = ref(false)
const busy = ref(false)
const urlInput = ref()

const url = computed(() => (share.value ? `${window.location.origin}/share/${share.value.token}` : ''))
const created = computed(() => fromApi(share.value?.created))

function showError(summary, err) {
  toast.add({ severity: 'error', summary, detail: err.message, life: 5000 })
}

watch(visible, async (open) => {
  if (!open || !props.board) return
  share.value = null
  loading.value = true
  try {
    share.value = await store.fetchShare(props.board.id)
  } catch (err) {
    showError('Could not load share link', err)
  } finally {
    loading.value = false
  }
})

async function createLink() {
  busy.value = true
  try {
    share.value = await store.createShare(props.board.id)
  } catch (err) {
    showError('Could not create share link', err)
  } finally {
    busy.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value)
    toast.add({ severity: 'success', summary: 'Link copied', life: 2000 })
  } catch {
    // Clipboard API needs https; let the user copy by hand.
    urlInput.value?.$el?.select()
    toast.add({ severity: 'info', summary: 'Press Ctrl+C to copy the link', life: 4000 })
  }
}

function askReplace() {
  confirm.require({
    header: 'Replace link?',
    message: 'The current link stops working. Anyone who should keep access needs the new link.',
    icon: 'pi pi-refresh',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Replace link' },
    accept: createLink,
  })
}

function askStop() {
  confirm.require({
    header: 'Stop sharing?',
    message: 'The link stops working. You can create a new one later.',
    icon: 'pi pi-ban',
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    acceptProps: { label: 'Stop sharing', severity: 'danger' },
    accept: async () => {
      busy.value = true
      try {
        await store.revokeShare(props.board.id)
        share.value = null
        toast.add({ severity: 'success', summary: 'Sharing stopped', life: 2500 })
      } catch (err) {
        showError('Could not stop sharing', err)
      } finally {
        busy.value = false
      }
    },
  })
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="board ? `Share “${board.name}”` : 'Share'"
    :style="{ width: '32rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :draggable="false"
  >
    <div class="flex flex-col gap-4 pt-1">
      <p class="text-sm text-slate-600">
        Anyone with the link can view this board without logging in. They can't change anything.
      </p>

      <p v-if="loading" class="text-sm text-slate-400">Loading…</p>

      <Button
        v-else-if="!share"
        label="Create link"
        icon="pi pi-link"
        :loading="busy"
        class="self-start"
        @click="createLink"
      />

      <template v-else>
        <div class="flex gap-2">
          <InputText
            ref="urlInput"
            :value="url"
            readonly
            aria-label="Share link"
            fluid
            class="font-mono !text-xs"
            @focus="$event.target.select()"
          />
          <Button label="Copy" icon="pi pi-copy" class="shrink-0" @click="copyLink" />
        </div>
        <p v-if="created" class="text-xs text-slate-500">Created {{ formatShort(created) }}</p>
        <div class="flex flex-wrap gap-2">
          <Button
            label="Replace link"
            icon="pi pi-refresh"
            severity="secondary"
            text
            size="small"
            :disabled="busy"
            @click="askReplace"
          />
          <Button
            label="Stop sharing"
            icon="pi pi-ban"
            severity="danger"
            text
            size="small"
            :disabled="busy"
            @click="askStop"
          />
        </div>
      </template>
    </div>
  </Dialog>
</template>
