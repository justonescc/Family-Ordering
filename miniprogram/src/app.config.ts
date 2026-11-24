export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/menu/index',
    'pages/mine/index',
    'pages/summary/index',
    'pages/me/index',
    'pages/admin/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#faf6f1',
    navigationBarTitleText: '家庭点菜',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#7a6d61',
    selectedColor: '#cf4d14',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/menu/index',
        text: '菜单',
        iconPath: 'assets/tabbar/menu.png',
        selectedIconPath: 'assets/tabbar/menu-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的单',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-active.png',
      },
      {
        pagePath: 'pages/summary/index',
        text: '总单',
        iconPath: 'assets/tabbar/summary.png',
        selectedIconPath: 'assets/tabbar/summary-active.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me.png',
        selectedIconPath: 'assets/tabbar/me-active.png',
      },
    ],
  },
});
