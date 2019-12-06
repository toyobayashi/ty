# ty

平时做项目也好写玩具也好，再也不想开始写之前先配它个几百行 Webpack。

这个项目是针对**平常一般的需求**写的一个“一劳永逸”零配置打包器。

真正零配置，不需要为打包写一行代码。（工具本身的配置还是要写，如果你要用的话，比如 eslint babel 等等）。

自动识别项目平台（web / electron / node）和工具（babel / typescript / eslint / css预处理 等等）

Vue 单文件组件和 React TSX 开箱即用，但是 JSX 需要自己配 babel。

但适配所有场景当然是不可能的，如果需要，你仍然可以配置内部的 Webpack。

完善中。

## 用法

* 项目本地使用

    1. 在项目里安装

        ``` bash
        $ npm install -D @tybys/ty
        ```

    2. 写在 NPM 脚本里

        ``` json
        {
          "scripts": {
            "serve": "ty serve",
            "build": "ty build"
          }
        }
        ```

*  全局使用

    1. 全局安装

        ``` bash
        $ npm install -g @tybys/ty
        ```

    2. 在项目中敲命令

        ``` bash
        $ ty build
        ```

## 开始

确保安装了 Node.js 最近的版本和 npm。

第一步，全局安装，新建一个空文件夹 cd 进去

``` bash
$ npm install -g @tybys/ty
$ mkdir hello
$ cd hello
```

第二步，除了敲命令，什么都不需要做，HTML 和 入口 JS 文件如果不存在会自动生成

``` bash
$ ty serve
```

更多用法等我更新文档。

## 命令

* `build` - 打包生产环境代码。默认输出位置：`dist` 或者 `resources/app`。
* `serve` - 开发环境启动 Webpack 监听文件变化。
* `watch` - 监听源码变动并直接把打包后的代码写入文件，不会开启本地服务器。
* `inspect` - 检查实际的 Webpack 配置。
* `vscode` - 生成或修改 VSCode 启动项配置文件 `.vscode/launch.json`。
* `dev` - 【限 Electron 项目】 监听源文件改动并启动 Electron。修改主进程代码会自动重启。
* `pack` - 【限 Electron 项目】 打包 Electron 应用，默认输出位置：`dist`。
* `start` - 【限 Electron 项目】 启动 Electron。

## 配置

可以在根目录下写一个 `tyconfig.js` 或 `tyconfig.ts` 配置文件，当然也可以不写。如果用 TypeScript 写，确保先安装 `typescript` 和 `ts-node`。

* `mode` {'development' | 'production'} `build` and `pack` 命令默认是 `'production'`，其它情况下默认是 `'development'`。

* `devServerHost` {string} 开发环境下的本地服务器。默认：`'localhost'`。

* `devServerPort` {number} 开发环境下的本地服务器端口号。 默认：`8090`。

* `target` {'web' | 'electron' | 'node'} 如果项目开发依赖中安装了 `electron`，那么它就是 `'electron'`。

* `entry` - 传给 Webpack 的入口文件。 默认：

    ``` js
    const path = require('path')
    const projectRoot = path.join(config.context || process.env.TY_CONTEXT || process.cwd())
    module.exports = {
      entry: {
        web: {
          app: [path.join(projectRoot, 'src/index')]
        },
        node: {
          main: [path.join(projectRoot, 'src/index')]
        },
        renderer: {
          renderer: [path.join(projectRoot, 'src/renderer/renderer')]
        },
        main: {
          main: [path.join(projectRoot, 'src/main/main')]
        },
        preload: null
      }
    }
    ```

* `output` - 传给 Webpack 的输出目录。 默认：

    ``` js
    module.exports = {
      output: {
        web: 'dist',
        node: 'dist',
        renderer: 'resources/app/renderer',
        main: 'resources/app/main',
        preload: 'resources/app/preload'
      }
    }
    ```

