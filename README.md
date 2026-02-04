# X Archiver

一个用于归档和浏览 Twitter/X 推文的工具。通过爬虫脚本获取推文数据,并使用现代化的 Web 界面进行浏览和查看。

> ⚠️ **重要提示**: 该方法需要登录你的 X 账号(通常是账号已被冻结的),且仅能获取个人账号的推文信息,无法获取他人账号的推文信息。

## ✨ 功能特性

- 📦 **推文归档**: 通过爬虫脚本批量抓取和归档推文数据
- 🎨 **现代界面**: 使用 React + TailwindCSS 构建的现代化 UI,支持无限滚动
- 📸 **截图导出**: 将推文导出为高清 PNG 图片,支持自动等待图片加载和字体渲染
- 🖼️ **图片代理**: 基于 Cloudflare Pages Functions 的图片代理服务,解决 CORS 跨域问题
- ⚙️ **配置化**: JSON 数据存储 + 灵活的用户信息配置
- 🚀 **快速部署**: 支持 Cloudflare Pages 一键部署

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置用户信息

编辑 `src/config/index.ts`,修改以下信息:

```typescript
export const userConfig: UserConfig = {
  screenName: 'your_username',        // 用户名(用于显示)
  name: '你的显示名称',                 // 显示名称
  avatar: 'https://example.com/avatar.png',  // 头像 URL
  bio: '你的个人简介',                  // 个人简介
  verified: false,                     // 是否认证账号
  followScreenName: 'your_username',   // 关注链接中的用户名
  archiveScreenName: 'your_username',  // 存档说明中的用户名
}
```

### 3. 配置爬虫脚本

编辑 `script/crawl.js`,配置以下信息:

#### 3.1 配置用户 ID

```javascript
const CONFIG = {
  USER_ID: '', // 填写要爬取的用户 ID
}
```

#### 3.2 配置认证信息

在浏览器中打开 X (Twitter),按 F12 打开开发者工具,切换到 Network 标签页,然后访问你的个人主页。通过过滤字符串 "UserTweets"找到如图所示API 请求,右键选择 "复制为 cURL"或"Copy as cURL",然后使用 AI 工具提取以下关键信息:

```javascript
const HEADERS = {
  authorization: '',     // Bearer token
  cookie: '',            // Cookie 字符串
  'x-csrf-token': '',   // CSRF Token
  // ... 其他固定值无需修改
}
```

![获取认证信息](./images/image-1.png)

### 4. 爬取和提取数据

#### 方式一:使用统一入口(推荐)

```bash
node script/index.js
```

这个命令会自动执行:
1. 爬取推文数据(保存到 `public/page_XXX.json`)
2. 提取推文条目(生成 `public/entries.json`)

#### 方式二:分步执行

```bash
# 步骤 1: 爬取推文数据
node script/crawl.js

# 步骤 2: 提取推文条目
node script/extract-entries.js
```

### 5. 配置图片代理(可选)

为了解决推文截图时的 CORS 跨域问题,项目提供了基于 Cloudflare Pages Functions 的图片代理服务。

#### 5.1 为什么需要图片代理?

Twitter/X 的图片服务器(pbs.twimg.com)不允许跨域访问,在使用 html-to-image 截图时会导致图片无法加载。图片代理服务会:
- 代理图片请求,添加 CORS 头信息
- 自动缓存图片,提升性能
- 仅允许代理 Twitter 图片域名,确保安全

#### 5.2 启用图片代理

创建 `.env` 文件:

```bash
VITE_ENABLE_IMAGE_PROXY=true
```

启用后,推文卡片会显示截图按钮,支持导出包含图片的高清 PNG。

#### 5.3 本地开发

在开发环境下,需要同时运行两个服务:

```bash
# 终端 1: 启动 Cloudflare Pages 开发服务器
pnpm wrangler:dev

# 终端 2: 启动前端开发服务器
pnpm dev
```

