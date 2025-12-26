import s from './tweet-body.module.css'
import { TweetLink } from 'react-tweet'
import type { EnrichedTweet } from 'react-tweet'

export const TweetBody = ({ tweet }: { tweet: EnrichedTweet & { full_text?: string } }) => {
  return (
    <p className={s.root} lang={tweet.lang} dir="auto">

      {
        tweet.entities.length < 2 ? (
          <span>
            {tweet.full_text || tweet.text}
          </span>
        ) : (
          <>
            {tweet.entities.map((item, i) => {
              switch (item.type) {
                case 'hashtag':
                case 'mention':
                case 'url':
                case 'symbol':
                  return (
                    <TweetLink key={i} href={item.href}>
                      {item.text}
                    </TweetLink>
                  )
                case 'media':
                  // Media text is currently never displayed, some tweets however might have indices
                  // that do match `display_text_range` so for those cases we ignore the content.
                  return
                default:
                  // We use `dangerouslySetInnerHTML` to preserve the text encoding.
                  // https://github.com/vercel/react-tweet/issues/29
                  return (
                    <span key={i} dangerouslySetInnerHTML={{ __html: item.text }} />
                  )
              }
            })}
          </>
        )
      }
    </p>
  );
}