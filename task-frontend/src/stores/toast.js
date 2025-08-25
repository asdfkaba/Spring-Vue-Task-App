import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),
  actions: {
    addToast(toast) {
      this.toasts.push(toast)
    },
    shiftToast() {
      this.toasts.shift()
    }
  }
})

