/**
 * 删除 entries.json 中含有 video_info 的 tweet 条目
 *
 * 用法: node script/remove-video-entries.js [--dry-run]
 *   --dry-run  仅预览，不写入
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ENTRIES_FILE: path.join(__dirname, '../public/entries.json'),
};

/**
 * 递归检查对象中是否包含指定键
 */
function hasKey(obj, key) {
  if (!obj || typeof obj !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return true;
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      if (hasKey(val, key)) return true;
    }
  }
  return false;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('📖 读取 entries.json...');
  const data = JSON.parse(fs.readFileSync(CONFIG.ENTRIES_FILE, 'utf-8'));
  const entries = data.entries || [];

  const before = entries.length;
  const filtered = entries.filter((entry) => !hasKey(entry, 'video_info'));
  const removed = before - filtered.length;

  data.entries = filtered;
  data.total = filtered.length;

  console.log(`📊 原始条目数: ${before}`);
  console.log(`📊 删除含 video_info 的条目: ${removed}`);
  console.log(`📊 剩余条目数: ${filtered.length}`);

  if (dryRun) {
    console.log('\n⚠️  --dry-run 模式，未写入文件');
    return;
  }

  console.log('\n💾 写入 entries.json...');
  fs.writeFileSync(CONFIG.ENTRIES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✨ 完成');
}

main();
