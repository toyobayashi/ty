import {
  defineComponent/* ,
  h,
  Fragment */
} from 'vue'

import { useTextInput } from './hooks'

export default defineComponent({
  name: 'App',
  setup () {
    const {
      inputValue,
      log
    } = useTextInput()
    return () => {
      console.log('App render')
      return (<>
        <input type="text" v-model={inputValue.value} />
        <p onClick={log}>{inputValue.value}</p>
      </>)
    }
  }
})
