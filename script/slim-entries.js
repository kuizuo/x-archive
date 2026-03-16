/**
 * 精简 entries.json，移除冗余字段以减小文件体积
 *
 * 根据 src/utils/db.ts 中 extractTweetsFromEntry/transformTweet 的实际使用，
 * 仅保留展示推文所需的字段。
 *
 * 用法: node script/slim-entries.js [--dry-run] [--compact]
 *   --dry-run  仅预览，不写入
 *   --compact  输出紧凑 JSON（无缩进），进一步减小体积
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ENTRIES_FILE: path.join(__dirname, '../public/entries.json'),
};

// 用户对象中可移除的字段（保留 core, avatar 用于展示）
const USER_REMOVE_KEYS = new Set([
  'affiliates_highlighted_label',
  'dm_permissions',
  'follow_request_sent',
  'has_graduated_access',
  'is_blue_verified',
  'location',
  'media_permissions',
  'parody_commentary_fan_label',
  'profile_image_shape',
  'professional',
  'profile_bio',
  'privacy',
  'relationship_perspectives',
  'tipjar_settings',
  'verification',
  'profile_description_language',
]);

// 推文对象中可移除的字段
const TWEET_REMOVE_KEYS = new Set([
  'unmention_data',
  'edit_control',
  'is_translatable',
  'grok_analysis_button',
  'quick_promote_eligibility',
]);

// legacy 中可移除的字段（保留展示所需）
// 注意: display_text_range 为 react-tweet enrichTweet 解析 entities 所必需，不可移除
const LEGACY_REMOVE_KEYS = new Set([
  'bookmark_count',
  'bookmarked',
  'favorited',
  'retweeted',
  'possibly_sensitive_editable',
]);

// 媒体对象中可移除的字段
const MEDIA_REMOVE_KEYS = new Set([
  'features', // 人脸检测，通常为空
  'media_results', // 冗余
]);

// original_info 中可移除的字段
// 注意: focus_rects 可能被 react-tweet 用于媒体裁剪/比例，保留以确保正确显示
const ORIGINAL_INFO_REMOVE_KEYS = new Set([]);

// itemContent 中可移除的字段
const ITEM_CONTENT_REMOVE_KEYS = new Set(['clientEventInfo', 'tweetDisplayType']);

/**
 * 递归移除对象中的指定键
 */
function removeKeys(obj, keys) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of keys) {
    delete obj[key];
  }
}

/**
 * 递归移除 __typename
 */
function removeTypenames(obj) {
  if (!obj || typeof obj !== 'object') return;
  delete obj.__typename;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      removeTypenames(val);
    }
  }
}

/**
 * 精简 original_info（当前保留 focus_rects 以确保媒体正确显示）
 */
function slimOriginalInfo(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (ORIGINAL_INFO_REMOVE_KEYS.size > 0) {
    removeKeys(obj, ORIGINAL_INFO_REMOVE_KEYS);
  }
}

/**
 * 精简媒体对象
 */
function slimMedia(media) {
  if (!media || typeof media !== 'object') return;
  removeKeys(media, MEDIA_REMOVE_KEYS);
  slimOriginalInfo(media.original_info);
}

/**
 * 精简用户对象
 */
function slimUser(user) {
  if (!user || typeof user !== 'object') return;
  removeKeys(user, USER_REMOVE_KEYS);
}

/**
 * 精简 legacy 中的 entities/extended_entities
 */
function slimLegacyEntities(legacy) {
  if (!legacy) return;
  const mediaList =
    legacy.extended_entities?.media ?? legacy.entities?.media ?? [];
  for (const m of mediaList) {
    slimMedia(m);
  }
}

/**
 * 精简 legacy
 */
function slimLegacy(legacy) {
  if (!legacy || typeof legacy !== 'object') return;
  removeKeys(legacy, LEGACY_REMOVE_KEYS);
  slimLegacyEntities(legacy);
}

/**
 * 精简推文对象（递归处理 quoted）
 */
function slimTweet(tweet) {
  if (!tweet || typeof tweet !== 'object') return;

  removeKeys(tweet, TWEET_REMOVE_KEYS);

  const user = tweet.core?.user_results?.result;
  if (user) slimUser(user);

  if (tweet.legacy) slimLegacy(tweet.legacy);

  const quoted = tweet.quoted_status_result?.result;
  if (quoted) slimTweet(quoted);
}

/**
 * 精简 entry
 */
function slimEntry(entry) {
  if (!entry || typeof entry !== 'object') return;

  const itemContent = entry?.content?.itemContent;
  if (!itemContent) return;

  removeKeys(itemContent, ITEM_CONTENT_REMOVE_KEYS);

  let result = itemContent?.tweet_results?.result;
  if (!result) return;

  if (result.result) result = result.result;
  slimTweet(result);
}

/**
 * 移除空对象/数组（可选，进一步压缩）
 */
function removeEmptyObjects(obj) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      removeEmptyObjects(obj[i]);
      if (
        typeof obj[i] === 'object' &&
        !Array.isArray(obj[i]) &&
        Object.keys(obj[i]).length === 0
      ) {
        // 不删除空对象，可能影响结构
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      removeEmptyObjects(val);
      if (
        !Array.isArray(val) &&
        Object.keys(val).length === 0 &&
        val.constructor === Object
      ) {
        delete obj[key];
      }
    }
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const compact = process.argv.includes('--compact');

  console.log('📖 读取 entries.json...');
  const data = JSON.parse(fs.readFileSync(CONFIG.ENTRIES_FILE, 'utf-8'));
  const entries = data.entries || [];

  const sizeBefore = JSON.stringify(data).length;
  console.log(`📊 原始大小: ${(sizeBefore / 1024 / 1024).toFixed(2)} MB`);

  let count = 0;
  for (const entry of entries) {
    slimEntry(entry);
    removeTypenames(entry);
    count++;
  }

  const sizeAfter = JSON.stringify(data).length;
  const saved = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);

  console.log(`📊 精简后: ${(sizeAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 减少: ${((sizeBefore - sizeAfter) / 1024 / 1024).toFixed(2)} MB (${saved}%)`);
  console.log(`📊 处理 ${count} 条 entries`);

  if (dryRun) {
    console.log('\n⚠️  --dry-run 模式，未写入文件');
    return;
  }

  console.log('\n💾 写入 entries.json...');
  const json = compact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  fs.writeFileSync(CONFIG.ENTRIES_FILE, json, 'utf-8');
  console.log(`   输出格式: ${compact ? '紧凑' : '格式化'}`);
  console.log('✨ 完成');
}

main();
