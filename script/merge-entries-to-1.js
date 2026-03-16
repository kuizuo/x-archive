/**
 * 遍历 entries-1.json，将其中在 entries.json 中不存在的 entry，
 * 按 legacy.created_at 时间顺序插入到 entries.json 的合适位置
 *
 * 用法: node script/merge-entries-to-1.js [--dry-run]
 *   --dry-run  仅预览，不写入
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ENTRIES_FILE: path.join(__dirname, '../public/entries.json'),
  ENTRIES_1_FILE: path.join(__dirname, '../public/entries-1.json'),
};

/**
 * 从 entry 中提取 legacy.created_at 时间戳（毫秒）
 * 路径: content.itemContent.tweet_results.result.legacy.created_at
 * 格式: "Thu Apr 03 06:43:07 +0000 2025"
 */
function getCreatedAtMs(entry) {
  const itemContent = entry?.content?.itemContent;
  if (!itemContent) return null;

  let result = itemContent.tweet_results?.result;
  if (!result) return null;

  // 处理可能的 result.result 嵌套（如 quoted）
  if (result.result) result = result.result;

  const createdStr = result?.legacy?.created_at;
  if (!createdStr) return null;

  const date = new Date(createdStr);
  return isNaN(date.getTime()) ? null : date.getTime();
}

/**
 * 从 entry 中提取 sortIndex 作为备用时间戳（用于无 legacy.created_at 的 entry）
 */
function getSortIndexMs(entry) {
  const idx = entry?.sortIndex;
  if (!idx || typeof idx !== 'string') return null;
  const n = parseInt(idx, 10);
  return isNaN(n) ? null : n;
}

/**
 * 获取 entry 的可比较时间戳，优先 legacy.created_at，其次 sortIndex
 */
function getEntryTimestamp(entry) {
  return getCreatedAtMs(entry) ?? getSortIndexMs(entry) ?? 0;
}

/**
 * 在已按时间降序排列的 entries 中，找到插入位置（保持降序，最新在前）
 * 返回插入索引 i，使得插入后 entries[i-1] >= newTs >= entries[i]
 * 即：找第一个 i 使得 entries[i] 的 ts < newTs（或 i === length）
 */
function findInsertIndex(entries, newTs) {
  let lo = 0;
  let hi = entries.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midTs = getEntryTimestamp(entries[mid]);
    if (midTs >= newTs) {
      lo = mid + 1; // 当前更新，插入位置在右侧
    } else {
      hi = mid; // 当前更旧，插入位置在 mid 或左侧
    }
  }
  return lo;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('📖 读取 entries.json...');
  const entriesData = JSON.parse(fs.readFileSync(CONFIG.ENTRIES_FILE, 'utf-8'));
  const entries = entriesData.entries || [];

  console.log('📖 读取 entries-1.json...');
  const entries1Data = JSON.parse(fs.readFileSync(CONFIG.ENTRIES_1_FILE, 'utf-8'));
  const entries1 = entries1Data.entries || [];

  const existingIds = new Set(entries.map((e) => e.entryId));
  console.log(`📊 entries.json: ${entries.length} 条`);
  console.log(`📊 entries-1.json: ${entries1.length} 条`);
  console.log(`📊 entries.json 中已有 entryId 数量: ${existingIds.size}`);

  const toInsert = [];
  for (const entry of entries1) {
    const id = entry?.entryId;
    if (!id) continue;
    if (existingIds.has(id)) continue;
    toInsert.push(entry);
  }

  console.log(`📊 需要插入到 entries.json 的 entry 数量: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('✨ 无需插入，entries.json 已包含 entries-1.json 中的所有 entry');
    return;
  }

  // 复制 entries.json，作为插入目标
  const resultEntries = [...entries];

  // 按时间戳排序 toInsert，便于按顺序插入（从早到晚插入，可减少移动）
  toInsert.sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));

  let inserted = 0;
  for (const entry of toInsert) {
    const ts = getEntryTimestamp(entry);
    const idx = findInsertIndex(resultEntries, ts);
    resultEntries.splice(idx, 0, entry);
    existingIds.add(entry.entryId);
    inserted++;
    if (inserted <= 5) {
      const createdAt = getCreatedAtMs(entry);
      const timeStr = createdAt ? new Date(createdAt).toISOString() : '(无 created_at)';
      console.log(`  插入: ${entry.entryId} @ ${timeStr} -> index ${idx}`);
    }
  }
  if (inserted > 5) {
    console.log(`  ... 共插入 ${inserted} 条`);
  }

  const output = {
    total: resultEntries.length,
    entries: resultEntries,
  };

  if (dryRun) {
    console.log('\n⚠️  --dry-run 模式，未写入文件');
    console.log(`   将写入 entries.json: total=${output.total}, entries.length=${output.entries.length}`);
    return;
  }

  console.log('\n💾 写入 entries.json...');
  fs.writeFileSync(CONFIG.ENTRIES_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✨ 完成，entries.json 现共 ${output.total} 条`);
}

main();
