# ty

No webpack config. Working in progress.

## Usage

* Local

    1. Install

        ``` bash
        $ npm install -D @tybys/ty
        ```

    2. Writing scripts in package.json

        ``` json
        {
          "scripts": {
            "serve": "ty serve",
            "build": "ty build"
          }
        }
        ```

*  Global

    1. Install

        ``` bash
        $ npm install -g @tybys/ty
        ```

    2. Run in project root directory

        ``` bash
        $ ty build
        ```

## Commands

* `build` - Bundle production code. Default output directory: `dist` or `resources/app`.
* `serve` - Start local development server.
* `watch` - Watch source code and write bundled code to local files.
* `inspect` - Inspect webpack config.
* `vscode` - Generate or modify `.vscode/launch.json`.
* `dev` - [Electron project only] Start local development server and launch electron.
* `pack` - [Electron project only] Pack application. Default output directory: `dist`.
* `start` - [Electron project only] Launch electron.

## Config

`tyconfig.js` or `tyconfig.ts` in your project root directory. If you want to use typescript to write configuration, you need to install `ts-node` first.

* `mode` {'development' | 'production'} Default: `'production'` for `build` and `pack`, `'development'` for other command.

* `devServerHost` {string} For `serve` and `dev`. Default: `'localhost'`.

* `devServerPort` {number} For `serve` and `dev`. Default: `8090`.

* `devServerOpenBrowser` {boolean | string} Web project only. For `serve` and `dev`. Default: `false`.

* `target` {'web' | 'electron' | 'node'} If `electron` in your `devDependencies` it is `'electron'`, otherwise it is `'web'`.

* `entry` - Must be absolute path. Default:

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

* `output` - Default:

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

* `contentBase` {string} For `webpack-dev-server`. Default: `'dist'` (web target) or `'resources'` (electron target).

* `localResourcesPath` {string} Simulate electron's `resources` directory in local development. Default: `'local_resources'`.

* `extraResourcesPath` {string} Extra contents to be copied to `resources` dir. Default: `'resources'`.

* `publicPath` {string} Default: `'/'` (web target) or `'/app/renderer/'` (electron target) in development environment, `''` in production.

* `staticDir` {string} Be copied to web root. Default: `'public'`.

* `distPath` {string} For `pack` command. Default: `'dist'`.

* `iconSrcDir` {string} For `pack` command. Application icons:

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

* `indexHtml` {any[]} Pass to `HtmlWebpackPlugin`. Default: `['public/index.html']`.

* `assetsPath` {string} Where the static assets should be output. Relative to `output`. Default: `''`.

* `arch` {string} For `pack` command. Default: `process.arch`.

* `inno` - For windows. Default:

    ``` js
    module.exports = {
      inno: {
        src: '', // custom inno script path.
        appid: {
          ia32: '', // UUID
          x64: '' // UUID
        },
        url: '', // display in installer
        def: {} // declare inno script variable
      }
    }
    ```

* `vue` {undefined | 0 | 1} Force to use Vue.js or not. Default: `undefined`.

* `ts` {undefined | 0 | 1} Force to use typescript or not. Default: `undefined`.

* `eslint` {undefined | 0 | 1} Force to use ESLint or not. Default: `undefined`.

* `sass` {undefined | 0 | 1} Force to use sass or not. Default: `undefined`.

* `less` {undefined | 0 | 1} Force to use less or not. Default: `undefined`.

* `stylus` {undefined | 0 | 1} Force to use stylus or not. Default: `undefined`.

* `generate` {undefined | 0 | 1} Force to generate missing files or not. Default: `undefined`.

* `context` {string} Project root directory. Default: `''`.

* `progress` {boolean} Show progress. Default: `false`.

* `define` {{ [key: string]: string }} Pass to `webpack.DefinePlugin`. Default: `{}`.

