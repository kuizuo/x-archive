import { Suspense } from 'react'
import {
  type TwitterComponents,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetMedia,
  TweetInfo,
  QuotedTweet,
  enrichTweet,
  TweetNotFound,
  TweetSkeleton,
} from 'react-tweet'
import type { EnrichedTweet } from 'react-tweet'
import { TweetBody } from './tweet-body'
import { TweetActions } from './tweet-actions'
import type { Tweet as RTweet } from 'react-tweet/api'

const TweetContent = ({
  tweet: t,
  components,
}: {
  tweet?: RTweet
  components?: TwitterComponents
}) => {
  if (!t) {
    return <TweetNotFound />
  }

  const tweet = enrichTweet(t)
  // 隐藏 reply 
  if (tweet.in_reply_to_status_id_str) {
    return (
      null
    )
  }

  return (
    <TweetContainer>
      <TweetHeader tweet={tweet} components={components} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet as EnrichedTweet & { full_text?: string }} />
      {tweet.mediaDetails?.length ? (
        <TweetMedia tweet={tweet} components={components} />
      ) : null}
      {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
      <TweetInfo tweet={tweet} />
      <TweetActions tweet={tweet as unknown as RTweet} />
    </TweetContainer>
  )
}

export const Tweet = ({
  fallback = <TweetSkeleton />,
  ...props
}: {
  tweet?: RTweet
  components?: TwitterComponents
  fallback?: React.ReactNode
}) => (
  <Suspense fallback={fallback}>
    <TweetContent {...props} />
  </Suspense>
)

export default Tweet
