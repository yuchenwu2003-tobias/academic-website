# Tobias 个人网站

一个便于持续添加内容的个人网站起点，使用纯 HTML、CSS 和原生 JavaScript，没有构建依赖。页面内容集中保存在 `dist/content/site.json`，部署时直接托管 `dist/` 目录即可。

首页先展示个人介绍，再展示旅行目的地心愿清单；文章链接与视频收藏保留独立入口。用户尚未提供显示姓名，网站暂用 GitHub handle 中的 **Tobias**，姓名、介绍和链接都可以修改。默认导航包括首页、文章、视频与关于；作品栏目作为可启用的扩展入口保留。

## 本地运行与检查

需要本机安装 Node.js。在项目目录打开终端后运行：

```sh
node scripts/serve.mjs
```

打开终端显示的本地地址预览网站。修改文件后刷新页面即可查看更新。

提交或部署前运行：

```sh
node scripts/check.mjs
```

该检查用于发现项目中可自动验证的问题，修改内容后仍应在浏览器中检查手机和桌面布局、导航、链接及文章排版。

## 文件与部署

| 位置 | 用途 |
| --- | --- |
| `dist/` | 可直接部署的网站文件 |
| `dist/content/site.json` | 个人资料、旅行心愿、链接、导航、文章、视频、作品和近况 |
| `scripts/serve.mjs` | 本地预览服务 |
| `scripts/check.mjs` | 项目检查 |
| `README.md` | 内容维护与扩展说明 |

生产环境将 `dist/` 作为站点根目录，无需执行依赖安装或构建。现有导航使用 hash 路由，例如 `/#/writing`，静态托管无需为这些路由单独配置服务器重写。

源码备份仓库为 <https://github.com/yuchenwu2003-tobias/academic-website>。该仓库与网站托管是两个独立环节；将本地源码推送至仓库后，是否自动部署取决于后续配置的托管服务。

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

`name` 为网站显示名，`handle` 为个人标识，`eyebrow` 为短句，`description` 为摘要，`bio` 为详细介绍。`avatar` 与 `location` 是可选项。使用头像时，将图片放入 `dist/` 内合适的资源目录，并把 `avatar` 设为对应的站内路径。

`links` 保存个人外部链接：

```json
{
  "links": [
    { "label": "GitHub", "url": "https://github.com/你的账号" },
    { "label": "邮箱", "url": "mailto:你的邮箱地址" }
  ]
}
```

只保留已经准备好的链接。站点默认没有配置邮箱；添加有效的邮箱链接后再显示联系方式。不要把私密信息或密钥写入这些文件，`dist/` 中的内容会公开给访问者。

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

每个目的地的 `id` 应唯一。`url` 与 `image` 是可选项，没有准备好时直接省略。链接使用完整的 http(s) 地址；本地图片放入 `dist/` 内，并确保配置中的相对路径正确。它是一份自己维护的心愿清单，当前没有地图、订票或实时目的地信息服务。

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

每个 `id` 应唯一，建议使用稳定的英文小写字母、数字和连字符。没有公开访问地址时，省略 `url`。`featured` 控制作品是否作为精选内容；`accent` 为作品视觉样式标识，应沿用已有条目的值或配合样式表扩展。数组顺序可用于调整内容的排列。

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

`date` 使用 `YYYY-MM-DD` 格式，`readingMinutes` 为预计阅读分钟数。正文按 `body` 的顺序显示，当前支持段落、小标题、引用与列表。需要图片、代码块或其他格式时，应先扩展正文渲染器，再添加对应的数据类型。

文章发布后尽量保留原有 `id`，避免已分享的文章链接失效。此版本的内容文件会随网站一同公开，不适合存放未准备公开的草稿。

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

`url` 指向视频原页面，`addedAt` 使用 `YYYY-MM-DD` 格式。保持 `id` 唯一。收藏功能通过修改配置文件维护；页面不会自动同步视频平台的收藏夹，也不会上传或托管视频文件。

## 更新近况与导航

`now` 用于更新当前关注或正在进行的事：

```json
{
  "now": [
    { "label": "正在做", "text": "一件近期投入的事情。" },
    { "label": "正在读", "text": "一本书或一个主题。" }
  ]
}
```

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

修改 `label` 可重命名，调整数组顺序可调整导航排列，设为 `enabled: false` 可隐藏入口。隐藏导航只是隐藏入口，不能作为访问权限控制。新增导航项前应先为其实现页面与路由。

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

建议让内容结构、页面渲染和样式各自保持清晰边界。一个栏目先用独立数组开始，条目数量变多后，再拆成单独 JSON 文件或按需加载，避免过早引入复杂系统。`extensionNotes` 用于记录维护和扩展约定，编辑此字段不会自动生成新功能。

## 未来接入 CMS 或更多功能

当前网站没有后台、数据库或留言提交服务。文章、视频与作品通过修改静态 JSON 维护。后续扩展可以按实际需要逐步进行：

- **内容管理：** 保持 `profile`、`travel`、`posts`、`videos`、`projects` 等页面所需的数据结构，通过一个数据适配层把 CMS 返回值转换成现有结构。页面 renderer 就可以继续复用。
- **内容增多：** 将文章正文拆成独立文件，列表保留摘要；详情页按文章 `id` 加载正文。需要搜索时，再添加索引或搜索服务。
- **编辑与发布：** 可选择由 CMS 在发布时生成静态内容文件，再交给托管平台部署。这样公开页面仍可保持静态站点的部署方式。
- **账户或互动：** 若未来需要访客登录、个人收藏同步或留言，再引入相应服务，并实现权限、错误反馈和隐私说明。仅增加页面按钮不会形成可用的提交功能。
- **链接与搜索呈现：** 若以后需要每篇文章拥有独立的搜索元信息、无需 hash 的地址或服务端功能，可迁移至静态生成框架，同时沿用已整理的内容 schema 与稳定 `id`。

浏览器端文件会公开。未来接入需要凭证的 CMS 或其他服务时，私密密钥应由服务端或部署平台保管，不应放入 `site.json` 或前端 JavaScript。

## 每次更新的建议流程

1. 修改内容或页面，检查 JSON 的逗号、引号及唯一 `id`。
2. 本地预览，打开涉及的列表页与详情页，并检查外部链接。
3. 运行 `node scripts/check.mjs`，处理发现的问题。
4. 将源码备份到 GitHub，再按所选托管方式更新 `dist/`。

