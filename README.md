# X Archiver

一个用于归档和浏览 Twitter/X 推文的工具。通过爬虫脚本获取推文数据，并使用现代化的 Web 界面进行浏览和查看。


> ⚠️ **重要提示**：该方法需要登录你的 X 账号(通常是账号已被冻结的)，且仅能获取个人账号的推文信息，无法获取他人账号的推文信息。

## **✨ 功能**

- 推文抓取与归档
- 界面浏览（无限滚动）
- 完整推文展示与 PNG 导出
- JSON 数据 + 配置化用户信息

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置用户信息

编辑 `src/config/user.ts`，修改以下信息：

```typescript
export const userConfig: UserConfig = {
  screenName: 'your_username',        // 用户名（用于显示）
  name: '你的显示名称',                 // 显示名称
  avatar: 'https://example.com/avatar.png',  // 头像 URL
  bio: '你的个人简介',                  // 个人简介
  verified: false,                     // 是否认证账号
  followScreenName: 'your_username',   // 关注链接中的用户名
  archiveScreenName: 'your_username',  // 存档说明中的用户名
}
```

### 3. 配置爬虫脚本

编辑 `script/crawl.js`，配置以下信息：

#### 3.1 配置用户 ID

```javascript
const CONFIG = {
  USER_ID: '', // 填写要爬取的用户 ID
}
```

#### 3.2 配置认证信息

在浏览器中打开 X (Twitter)，按 F12 打开开发者工具，切换到 Network 标签页，然后访问你的个人主页。通过过滤字符串 “UserTweets”找到如图所示API 请求，右键选择 "复制为 cURL"或"Copy as cURL"，然后使用 AI 工具提取以下关键信息：

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

#### 方式一：使用统一入口（推荐）

```bash
node script/index.js
```

这个命令会自动执行：
1. 爬取推文数据（保存到 `public/page_XXX.json`）
2. 提取推文条目（生成 `public/entries.json`）

#### 方式二：分步执行

```bash
# 步骤 1: 爬取推文数据
node script/crawl.js

# 步骤 2: 提取推文条目
node script/extract-entries.js
```

### 5. 启动前端应用

开发模式：

```bash
pnpm dev
```

构建生产版本：

```bash
pnpm build
```

预览构建结果：

```bash
pnpm preview
```

## ⚠️ 注意事项

1. **认证信息**：爬虫脚本需要有效的 Twitter/X 认证信息才能正常工作
2. **使用条款**：请遵守 Twitter/X 的使用条款和 API 限制
3. **数据安全**：认证信息包含敏感数据，请勿提交到版本控制系统
4. **使用目的**：项目仅用于个人学习和研究目的
5. **图片资源**：由于原推特存档机制限制，推文的图片资源可能无法找回

## 📄 许可证

[BSD 3-Clause License](./LICENSE)

## 🙏 致谢

- [react-tweet](https://github.com/vercel/react-tweet) - 推文展示组件
- [html-to-image](https://github.com/bubkoo/html-to-image) - 图片导出功能