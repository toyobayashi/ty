import type { Configuration } from '@tybys/ty'

export default {
  configureWebpack: {
    web (config: any) {
      config.output.devtoolModuleFilenameTemplate = 'ty:///[resource-path]?[hash]'
    },
  },
  define: {
    // https://github.com/vuejs/vue-next/tree/master/packages/vue#bundler-build-feature-flags
    __VUE_OPTIONS_API__: 'false', // default is true
    __VUE_PROD_DEVTOOLS__: 'false'
  },
  pluginImplementation: {
    // for webpack 5
    HtmlWebpackPlugin: require('html-webpack-plugin'),
    TerserWebpackPlugin: require('terser-webpack-plugin')
  },
  loaderPath: {
    vueLoader: require.resolve('vue-loader') // vue-loader@next
  }
} as Configuration
