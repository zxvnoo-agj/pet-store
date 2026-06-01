const { UnifiedWebpackPluginV5 } = require('weapp-tailwindcss/webpack')

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
  defineConstants: {},
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
