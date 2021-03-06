# ty

基于 Webpack 的一劳永逸零配置命令行打包器。

真正零配置，不需要为**打包**写一行代码。（工具本身的配置还是要写，如果你要用的话，比如 eslint babel 等等）

自动识别项目平台（web / electron / node）和工具（babel / typescript / eslint / css预处理 等等）

Vue 单文件组件和 React TSX 开箱即用，但是 JSX 需要自己配 babel。

可一行命令根据项目依赖识别环境并动态生成 Webpack 配置文件。

但适配所有场景当然是不可能的，如果需要，你仍然可以配置内部的 Webpack。

支持 Webpack 4+。

暂不支持 Node.js API，只能通过命令行使用。

## 用法

* 项目本地使用

    1. 在项目里安装

        ``` bash
        $ npm install -D @tybys/ty webpack webpack-dev-server
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
* `inspect` - 检查实际的 Webpack 配置，可以直接通过 `>` 输出到文件，如 `ty inspect --mode=production>webpack.prod.js`
* `vscode` - 生成或修改 VSCode 启动项配置文件 `.vscode/launch.json`。
* `dev` - 【限 Electron 项目】 监听源文件改动并启动 Electron。修改主进程代码会自动重启。
* `pack` - 【限 Electron 项目】 打包 Electron 应用，默认输出位置：`dist`。
* `start` - 【限 Electron 项目】 启动 Electron。

## 配置

可以在根目录下写一个 `tyconfig.js` 或 `tyconfig.ts` 配置文件，当然也可以不写。如果用 TypeScript 写，确保先安装 `typescript` 和 `ts-node`。

* `mode` {'development' | 'production'} `build` and `pack` 命令默认是 `'production'`，其它情况下默认是 `'development'`。

* `devServerHost` {string} 开发环境下的本地服务器。默认：`'localhost'`。

* `devServerPort` {number} 开发环境下的本地服务器端口号。 默认：`8090`。

* `devServerOpenBrowser` {boolean | string} 限 Web 项目。本地服务器启动时打开浏览器。默认：`false`。

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
        renderer: `${localResourcesPath}/app/renderer`,
        main: `${localResourcesPath}/app/main`,
        preload: `${localResourcesPath}/app/preload`
      }
    }
    ```

* `contentBase` {string} 传给 `webpack-dev-server`，从什么地方托管静态文件。 默认：`'dist'` 或 `'local_resources'`。

* `localResourcesPath` {string} 在本地开发启动时模拟 Electron 的 `resources` 目录。默认：`'local_resources'`。

* `extraResourcesPath` {string} 打包时会把这里面的东西复制到 `resources` 目录。默认：`'resources'`。

* `publicPath` {string} 输出的静态资源路径前缀。默认：开发环境为 `'/'` 或 `'/app/renderer/'`，生产环境为 `''`。

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

* `vue` {undefined | 0 | 1} 强制使用或强制不使用 Vue.js，传数字。默认：`undefined`。

* `webpack` {undefined | number} 强制指定 webpack 版本，传数字。默认：`undefined`。

* `ts` {undefined | 0 | 1} 强制使用或强制不使用 TypeScript，传数字。默认：`undefined`。

* `eslint` {undefined | 0 | 1} 强制使用或强制不使用 ESLint，传数字。默认：`undefined`。

* `sass` {undefined | 0 | 1} 强制使用或强制不使用 Sass，传数字。默认：`undefined`。

* `less` {undefined | 0 | 1} 强制使用或强制不使用 Less，传数字。默认：`undefined`。

* `stylus` {undefined | 0 | 1} 强制使用或强制不使用 Stylus，传数字。默认：`undefined`。

* `generate` {undefined | 0 | 1} 强制生成或强制不生成缺失的文件。默认：`undefined`。

* `context` {string} 修改打包器的上下文根目录。默认：`''`。

* `progress` {boolean} 显示编译进度。默认: `false`。

* `define` {{ [key: string]: string }} 传入 `webpack.DefinePlugin`。默认：`{}`。

* `devtool` {{ development: string; production: string }} 不同模式下传给 `webpackConfig.devtool`。 默认：`{ development: 'eval-source-map', production: 'source-map' }`。

* `productionSourcemap` {boolean} 生产环境是否需要源地图。默认：`false`。

* `extractcss` {undefined | 0 | 1} 强制提取或强制不提取 CSS 文件。默认：`undefined`。

* `cssLoaderOptions` {any} 默认：`{}`.

* `postcssLoaderOptions` {any} 默认：`{}`.

* `stylusLoaderOptions` {any} 默认：`{}`.

* `lessLoaderOptions` {any} 默认：`{}`.

* `sassLoaderOptions` {any} 默认：`{}`.

* `eslintPluginOptions` {any} 默认：`{}`.

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
        beforeBuild (config) {},
        beforeBuildCopy (config, copyPaths) {},
        beforeWritePackageJson (config, pkg) { return pkg },
        beforeInstall (config, tempAppDir) {},
        afterInstall (config, tempAppDir) {},
        beforeZip (config, appDir) {},
        afterZip (config, zipPath) {}
      }
    }
   ```

* `packTempAppDir` - 打包时产生的临时 `app` 目录。 默认：`path.join(distPath, '_app')`。

* `packagerOptions` - 传入 `electron-packager`。默认： `{}`。

* `asarOptions` - 传入 `asar.createPackageWithOptions()`。默认：`{ unpack: '*.node' }`。

* `nodeModulesAsar` - 单独把 `node_modules` 打包成 `node_modules.asar` 与 `app.asar` 同级。默认： `false`。 

* `nodeExternals` - 传入 `webpack-node-externals`。默认： `{ allowlist: ['tslib'] }`。 

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
        extractComments: false,
        terserOptions: {
          ecma: 2018,
          output: {
            comments: false,
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

* `cssOptimize` - 传入 `new CssMinimizerWebpackPlugin(cssOptimize)`。默认：

    ``` js
    module.exports = {
      cssOptimize: {
        minimizerOptions: {
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
* `--webpack` - 强制指定 webpack 版本。
* `--ts` - 强制使用或强制不使用 TypeScript。
* `--vue` - 强制使用或强制不使用 Vue。
* `--eslint` - 强制使用或强制不使用 ESLint。
* `--sass` - 强制使用或强制不使用 Sass。
* `--less` - 强制使用或强制不使用 Less。
* `--stylus` - 强制使用或强制不使用 Stylus。
* `--generate` - 强制生成或强制不生成缺失的文件。
* `--context` - 项目的根目录。
* `--dev-server-port`
* `--dev-server-host`
* `--dev-server-open-browser`
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

## 例子

看 [example 目录](https://github.com/toyobayashi/ty/tree/master/example)。

## 许可

* MIT
