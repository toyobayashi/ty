const packager = require('electron-packager')
const path = require('path')
const fs = require('fs-extra')
const { execSync, spawn } = require('child_process')
const crossZip = require('cross-zip')
const { createPackageWithOptions } = require('asar')
const build = require('./build.js')
const WebpackConfig = require('../config/webpack.config.js')
const Log = require('../util/log.js')

function isUuid4 (str) {
  const reg = /[0123456789ABCDEF]{8}-[0123456789ABCDEF]{4}-4[0123456789ABCDEF]{3}-[89AB][0123456789ABCDEF]{3}-[0123456789ABCDEF]{12}/
  return reg.test(str)
}

async function rename (appPath, webpackConfig) {
  let dirName = path.basename(appPath).split('-')
  dirName.splice(1, 0, `v${webpackConfig.pkg.version}`)
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
    '16x16': webpackConfig.pathUtil.getPath(config.iconSrcDir, '16x16.png'),
    '24x24': webpackConfig.pathUtil.getPath(config.iconSrcDir, '24x24.png'),
    '32x32': webpackConfig.pathUtil.getPath(config.iconSrcDir, '32x32.png'),
    '48x48': webpackConfig.pathUtil.getPath(config.iconSrcDir, '48x48.png'),
    '64x64': webpackConfig.pathUtil.getPath(config.iconSrcDir, '64x64.png'),
    '128x128': webpackConfig.pathUtil.getPath(config.iconSrcDir, '128x128.png'),
    '256x256': webpackConfig.pathUtil.getPath(config.iconSrcDir, '256x256.png'),
    '512x512': webpackConfig.pathUtil.getPath(config.iconSrcDir, '512x512.png'),
    '1024x1024': webpackConfig.pathUtil.getPath(config.iconSrcDir, '1024x1024.png')
  }
  fs.mkdirsSync(path.join(distRoot, '.tmp/DEBIAN'))
  fs.writeFileSync(
    path.join(distRoot, '.tmp/DEBIAN/control'),
    `Package: ${webpackConfig.pkg.name}
Version: ${webpackConfig.pkg.version}-${Math.round(new Date().getTime() / 1000)}
Section: utility
Priority: optional
Architecture: ${config.arch === 'x64' ? 'amd64' : 'i386'}
Depends: kde-cli-tools | kde-runtime | trash-cli | libglib2.0-bin | gvfs-bin, libgconf-2-4, libgtk-3-0 (>= 3.10.0), libnotify4, libnss3 (>= 2:3.26), libxtst6, xdg-utils
Installed-Size: ${getDirectorySizeSync(appPath)}
Maintainer: ${webpackConfig.productionPackage.author}
Homepage: https://github.com/${webpackConfig.productionPackage.author}/${webpackConfig.pkg.name}
Description: ${webpackConfig.pkg.description}
`)

  fs.mkdirsSync(path.join(distRoot, '.tmp/usr/share/applications'))
  fs.writeFileSync(
    path.join(distRoot, `.tmp/usr/share/applications/${webpackConfig.pkg.name}.desktop`),
    `[Desktop Entry]
Name=${webpackConfig.pkg.name}
Comment=${webpackConfig.pkg.description}
GenericName=Utility
Exec=/usr/share/${webpackConfig.pkg.name}/${webpackConfig.pkg.name}
Icon=${webpackConfig.pkg.name}
Type=Application
StartupNotify=true
Categories=Utility;
`)

  for (const size in icon) {
    fs.mkdirsSync(path.join(distRoot, `.tmp/usr/share/icons/hicolor/${size}/apps`))
    fs.copySync(icon[size], path.join(distRoot, `.tmp/usr/share/icons/hicolor/${size}/apps/${webpackConfig.pkg.name}.png`))
  }
  fs.copySync(appPath, path.join(distRoot, `.tmp/usr/share/${webpackConfig.pkg.name}`))

  execSync(`dpkg -b ./.tmp ./${webpackConfig.pkg.name}-v${webpackConfig.pkg.version}-linux-${config.arch}.deb`, { cwd: distRoot, stdio: 'inherit' })
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

