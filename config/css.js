const merge = require('deepmerge')
const wrapPlugin = require('../util/plugin.js')
const { getLoaderPath, getPluginImplementation } = require('../util/webpack.js')

function createCssLoaders (wc, config, importLoaders = 0) {
  const cssLoaderOptions = {
    modules: {
      auto: true,
      localIdentName: config.mode === 'production' ? '[hash:base64]' : '[path][name]__[local]'
    },
    importLoaders: (wc._usePostCss ? 1 : 0) + importLoaders
  }

  const MiniCssExtractPlugin = wrapPlugin('MiniCssExtractPlugin', getPluginImplementation(config, 'mini-css-extract-plugin'))

  return [
    wc._extractCss
      ? { loader: MiniCssExtractPlugin.loader }
      : { loader: getLoaderPath(config, 'style-loader') },
    {
      loader: getLoaderPath(config, 'css-loader'),
      options: merge(cssLoaderOptions, (typeof config.cssLoaderOptions === 'object' && config.cssLoaderOptions !== null) ? config.cssLoaderOptions : {})
    },
    ...(wc._usePostCss ? [createPostCssLoader(config)] : [])
  ]
}

function createPostCssLoader (config) {
  return {
    loader: getLoaderPath(config, 'postcss-loader'),
    ...((typeof config.postcssLoaderOptions === 'object' && config.postcssLoaderOptions !== null) ? { options: config.postcssLoaderOptions } : {})
  }
}

function createStylusLoader (config) {
  return {
    loader: getLoaderPath(config, 'stylus-loader'),
    ...((typeof config.stylusLoaderOptions === 'object' && config.stylusLoaderOptions !== null) ? { options: config.stylusLoaderOptions } : {})
  }
}

function createLessLoader (config) {
  return {
    loader: getLoaderPath(config, 'less-loader'),
    ...((typeof config.lessLoaderOptions === 'object' && config.lessLoaderOptions !== null) ? { options: config.lessLoaderOptions } : {})
  }
}

function createSassLoader (config) {
  return {
    loader: getLoaderPath(config, 'sass-loader'),
    ...((typeof config.sassLoaderOptions === 'object' && config.sassLoaderOptions !== null) ? { options: config.sassLoaderOptions } : {})
  }
}

function createStyleLoaders (wc, config) {
  return [
    {
      test: /\.css$/,
      use: createCssLoaders(wc, config, 0)
    },
    ...(wc._useStylus
      ? [{
          test: /\.styl(us)?$/,
          use: [
            ...(createCssLoaders(wc, config, 1)),
            createStylusLoader(config)
          ]
        }]
      : []),
    ...(wc._useLess
      ? [{
          test: /\.less$/,
          use: [
            ...(createCssLoaders(wc, config, 1)),
            createLessLoader(config)
          ]
        }]
      : []),
    ...(wc._useSass
      ? [{
          test: /\.s[ac]ss$/i,
          use: [
            ...(createCssLoaders(wc, config, 1)),
            createSassLoader(config)
          ]
        }]
      : [])
  ]
}

function cssExtract (wc, config) {
  const MiniCssExtractPlugin = wrapPlugin('MiniCssExtractPlugin', getPluginImplementation(config, 'mini-css-extract-plugin'))
  return (wc._extractCss ? [new MiniCssExtractPlugin({ filename: config.out.css })] : [])
}

exports.createCssLoaders = createCssLoaders
exports.createPostCssLoader = createPostCssLoader
exports.createStylusLoader = createStylusLoader
exports.createLessLoader = createLessLoader
exports.createSassLoader = createSassLoader
exports.createStyleLoaders = createStyleLoaders
exports.cssExtract = cssExtract
