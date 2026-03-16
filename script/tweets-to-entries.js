/**
 * 将 tweets.json (Twitter 归档格式) 转换为 entries.json 格式
 * 同时将 pbs.twimg.com 媒体 URL 替换为 img.x.kuizuo.me/{tweet_id}-{filename}
 *
 * 用法: node script/tweets-to-entries.js [--input path] [--output path]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================
const CONFIG = {
  INPUT: path.join(__dirname, '../public/tweets.json'),
  OUTPUT: path.join(__dirname, '../public/entries.json'),
  MEDIA_DOMAIN: 'img.x.kuizuo.me',
  TWITTER_DATA: path.join(__dirname, '../twitter/data'),
};

// 默认用户信息 (fallback)
const DEFAULT_USER = {
  accountId: '1260079170941378561',
  username: 'kuizuo',
  accountDisplayName: '愧怍',
  avatarMediaUrl: 'https://img.x.kuizuo.me/logo.jpg',
};

// ==================== 工具函数 ====================

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 解析 JSON，支持 tweets.js 的 window.YTD.tweets.part0 = 前缀
 */
function parseTweetsFile(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // 处理 tweets.js 格式 (strip window.YTD.tweets.partN = 前缀)
  const ytdMatch = content.match(/^window\.YTD\.tweets\.part\d+\s*=\s*/);
  if (ytdMatch) {
    content = content.slice(ytdMatch[0].length);
  }

  const data = JSON.parse(content);
  return Array.isArray(data) ? data : [];
}

/**
 * 从 account.js 和 profile.js 加载用户信息
 */
function loadUserInfo() {
  const user = { ...DEFAULT_USER };

  const accountPath = path.join(CONFIG.TWITTER_DATA, 'account.js');
  if (fileExists(accountPath)) {
    try {
      let content = fs.readFileSync(accountPath, 'utf-8');
      content = content.replace(/^window\.YTD\.account\.part\d+\s*=\s*/, '');
      const accounts = JSON.parse(content);
      const account = accounts?.[0]?.account;
      if (account) {
        user.accountId = account.accountId || user.accountId;
        user.username = account.username || user.username;
        user.accountDisplayName = account.accountDisplayName || user.accountDisplayName;
      }
    } catch (e) {
      console.warn('⚠️  解析 account.js 失败，使用默认用户信息');
    }
  }

  const profilePath = path.join(CONFIG.TWITTER_DATA, 'profile.js');
  if (fileExists(profilePath)) {
    try {
      let content = fs.readFileSync(profilePath, 'utf-8');
      content = content.replace(/^window\.YTD\.profile\.part\d+\s*=\s*/, '');
      const profiles = JSON.parse(content);
      const profile = profiles?.[0]?.profile;
      if (profile?.avatarMediaUrl) {
        user.avatarMediaUrl = profile.avatarMediaUrl;
      }
    } catch (e) {
      console.warn('⚠️  解析 profile.js 失败');
    }
  }

  return user;
}

/**
 * 将 pbs.twimg.com/media/X 替换为 img.x.kuizuo.me/{tweetId}-X
 */