* `contentBase` {string} 传给 `webpack-dev-server`，从什么地方托管静态文件。 默认：`'dist'` 或 `'resources'`。

* `resourcesPath` {string} 在本地开发启动时模拟 Electron 的 `resources` 目录。打包时会把这里的东西全部复制过去。默认：`'resources'`。

* `publicPath` {string} 本地开发时静态资源的相对路径。默认：`'/'` 或 `'/app/renderer/'`。

* `staticDir` {string} 被复制到网站根目录下。默认： `'public'`。

* `distPath` {string} 打包时的输出目录。默认：`'dist'`.

* `iconSrcDir` {string} 打包时的应用图标存放位置，必须是下面这样：

    ```
    iconSrcDir
      ├── 16x16.png (linux)
      ├── 24x24.png (linux)
      ├── 32x32.png (linux)
      ├── 48x48.png (linux)
      ├── 64x64.png (linux)
      ├── 128x128.png (linux)
      ├── 256x256.png (linux)
      ├── 512x512.png (linux)
      ├── 1024x1024.png (linux)
      ├── app.ico (windows)
      └── app.icns (mac)
    ```

* `indexHtml` {string} 传入 `new HtmlWebpackPlugin(item)`。默认：`[{ template: 'public/index.html' }]`。

* `assetsPath` {string} 静态资源应该输出的位置。相对于 `output`。 默认：`''`。

* `arch` {string} 打包应用的架构。默认：`process.arch`。

* `inno` - Windows 打包安装程序。默认：

    ``` js
    module.exports = {
      inno: {
        src: '', // 自定义的 inno 脚本
        appid: {
          ia32: '', // UUID
          x64: '' // UUID
        },
        url: '', // 会显示在安装程序中
        def: {} // 预定义
      }
    }
    ```

* `ts` {undefined | 0 | 1} 强制使用或强制不使用 TypeScript，传数字。默认：`undefined`。

* `generate` {undefined | 0 | 1} 强制生成或强制不生成缺失的文件。默认：`undefined`。

* `context` {string} 修改打包器的上下文根目录。默认：`''`。

* `progress` {boolean} 显示编译进度。默认: `false`。

* `define` {{ [key: string]: string }} 传入 `webpack.DefinePlugin`。默认：`{}`。

* `devtool` {{ development: string; production: string }} 不同模式下传给 `webpackConfig.devtool`。 默认：`{ development: 'eval-source-map', production: 'source-map' }`。

* `productionSourcemap` {boolean} 生产环境是否需要源地图。默认：`false`。

* `cssModule` {boolean} 是否启用 CSS Module。默认：`false`。

* `cssLoaderOptions` {any} 默认：`{}`.

* `alias` {{ [name: string]: string }} 传给 `webpackConfig.resolve.alias`。 默认：`{ '@': path.join(conifg.context || process.env.TY_CONTEXT || process.cwd(), 'src') }`

* `tsconfig` - 指定各构建目标的 `tsconfig.json` 位置。默认：

    ``` js
    module.exports = {
      tsconfig: {
        web: 'tsconfig.json',
        node: 'tsconfig.json',
        renderer: 'src/renderer/tsconfig.json',
        main: 'src/main/tsconfig.json',
        preload: 'src/preload/tsconfig.json'
      }
    }
    ```

* `proxy` - 传入 `webpack-dev-server`。默认：`{}`。

* `packHook` - 用于 Electron 打包过程。 默认：`undefined`。

   ``` js
   module.exports = {
      packHook: {
        afterInstall (config, root) {},
        beforeZip (config, root) {}
      }
    }
   ```

* `prune` - 用于 Electron 打包后精简 node_modules 文件夹大小。配置项详细见 `@tybys/prune-node-modules`。默认：`{ production: true }`。

* `statsOptions` - 配置 Webpack 的输出，详细见 Webpack 文档。默认：

    ``` js
    module.exports = {
      statsOptions: {
        colors: true,
        children: false,
        modules: false,
        entrypoints: false
      }
    }
    ```

