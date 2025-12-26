import { useCallback, useEffect, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Tweet } from './components/tweet'
import { Sidebar } from './components/sidebar'
import { parseTwitterArchive } from './utils/parse'

import type { Tweet as RTweet } from 'react-tweet/api'

export default function App() {
  const [tweets, setTweets] = useState<RTweet[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchNextPage = useCallback(async () => {
    try {
      const pageStr = String(page).padStart(3, '0')
      const response = await fetch(`/page_${pageStr}.json`)

      if (!response.ok) {
        setHasMore(false)
        return
      }

      const data = await response.json()
      const newTweets = parseTwitterArchive(data)

      if (newTweets.length === 0) {
        setHasMore(false)
      } else {
        setTweets((prev) => [...prev, ...newTweets])
        setPage((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error fetching page:', error)
      setHasMore(false)
    }
  }, [page])

  // 初始加载
  useEffect(() => {
    const loadFirstPage = async () => {
      try {
        const response = await fetch('/page_001.json')
        if (!response.ok) {
          setHasMore(false)
          return
        }
        const data = await response.json()
        const initialTweets = parseTwitterArchive(data)
        setTweets(initialTweets)
        setPage(2)
        if (initialTweets.length === 0) {
          setHasMore(false)
        }
      } catch (error) {
        console.error('Error loading first page:', error)
        setHasMore(false)
      }
    }

    loadFirstPage()
  }, [])

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-black relative overflow-hidden flex justify-center"
    >
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900 opacity-50" />

      {/* 网格 */}
      <div
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* 光晕 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* 主内容 */}
      <main className="relative z-10 max-w-[550px] w-full px-4 pt-8 md:pt-12">
        <Sidebar />
        <InfiniteScroll
          dataLength={tweets.length}
          next={fetchNextPage}
          hasMore={hasMore}
          loader={
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          }
          endMessage={
            <p className="text-center text-gray-500 py-8 font-medium">
              没有更多内容了
            </p>
          }
          style={{ overflow: 'visible' }}
        >
          <div className="flex flex-col items-center">
            {tweets.map((t) => (
              <div
                key={t.id_str || (t as { id?: string }).id}
                className="w-full"
              >
                <Tweet tweet={t} />
              </div>
            ))}
          </div>
        </InfiniteScroll>
      </main>
    </div>
  )
}
