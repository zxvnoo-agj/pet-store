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
        iconPath: 'assets/tabbar/home.svg',
        selectedIconPath: 'assets/tabbar/home-active.svg',
      },
      {
        pagePath: 'pages/category/index',
        text: '分类',
        iconPath: 'assets/tabbar/category.svg',
        selectedIconPath: 'assets/tabbar/category-active.svg',
      },
      {
        pagePath: 'pages/chat/index',
        text: 'AI助手',
        iconPath: 'assets/tabbar/chat.svg',
        selectedIconPath: 'assets/tabbar/chat-active.svg',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.svg',
        selectedIconPath: 'assets/tabbar/mine-active.svg',
      },
    ],
  },
})
