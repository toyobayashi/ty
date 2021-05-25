const packager = require('electron-packager')
const path = require('path')
const fs = require('fs-extra')
const { execSync, spawn } = require('child_process')
const crossZip = require('@tybys/cross-zip')
const { pnm } = require('@tybys/prune-node-modules')
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
  return crossZip.zip(source, target, false)
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

async function createAsarApp (root, webpackConfig, config) {
  const distResourcesDir = path.dirname(webpackConfig.packagerConfig.prebuiltAsar)
  if (fs.existsSync(distResourcesDir)) fs.removeSync(distResourcesDir)
  fs.mkdirsSync(distResourcesDir)
  if (config.nodeModulesAsar) {
    const nodeModulesPath = path.join(root, 'node_modules')
    if (fs.existsSync(nodeModulesPath)) {
      await createPackageWithOptions(nodeModulesPath, path.join(distResourcesDir, 'node_modules.asar'), config.asarOptions)
      await fs.remove(nodeModulesPath)
    }
  }
  await createPackageWithOptions(root, webpackConfig.packagerConfig.prebuiltAsar, config.asarOptions)
}

async function copyExtraResources (root, config, webpackConfig) {
  const extraResourcesPath = webpackConfig.pathUtil.getPath(config.extraResourcesPath)
  if (!fs.existsSync(extraResourcesPath)) return
  const ls = (await fs.readdir(extraResourcesPath)).filter(item => (item !== '.gitkeep'))
  await Promise.all(ls.map(item => {
    return fs.copy(webpackConfig.pathUtil.getPath(config.extraResourcesPath, item), webpackConfig.pathUtil.getPath(config.distPath, 'resources', item))
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
      Publisher: typeof webpackConfig.pkg.author === 'object' ? webpackConfig.pkg.author.name : webpackConfig.pkg.author,
      URL: config.inno.url || webpackConfig.pkg.name,
      AppId: config.arch === 'ia32' ? `{{${config.inno.appid.ia32}}` : `{{${config.inno.appid.x64}}`,
      OutputDir: webpackConfig.pathUtil.getPath(config.distPath),
      SetupIconFile: webpackConfig.pathUtil.getPath(config.iconSrcDir, 'app.ico'),
      Arch: config.arch,
      // RepoDir: webpackConfig.pathUtil.getPath(),
      SourceDir: sourceDir,
      ArchitecturesAllowed: config.arch === 'ia32' ? '' : 'x64',
      ArchitecturesInstallIn64BitMode: config.arch === 'ia32' ? '' : 'x64',
      ...(Object.prototype.toString.call(config.inno.def) === '[object Object]' ? config.inno.def : {})
    }
    spawn('ISCC.exe',
      [
        '/Q',
        ...Object.keys(def).map(k => `/D${k}=${def[k]}`),
        config.inno.src ? config.inno.src : path.join(__dirname, '../script/inno.iss')
      ],
      { cwd: webpackConfig.pathUtil.getPath(), stdio: 'inherit' }
    )
      .on('error', reject)
      .on('exit', resolve)
  })
}

async function callPackHook (config, hookName, ...args) {
  if (config.packHook && typeof config.packHook[hookName] === 'function') {
    Log.info(`Running config.packHook.${hookName}...`)
    await Promise.resolve(config.packHook[hookName](config, ...args))
  }
}

async function pack (config) {
  if (config.target !== 'electron') {
    const chalk = require('chalk')
    console.error(chalk.redBright(`This command does not support ${config.target} target`))
    process.exit(1)
  }

  const webpackConfig = new WebpackConfig(config)
  const start = new Date().getTime()

  await callPackHook(config, 'beforeBuild')
  Log.info('Bundle production code...')
  await build(config)

  const packTempAppDir = webpackConfig.pathUtil.getPath(config.packTempAppDir)
  const buildCopyPath = {
    main: [webpackConfig.pathUtil.getPath(config.output.main), path.join(packTempAppDir, path.basename(config.output.main))],
    renderer: [webpackConfig.pathUtil.getPath(config.output.renderer), path.join(packTempAppDir, path.basename(config.output.renderer))],
    ...(config.entry.preload ? {
      preload: [webpackConfig.pathUtil.getPath(config.output.preload), path.join(packTempAppDir, path.basename(config.output.preload))]
    } : {})
  }

  if (fs.existsSync(packTempAppDir)) fs.removeSync(packTempAppDir)
  fs.mkdirsSync(packTempAppDir)

  await callPackHook(config, 'beforeBuildCopy', buildCopyPath)
  fs.copySync(buildCopyPath.main[0], buildCopyPath.main[1])
  fs.copySync(buildCopyPath.renderer[0], buildCopyPath.renderer[1])
  if (config.entry.preload) {
    fs.copySync(buildCopyPath.preload[0], buildCopyPath.preload[1])
  }

  const pkg = (await callPackHook(config, 'beforeWritePackageJson', webpackConfig.productionPackage)) || webpackConfig.productionPackage
  Log.info('Write production package.json...')
  fs.writeFileSync(path.join(packTempAppDir, 'package.json'), JSON.stringify(pkg), 'utf8')

  const existNodeModules = fs.existsSync(path.join(packTempAppDir, 'node_modules'))

  if (existNodeModules) {
    Log.warn('Remove node_modules cache...')
    try {
      await fs.remove(path.join(packTempAppDir, 'node_modules'))
    } catch (err) {
      Log.error(err.message)
    }
  }

  await callPackHook(config, 'beforeInstall', packTempAppDir)

  if (webpackConfig.productionPackage.dependencies && Object.keys(webpackConfig.productionPackage.dependencies).length) {
    Log.info('Install production dependencies...')
    execSync(`npm install --no-save --no-package-lock --production --arch=${config.arch} --target_arch=${config.arch} --build-from-source --runtime=electron --target=${webpackConfig.pkg.devDependencies.electron.replace(/[~^]/g, '')} --disturl=https://electronjs.org/headers`, { cwd: packTempAppDir, stdio: 'inherit' })
    fs.writeFileSync(path.join(packTempAppDir, 'package.json'), JSON.stringify(webpackConfig.productionPackage), 'utf8')
  }

  await callPackHook(config, 'afterInstall', packTempAppDir)
  if (Object.prototype.toString.call(config.prune) === '[object Object]') {
    Log.info('Prune node_modules...')
    pnm(packTempAppDir, config.prune)
  }

  Log.info('Make app.asar...')
  await createAsarApp(packTempAppDir, webpackConfig, config)

  Log.print('')
  const [appPath] = await packager(webpackConfig.packagerConfig)
  const root = process.platform === 'darwin' ? path.join(appPath, `${webpackConfig.pkg.name}.app/Contents/Resources/app`) : path.join(appPath, 'resources/app')
  const unpackedName = path.basename(webpackConfig.packagerConfig.prebuiltAsar) + '.unpacked'
  const unpacked = path.join(path.dirname(webpackConfig.packagerConfig.prebuiltAsar), unpackedName)
  if (fs.existsSync(unpacked)) {
    fs.copySync(unpacked, path.join(root, '..', unpackedName))
  }
  await copyExtraResources(root, config, webpackConfig)

  Log.info('Zip resources...')
  await zipResourcesDir(webpackConfig, config)
  await callPackHook(config, 'beforeZip', root)

  const newPath = await rename(appPath, webpackConfig)

  Log.info(`Zip ${newPath}...`)
  const size = await zip(newPath, newPath + '.zip')
  Log.info(`Total size of zip: ${size} Bytes`)

  await callPackHook(config, 'afterZip', newPath + '.zip')

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
