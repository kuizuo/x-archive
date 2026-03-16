/**
 * 从 entries-1.json 合并 entities 和 extended_entities 到 entries.json
 *
 * 遍历 entries.json，按 entryId 在 entries-1.json 中查找匹配项，
 * 将匹配到的 legacy.entities 和 legacy.extended_entities 覆盖到 entries.json
 *
 * 用法: node script/merge-entities.js
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
 * 从 entry 中获取主推文的 tweet 对象
 * 处理可能的嵌套结构 (如 TweetWithVisibilityResults)
 */
function getTweetFromEntry(entry) {
  const itemContent = entry?.content?.itemContent;
  if (!itemContent) return null;

  let result = itemContent?.tweet_results?.result;
  if (!result) return null;

  // 处理 TweetWithVisibilityResults 等包装类型
  if (result.result) {
    result = result.result;
  }

  return result;
}

/**
 * 获取 tweet 的 legacy 对象
 */
function getLegacy(tweet) {
  return tweet?.legacy;
}

/**
 * 合并单个 entry 的 entities 和 extended_entities
 */
function mergeEntryLegacy(entry, sourceEntry) {
  const targetTweet = getTweetFromEntry(entry);
  const sourceTweet = getTweetFromEntry(sourceEntry);

  if (!targetTweet || !sourceTweet) return false;

  const targetLegacy = getLegacy(targetTweet);
  const sourceLegacy = getLegacy(sourceTweet);

  if (!targetLegacy || !sourceLegacy) return false;

  let updated = false;

  if (sourceLegacy.entities) {
    targetLegacy.entities = sourceLegacy.entities;
    updated = true;
  }

  if (sourceLegacy.extended_entities) {
    targetLegacy.extended_entities = sourceLegacy.extended_entities;
    updated = true;
  }

  return updated;
}

function main() {
  console.log('📖 读取 entries.json...');
  const entriesData = JSON.parse(fs.readFileSync(CONFIG.ENTRIES_FILE, 'utf-8'));
  const entries = entriesData.entries || [];

  console.log('📖 读取 entries-1.json...');
  const entries1Data = JSON.parse(
    fs.readFileSync(CONFIG.ENTRIES_1_FILE, 'utf-8')
  );
  const entries1 = entries1Data.entries || [];

  // 按 entryId 建立 entries-1 的索引
  const entries1Map = new Map();
  for (const entry of entries1) {
    if (entry.entryId) {
      entries1Map.set(entry.entryId, entry);
    }
  }

  console.log(`📊 entries.json: ${entries.length} 条`);
  console.log(`📊 entries-1.json: ${entries1.length} 条`);
  console.log(`📊 entries-1 唯一 entryId: ${entries1Map.size} 个`);

  let matchedCount = 0;
  let updatedCount = 0;

  for (const entry of entries) {
    const sourceEntry = entries1Map.get(entry.entryId);
    if (!sourceEntry) continue;

    matchedCount++;
    if (mergeEntryLegacy(entry, sourceEntry)) {
      updatedCount++;
    }
  }

  console.log(`\n✅ 匹配到 ${matchedCount} 条相同 entryId`);
  console.log(`✅ 成功覆盖 ${updatedCount} 条的 entities/extended_entities`);

  console.log('\n💾 写入 entries.json...');
  fs.writeFileSync(
    CONFIG.ENTRIES_FILE,
    JSON.stringify(entriesData, null, 2),
    'utf-8'
  );

  console.log('✨ 完成');
}

main();
