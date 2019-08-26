const packager = require('electron-packager')
const path = require('path')
const fs = require('fs-extra')
const { execSync, spawn } = require('child_process')
const crossZip = require('cross-zip')
const { createPackageWithOptions } = require('asar')
const build = require('./build.js')
const WebpackConfig = require('../config/webpack.config.js')
const getPath = require('../util/path.js')
const Log = require('../util/log.js')

const pkg = require(getPath('package.json'))

function isUuid4 (str) {
  const reg = /[0123456789ABCDEF]{8}-[0123456789ABCDEF]{4}-4[0123456789ABCDEF]{3}-[89AB][0123456789ABCDEF]{3}-[0123456789ABCDEF]{12}/
  return reg.test(str)
}

async function rename (appPath) {
  let dirName = path.basename(appPath).split('-')
  dirName.splice(1, 0, `v${pkg.version}`)
  dirName = dirName.join('-')
  const newPath = path.join(path.dirname(appPath), dirName)
  if (fs.existsSync(newPath)) {
    Log.warn(`Overwriting ${newPath} `)
    await fs.remove(newPath)
  }
  await fs.rename(appPath, newPath)
  return newPath
}

function zip (source, target) {
  if (!fs.existsSync(path.dirname(target))) fs.mkdirsSync(path.dirname(target))
  return new Promise((resolve, reject) => {
    crossZip.zip(source, target, (err) => {
      if (err) {
        reject(err)
        return
      }
      fs.stat(target, (err, stat) => {
        if (err) {
          reject(err)
          return
        }
        if (!stat.isFile()) {
          reject(new Error('Zip failed.'))
          return
        }
        resolve(stat.size)
      })
    })
  })
}

function createDebInstaller (appPath, config, webpackConfig) {
  const distRoot = path.dirname(appPath)
  const icon = {
    '16x16': getPath(config.iconSrcDir, '16x16.png'),
    '24x24': getPath(config.iconSrcDir, '24x24.png'),
    '32x32': getPath(config.iconSrcDir, '32x32.png'),
    '48x48': getPath(config.iconSrcDir, '48x48.png'),
    '64x64': getPath(config.iconSrcDir, '64x64.png'),
    '128x128': getPath(config.iconSrcDir, '128x128.png'),
    '256x256': getPath(config.iconSrcDir, '256x256.png'),
    '512x512': getPath(config.iconSrcDir, '512x512.png'),
    '1024x1024': getPath(config.iconSrcDir, '1024x1024.png')
  }
  fs.mkdirsSync(path.join(distRoot, '.tmp/DEBIAN'))
  fs.writeFileSync(
    path.join(distRoot, '.tmp/DEBIAN/control'),
    `Package: ${pkg.name}
Version: ${pkg.version}-${Math.round(new Date().getTime() / 1000)}
Section: utility
Priority: optional
Architecture: ${config.arch === 'x64' ? 'amd64' : 'i386'}
Depends: kde-cli-tools | kde-runtime | trash-cli | libglib2.0-bin | gvfs-bin, libgconf-2-4, libgtk-3-0 (>= 3.10.0), libnotify4, libnss3 (>= 2:3.26), libxtst6, xdg-utils
Installed-Size: ${getDirectorySizeSync(appPath)}
Maintainer: ${webpackConfig.productionPackage.author}
Homepage: https://github.com/${webpackConfig.productionPackage.author}/${pkg.name}
Description: ${pkg.description}
`)

  fs.mkdirsSync(path.join(distRoot, '.tmp/usr/share/applications'))
  fs.writeFileSync(
    path.join(distRoot, `.tmp/usr/share/applications/${pkg.name}.desktop`),
    `[Desktop Entry]
Name=${pkg.name}
Comment=${pkg.description}
GenericName=Utility
Exec=/usr/share/${pkg.name}/${pkg.name}
Icon=${pkg.name}
Type=Application
StartupNotify=true
Categories=Utility;
`)

  for (const size in icon) {
    fs.mkdirsSync(path.join(distRoot, `.tmp/usr/share/icons/hicolor/${size}/apps`))
    fs.copySync(icon[size], path.join(distRoot, `.tmp/usr/share/icons/hicolor/${size}/apps/${pkg.name}.png`))
  }
  fs.copySync(appPath, path.join(distRoot, `.tmp/usr/share/${pkg.name}`))

  execSync(`dpkg -b ./.tmp ./${pkg.name}-v${pkg.version}-linux-${config.arch}.deb`, { cwd: distRoot, stdio: 'inherit' })
  fs.removeSync(path.join(distRoot, '.tmp'))
}

