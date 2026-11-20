module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      unitToConvert: 'px',
      viewportUnit: 'vw',
      selectorBlackList: ['.ignore-vw'],
      minPixelValue: 2,
      // antd-mobile 自身已做移动端适配，不参与转换
      exclude: [/node_modules/],
    },
  },
};
