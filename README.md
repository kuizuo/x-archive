# X Archiver

一个用于归档和浏览 Twitter/X 推文的工具。通过爬虫脚本获取推文数据，并使用现代化的 Web 界面进行浏览和查看。

> ⚠️ **重要提示**: 该方法需要登录你的 X 账号，且仅能获取个人账号的推文信息。

## ✨ 功能特性

- 📦 **推文归档**: 批量抓取和归档推文数据
- 🎨 **现代界面**: React + TailwindCSS 构建，支持无限滚动
- 📸 **截图导出**: 支持将推文导出为高清 PNG 图片
- 🖼️ **图片代理**: 解决 CORS 跨域问题
- 🚀 **快速部署**: 支持 Cloudflare Pages 一键部署

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 获取认证信息

1. 在浏览器打开 X (Twitter) 个人主页，按 F12 打开开发者工具。
2. 切换到 Network 标签页，过滤字符串 "UserTweets"。
3. 找到 API 请求，右键选择 "Copy as cURL"。
4. 将内容保存到 `script/curl.txt` 文件中。

> ⚠️ `script/curl.txt` 包含敏感信息，请勿提交到版本控制系统。

### 3. 配置用户信息

编辑 `src/config/index.ts`，修改 `userConfig`：

```typescript
export const userConfig: UserConfig = {
  screenName: 'your_username',        // 用户名
  name: '你的显示名称',                 // 显示名称
  avatar: 'https://example.com/avatar.png',  // 头像 URL
  bio: '你的个人简介',                  // 个人简介
  // ...
}
```

### 4. 抓取数据

```bash
node script/index.js
```
该命令会自动爬取数据、提取条目并生成用户信息文件。

### 5. 启动应用

```bash
pnpm dev
```

## 📸 截图功能 & 图片代理

为了解决推文截图时的 CORS 跨域问题，项目提供了基于 Cloudflare Pages Functions 的图片代理服务。

**启用方法：**

1. 创建 `.env` 文件：
   ```bash
   VITE_ENABLE_IMAGE_PROXY=true
   ```

2. 开发环境下，需运行以下命令：
   ```bash
   # 启动 Cloudflare Pages 开发服务器
   pnpm wrangler:dev
   ```

3. 部署到 Cloudflare Pages 时，在设置中添加环境变量 `VITE_ENABLE_IMAGE_PROXY=true` 即可。

## 📦 项目结构

```
x-archive/
├── script/                    # 数据爬取脚本
│   ├── curl.txt              # cURL 认证信息 (需手动创建)
│   └── index.js              # 统一入口
├── src/
│   ├── components/           # React 组件
│   └── config/               # 配置文件
├── functions/                # Cloudflare Pages Function
├── public/                   # 静态资源及数据文件
└── ...
```

## 📄 许可证

[BSD 3-Clause License](./LICENSE)