* `devtool` {{ development: string; production: string }} Pass to `webpackConfig.devtool` in different mode. Default: `{ development: 'eval-source-map', production: 'source-map' }`.

* `productionSourcemap` {boolean} Whether to generate sourcemap in production mode. Default: `false`.

* `extractcss` {undefined | 0 | 1} Whether to extract CSS. Default: `undefined`.

* `cssLoaderOptions` {any} Default: `{}`.

* `postcssLoaderOptions` {any} Default: `{}`.

* `stylusLoaderOptions` {any} Default: `{}`.

* `lessLoaderOptions` {any} Default: `{}`.

* `sassLoaderOptions` {any} Default: `{}`.

* `eslintPluginOptions` {any} Default: `{}`.

* `alias` {{ [name: string]: string }} Pass to `webpackConfig.resolve.alias`. Default: `{ '@': path.join(config.context || process.env.TY_CONTEXT || process.cwd(), 'src') }`

* `tsconfig` - For TypeScript project. Default:

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

* `proxy` - Pass to `webpack-dev-server`. Default: `{}`.

* `packHook` - For electron packing process. Default: `undefined`.

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

* `packTempAppDir` - Temp `app` dir when packing. Default: `path.join(distPath, '_app')`.

* `packagerOptions` - Pass to `electron-packager`. Default: `{}`.

* `asarOptions` - Pass to `asar.createPackageWithOptions()`. Default: `{ unpack: '*.node' }`.

* `nodeModulesAsar` - Pack `node_modules` to `node_modules.asar` and place it with `app.asar` together. Default: `false`.

* `nodeExternals` - Pass to `webpack-node-externals`. Default: `{ allowlist: ['tslib'] }`.

* `prune` - For pruning node_modules folder after electron packing process. See `@tybys/prune-node-modules`. Default: `{ production: true }`.

* `statsOptions` - For webpack output. Default: 

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

* `terserPlugin` - For `terser-webpack-plugin`. Default:

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

* `htmlMinify` - For `html-webpack-plugin` minify option. Default:

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

* `cssOptimize` - Pass to `new CssMinimizerWebpackPlugin(cssOptimize)`. Default:

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

* `configureWebpack` - Modify webpack config. Default:

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

* `command` - Your custom command. Default: `undefined`

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

## Options

* `--mode`
* `--target`
* `--arch`
* `--ts` - Force to use typescript or not.
* `--vue` - Force to use vue or not.
* `--eslint` - Force to use eslint or not.
* `--sass` - Force to use sass or not.
* `--less` - Force to use less or not.
* `--stylus` - Force to use stylus or not.
* `--generate` - Force to generate missing files or not.
* `--context` - Project root directory.
* `--dev-server-port`
* `--dev-server-host`
* `--dev-server-open-browser`
* `--production-sourcemap`
* `--css-module`
* `--progress` - Show progress.
* `--config` - CLI only. Specify tyconfig file path.
* `--define.PRE_DEFINE_VARIABLE='value'` - Predefine.

## Other

* ESLint / Babel / PostCSS will be loaded in webpack if there are config files such as `.eslintrc.js` / `babel.config.js` / `postcss.config.js` in your project root directory.

* In most cases you don't need to config anything except ESLint / Babel / PostCSS.

* TypeScript support is out of box. Just write your `tsconfig.json` in project root directory. But in electron project, you should write different `tsconfig.json` for main process and renderer process, default in `src/renderer/tsconfig.json` and `src/main/tsconfig.json`.

* Use ESLint to check typescript code instead of TSLint.

* By default, `.node` file can only be used in electron main process.

## Example

* [electron-vue-ts](https://github.com/toyobayashi/webpack-template/tree/master/electron-vue-ts)
* [electron-vue-js](https://github.com/toyobayashi/webpack-template/tree/master/electron-vue-js)
* [react-js](https://github.com/toyobayashi/webpack-template/tree/master/react-js)

## License

* MIT
