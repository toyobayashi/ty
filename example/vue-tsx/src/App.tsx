import Vue, { VNode } from 'vue'
import InputModel from './InputModel'
import InputModelSFC from './InputModelSFC.vue'

export default Vue.extend({
  components: {
    InputModel,
    InputModelSFC
  },
  methods: {
    onClick (event: Event) {
      window.alert((event.target as HTMLHeadElement).innerHTML)
    }
  },
  render (h): VNode {
    return (
      <div id='app'>
        <h1 onClick={this.onClick}>Hello World</h1>
        <InputModel />
        <InputModelSFC />
      </div>
    )
  }
})
