declare namespace ty {
  type WebpackEntry = string | string[] | { [name: string]: string | string[] }

  export interface Configuration {
    mode?: 'production' | 'development'
    devServerHost?: string
    devServerPort?: number
    target?: 'electron' | 'web'
    entry?: {
      web?: WebpackEntry
      renderer?: WebpackEntry
      main?: WebpackEntry
    }
    output?: {
      web?: string
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
    arch?: 'ia32' | 'x64',

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
      renderer?: string
      main?: string
    }

    statsOptions?: any

    terserPlugin?: any

    htmlMinify?: any

    configureWebpack?: {
      web? (webConfig: any): void
      renderer? (rendererConfig: any): void
      main? (mainConfig: any): void
    }
  }
}

declare function ty (
  command: string,
  config: ty.Configuration,
  args: {
    [arg: string]: any
    '--'?: string[]
    _: string[]
  }
): void

export = ty
