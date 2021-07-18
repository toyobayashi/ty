/// <reference types="node" />

declare namespace ty {
  export type WebpackEntry = string | string[] | { [name: string]: string | string[] }

  export interface Plugin {
    apply (...args: any[]): void
  }

  /* interface minimistArgs {
    [arg: string]: any
    '--'?: string[]
    _: string[]
  } */

  export type Mode = 'production' | 'development'

  export type Target = 'electron' | 'web' | 'node'

  export type Arch = 'ia32' | 'x64'

  export interface Configuration {
    mode?: Mode
    devServerHost?: string
    devServerPort?: number
    devServerOpenBrowser?: boolean | string
    target?: Target
    entry?: {
      web?: WebpackEntry
      node?: WebpackEntry
      renderer?: WebpackEntry
      main?: WebpackEntry
      preload?: WebpackEntry | null
    }
    output?: {
      web?: string
      node?: string
      renderer?: string
      main?: string
      preload?: string
    }
    out?: {
      js?: string
      css?: string
      node?: string
      assets?: string
    }
    contentBase?: string
    localResourcesPath?: string
    extraResourcesPath?: string
    staticDir?: string
    publicPath?: string
    distPath?: string
    iconSrcDir?: string
    indexHtml?: (string | Record<string, any>)[]
    assetsPath?: string
    arch?: Arch
    webpack?: undefined | number
    vue?: undefined | 0 | 1
    ts?: undefined | 0 | 1
    eslint?: undefined | 0 | 1
    sass?: undefined | 0 | 1
    less?: undefined | 0 | 1
    stylus?: undefined | 0 | 1
    generate?: undefined | 0 | 1
    context?: string
    progress?: boolean
    extractcss?: undefined | 0 | 1
    define?: {
      [key: string]: string
    }

    devtool?: {
      development?: string
      production?: string
    }

    productionSourcemap?: boolean
    cssLoaderOptions?: Record<string, any>
    postcssLoaderOptions?: Record<string, any>
    stylusLoaderOptions?: Record<string, any>
    lessLoaderOptions?: Record<string, any>
    sassLoaderOptions?: Record<string, any>

    eslintPluginOptions?: Record<string, any>

    alias?: {
      [name: string]: string
    }

    proxy?: Record<string, any>

    inno?: {
      src?: string
      appid?: {
        ia32?: string
        x64?: string
      },
      url?: string,
      def?: {
        [key: string]: string
      }
    }

    tsconfig?: {
      web?: string
      node?: string
      renderer?: string
      main?: string
      preload?: string
    }

    packHook?: undefined | {
      beforeBuild? (config: ty.Configuration): any
      beforeBuildCopy? (config: ty.Configuration, copyPaths: { main: [string, string]; renderer: [string, string]; preload?: [string, string] }): any
      beforeWritePackageJson? (config: ty.Configuration, pkg: any): any
      beforeInstall? (config: ty.Configuration, tempAppDir: string): any
      afterInstall? (config: ty.Configuration, tempAppDir: string): any
      beforeZip? (config: ty.Configuration, appDir: string): any
      afterZip? (config: ty.Configuration, zipPath: string): any
    }

    packTempAppDir?: string

    packagerOptions?: Record<string, any>

    asarOptions?: {
      globOptions?: any
      dot?: boolean
      ordering?: boolean
      pattern?: string
      unpack?: string
      unpackDir?: string
      transform? (filename: string): NodeJS.WritableStream | void
      [key: string]: any
    }

    nodeModulesAsar?: boolean

    nodeExternals?: {
      node?: Record<string, any>
      renderer?: Record<string, any>
      main?: Record<string, any>
      preload?: Record<string, any>
    }

    prune?: {
      whitelist?: string[]
      removeFiles?: string[]
      removeDirs?: string[]
      production?: boolean
    }

    statsOptions?: any

    terserPlugin?: any

    htmlMinify?: any

    cssOptimize?: any

    configureWebpack?: {
      web? (webConfig: any): void
      node? (webConfig: any): void
      renderer? (rendererConfig: any): void
      main? (mainConfig: any): void
      preload? (preloadConfig: any): void
    }

    pluginImplementation?: {
      [name: string]: { new (options: any): Plugin }
    }

    loaderPath?: {
      [name: string]: any
    }
  }

  export type ConfigurationFactory = (mode: Mode) => Configuration

  export function defineConfiguration<T extends Configuration | ConfigurationFactory> (config: T): T

  export function wrapPlugin<P extends Plugin> (name: string, Constructor: P): P
}

// declare function ty (command: 'build', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'dev', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'inspect', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'pack', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'serve', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'start', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'vscode', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: 'watch', args?: ty.minimistArgs, config?: ty.Configuration): void
// declare function ty (command: string, args?: ty.minimistArgs, config?: ty.Configuration): void

export = ty
