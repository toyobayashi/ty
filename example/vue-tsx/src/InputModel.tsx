import Vue, { VNode } from 'vue'

export default Vue.extend({
  name: 'InputModel',
  props: {
    customProp: {
      type: String,
      default: 'default customProp'
    }
  },
  data () {
    return {
      inputValue: 'data binding'
    }
  },
  methods: {
    onInput (event: Event) {
      this.$emit('customEvent', (event.target as HTMLInputElement).value)
    }
  },
  render (h): VNode {
    return (
      <div>
        <p>{this.customProp}</p>
        <input type='text' vModel={this.inputValue} onInput_stop={this.onInput} />
        <p>{this.inputValue}</p>
      </div>
    )
  }
})
