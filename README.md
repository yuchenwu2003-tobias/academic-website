# Tobias 个人网站

首页由个人介绍、旅行目的地心愿清单两块组成；文章与视频收藏通过独立入口访问。网站使用纯 HTML、CSS 和原生 JavaScript，内容集中保存在 `dist/content/site.json`，没有构建依赖。

显示姓名暂用 GitHub handle 中的 **Tobias**，可随时修改。默认导航为首页、文章、视频与关于，作品栏目作为可启用的扩展入口保留。

## 本地运行与检查

安装 Node.js 后，在项目目录运行：

```sh
node scripts/serve.mjs
```

打开终端显示的地址预览，修改后刷新页面。提交或部署前运行：

```sh
node scripts/check.mjs
```

检查覆盖内容格式、链接、日期、资源路径、托管配置及 JavaScript 语法。实际排版仍需人工查看。

## 文件与部署

| 位置 | 用途 |
| --- | --- |
| `dist/` | 可直接部署的网站文件 |
| `dist/content/site.json` | 个人资料、旅行心愿、链接、导航、文章、视频与作品 |
| `scripts/serve.mjs` | 本地预览服务 |
| `scripts/check.mjs` | 项目检查 |
| `README.md` | 内容维护与扩展说明 |

生产环境直接托管 `dist/`。网站使用 hash 路由，例如 `/#/writing`，无需配置服务器路由重写。

源码备份仓库为 <https://github.com/yuchenwu2003-tobias/academic-website>。推送源码后是否自动部署，取决于后续的托管配置。

## 修改个人资料

编辑 `dist/content/site.json` 中的 `profile`：

```json
{
  "profile": {
    "name": "Tobias",
    "handle": "tobias",
    "eyebrow": "记录思考，持续创造",
    "description": "放在首页的简短介绍。",
    "bio": "更完整的个人介绍。",
    "location": "你的城市"
  }
}
```

`name` 为显示名，`eyebrow` 为短句，`description` 为首页摘要，`bio` 为关于页介绍。可选的 `location` 显示在关于页。`handle` 保留为身份资料，目前不在页面显示。

`links` 保存个人外部链接：

```json
{
  "links": [
    { "label": "GitHub", "url": "https://github.com/你的账号" },
    { "label": "邮箱", "url": "mailto:你的邮箱地址" }
  ]
}
```

默认只配置 GitHub；添加邮箱链接后，关于页才会显示邮箱入口。`dist/` 中的内容会公开，请勿放入私密资料或密钥。

## 编辑旅行心愿清单

`travel` 控制首页第二块内容。`title` 与 `description` 是这一块的标题和介绍，`destinations` 保存想去的目的地。初始列表为空，待你选择真实的心愿后再添加：

```json
{
  "travel": {
    "title": "想去的地方",
    "description": "为下一段旅程，先留一个位置。",
    "destinations": [
      {
        "id": "a-place-i-want-to-visit",
        "name": "目的地名称",
        "region": "所在地区",
        "description": "为什么想去这里。",
        "url": "https://example.com/destination",
        "image": "assets/my-destination.jpg"
      }
    ]
  }
}
```

`id` 应唯一。`url` 与 `image` 可省略。链接使用完整的 http(s) 地址；本地图片放入 `dist/` 内，并填写相对该目录的路径。目的地由你维护，当前没有地图、订票或实时信息服务。

## 添加作品（预留栏目）

作品栏目默认隐藏。需要使用时，先添加作品，再将 `navigation` 中 `projects` 的 `enabled` 改为 `true`。

在 `projects` 数组中添加一个对象：

```json
{
  "id": "my-new-project",
  "title": "作品名称",
  "category": "设计 / 开发",
  "description": "介绍作品解决的问题，以及你的工作。",
  "status": "进行中",
  "year": "2026",
  "url": "https://example.com",
  "featured": true,
  "accent": "violet"
}
```

`id` 应使用唯一、稳定的英文小写字母、数字和连字符。没有公开地址时省略 `url`。作品按数组顺序显示；`year`、`featured`、`accent` 是保留元数据，目前不影响页面显示。

## 添加文章

在 `posts` 数组中添加文章。可以链接已在其他平台发布的文章，也可以把正文保存在站内。

链接外部文章时，填写可选的 `url`。访问者点击后会直接前往原文：

```json
{
  "id": "an-external-article",
  "title": "文章标题",
  "category": "随笔",
  "date": "2026-10-17",
  "excerpt": "简单介绍文章内容。",
  "readingMinutes": 3,
  "url": "https://example.com/my-article",
  "featured": true,
  "body": []
}
```

站内文章不填写 `url`，用 `body` 保存正文。`id` 决定文章地址，例如 `id` 为 `a-new-start` 时，访问 `/#/post/a-new-start`：

