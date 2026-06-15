module.exports = {
  mini: {
    urlCheck: true,
  },
  h5: {
    publicPath: './',
  },
  env: {
    NODE_ENV: JSON.stringify('production'),
    TARO_ENV: JSON.stringify('weapp'),
  },
}
