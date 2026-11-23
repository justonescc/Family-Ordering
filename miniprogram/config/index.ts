import { defineConfig, type UserConfigExport } from '@tarojs/cli';

import devConfig from './dev';
import prodConfig from './prod';

// https://taro-docs.jd.com/docs/next/freeze#webpack5
export default defineConfig(async (merge) => {
  const userConfig: UserConfigExport<'webpack5'> = {
    projectName: 'family-ordering-miniprogram',
    date: '2026-11-23',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    // tabBar 图标静态拷贝（app.config 中的 iconPath 相对 sourceRoot）
    copy: {
      patterns: [{ from: 'src/assets/tabbar/', to: 'dist/assets/tabbar/', ignore: ['.*'] }],
      options: {},
    },
    framework: 'react',
    compiler: 'webpack5',
    mini: {
      miniCssExtractPluginOption: {
        ignoreOrder: true,
      },
    },
    h5: {},
  };

  if (process.env.NODE_ENV === 'development') {
    return merge({}, userConfig, devConfig);
  }
  return merge({}, userConfig, prodConfig);
});
