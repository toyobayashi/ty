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
    target?: 'electron' | 'web'
    entry?: {
      web?: WebpackEntry
      node?: WebpackEntry
      renderer?: WebpackEntry
      main?: WebpackEntry
    }
    output?: {
      web?: string
      node?: string
      renderer?: string
      main?: string
    }
    contentBase?: string
    resourcesPath?: string
    publicPath?: string
    distPath?: string
    iconSrcDir?: string
    indexHtml?: string
    assetsPath?: string
    arch?: 'ia32' | 'x64'
    ts?: undefined | 0 | 1
    context?: string
    productionSourcemap?: boolean

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
      url?: string
    }

    tsconfig?: {
      web?: string
      node?: string
      renderer?: string
      main?: string
    }

    packHook?: undefined | {
      afterInstall? (config: ty.Configuration, root: string): void
      beforeZip? (config: ty.Configuration, root: string): void
    }

    statsOptions?: any

    terserPlugin?: any

    htmlMinify?: any

    configureWebpack?: {
      web? (webConfig: any): void
      node? (webConfig: any): void
      renderer? (rendererConfig: any): void
      main? (mainConfig: any): void
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
