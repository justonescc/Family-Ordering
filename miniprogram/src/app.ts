import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';

import { getAuth } from './stores/auth';

import './app.scss';

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    const { token, family } = getAuth();
    // eslint-disable-next-line no-console
    console.log(
      '[app] onLaunch',
      token ? (family ? '已登录并进入家庭' : '已登录未进入家庭') : '未登录',
    );
  });

  // children 是当前页面组件，由 Taro runtime 渲染
  return children;
}

export default App;
