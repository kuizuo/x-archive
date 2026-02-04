export interface UserConfig {
  /** 用户名（用于显示，如 @username） */
  screenName: string
  /** 显示名称 */
  name: string
  /** 头像 URL */
  avatar: string
  /** 个人简介 */
  bio: string
  /** 是否认证账号 */
  verified: boolean
  /** 关注链接中的用户名（可能与 screenName 不同） */
  followScreenName: string
  /** 存档说明中的用户名（用于显示） */
  archiveScreenName: string
}

export const user = {
  screenName: 'kuizuo',
  name: '愧怍',
  avatar: 'https://github.com/kuizuo.png',
  bio: '故事不是写出来的，而是经历出来的。',
  verified: true,
  followScreenName: 'ku1zu0',
  archiveScreenName: 'kuizuo',
} satisfies UserConfig

export const ENABLE_IMAGE_PROXY = import.meta.env.VITE_ENABLE_IMAGE_PROXY === 'true'

// 可直接替代为 cloudflare worker 路由，例 https://xxxxx.workers.dev/img-proxy?url=
export const IMG_PROXY_URL = '/img-proxy?url=' 

