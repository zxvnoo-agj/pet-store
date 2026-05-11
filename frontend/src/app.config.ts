export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/category/index',
    'pages/product/list',
    'pages/product/detail',
    'pages/chat/index',
    'pages/chat/list',
    'pages/product/compare',
    'pages/search/index',
    'pages/mine/index',
    'pages/mine/favorites',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '宠物用品助手',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999',
    selectedColor: '#FF6B6B',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
      },
      {
        pagePath: 'pages/category/index',
        text: '分类',
      },
      {
        pagePath: 'pages/chat/index',
        text: 'AI助手',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
      },
    ],
  },
})
