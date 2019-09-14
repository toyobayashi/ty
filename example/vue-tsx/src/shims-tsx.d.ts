
import Vue, { VNode } from 'vue';

declare global {
  namespace JSX {
    interface Element extends VNode {}
    interface ElementClass extends Vue {}
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    ref?: string
    [propName: string]: any
  }
}
