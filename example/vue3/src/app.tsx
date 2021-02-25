import { defineComponent, ref, h, Fragment } from 'vue'

export default defineComponent({
  name: 'App',
  setup () {
    const inputValue = ref('aaa')
    const log = () => {
      console.log(inputValue.value)
    }
    const onInput = (e: Event) => {
      inputValue.value = (e.target as any).value
    }
    // return { inputValue, log }
    return () => {
      return (<>
        <input type="text" value={inputValue.value} onInput={onInput} />
        <p onClick={log}>{inputValue.value}</p>
      </>)
    }
  }
})
