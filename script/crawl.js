/**
 * 爬取 X/Twitter 推文数据
 * Node.js >= 18
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCrawlConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================
let CONFIG = {
  ENDPOINT: '',
  USER_ID: '',
  PAGE_SIZE: 20,
  MAX_TWEETS: 2000,
  DELAY_MS: 1000, // 请求间隔（毫秒），避免请求过快
  OUTPUT_DIR: path.join(__dirname, '../public'),
};

let HEADERS = {};

const FEATURES = {
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_enhance_cards_enabled: false,
};

const FIELD_TOGGLES = {
  withArticlePlainText: false,
};

// ==================== 工具函数 ====================

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 构造请求 URL
 */
function buildUrl(cursor) {
  const variables = {
    userId: CONFIG.USER_ID,
    count: CONFIG.PAGE_SIZE,
    includePromotedContent: true,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
  };

  if (cursor) {
    variables.cursor = cursor;
  }

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(FEATURES),
    fieldToggles: JSON.stringify(FIELD_TOGGLES),
  });

  return `${CONFIG.ENDPOINT}?${params.toString()}`;
}

/**
 * 解析下一页 cursor
 */
function extractCursor(json) {
  const instructions =
    json?.data?.user?.result?.timeline?.timeline?.instructions || [];

  for (const instruction of instructions) {
    if (instruction.type !== 'TimelineAddEntries') continue;

    for (const entry of instruction.entries) {
      const content = entry.content;
      if (content?.cursorType === 'Bottom') {
        return content.value;
      }
    }
  }

  return null;
}

/**
 * 统计本页推文数量
 */
function countTweetsInPage(json) {
  const instructions =
    json?.data?.user?.result?.timeline?.timeline?.instructions || [];

  let count = 0;
  for (const instruction of instructions) {
    if (instruction.type !== 'TimelineAddEntries') continue;
    for (const entry of instruction.entries) {
      if (entry.content?.itemContent?.tweet_results?.result) {
        count++;
      }
    }
  }

  return count;
}

/**
 * 统计本页有效 entries 数量（排除 cursor 类型）
 */
function countEntriesInPage(json) {
  const instructions =
    json?.data?.user?.result?.timeline?.timeline?.instructions || [];

  let count = 0;
  for (const instruction of instructions) {
    if (instruction.type === 'TimelineAddEntries' && Array.isArray(instruction.entries)) {
      // 过滤掉 cursor 类型的 entry
      const validEntries = instruction.entries.filter((entry) => {
        const entryType = entry.content?.entryType;
        return entryType !== 'TimelineTimelineCursor';
      });
      count += validEntries.length;
    }
  }

  return count;
}

/**
 * 获取页面文件路径
 */
function getPageFilePath(page) {
  const fileName = `page_${String(page).padStart(3, '0')}.json`;
  return path.join(CONFIG.OUTPUT_DIR, fileName);
}

/**
 * 请求单页数据
 */
async function fetchPage(cursor, page) {
  const url = buildUrl(cursor);
  console.log(`📄 请求第 ${page} 页...`);
  const maxRetries = 2;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: HEADERS,
      });

      if (!response.ok) {
        const shouldRetry =
          (response.status === 429 || response.status >= 500) &&
          attempt < maxRetries;
        if (shouldRetry) {
          const wait = 1000 * 2 ** attempt;
          console.log(`⚠️  HTTP ${response.status}，${wait}ms 后重试 (${attempt + 1}/${maxRetries})`);
          await delay(wait);
          attempt++;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      // 检查是否有错误
      if (json.errors) {
        throw new Error(`API 错误: ${JSON.stringify(json.errors)}`);
      }

      return json;
    } catch (error) {
      if (attempt < maxRetries) {
        const wait = 1000 * 2 ** attempt;
        console.log(`⚠️  请求失败，${wait}ms 后重试 (${attempt + 1}/${maxRetries})`);
        await delay(wait);
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

/**
 * 保存页面数据
 */
function savePage(json, page) {
  const filePath = getPageFilePath(page);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
  console.log(`💾 已保存 ${path.basename(filePath)}`);
}

// ==================== 主函数 ====================

/**
 * 爬取所有推文页面
 */
export async function crawl(argv = process.argv.slice(2)) {
  const context = loadCrawlConfig(argv);
  CONFIG = context.config;
  HEADERS = context.headers;

  console.log('🚀 开始爬取推文数据...\n');
  console.log(`   userId: ${CONFIG.USER_ID}`);
  console.log(`   pageSize: ${CONFIG.PAGE_SIZE}`);
  console.log(`   maxTweets: ${CONFIG.MAX_TWEETS}\n`);
  console.log(`   headers: ${JSON.stringify(HEADERS, null, 2)}`);
  // 确保输出目录存在
  ensureDir(CONFIG.OUTPUT_DIR);

  let cursor = undefined;
  let fetchedTweets = 0;
  let page = 1;
  const startTime = Date.now();

  try {
    while (fetchedTweets < CONFIG.MAX_TWEETS) {
      // 请求数据
      const json = await fetchPage(cursor, page);

      // 保存数据
      savePage(json, page);

      // 统计推文数量
      const count = countTweetsInPage(json);
      fetchedTweets += count;
      
      // 统计有效 entries 数量
      const entriesCount = countEntriesInPage(json);
      console.log(`   ✓ 本页包含 ${count} 条推文，${entriesCount} 个 entries，累计 ${fetchedTweets} 条\n`);

      // 如果 entries 数量为 0，停止爬取
      if (entriesCount === 0) {
        console.log('⚠️  本页 entries 数量为 0，停止爬取');
        break;
      }

      // 提取下一页 cursor
      cursor = extractCursor(json);
      if (!cursor) {
        console.log('⚠️  没有更多数据，停止爬取');
        break;
      }

      page++;

      // 延迟，避免请求过快
      if (fetchedTweets < CONFIG.MAX_TWEETS && cursor) {
        await delay(CONFIG.DELAY_MS);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n✅ 爬取完成！');
    console.log(`   共请求 ${page - 1} 页`);
    console.log(`   约 ${fetchedTweets} 条推文`);
    console.log(`   耗时 ${duration} 秒`);

    return {
      success: true,
      pages: page - 1,
      tweets: fetchedTweets,
      duration: Number.parseFloat(duration),
    };
  } catch (error) {
    console.error('\n❌ 爬取失败:', error.message);
    throw error;
  }
}

// 如果直接运行此文件，执行爬取
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('crawl.js')) {
  crawl().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
