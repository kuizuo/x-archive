/**
 * 用户配置文件
 * 请根据你的实际情况修改以下配置
 */

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

export const userConfig: UserConfig = {
  screenName: 'kuizuo',
  name: '愧怍',
  avatar: 'https://github.com/kuizuo.png',
  bio: '故事不是写出来的，而是经历出来的。',
  verified: true,
  followScreenName: 'ku1zu0',
  archiveScreenName: 'kuizuo',
}

