import { type FC, useState, useEffect } from 'react'

export const Sidebar: FC = () => {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isInitial, setIsInitial] = useState(true)

  useEffect(() => {
    // 5秒后自动关闭初始显示状态
    const timer = setTimeout(() => {
      setIsInitial(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const toggleDisclaimer = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowDisclaimer(!showDisclaimer)
  }

  return (
    <>
      <aside
        onMouseEnter={() => setIsInitial(false)}
        className={`w-full mb-8 xl:mb-0 xl:fixed xl:right-8 xl:top-24 xl:w-[350px] transition-all duration-700 
          ${isInitial ? 'xl:opacity-100 xl:translate-x-0' : 'xl:opacity-0 xl:translate-x-4'} 
          xl:hover:opacity-100 xl:focus-within:opacity-100 xl:hover:translate-x-0`}
      >
        {/* 用户卡片 */}
        <div className="bg-[#16181c] rounded-2xl overflow-hidden mb-4 border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">用户</h2>
            <a
              href="https://x.com/intent/follow?screen_name=ku1zu0"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              关注新账号
            </a>
          </div>
          <div className="flex items-center space-x-3 group/user cursor-pointer">
            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
              <img src="https://github.com/kuizuo.png" alt="kuizuo" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-bold text-white hover:underline truncate">
                  愧怍
                </span>
                <svg className="w-4 h-4 fill-blue-400 shrink-0" viewBox="0 0 22 22" aria-label="认证账号" role="img" data-testid="icon-verified">
                  <g><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" /></g>
                </svg>
              </div>
              <div className="text-gray-500 text-sm truncate">@kuizuo</div>
              <div className="text-white text-[14px] mt-1 leading-snug">故事不是写出来的，而是经历出来的。</div>
            </div>
          </div>
        </div>

        {/* 归档说明卡片 */}
        <div className="bg-[#16181c] rounded-2xl overflow-hidden mb-4 border border-gray-800/50">
          <h2 className="px-4 py-3 text-xl font-bold text-white">存档说明</h2>
          <div className="px-4 py-3 hover:bg-white/5 transition-colors cursor-default">
            <p className="text-white text-[15px] leading-normal">
              这是 x <span className="text-blue-500 hover:underline cursor-pointer">@kuizuo</span> 账号的历史推文，仅作为个人推文的历史存档使用。
            </p>
            <div className="mt-3 flex items-start space-x-2 text-sm text-yellow-500/80 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>注意：由于原推特存档机制限制，推文的图片资源已无法找回。</span>
            </div>
          </div>
        </div>

        {/* 页脚链接 */}
        <div className="px-4 flex flex-wrap gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={toggleDisclaimer}
            className="text-[13px] text-gray-500 hover:underline cursor-pointer"
          >
            免责说明
          </button>
        </div>
      </aside>

      {/* 免责声明弹窗 */}
      {showDisclaimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/10 backdrop-blur-sm"
          onClick={toggleDisclaimer}
          onKeyDown={(e) => e.key === 'Escape' && setShowDisclaimer(false)}
          role="button"
          tabIndex={0}
          aria-label="关闭弹窗"
        >
          <div
            className="bg-black border border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="document"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">站点说明</h3>
              <div className="space-y-4 text-gray-300 text-[15px] leading-relaxed">
                <p>
                  1. 本网页仅作为个人推文的历史存档与技术记录使用，不具备任何社交或即时通讯功能。
                </p>
                <p>
                  2. 本站点为静态归档页，所有内容均为历史备份，不会对 X (Twitter) 平台产生任何实时请求或负面影响。
                </p>
                <p>
                  3. 本站点纯属个人存档，无任何商业用途，亦不代表任何官方立场。
                </p>
                <p>
                  4. 归档内容仅用于个人记录，回忆当时的心境与成长。
                </p>
              </div>
              <button
                type="button"
                onClick={toggleDisclaimer}
                className="mt-8 w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