```json
{
  "id": "a-new-start",
  "title": "一篇新文章",
  "category": "随笔",
  "date": "2026-10-17",
  "excerpt": "出现在文章列表中的简短摘要。",
  "readingMinutes": 3,
  "featured": true,
  "body": [
    { "type": "paragraph", "text": "文章开头。" },
    { "type": "heading", "text": "一个小标题" },
    { "type": "quote", "text": "一段引用或值得强调的话。" },
    { "type": "list", "items": ["第一点", "第二点"] },
    { "type": "paragraph", "text": "文章结尾。" }
  ]
}
```

`date` 使用 `YYYY-MM-DD`，`readingMinutes` 为正整数。正文支持段落、小标题、引用与列表；其他格式需先扩展渲染器。`featured` 为预留字段，目前不控制推荐或排序。发布后保留文章 `id`，以保持已分享链接有效；草稿不应存入公开内容文件。

## 收藏视频

视频收藏默认是空列表，不会预先填入未经用户选择的视频。在 `videos` 数组中加入希望分享的视频链接：

```json
{
  "videos": [
    {
      "id": "a-video-to-keep",
      "title": "视频标题",
      "creator": "创作者名称",
      "platform": "视频平台名称",
      "category": "学习",
      "url": "https://example.com/watch/video",
      "description": "我收藏它的原因，或内容摘要。",
      "addedAt": "2026-10-17"
    }
  ]
}
```

`url` 指向视频原页面，`addedAt` 使用 `YYYY-MM-DD`，`id` 保持唯一。列表通过配置文件维护，不同步平台收藏夹，也不托管视频文件。

## 更新导航

`navigation` 控制导航项的名称、顺序与显示状态：

```json
{
  "navigation": [
    { "id": "home", "label": "首页", "enabled": true },
    { "id": "writing", "label": "文章", "enabled": true },
    { "id": "videos", "label": "视频", "enabled": true },
    { "id": "about", "label": "关于", "enabled": true },
    { "id": "projects", "label": "作品", "enabled": false }
  ]
}
```

修改 `label` 可重命名，调整数组顺序可排序，`enabled: false` 隐藏导航入口。隐藏入口不限制直接访问对应地址。新增导航前应先实现页面与路由。

## 新增栏目

现有核心路由为：

| 地址 | 页面 |
| --- | --- |
| `#/` | 首页 |
| `#/writing` | 文章列表 |
| `#/videos` | 视频收藏 |
| `#/about` | 关于 |
| `#/post/<id>` | 文章详情 |
| `#/projects` | 预留作品页，默认隐藏导航入口 |

`app.js` 导出 `pageRenderers` 映射，现有键为 `home`、`writing`、`videos`、`about` 与 `projects`。`renderRoute` 根据 hash 路径选择页面，`navigation` 中的 `id` 对应映射中的键。

例如未来增加“阅读”栏目，可以沿用现有结构：

1. 在 `site.json` 新增 `books` 等独立内容数组，并为条目设置稳定的 `id`。
2. 在 `app.js` 中编写该栏目的 renderer，复用现有页面容器和卡片样式。
3. 将新 renderer 加入 `pageRenderers` 的 `reading` 键，并配合 `renderRoute` 的路由规则使 `#/reading` 能显示新页面。
4. 在 `navigation` 中添加 `{ "id": "reading", "label": "阅读", "enabled": true }`，并同步 `scripts/check.mjs` 中的 `registeredPages` 页面列表。
5. 检查直接打开链接、刷新、浏览器前进后退、空列表和手机布局。

`profile.avatar`、`now`、`featured`、`accent` 为预留字段，当前页面不读取它们；修改这些值不会产生可见变化。保留现有默认值即可。`extensionNotes` 记录维护约定，也不直接生成页面功能。

## 未来接入 CMS 或更多功能

当前没有后台、数据库或留言提交服务，后续可逐步扩展：

- **接入 CMS：** 用数据适配层将 CMS 返回值转换成现有 `profile`、`travel`、`posts`、`videos` 等结构，继续复用页面 renderer。也可以在发布时由 CMS 生成静态 JSON。
- **内容增多：** 将文章正文拆成独立文件，按 `id` 加载；保留稳定的内容 ID。需要独立搜索元信息或无 hash 地址时，可迁移至静态生成框架。
- **加入互动：** 访客登录、收藏同步或留言需要接入服务，并实现权限与错误反馈。服务密钥应由服务端或部署平台保管。

## 每次更新的建议流程

1. 修改内容，保持 JSON 格式和 `id` 唯一。
2. 本地预览涉及的页面，检查手机布局与外部链接。
3. 运行 `node scripts/check.mjs`。
4. 备份源码到 GitHub，并按托管方式更新 `dist/`。


