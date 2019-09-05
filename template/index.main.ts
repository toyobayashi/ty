import { app, BrowserWindow, BrowserWindowConstructorOptions, nativeImage } from 'electron'
import { format } from 'url'
import { join } from 'path'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow () {
  const browerWindowOptions: BrowserWindowConstructorOptions = {
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  }

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

  mainWindow = new BrowserWindow(browerWindowOptions)

  mainWindow.on('ready-to-show', function () {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
    if (process.env.NODE_ENV !== 'production') mainWindow.webContents.openDevTools()
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  if (process.env.NODE_ENV !== 'production') {
    const res: any = mainWindow.loadURL('http://{{host}}:{{port}}{{publicPath}}')

    if (res !== undefined && typeof res.then === 'function' && typeof res.catch === 'function') {
      res.catch((err: Error) => {
        console.log(err)
      })
    }
  } else {
    (mainWindow as any).removeMenu ? (mainWindow as any).removeMenu() : mainWindow.setMenu(null)
    const res: any = mainWindow.loadURL(format({
      pathname: join(__dirname, '../renderer/index.html'),
      protocol: 'file:',
      slashes: true
    }))

    if (res !== undefined && typeof res.then === 'function' && typeof res.catch === 'function') {
      res.catch((err: Error) => {
        console.log(err)
      })
    }
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

// tslint:disable-next-line: strict-type-predicates
typeof (app as any).whenReady === 'function' ? (app as any).whenReady().then(main) : app.on('ready', main)

function main () {
  if (!mainWindow) createWindow()
}
