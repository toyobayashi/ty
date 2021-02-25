import { VNode, DefineComponent } from 'vue'

declare global {
  namespace JSX {
    interface Element extends VNode {}
    interface ElementClass extends DefineComponent {}
    interface IntrinsicElements {
      [elem: string]: any
    }
  }
}
