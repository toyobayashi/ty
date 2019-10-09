declare namespace ty {
  type WebpackEntry = string | string[] | { [name: string]: string | string[] }

  interface minimistArgs {
    [arg: string]: any
    '--'?: string[]
    _: string[]
  } 

  export interface Configuration {
    mode?: 'production' | 'development'
    devServerHost?: string
    devServerPort?: number
    target?: 'electron' | 'web' | 'node'
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
    contentBase?: string
    resourcesPath?: string
    staticDir?: string
    publicPath?: string
    distPath?: string
    iconSrcDir?: string
    indexHtml?: any[]
    assetsPath?: string
    arch?: 'ia32' | 'x64'
    ts?: undefined | 0 | 1
    generate?: undefined | 0 | 1
    context?: string
    progress?: boolean
    define?: {
      [key: string]: string
    }

    devtool?: {
      development?: string
      production?: string
    }

    productionSourcemap?: boolean
    cssModule?: boolean
    cssLoaderOptions?: any

    alias?: {
      [name: string]: string
    }

    proxy?: any

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
      afterInstall? (config: ty.Configuration, root: string): void
      beforeZip? (config: ty.Configuration, root: string): void
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
  }
}

declare function ty (command: 'build', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'dev', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'inspect', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'pack', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'serve', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'start', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'vscode', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: 'watch', args?: ty.minimistArgs, config?: ty.Configuration): void
declare function ty (command: string, args?: ty.minimistArgs, config?: ty.Configuration): void

export = ty
