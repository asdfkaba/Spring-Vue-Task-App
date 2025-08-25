<script>
import Button from 'primevue/button';

export default {
  props: {
    itemId: String,
  },
};
</script>

<template>
  <div class="task">

      <h1>{{ itemId }}</h1>
  </div>
<div class="link">
    <router-link :to="`/tasks`">Back</router-link>
</div>
    </template>
<style>
.task {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    position: relative;
}

.link {
    grid-column: 1/-1;
    text-align: center;
    border: 1px solid black;
    border-radius: 4px;
    padding: 0.5rem 0.2rem;
}

</style>