function replaceMediaUrl(url, tweetId) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(/pbs\.twimg\.com\/media\/([^/?#]+)/);
  if (!match) return url;
  const filename = match[1];
  return `https://${CONFIG.MEDIA_DOMAIN}/${tweetId}-${filename}`;
}

/**
 * 替换 tweet 中所有媒体 URL
 */
function replaceMediaUrls(tweet, tweetId) {
  const replaceInMedia = (mediaList) => {
    if (!Array.isArray(mediaList)) return;
    for (const m of mediaList) {
      if (m.media_url) m.media_url = replaceMediaUrl(m.media_url, tweetId);
      if (m.media_url_https) m.media_url_https = replaceMediaUrl(m.media_url_https, tweetId);
    }
  };

  if (tweet.entities?.media) replaceInMedia(tweet.entities.media);
  if (tweet.extended_entities?.media) replaceInMedia(tweet.extended_entities.media);
}

/**
 * 转换 sizes 格式: tweets 用字符串 "680", entries 用数字 680
 */
function convertSizes(sizes) {
  if (!sizes || typeof sizes !== 'object') return sizes;
  const result = {};
  for (const [key, val] of Object.entries(sizes)) {
    if (val && typeof val === 'object') {
      result[key] = {
        w: typeof val.w === 'string' ? parseInt(val.w, 10) : val.w,
        h: typeof val.h === 'string' ? parseInt(val.h, 10) : val.h,
        resize: val.resize || 'fit',
      };
    }
  }
  return result;
}

/**
 * 转换 media 对象格式 (tweets -> entries)
 */
function convertMedia(media, tweetId) {
  if (!media) return media;
  return media.map((m) => {
    const url = replaceMediaUrl(m.media_url_https || m.media_url, tweetId);
    return {
      display_url: m.display_url,
      expanded_url: m.expanded_url,
      id_str: m.id_str,
      indices: Array.isArray(m.indices) ? m.indices.map((i) => (typeof i === 'string' ? parseInt(i, 10) : i)) : m.indices,
      media_key: m.media_key || `3_${m.id_str}`,
      media_url_https: url,
      type: m.type || 'photo',
      url: m.url,
      sizes: convertSizes(m.sizes),
    };
  });
}

/**
 * 将 edit_info 转换为 edit_control
 */
function buildEditControl(tweet) {
  const editInfo = tweet.edit_info?.initial;
  if (!editInfo) {
    return {
      edit_tweet_ids: [tweet.id_str],
      editable_until_msecs: '0',
      is_edit_eligible: false,
      edits_remaining: '5',
    };
  }

  let editableUntilMsecs = '0';
  if (editInfo.editableUntil) {
    editableUntilMsecs = String(new Date(editInfo.editableUntil).getTime());
  }

  return {
    edit_tweet_ids: editInfo.editTweetIds || [tweet.id_str],
    editable_until_msecs: editableUntilMsecs,
    is_edit_eligible: editInfo.isEditEligible !== false,
    edits_remaining: editInfo.editsRemaining || '5',
  };
}

/**
 * 将单个 tweet 转换为 entry 格式
 */
function tweetToEntry(item, userInfo, index) {
  const tweet = item.tweet || item;
  if (!tweet || !tweet.id_str) return null;

  const tweetId = tweet.id_str;

  // 跳过转发的推文 (只保留原创)
  if (tweet.retweeted_status) return null;

  // 跳过评论的推文 (in_reply_to_screen_name 有值则为评论)
  if (tweet.in_reply_to_screen_name || tweet.in_reply_to_user_id_str) return null;

  replaceMediaUrls(tweet, tweetId);

  const legacy = {
    bookmark_count: 0,
    bookmarked: false,
    created_at: tweet.created_at,
    conversation_id_str: tweet.conversation_id_str || tweetId,
    display_text_range: tweet.display_text_range || [0, (tweet.full_text || '').length],
    entities: {
      hashtags: tweet.entities?.hashtags || [],
      media: convertMedia(tweet.entities?.media || tweet.extended_entities?.media, tweetId),
      symbols: tweet.entities?.symbols || [],
      urls: tweet.entities?.urls || [],
      user_mentions: tweet.entities?.user_mentions || [],
    },
    extended_entities: tweet.extended_entities
      ? {
          media: convertMedia(tweet.extended_entities.media, tweetId),
        }
      : undefined,
    favorite_count: parseInt(tweet.favorite_count, 10) || 0,
    favorited: tweet.favorited || false,
    full_text: tweet.full_text || '',
    is_quote_status: !!tweet.quoted_status,
    lang: tweet.lang || 'und',
    possibly_sensitive: tweet.possibly_sensitive || false,
    quote_count: parseInt(tweet.quote_count, 10) || 0,
    reply_count: parseInt(tweet.reply_count, 10) || 0,
    retweet_count: parseInt(tweet.retweet_count, 10) || 0,
    retweeted: tweet.retweeted || false,
    user_id_str: userInfo.accountId,
    id_str: tweetId,
  };

  if (legacy.extended_entities && !legacy.extended_entities.media?.length) {
    delete legacy.extended_entities;
  }
  if (!legacy.entities.media?.length) {
    delete legacy.entities.media;
  }

  const result = {
    __typename: 'Tweet',
    rest_id: tweetId,
    core: {
      user_results: {
        result: {
          __typename: 'User',
          id: `VXNlcj:${userInfo.accountId}`,
          rest_id: userInfo.accountId,
          affiliates_highlighted_label: {},
          avatar: {
            image_url: userInfo.avatarMediaUrl,
          },
          core: {
            created_at: 'Tue May 12 05:27:45 +0000 2020',
            name: userInfo.accountDisplayName,
            screen_name: userInfo.username,
          },
          legacy: {
            name: userInfo.accountDisplayName,
            screen_name: userInfo.username,
          },
        },
      },
    },
    unmention_data: {},
    edit_control: buildEditControl(tweet),
    is_translatable: false,
    views: { count: '0', state: 'EnabledWithCount' },
    source: tweet.source || '',
    legacy,
    quick_promote_eligibility: { eligibility: 'IneligibleTweet' },
  };

  // 处理引用推文
  if (tweet.quoted_status) {
    const quoted = tweet.quoted_status;
    const quotedId = quoted.id_str;
    replaceMediaUrls(quoted, quotedId);

    const quotedLegacy = {
      created_at: quoted.created_at,
      full_text: quoted.full_text || '',
      id_str: quotedId,
      entities: {
        hashtags: quoted.entities?.hashtags || [],
        media: convertMedia(quoted.entities?.media || quoted.extended_entities?.media, quotedId),
        symbols: quoted.entities?.symbols || [],
        urls: quoted.entities?.urls || [],
        user_mentions: quoted.entities?.user_mentions || [],
      },
      extended_entities: quoted.extended_entities
        ? { media: convertMedia(quoted.extended_entities.media, quotedId) }
        : undefined,
    };

    result.quoted_status_result = {
      result: {
        __typename: 'Tweet',
        rest_id: quotedId,
        core: {
          user_results: {
            result: {
              __typename: 'User',
              rest_id: quoted.user?.id_str || quoted.user_id_str,
              core: {
                name: quoted.user?.name || '',
                screen_name: quoted.user?.screen_name || '',
              },
              avatar: {
                image_url: quoted.user?.profile_image_url_https || '',
              },
            },
          },
        },
        legacy: quotedLegacy,
      },
    };
  }

  const sortIndex = tweet.id_str || String(Number.MAX_SAFE_INTEGER - index);

  return {
    entryId: `tweet-${tweetId}`,
    sortIndex,
    content: {
      entryType: 'TimelineTimelineItem',
      __typename: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineTweet',
        __typename: 'TimelineTweet',
        tweet_results: {
          result,
        },
        tweetDisplayType: 'Tweet',
      },
      clientEventInfo: {
        component: 'tweet',
        element: 'tweet',
        details: {
          timelinesDetails: {
            injectionType: 'RankedOrganicTweet',
            controllerData: '',
          },
        },
      },
    },
  };
}

/**
 * 主转换流程
 */
export async function convert(options = {}) {
  const inputPath = options.input || CONFIG.INPUT;
  const outputPath = options.output || CONFIG.OUTPUT;

  console.log('📦 开始转换 tweets.json -> entries.json\n');
  console.log(`   输入: ${inputPath}`);
  console.log(`   输出: ${outputPath}`);
  console.log(`   媒体域名: ${CONFIG.MEDIA_DOMAIN}\n`);

  const startTime = Date.now();

  const userInfo = loadUserInfo();
  console.log(`   用户: @${userInfo.username} (${userInfo.accountDisplayName})\n`);

  const rawItems = parseTweetsFile(inputPath);
  console.log(`   读取 ${rawItems.length} 条推文\n`);

  const entries = [];
  let skipped = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const entry = tweetToEntry(rawItems[i], userInfo, i);
    if (entry) {
      entries.push(entry);
    } else {
      skipped++;
    }
  }

  const output = {
    total: entries.length,
    entries,
    extractedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('✅ 转换完成！');
  console.log(`   有效 entries: ${entries.length}`);
  if (skipped > 0) {
    console.log(`   跳过 (转发等): ${skipped}`);
  }
  console.log(`   已保存到 ${path.basename(outputPath)}`);
  console.log(`   耗时 ${duration} 秒`);

  return {
    success: true,
    entries: entries.length,
    skipped,
    duration: Number.parseFloat(duration),
  };
}

// ==================== CLI ====================

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      options.input = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      options.output = argv[++i];
    }
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('tweets-to-entries.js')) {
  const options = parseArgs();
  convert(options).catch((err) => {
    console.error('❌ 转换失败:', err.message);
    process.exit(1);
  });
}
