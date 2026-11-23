module.exports = {
  plugins: {
    // 不使用 px -> vw：375 基准的等比换算会让桌面端整体放大、max-width 限宽失效，
    // 而移动端 375/390 下固定 px 与换算值差异不足 4%。改用固定 px + 容器 max-width 居中。
    // 'postcss-px-to-viewport': {
    //   viewportWidth: 375,
    //   unitToConvert: 'px',
    //   viewportUnit: 'vw',
    //   selectorBlackList: ['.ignore-vw'],
    //   minPixelValue: 2,
    //   exclude: [/node_modules/],
    // },
  },
};