async function copyExtraResources (root, config, webpackConfig) {
  const ls = (await fs.readdir(webpackConfig.pathUtil.getPath(config.resourcesPath))).filter(item => (item !== 'app' && item !== '.gitkeep'))
  await Promise.all(ls.map(item => {
    return fs.copy(webpackConfig.pathUtil.getPath(config.resourcesPath, item), webpackConfig.pathUtil.getPath(config.distPath, 'resources', item))
  }))
  await fs.copy(webpackConfig.pathUtil.getPath(config.distPath, 'resources'), path.join(root, '..'))
}

async function zipResourcesDir (webpackConfig, config) {
  const distResourcesDir = path.dirname(webpackConfig.packagerConfig.prebuiltAsar)
  await zip(distResourcesDir, webpackConfig.pathUtil.getPath(config.distPath, `resources-v${webpackConfig.productionPackage.version}-${process.platform}-${config.arch}.zip`))
}

function inno (sourceDir, config, webpackConfig) {
  return new Promise((resolve, reject) => {
    if (!isUuid4(config.inno.appid[config.arch])) {
      reject(new Error(`Please specify [module.exports.inno.appid.${config.arch}] in tyconfig.js to generate windows installer.`))
      return
    }
    const def = {
      Name: webpackConfig.pkg.name,
      Version: webpackConfig.pkg.version,
      Publisher: webpackConfig.pkg.author,
      URL: config.inno.url || webpackConfig.pkg.name,
      AppId: config.arch === 'ia32' ? `{{${config.inno.appid.ia32}}` : `{{${config.inno.appid.x64}}`,
      OutputDir: webpackConfig.pathUtil.getPath(config.distPath),
      SetupIconFile: webpackConfig.pathUtil.getPath(config.iconSrcDir, 'app.ico'),
      Arch: config.arch,
      RepoDir: webpackConfig.pathUtil.getPath('..'),
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
      { cwd: webpackConfig.pathUtil.getPath(), stdio: 'inherit' }
    )
      .on('error', reject)
      .on('exit', resolve)
  })
}

async function pack (config) {
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright('This command does not support web target'))
    process.exit(1)
  }

  const webpackConfig = new WebpackConfig(config)
  const start = new Date().getTime()

  Log.info('Bundle production code...')
  await build(config)

  const resourceAppRoot = webpackConfig.pathUtil.getPath(config.resourcesPath, 'app')
  Log.info('Write production package.json...')
  fs.writeFileSync(path.join(resourceAppRoot, 'package.json'), JSON.stringify(webpackConfig.productionPackage), 'utf8')

  Log.info('Install production dependencies...')
  execSync(`npm install --no-package-lock --production --arch=${config.arch} --target_arch=${config.arch} --build-from-source --runtime=electron --target=${webpackConfig.pkg.devDependencies.electron} --disturl=https://electronjs.org/headers`, { cwd: resourceAppRoot, stdio: 'inherit' })
  fs.writeFileSync(path.join(resourceAppRoot, 'package.json'), JSON.stringify(webpackConfig.productionPackage), 'utf8')

  Log.info('Make app.asar...')
  await createAsarApp(resourceAppRoot, webpackConfig)

  Log.print('')
  const [appPath] = await packager(webpackConfig.packagerConfig)
  const root = process.platform === 'darwin' ? path.join(appPath, `${webpackConfig.pkg.name}.app/Contents/Resources/app`) : path.join(appPath, 'resources/app')
  await copyExtraResources(root, config, webpackConfig)

  Log.info('Zip resources...')
  await zipResourcesDir(webpackConfig, config)

  const newPath = await rename(appPath, webpackConfig)

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
      await inno(newPath, config, webpackConfig)
    } catch (err) {
      Log.warn(`${err.message}`)
    }
  }

  const s = (new Date().getTime() - start) / 1000
  Log.info(`Done in ${s} seconds.`)
}

module.exports = pack