* `terserPlugin` - 配置 `terser-webpack-plugin`，详细见它的文档。默认：

    ``` js
    module.exports = {
      terserPlugin: {
        parallel: true,
        cache: true,
        terserOptions: {
          ecma: 9,
          output: {
            beautify: false
          }
        }
      }
    }
    ```

* `htmlMinify` - 配置 `html-webpack-plugin` 压缩选项，详细见它的文档。默认：

    ``` js
    module.exports = {
      htmlMinify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        collapseBooleanAttributes: true,
        removeScriptTypeAttributes: true
      }
    }
    ```

* `cssOptimize` - 传入 `new OptimizeCSSAssetsPlugin()`。默认：

    ``` js
    module.exports = {
      cssOptimize: {
        cssProcessorPluginOptions: {
          preset: [
            'default',
            {
              mergeLonghand: false,
              cssDeclarationSorter: false
            }
          ]
        }
      }
    }
    ```

* `configureWebpack` - 修改内部的 Webpack 配置。默认：

    ``` js
    module.exports = {
      configureWebpack: {
        // web (webConfig: WebpackConfiguration): void
        web (webConfig) {}, 
        // node (nodeConfig: WebpackConfiguration): void
        node (nodeConfig) {}, 
        // renderer (rendererConfig: WebpackConfiguration): void
        renderer (rendererConfig) {},
        // main (mainConfig: WebpackConfiguration): void
        main (mainConfig) {},
        // preload (preloadConfig: WebpackConfiguration): void
        preload (preloadConfig) {}
      }
    }
    ```

* `command` - 自定义的命令。默认：`undefined`

    ``` js
    module.exports = {
      command: {
        // [command: string]: (
        //   tyconfig: TyConfig,
        //   args: minimist.ParsedArgs,
        //   getCommand: (command: string) => undefined | ((tyconfig: TyConfig) => void)
        // ) => void
        hello (tyconfig, args, getCommand) {
          console.log('hello.')
        }
      }
    }
    ```

    ``` bash
    $ ty hello
    ```

## 选项

对应配置项。命令行传入的优先级更高。

* `--mode`
* `--target`
* `--arch`
* `--ts` - 强制使用或强制不使用 TypeScript。
* `--generate` - 强制生成或强制不生成缺失的文件。
* `--context` - 项目的根目录。
* `--dev-server-port`
* `--dev-server-host`
* `--production-sourcemap`
* `--css-module`
* `--progress` - 是否显示编译进度
* `--config` - 只能在命令行使用。指定配置文件的路径。
* `--define.PRE_DEFINE_VARIABLE='value'` - 预定义。

## 其它

* 如果项目中存在 `.eslintrc.js` / `babel.config.js` / `postcss.config.js`，ESLint / Babel / PostCSS 会被自动启用。

* 除了 ESLint / Babel / PostCSS，大多数情况下不需要任何多余的配置。

* TypeScript 开箱即用。只需要配一下 `tsconfig.json`。如果是 Electron 项目，你需要为主进程和渲染进程各写一个 `tsconfig.json`，默认是在 `src/renderer/tsconfig.json` 和 `src/main/tsconfig.json`。

* 不支持 TSLint 检查 TypeScript 代码，请使用 ESLint 检查，未来是 ESLint 的天下。

* 默认情况下，原生模块 `.node` 文件只能用于 Electron 主进程和 node 项目中。不推荐在 Electron 渲染进程里加载原生模块。

## 例子

* [electron-vue-ts](https://github.com/toyobayashi/webpack-template/tree/master/electron-vue-ts)
* [electron-vue-js](https://github.com/toyobayashi/webpack-template/tree/master/electron-vue-js)
* [react-js](https://github.com/toyobayashi/webpack-template/tree/master/react-js)

## 许可

* MIT
