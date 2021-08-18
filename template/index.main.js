import { app, BrowserWindow, nativeImage, globalShortcut, MenuItem, Menu } from 'electron'
import { format } from 'url'
import { join } from 'path'
import { existsSync } from 'fs'

function isPromiseLike (obj) {
  return (obj instanceof Promise) || (
    obj !== undefined && obj !== null && typeof obj.then === 'function' && typeof obj.catch === 'function'
  )
}

function registerGlobalShortcut () {
  globalShortcut.register('CommandOrControl+Shift+I', function () {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win.webContents.openDevTools()
      }
    }
  })
  if (process.env.NODE_ENV !== 'production') {
    globalShortcut.register('CommandOrControl+R', function () {
      const win = BrowserWindow.getFocusedWindow()
      if (win) {
        win.webContents.reload()
      }
    })
  }
}

function setMacDefaultMenu () {
  if (process.platform === 'darwin') {
    const template = [
      new MenuItem({
        label: app.name,
        submenu: [
          { role: 'quit' }
        ]
      })
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    if (process.env.NODE_ENV !== 'production') {
      const iconPath = join(__dirname, '../../../icon/1024x1024.png')
      if (existsSync(iconPath)) {
        app.dock.setIcon(iconPath)
      }
    }
  }
}

class WindowManager {
  constructor () {
    if (WindowManager._instance) {
      throw new Error('Can not create multiple WindowManager instances.')
    }
    this.windows = new Map()
  }

  createWindow (name, browerWindowOptions, url) {
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

    let win = new BrowserWindow(browerWindowOptions)

    win.on('ready-to-show', function () {
      if (!win) return
      win.show()
      win.focus()
    })

    win.on('closed', () => {
      win = null
      this.windows.delete(name)
    })

    this.windows.set(name, win)

    if (typeof win.removeMenu === 'function') {
      win.removeMenu()
    } else {
      win.setMenu(null)
    }

    const res = win.loadURL(url)

    if (isPromiseLike(res)) {
      res.catch((err) => {
        console.log(err)
      })
    }
  }

  getWindow (name) {
    if (this.windows.has(name)) {
      return this.windows.get(name)
    }
    throw new Error(`The window named "${name} doesn't exists."`)
  }

  removeWindow (name) {
    if (!this.windows.has(name)) {
      throw new Error(`The window named "${name} doesn't exists."`)
    }
    this.windows.get(name).close()
  }

  hasWindow (name) {
    return this.windows.has(name)
  }
}

WindowManager.getInstance = function () {
  if (!WindowManager._instance) {
    WindowManager._instance = new WindowManager()
  }
  return WindowManager._instance
}

WindowManager.ID_MAIN_WINDOW = 'main-window'

WindowManager.createMainWindow = function () {
  const windowManager = WindowManager.getInstance()
  if (!windowManager.hasWindow(WindowManager.ID_MAIN_WINDOW)) {
    const browerWindowOptions = {
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
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

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  WindowManager.createMainWindow()
})

typeof app.whenReady === 'function' ? app.whenReady().then(main).catch(err => console.log(err)) : app.on('ready', main)

function main () {
  registerGlobalShortcut()
  setMacDefaultMenu()
  WindowManager.createMainWindow()
}
