import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

/**
 * 小程序自动上传（微信开发者工具 CLI）：
 *   npm run deploy              # 构建 + 上传（版本号取 package.json）
 *   npm run deploy -- 1.0.3     # 构建上传 + 指定版本号
 *   npm run upload -- 1.0.3 ... # 跳过构建直接上传
 *
 * 依赖：开发者工具运行中且已开启「服务端口」（设置 → 安全设置）。
 * 不走上传密钥，因此不受 mp 后台 IP 白名单限制。
 * 上传后需在 mp 后台「版本管理」将新开发版本设为体验版（微信未开放 API）。
 */

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, '../package.json'), 'utf8'));
const version = process.argv[2] || pkg.version;
const desc = process.argv[3] || `自动化部署 ${new Date().toLocaleString('zh-CN')}`;
const distPath = resolve(root, '../dist');
const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';

if (!existsSync(cliPath)) {
  console.error('❌ 未找到微信开发者工具 CLI（仅支持 macOS + 默认安装路径）');
  process.exit(1);
}
if (!existsSync(resolve(distPath, 'app.json'))) {
  console.error('❌ dist/app.json 不存在，请先执行 npm run build:weapp');
  process.exit(1);
}
const sizeKb = (statSync(resolve(distPath, 'app.js')).size / 1024).toFixed(0);

console.log(`开始上传：v${version}（dist 主包入口 ${sizeKb}KB）…`);
const result = spawnSync(cliPath, [
  'upload',
  '--project', distPath,
  '--version', version,
  '--desc', desc,
], { stdio: 'pipe', encoding: 'utf8', timeout: 180000 });

if (result.status !== 0 || /error|✖/i.test(result.stderr + result.stdout)) {
  const log = (result.stdout + result.stderr).trim();
  console.error('❌ 上传失败：');
  console.error(log.includes('服务端口') ? '   开发者工具未运行或未开启服务端口（设置 → 安全设置 → 服务端口）' : log.slice(-800));
  process.exit(1);
}
console.log('✅ 上传成功');
console.log(`   版本: ${version}`);
console.log('ℹ️  下一步：mp 后台 → 版本管理 → 开发版本 → 选为体验版（微信未开放 API，需手动）');
