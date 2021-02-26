<template>
  <input type="text" v-model="inputValue" />
  <p @click="log">{{inputValue}}</p>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useTextInput } from './hooks'

export default defineComponent({
  name: 'App',
  setup () {
    const { inputValue, log } = useTextInput()
    return { inputValue, log }
  }
})
</script>