Vite 会自动将 `/img-proxy` 请求代理到本地的 Cloudflare Pages 服务(http://127.0.0.1:8787)。

#### 5.4 部署到 Cloudflare Pages

编辑 `wrangler.toml` 配置项目名称:

```toml
name = "x-archive"  # 修改为你的项目名称
compatibility_date = "2026-02-04"
pages_build_output_dir = "dist"
```

使用 Wrangler CLI 部署:

```bash
# 首次部署需要登录
pnpm wrangler pages deploy dist

# 或使用 npm 脚本
pnpm wrangler:deploy
```

部署成功后,Cloudflare Pages 会自动处理 `/img-proxy` 路由,无需额外配置。

#### 5.5 自定义图片代理地址

如果需要使用独立的 Worker 服务,可以修改 `src/config/index.ts`:

```typescript
// 默认使用相对路径(适用于 Cloudflare Pages)
export const imgProxyUrl = '/img-proxy?url='

// 或使用独立的 Worker URL
// export const imgProxyUrl = 'https://your-worker.workers.dev/img-proxy?url='
```

#### 5.6 技术实现

图片代理服务位于 `functions/img-proxy.ts`,作为 Cloudflare Pages Function 运行:
- 仅代理 `pbs.twimg.com` 域名的图片
- 使用 Cloudflare Cache API 缓存响应
- 自动添加 CORS 和 Timing 头信息
- 支持条件请求(If-None-Match, If-Modified-Since)

### 6. 启动前端应用

开发模式:

```bash
pnpm dev
```

构建生产版本:

```bash
pnpm build
```

预览构建结果:

```bash
pnpm preview
```

## 📸 截图功能

项目支持将推文导出为高清 PNG 图片,截图功能特性:

- ⏳ **智能等待**: 自动等待所有图片加载完成和字体渲染完毕
- 🎯 **高清输出**: 2倍像素比率,确保文字和图片清晰
- 🎭 **智能过滤**: 自动过滤视频、iframe 等无法截图的元素
- 🌐 **CORS 解决**: 通过图片代理服务解决 Twitter 图片跨域问题
- 📐 **自适应尺寸**: 自动适配推文内容的完整高度

### 使用方法

1. **启用图片代理**(见步骤 5):
   ```bash
   echo "VITE_ENABLE_IMAGE_PROXY=true" > .env
   ```

2. **启动服务**:
   ```bash
   # 终端 1
   pnpm wrangler:dev
   
   # 终端 2
   pnpm dev
   ```

3. **截图操作**:
   - 将鼠标悬停在推文卡片上
   - 点击右下角出现的📷截图按钮
   - 等待处理完成
   - 图片自动下载,文件名格式: `tweet-{推文ID}.png`

### 技术细节

截图功能基于 `html-to-image` 库,并进行了以下优化:

```typescript
// 1. 等待所有图片加载
await waitForImages(tweetRef.current)

// 2. 等待字体渲染
await document.fonts?.ready

// 3. 高清截图
await toPng(element, {
  pixelRatio: 2,              // 2倍分辨率
  cacheBust: true,            // 避免缓存问题
  filter: captureFilter       // 过滤不可截图元素
})
```

## ⚠️ 注意事项

### 基本使用

- **认证信息**: 爬虫脚本需要有效的 Twitter/X 认证信息(authorization, cookie, x-csrf-token)
- **使用条款**: 请遵守 Twitter/X 的使用条款和 API 限制
- **数据安全**: 认证信息包含敏感数据,请勿提交到版本控制系统(.gitignore 已配置)
- **使用目的**: 项目仅用于个人学习和研究目的
- **图片资源**: 由于 Twitter 存档机制限制,部分推文的图片资源可能无法找回

### 图片代理

- ✅ **推荐启用**: 如需导出包含图片的推文截图,建议启用图片代理功能
- 🔄 **缓存机制**: 图片代理会使用 Cloudflare Cache API 缓存图片,提升性能
- 💰 **配额限制**: Cloudflare Pages 免费计划提供每天 100,000 次请求
- 🔧 **本地开发**: 需要同时运行 `pnpm wrangler:dev` 和 `pnpm dev` 两个服务
- 🚀 **生产部署**: Cloudflare Pages 会自动处理 Functions,无需额外配置

### 截图功能

- 📸 **显示条件**: 只有启用图片代理后,悬停推文时才会显示截图按钮
- ⏱️ **等待时间**: 截图会等待所有图片加载完成,大量图片可能需要 5-10 秒
- 📦 **文件格式**: PNG 格式,文件名为 `tweet-{推文ID}.png`
- 🐛 **调试方法**: 截图失败时,请检查浏览器控制台的错误信息
- 🔒 **跨域问题**: 如果图片无法加载,确认图片代理服务正在运行

### 部署建议

- **Cloudflare Pages**: 推荐使用 Cloudflare Pages 部署,自动支持 Functions
- **其他平台**: 如使用 Vercel/Netlify,需要单独部署 Worker 服务
- **环境变量**: 部署时需要在平台设置 `VITE_ENABLE_IMAGE_PROXY=true`
- **自定义域名**: 使用自定义域名时,图片代理路由会自动生效

## 📦 项目结构

```
x-archive/
├── script/                    # 数据爬取脚本
│   ├── crawl.js              # 推文抓取脚本
│   ├── extract-entries.js    # 推文条目提取
│   └── index.js              # 统一入口(推荐使用)
├── src/
│   ├── components/           # React 组件
│   │   ├── tweet.tsx         # 推文展示组件(含截图功能)
│   │   ├── tweet-body.tsx    # 推文正文
│   │   ├── tweet-actions.tsx # 推文操作按钮
│   │   └── sidebar.tsx       # 侧边栏
│   ├── config/
│   │   └── index.ts          # 配置文件(用户信息、图片代理等)
│   ├── utils/
│   │   ├── db.ts             # 数据库操作
│   │   ├── parse.ts          # 推文数据解析
│   │   └── format.ts         # 格式化工具
│   ├── App.tsx               # 主应用组件
│   └── main.tsx              # 应用入口
├── functions/
│   └── img-proxy.ts          # Cloudflare Pages Function(图片代理)
├── public/
│   ├── entries.json          # 推文索引(由脚本生成)
│   ├── page_*.json           # 推文数据文件
│   └── x.svg                 # X 图标
├── .env                      # 环境变量(可选)
├── wrangler.toml             # Cloudflare Pages 配置
├── vite.config.ts            # Vite 配置
└── package.json              # 项目依赖
```

## 🔧 开发相关

### 技术栈

- **前端框架**: React 19 + TypeScript
- **样式**: TailwindCSS 4
- **构建工具**: Vite
- **推文组件**: react-tweet
- **截图**: html-to-image
- **部署**: Cloudflare Pages + Functions

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 启动图片代理服务(可选)
pnpm wrangler:dev
```

### 部署到 Cloudflare Pages

1. Fork 本项目到你的 GitHub 账号
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 Pages 页面,点击"创建项目"
4. 连接 GitHub 仓库
5. 配置构建设置:
   - **构建命令**: `pnpm build`
   - **构建输出目录**: `dist`
   - **环境变量**: `VITE_ENABLE_IMAGE_PROXY=true`
6. 点击"保存并部署"

## ❓ 常见问题

### Q: 截图时图片显示不出来?

A: 确保已启用图片代理功能:
1. 创建 `.env` 文件并添加 `VITE_ENABLE_IMAGE_PROXY=true`
2. 同时运行 `pnpm wrangler:dev` 和 `pnpm dev`
3. 检查浏览器控制台是否有 CORS 错误

### Q: 如何获取 Twitter 认证信息?

A: 
1. 登录 Twitter/X 网页版
2. 打开开发者工具(F12)
3. 切换到 Network 标签
4. 访问你的个人主页
5. 过滤 "UserTweets",找到对应请求
6. 右键选择 "Copy as cURL"
7. 使用 AI 工具提取 authorization、cookie、x-csrf-token

### Q: Cloudflare Pages 部署后图片代理不工作?

A: 
1. 确认 `functions/img-proxy.ts` 已包含在部署中
2. 检查环境变量 `VITE_ENABLE_IMAGE_PROXY` 是否设置为 `true`
3. 查看 Cloudflare Pages 的 Functions 日志
4. 确认 `wrangler.toml` 中的配置正确

### Q: 为什么只能爬取自己的推文?

A: Twitter API 限制了第三方访问,使用本项目的方法只能通过自己的认证信息获取自己的推文数据。

### Q: 爬虫会被 Twitter 封号吗?

A: 本项目使用正常的浏览器请求方式,不会触发反爬机制。但建议:
- 不要频繁请求(脚本已内置延迟)
- 仅用于个人数据归档
- 遵守 Twitter 使用条款

## 📄 许可证

[BSD 3-Clause License](./LICENSE)

## 🙏 致谢

- [react-tweet](https://github.com/vercel/react-tweet) - 推文展示组件
- [html-to-image](https://github.com/bubkoo/html-to-image) - 截图导出功能
- [Cloudflare Pages](https://pages.cloudflare.com/) - 托管和 Functions 服务
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Vite](https://vitejs.dev/) - 构建工具

## 🌟 Star History

如果这个项目对你有帮助,欢迎 Star ⭐️
