<template>
  <input type="text" v-model="inputValue" />
  <p @click="log">{{inputValue}}</p>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'App',
  setup () {
    const inputValue = ref('aaa')
    const log = () => {
      console.log(inputValue.value)
    }
    return { inputValue, log }
  }
})
</script>
