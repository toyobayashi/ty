const path = require('path')

function createAssetsLoaders (config) {
  return [
    {
      test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
      type: 'asset',
      generator: {
        filename: path.posix.join(config.assetsPath || '', 'img', config.out.assets)
      }
    },
    {
      test: /\.(svg)(\?.*)?$/,
      type: 'asset/resource',
      generator: {
        filename: path.posix.join(config.assetsPath || '', 'img', config.out.assets)
      }
    },
    {
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      type: 'asset',
      generator: {
        filename: path.posix.join(config.assetsPath || '', 'media', config.out.assets)
      }
    },
    {
      test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
      type: 'asset',
      generator: {
        filename: path.posix.join(config.assetsPath || '', 'fonts', config.out.assets)
      }
    }
  ]
}

exports.createAssetsLoaders = createAssetsLoaders
