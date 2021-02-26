import { ref } from "vue"

export function useTextInput () {
  const inputValue = ref('aaa')
  const log = () => {
    console.log(inputValue.value)
  }

  return {
    inputValue,
    log
  }
}