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
    'pages/mine/pets',
    'pages/mine/pets-create',
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
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/category/index',
        text: '分类',
        iconPath: 'assets/tabbar/category.png',
        selectedIconPath: 'assets/tabbar/category-active.png',
      },
      {
        pagePath: 'pages/chat/index',
        text: 'AI助手',
        iconPath: 'assets/tabbar/ai-assistant.png',
        selectedIconPath: 'assets/tabbar/ai-assistant-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-active.png',
      },
    ],
  },
})
