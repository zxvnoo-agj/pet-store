module.exports = {
  mini: {
    urlCheck: false,
  },
  h5: {
    publicPath: './',
  },
  env: {
    NODE_ENV: JSON.stringify('production'),
    TARO_ENV: JSON.stringify('weapp'),
  },
}
