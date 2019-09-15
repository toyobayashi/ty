import Vue, { VNode } from 'vue'
import App from './App'

const vm = new Vue({
  render: (h): VNode => h(App)
})

vm.$mount('#app')

if (process.env.NODE_ENV !== 'production') {
  if ((module as any).hot) (module as any).hot.accept()
}
