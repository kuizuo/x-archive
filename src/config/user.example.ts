/**
 * 用户配置示例文件
 * 
 * 使用方法：
 * 1. 复制此文件为 user.ts
 * 2. 根据你的实际情况修改配置项
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
  screenName: 'your_username',
  name: '你的显示名称',
  avatar: 'https://example.com/avatar.png',
  bio: '你的个人简介',
  verified: false,
  followScreenName: 'your_username',
  archiveScreenName: 'your_username',
}

