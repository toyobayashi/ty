const path = require('path')
const { getLoaderPath } = require('../util/webpack.js')

function createAssetsLoaders (config) {
  return [
    {
      test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
      use: [
        createUrlLoader('img', config)
      ]
    },
    {
      test: /\.(svg)(\?.*)?$/,
      use: [
        createFileLoader('img', config)
      ]
    },
    {
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      use: [
        createUrlLoader('media', config)
      ]
    },
    {
      test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
      use: [
        createUrlLoader('fonts', config)
      ]
    }
  ]
}

function createUrlLoader (dir, config) {
  return {
    loader: getLoaderPath(config, 'url-loader'),
    options: {
      limit: 4096,
      fallback: createFileLoader(dir, config)
    }
  }
}

function createFileLoader (dir, config) {
  return {
    loader: getLoaderPath(config, 'file-loader'),
    options: {
      name: path.posix.join(config.assetsPath || '', dir, config.out.assets)
    }
  }
}

exports.createAssetsLoaders = createAssetsLoaders
