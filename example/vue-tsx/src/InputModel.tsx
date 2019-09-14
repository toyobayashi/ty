import Vue, { VNode } from 'vue'

export default Vue.extend({
  name: 'InputModel',
  data () {
    return {
      inputValue: 'data binding'
    }
  },
  render (h): VNode {
    return (
      <div>
        <input type='text' vModel={this.inputValue} />
        <p>{this.inputValue}</p>
      </div>
    )
  }
})
