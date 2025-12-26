/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tweet as RTweet } from 'react-tweet/api'

// Twitter entry 类型定义
interface TwitterEntry {
  entryId: string
  sortIndex: string
  content?: {
    entryType?: string
    itemContent?: any
    items?: any[]
    [key: string]: any
  }
  [key: string]: any
}

interface Database {
  entries: TwitterEntry[]
  tweets: RTweet[]
}

// 纯前端项目：直接使用内存对象存储（不使用适配器）
const db: { data: Database } = {
  data: {
    entries: [],
    tweets: [],
  },
}

// 初始化数据库
export async function initDB() {
  try {
    // 如果已经有数据，直接返回
    if (db.data.tweets.length > 0) {
      return db
    }

    const response = await fetch('/entries.json')
    if (!response.ok) {
      throw new Error('Failed to load entries.json')
    }

    const data = await response.json()

    // 设置 entries
    db.data.entries = data.entries || []

    // 解析所有 entries 为 tweets
    const allTweets: RTweet[] = []
    for (const entry of db.data.entries) {
      const tweets = extractTweetsFromEntry(entry)
      allTweets.push(...tweets)
    }

    db.data.tweets = allTweets

    return db
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// 从单个 entry 提取 tweets
function extractTweetsFromEntry(entry: TwitterEntry): RTweet[] {
  const tweets: RTweet[] = []


  const walk = (item: TwitterEntry | any) => {
    if (!item) return

    // 处理单个推文
    const itemContent = item?.content?.itemContent || item?.item?.itemContent
    if (itemContent?.itemType === 'TimelineTweet') {
      const result = itemContent.tweet_results?.result
      if (result) {
        const transformed = transformTweet(result)
        if (transformed) {
          tweets.push(transformed)
        }
      }
    }

    // 处理会话/模块中的推文 (TimelineTimelineModule)
    const items = item?.content?.items
    if (Array.isArray(items)) {
      for (const moduleItem of items) {
        walk(moduleItem)
      }
    }
  }

  walk(entry)
  return tweets
}

// 转换 tweet 格式

function transformTweet(t: any): RTweet | null {
  if (!t || !t.legacy) return null

  const id = t.rest_id
  const screenName = t.core?.user_results?.result?.core?.screen_name || ''


  const tweet: any = {
    ...t.legacy,
    id_str: id,
    created_at: t.legacy.created_at,
    full_text: t.note_tweet?.note_tweet_results?.result?.text ?? t.legacy.full_text,
    text: t.note_tweet?.note_tweet_results?.result?.text ??
      t.legacy.full_text ??
      '',
    favorite_count: t.legacy.favorite_count ?? 0,
    reply_count: t.legacy.reply_count ?? 0,
    retweet_count: t.legacy.retweet_count ?? 0,
    quote_count: t.legacy.quote_count ?? 0,
    views: Number(t.views?.count ?? 0),
    like_url: `https://x.com/intent/like?tweet_id=${id}`,
    reply_url: `https://x.com/intent/tweet?in_reply_to=${id}`,
    view_url: `https://x.com/${screenName}/status/${id}`,
    user: {
      name: t.core?.user_results?.result?.core?.name || '',
      screen_name: screenName,
      profile_image_url_https:
        t.core?.user_results?.result?.avatar?.image_url || '',
    },
  }

  // 处理引用推文 (Quoted Tweet)
  const quotedStatus = t.quoted_status_result?.result
  if (quotedStatus) {
    const quoted = transformTweet(quotedStatus)
    if (quoted) {
      tweet.quoted_tweet = quoted
    }
  }

  return tweet as RTweet
}

// 获取所有 tweets
export function getAllTweets(): RTweet[] {
  return db.data.tweets || []
}

// 分页获取 tweets
export function getTweets(page: number, pageSize = 20): RTweet[] {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return db.data.tweets.slice(start, end) || []
}

// 根据 ID 获取 tweet
export function getTweetById(id: string): RTweet | undefined {
  return db.data.tweets.find(t => t.id_str === id)
}

// 获取 tweets 总数
export function getTweetsCount(): number {
  return db.data.tweets.length
}

// 获取数据库实例（用于高级查询）
export function getDB() {
  return db
}

