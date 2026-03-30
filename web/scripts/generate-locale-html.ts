/**
 * 根据 src/config/localeSeo.ts 生成各语言入口 HTML，保证静态 SEO 与运行时一致。
 * 用法：在 web 目录执行 npm run generate:locale-html
 * 生产环境若需 hreflang/canonical 绝对地址，可设置环境变量 VITE_SITE_ORIGIN（如 https://example.com）
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localeSeoConfigs, renderLocaleHtmlDocument } from '../src/config/localeSeo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const siteOrigin = process.env.VITE_SITE_ORIGIN?.trim() || '';

for (const config of localeSeoConfigs) {
  const html = renderLocaleHtmlDocument(config, { siteOrigin });
  writeFileSync(resolve(webRoot, config.filename), html, 'utf8');
}

console.log(`Generated ${localeSeoConfigs.length} locale HTML files under ${webRoot}`);