function getDirectorySizeSync (dir) {
  const ls = fs.readdirSync(dir)
  let size = 0
  for (let i = 0; i < ls.length; i++) {
    const item = path.join(dir, ls[i])
    const stat = fs.statSync(item)
    if (stat.isDirectory()) {
      size += getDirectorySizeSync(item)
    } else {
      size += stat.size
    }
  }
  return size
}

async function createAsarApp (root, webpackConfig) {
  const distResourcesDir = path.dirname(webpackConfig.packagerConfig.prebuiltAsar)
  if (fs.existsSync(distResourcesDir)) fs.removeSync(distResourcesDir)
  await createPackageWithOptions(root, webpackConfig.packagerConfig.prebuiltAsar, { unpack: '*.node' })
}

async function copyExtraResources (root, config) {
  const ls = (await fs.readdir(getPath(config.resourcesPath))).filter(item => (item !== 'app' && item !== '.gitkeep'))
  await Promise.all(ls.map(item => {
    return fs.copy(getPath(config.resourcesPath, item), getPath(config.distPath, 'resources', item))
  }))
  await fs.copy(getPath(config.distPath, 'resources'), path.join(root, '..'))
}

async function zipResourcesDir (webpackConfig, config) {
  const distResourcesDir = path.dirname(webpackConfig.packagerConfig.prebuiltAsar)
  await zip(distResourcesDir, getPath(config.distPath, `resources-v${webpackConfig.productionPackage.version}-${process.platform}-${config.arch}.zip`))
}

function inno (sourceDir, config) {
  return new Promise((resolve, reject) => {
    if (!isUuid4(config.inno.appid)) {
      reject(new Error('Please specify [config.inno.appid] in script/config.ts to generate windows installer.'))
      return
    }
    const def = {
      Name: pkg.name,
      Version: pkg.version,
      Publisher: pkg.author,
      URL: config.inno.url || pkg.name,
      AppId: config.arch === 'ia32' ? `{{${config.inno.appid.ia32}}` : `{{${config.inno.appid.x64}}`,
      OutputDir: getPath(config.distPath),
      SetupIconFile: getPath(config.iconSrcDir, 'app.ico'),
      Arch: config.arch,
      RepoDir: getPath('..'),
      SourceDir: sourceDir,
      ArchitecturesAllowed: config.arch === 'ia32' ? '' : 'x64',
      ArchitecturesInstallIn64BitMode: config.arch === 'ia32' ? '' : 'x64'
    }
    spawn('ISCC.exe',
      [
        '/Q',
        ...Object.keys(def).map(k => `/D${k}=${def[k]}`),
        config.inno.src ? path.join(__dirname, '../script/inno.iss') : config.inno.src
      ],
      { cwd: getPath(), stdio: 'inherit' }
    )
      .on('error', reject)
      .on('exit', resolve)
  })
}

async function pack (config) {
  const webpackConfig = new WebpackConfig(config)
  const start = new Date().getTime()

  Log.info('Bundle production code...')
  await build(config)

  const resourceAppRoot = getPath(config.resourcesPath, 'app')
  Log.info('Write production package.json...')
  fs.writeFileSync(path.join(resourceAppRoot, 'package.json'), JSON.stringify(webpackConfig.productionPackage), 'utf8')

  Log.info('Install production dependencies...')
  execSync(`npm install --no-package-lock --production --arch=${config.arch} --target_arch=${config.arch} --build-from-source --runtime=electron --target=${pkg.devDependencies.electron} --disturl=https://electronjs.org/headers`, { cwd: resourceAppRoot, stdio: 'inherit' })
  fs.writeFileSync(path.join(resourceAppRoot, 'package.json'), JSON.stringify(webpackConfig.productionPackage), 'utf8')

  Log.info('Make app.asar...')
  await createAsarApp(resourceAppRoot, webpackConfig)

  Log.print('')
  const [appPath] = await packager(webpackConfig.packagerConfig)
  const root = process.platform === 'darwin' ? path.join(appPath, `${pkg.name}.app/Contents/Resources/app`) : path.join(appPath, 'resources/app')
  await copyExtraResources(root, config)

  Log.info('Zip resources...')
  await zipResourcesDir(webpackConfig, config)

  const newPath = await rename(appPath)

  Log.info(`Zip ${newPath}...`)
  const size = await zip(newPath, newPath + '.zip')
  Log.info(`Total size of zip: ${size} Bytes`)

  if (process.platform === 'linux') {
    Log.info('Create .deb installer...')
    createDebInstaller(newPath, config, webpackConfig)
  }

  if (process.platform === 'win32') {
    Log.info('Create inno-setup installer...')
    try {
      await inno(newPath, config)
    } catch (err) {
      Log.warn(`${err.message}`)
    }
  }

  const s = (new Date().getTime() - start) / 1000
  Log.info(`Done in ${s} seconds.`)
}

module.exports = pack
