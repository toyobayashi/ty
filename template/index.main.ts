import { app, BrowserWindow, nativeImage, BrowserWindowConstructorOptions } from 'electron'
import { format } from 'url'
import { join } from 'path'
import { existsSync } from 'fs'

function isPromiseLike (obj: any): boolean {
  return (obj instanceof Promise) || (
    obj !== undefined && obj !== null && typeof obj.then === 'function' && typeof obj.catch === 'function'
  )
}

class WindowManager {
  public static ID_MAIN_WINDOW: string = 'main-window'

  private static _instance: WindowManager

  public static getInstance (): WindowManager {
    if (!WindowManager._instance) {
      WindowManager._instance = new WindowManager()
    }
    return WindowManager._instance
  }

  public static createMainWindow (): void {
    const windowManager = WindowManager.getInstance()
    if (!windowManager.hasWindow(WindowManager.ID_MAIN_WINDOW)) {
      const browerWindowOptions: BrowserWindowConstructorOptions = {
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: true
        }
      }

      windowManager.createWindow(
        WindowManager.ID_MAIN_WINDOW,
        browerWindowOptions,
        process.env.NODE_ENV !== 'production' ? 'http://{{host}}:{{port}}{{publicPath}}' : format({
          pathname: join(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true
        })
      )
    }
  }

  public windows: Map<string, BrowserWindow>

  public constructor () {
    if (WindowManager._instance) {
      throw new Error('Can not create multiple WindowManager instances.')
    }
    this.windows = new Map()
  }

  public createWindow (name: string, browerWindowOptions: BrowserWindowConstructorOptions, url: string): void {
    if (this.windows.has(name)) {
      throw new Error(`The window named "${name}" exists.`)
    }

    if (!('icon' in browerWindowOptions)) {
      if (process.platform === 'linux') {
        const linuxIcon = join(__dirname, '../../icon/app.png')
        if (existsSync(linuxIcon)) {
          browerWindowOptions.icon = nativeImage.createFromPath(linuxIcon)
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          const iconPath = join(__dirname, `../../../icon/app.${process.platform === 'win32' ? 'ico' : 'icns'}`)
          if (existsSync(iconPath)) {
            browerWindowOptions.icon = nativeImage.createFromPath(iconPath)
          }
        }
      }
    }

    let win: BrowserWindow | null = new BrowserWindow(browerWindowOptions)

    win.on('ready-to-show', function () {
      if (!win) return
      win.show()
      win.focus()
      if (process.env.NODE_ENV !== 'production') win.webContents.openDevTools()
    })

    win.on('closed', () => {
      win = null
      this.windows.delete(name)
    })

    this.windows.set(name, win)

    if (process.env.NODE_ENV === 'production') {
      win.removeMenu ? win.removeMenu() : win.setMenu(null)
    }
    const res = win.loadURL(url)

    if (isPromiseLike(res)) {
      res.catch((err: any) => {
        console.log(err)
      })
    }
  }

  public getWindow (name: string): BrowserWindow {
    if (this.windows.has(name)) {
      return this.windows.get(name) as BrowserWindow
    }
    throw new Error(`The window named "${name} doesn't exists."`)
  }

  public removeWindow (name: string): void {
    if (!this.windows.has(name)) {
      throw new Error(`The window named "${name} doesn't exists."`)
    }
    (this.windows.get(name) as BrowserWindow).close()
  }

  public hasWindow (name: string): boolean {
    return this.windows.has(name)
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  WindowManager.createMainWindow()
})

typeof app.whenReady === 'function' ? app.whenReady().then(main).catch(err => console.log(err)) : app.on('ready', main)

function main (): void {
  WindowManager.createMainWindow()
}
