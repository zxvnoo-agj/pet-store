const { UnifiedWebpackPluginV5 } = require('weapp-tailwindcss/webpack')

const isProd = process.env.NODE_ENV === 'production'
const isWeapp = process.env.TARO_ENV === 'weapp'
const PROD_API_BASE_URL = 'https://api.pawpalai.cn/v1'
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8001/v1'
const apiBaseUrl = process.env.TARO_API_BASE_URL || (
  isProd || isWeapp ? PROD_API_BASE_URL : LOCAL_API_BASE_URL
)

const config = {
  projectName: 'pet-shop-mp',
  date: '2026-5-11',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {
    __API_BASE_URL__: JSON.stringify(apiBaseUrl),
  },
  alias: {
    '@': require('path').resolve(__dirname, '..', 'src')
  },
  copy: {
    patterns: [
      { from: 'project.config.json', to: 'project.config.json' },
    ],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false
  },
  mini: {
    // Bundle size optimization
    optimizeMainPackage: {
      enable: false,
    },
    // Code splitting for subpackages
    subPackages: {
      enable: false,
    },
    // Disable prebundle to fix "page instance not found" error
    prebundle: {
      enable: false,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
    },
    webpackChain(chain, webpack) {
      chain.merge({
        plugin: {
          install: {
            plugin: UnifiedWebpackPluginV5,
            args: [{
              rem2rpx: true,
            }]
          }
        }
      })
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    esnextModules: ['nutui-react'],
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      }
    },
    devServer: {
      static: {
        directory: require('path').resolve(__dirname, '..')
      }
    },
    webpackChain(chain) {
      chain.module.rule('js').resolve.set('fullySpecified', false)
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
