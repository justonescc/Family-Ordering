import Taro from '@tarojs/taro';

/**
 * 菜品图片：选图 → 压缩 → base64 dataURL。
 * 后端 imageUrlSchema 允许 data:image/jpeg|png|webp;base64，长度上限 300000 字符（约 220KB 原图）。
 */

const MAX_DATAURL_LEN = 280_000; // 留一点余量

async function readAsDataUrl(filePath: string): Promise<string> {
  const fsm = Taro.getFileSystemManager();
  const base64 = await new Promise<string>((resolve, reject) => {
    fsm.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data as string),
      fail: reject,
    });
  });
  return `data:image/jpeg;base64,${base64}`;
}

/** 选一张图（微信侧先做一级压缩），返回可直接作为 imageUrl 的 dataURL；取消选择返回 null */
export async function pickDishImage(): Promise<string | null> {
  const choose = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] });
  if (!choose.tempFilePaths?.length) return null;
  let filePath = choose.tempFilePaths[0];

  let dataUrl = await readAsDataUrl(filePath);
  if (dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;

  // 超限：微信压缩后再试
  const compressed = await Taro.compressImage({ src: filePath, quality: 60 });
  filePath = compressed.tempFilePath;
  dataUrl = await readAsDataUrl(filePath);
  if (dataUrl.length <= MAX_DATAURL_LEN) return dataUrl;

  // 仍超限：再压一次（更低质量）
  const compressed2 = await Taro.compressImage({ src: compressed.tempFilePath, quality: 30 });
  dataUrl = await readAsDataUrl(compressed2.tempFilePath);
  if (dataUrl.length > MAX_DATAURL_LEN) {
    throw new Error('图片过大，请换一张较小的图片');
  }
  return dataUrl;
}
