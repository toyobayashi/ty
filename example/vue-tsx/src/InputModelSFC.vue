<template>
<div>
  <input type="text" v-model="inputValue" />
  <p>{{inputValue}}</p>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  name: 'InputModelSFC',
  data () {
    return {
      inputValue: 'data binding sfc'
    }
  },
})
</script>
