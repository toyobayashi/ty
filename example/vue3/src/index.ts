import { createApp, h } from 'vue'
// import App from './App.vue'
import App from './app'

const app = createApp({
  render: () => h(App)
})

app.mount('#app')

// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.accept()
}
