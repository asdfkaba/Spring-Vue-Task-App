import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import base64 from 'base-64'
import { authFetch } from '@/api/actions.js'  // adjust path as needed



export const useTaskStore = defineStore('storeId', {

    // arrow function recommended for full type inference
    state: () => {
        return {
            tasks: [],
        }
    },
    actions: {
        async logout() {
	  this.tasks = []
	},
        async fetchTasks() {
	    console.log("call fetchTasks");
            authFetch('https://spring.morfic.de/api/tasks', {
            }).then(response => response.json()
            ).then(
                fetchedTasks => {
		    console.log(fetchedTasks)
		    console.log(this.tasks)
		    this.tasks.push(...fetchedTasks.filter(task => !this.tasks.filter(t => t.id === task.id).length))
		}
            ).catch(error => console.error(error))

        },
        async createTask(data) {
            authFetch('https://spring.morfic.de/api/tasks', {
                method: 'POST',
                headers: new Headers({
                    "Authorization": `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(data)
            }).then(
                response => response.json()
            ).then(
                task => this.tasks.push(task)
            ).catch(
                error => console.error(error)
            )
        },
	async updateTask(data) {
            authFetch('https://spring.morfic.de/api/tasks', {
                method: 'POST',
                headers: new Headers({
                    "Authorization": `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(data)
            }).then(
                response => response.json()
            ).then(
                task => this.tasks.push(task)
            ).catch(
                error => console.error(error)
            )
	},
        async deleteTask(id) {
	    console.log("delete task", id);
            authFetch(`https://spring.morfic.de/api/tasks/${id}/delete`, {
                method: 'DELETE',
                headers: new Headers({
                    "Authorization": `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }),
            }).then(
                this.tasks = this.tasks.filter(task => task.id !== id)
            ).catch(
                error => console.error(error)
            )
        },
	getTaskById(id) {
	  console.log("call getTaskById");
	  console.log(this.tasks)
          return this.tasks.find(task => String(task.id) === String(id))
        }
    },
})
