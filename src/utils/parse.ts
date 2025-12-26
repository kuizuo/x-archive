/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tweet as RTweet } from 'react-tweet/api'

interface TwitterArchiveResult {
  data?: {
    user?: {
      result?: {
        timeline?: {
          timeline?: {
            instructions?: TwitterInstruction[]
          }
        }
      }
    }
  }
}

interface TwitterInstruction {
  type: string
  entries?: any[]
  entry?: any
}

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
    // 递归处理引用的推文，支持嵌套
    const quoted = transformTweet(quotedStatus)
    if (quoted) {
      tweet.quoted_tweet = quoted
    }
  }

  return tweet as RTweet
}

export function parseTwitterArchive(raw: TwitterArchiveResult): RTweet[] {
  const timeline = raw?.data?.user?.result?.timeline?.timeline
  const instructions = Array.isArray(timeline?.instructions)
    ? timeline.instructions
    : []

  const tweets: RTweet[] = []

  const walk = (entry: any) => {
    if (!entry) return

    // 处理单个推文
    const item = entry?.content?.itemContent || entry?.item?.itemContent
    if (item?.itemType === 'TimelineTweet') {
      const result = item.tweet_results?.result
      if (result) {
        const transformed = transformTweet(result)
        if (transformed) {
          tweets.push(transformed)
        }
      }
    }

    // 处理会话/模块中的推文 (TimelineTimelineModule)
    const items = entry?.content?.items
    if (Array.isArray(items)) {
      for (const moduleItem of items) {
        walk(moduleItem)
      }
    }
  }

  for (const instruction of instructions) {
    if (Array.isArray(instruction?.entries)) {
      for (const entry of instruction.entries) {
        walk(entry)
      }
    }

    if (instruction?.entry) {
      walk(instruction.entry)
    }
  }

  return tweets
}
