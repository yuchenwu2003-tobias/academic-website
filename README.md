# Tobias 个人网站

首页由个人介绍、旅行地图预览两块组成；完整旅行地图、兴趣爱好、文章与视频收藏通过独立入口访问。网站使用纯 HTML、CSS 和原生 JavaScript，个人内容集中保存在 `dist/content/site.json`，地图与目的地目录保存在独立资源文件中，没有构建依赖。

显示姓名为 **Tobias**，可随时修改。默认导航为首页、旅行地图（含心愿评分子页）、学术地图、兴趣爱好、文章、收藏视频与关于我；项目栏目默认隐藏，可按需启用。

右上角的白昼 / 黑夜按钮可切换主题，并会记住当前浏览器的选择。

语言切换提供简体中文、繁體中文和 English，选择保存在当前浏览器。翻译在本地完成，覆盖界面和预置地名；文章、个人标记的名称与备注保留原文。新增界面文案时按用途维护 `dist/assets/i18n-messages.js`、`i18n-destinations.js` 或 `i18n-place-search.js`，由 `i18n.js` 统一处理；不要将个人记录或在线搜索结果写进翻译字典。

## 本地运行与检查

安装 Node.js 后，在项目目录运行：

```sh
node scripts/serve.mjs
```

打开终端显示的地址预览，修改后刷新页面。提交或部署前运行：

```sh
node scripts/stamp-assets.mjs
node scripts/check.mjs
```

入口脚本与样式使用内容哈希版本，避免更新后浏览器继续显示旧样式；修改资源后先运行 `stamp-assets.mjs` 更新入口。检查覆盖内容格式、链接、日期、资源路径、托管配置及 JavaScript 语法。实际排版仍需人工查看。

## 文件与部署

| 位置 | 用途 |
| --- | --- |
| `dist/` | 可直接部署的网站文件 |
| `dist/content/site.json` | 个人资料、发布的旅行地点、链接、导航、文章、视频与作品 |
| `dist/assets/geography-data.js`、`geography-detail/` | 世界概览、区域与高清国界数据 |
| `dist/assets/destination-catalog.js` | 250 个预置城市与地标坐标 |
| `dist/assets/destinations-attribution.txt` | GeoNames 城市坐标来源与 CC BY 4.0 许可 |
| `dist/assets/place-search.js`、`i18n-place-search.js` | 地名搜索添加、在线结果与三语言提示 |
| `dist/assets/landmark-catalog.js`、`landmark-sprites-v3.js`、`travel-landmarks-atlas-v3.png` | 36 幅卡通地标、独立取图区域、地理坐标与优先级 |
| `dist/assets/country-flags.js`、`flags/` | 国家与地区旗帜映射、SVG 与许可 |
| `dist/assets/i18n.js` | 三语言界面与预置地名翻译 |
| `dist/assets/country-destinations.js` | 179 个国家／地区收藏入口与定位 |
| `dist/assets/pin-icons.js` | 城市水滴与国家旗杆两种个人图钉 |
| `dist/assets/place-info.js`、`place-media.js`、`travel-guides.js` | 地点资料卡、百科照片与旅行攻略详情 |
| `dist/assets/travel-ratings.js` | 国家与城市分开的心愿评分 |
| `dist/assets/academic-model.js`、`academic-map.js`、`academic-globe.js` | 研究组独立收藏、三种学术地图视图 |
| `dist/assets/earth-day.jpg`、`earth-night.jpg`、`earth-attribution.txt` | NASA 白天／夜景合成影像和来源 |
| `dist/assets/portrait.css` | 头像显示大小与脸部裁切位置 |
| `dist/assets/world-map.svg` | 保留的旧静态兼容底图 |
| `dist/assets/map-attribution.txt` | 地图数据来源与公共领域许可说明 |
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
    "location": "你的城市",
    "avatar": "assets/portrait.jpg"
  }
}
```

`name` 为显示名，`eyebrow` 为短句，`description` 为首页摘要，`bio` 为关于页介绍。可选的 `location` 显示在关于页。`handle` 保留为身份资料，目前不在页面显示。

可选的 `avatar` 用于侧栏、首页和关于页。现有头像通过 CSS 将原照片放大至显示窗口宽度的 **900%**，并设置 `translate(-52.27%, -60%)` 对准脸部；原照片像素没有改写。更换照片后在 `portrait.css` 调整裁切位置；只想放大圆形头像时修改对应的 `--portrait-size`。

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

## 使用与编辑旅行地图

首页第二块保留地图预览；左侧“旅行地图”进入 `#/travel`。点击大洲进入 `#/travel/continent/asia` 等页面，再点击国家或地区进入 `#/travel/country/dnk` 等页面。各层地址支持直接打开、刷新和浏览器前进后退。

完整地图下方提供 **250 个预录目的地：214 座城市与 36 个地标，覆盖 79 个国家或地区标识**。候选按当前世界、大洲或国家筛选，支持地名搜索、城市／地标筛选与“再看看更多”。点击“加入心愿”即按已有坐标添加“想去”标记，之后可在地图上编辑备注与状态；重复地点会显示“已在地图中”。这些候选是参考目录，只有点击添加后才计入个人地点，初始个人清单仍为空。城市坐标来自 [GeoNames](https://www.geonames.org/)，表示中心参考点，并非景区入口；来源与许可见 `destinations-attribution.txt`。

点击“添加地点”可按城市、景点或地名搜索：先展示已收录地点，提交搜索后从 Photon / OpenStreetMap 查找更多结果。选择结果即可加入心愿，不需要手动填写经纬度。也可通过“在地图上选位置”直接放置 📌；已有地点支持编辑名称、备注和状态，或删除。在线搜索结果的名称、地址与用户输入保留原文，界面提示支持三种语言。鼠标滚轮以光标为中心缩放，拖动可平移，`＋ / −` 用于缩放；下方的 🌐 按钮直接返回世界地图，在世界页则恢复完整世界视野。

预置目录在 `destination-catalog.js` 中维护，保留稳定的 `id`、`country`、`continent`、`lat`、`lon`、`kind` 与 `priority`。添加后的 ID 为 `destination-<目录 id>`；其位置仍在源点 150 米内时，区域归属沿用目录，避免小岛或海岸的概览轮廓误判。手工标记按坐标与地图多边形归属；海上位置可在世界页查看。新加坡和马尔代夫已有候选坐标，但当前底图没有独立国家入口，因此可在世界／亚洲页加入。不要为它们生成未注册的国家路由。

在线搜索结果可保存 `countryHint: {id, lat, lon}` 作为来源国家提示，随 JSON 备份保留；地点移离来源位置 150 米后重新按地图边界判断。在线搜索由明确提交触发，重复查询缓存，请求至少间隔 1.2 秒；[Photon](https://github.com/komoot/photon) 提供搜索，[OpenStreetMap](https://www.openstreetmap.org/copyright) 提供数据。服务不可用时仍可选择预录地点或地图选点。

个人图钉默认以原尺寸的 58% 显示，鼠标悬停、键盘聚焦或触屏按压时恢复原大小。内层图形在 210–240 毫秒内平滑缩放，尖端始终保持原经纬度；透明点击区域独立保留，触屏扩大命中范围，并尊重系统减少动画设置。

地图最多保留 1000 个可见地点。通过页面添加的标记默认只保存在当前浏览器的 `localStorage`，不会云同步，也不会自动写回网站源码。换设备时先导出 JSON，再在另一台设备导入；导入文件上限为 5 MB。导出文件也保留已隐藏的发布地点记录，导入时与当前地图合并。清理浏览器数据可能移除这些标记，建议定期导出备份。

浏览器不能保存时，页面会明确提示：本次修改暂存在当前页面，需导出地图备份；看到已添加状态不代表已成功写入持久存储。

若要把地点发布给所有有权访问网站的访问者，在 `dist/content/site.json` 的 `travel.destinations` 中配置地点并重新发布网站。`travel.title` 与 `travel.description` 设置旅行内容的标题和介绍：

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
        "lat": 48.8566,
        "lon": 2.3522,
        "status": "want",
        "url": "https://example.com/destination",
        "image": "assets/my-destination.jpg"
      }
    ]
  }
}
```

`id` 应唯一。`lat` 与 `lon` 可省略，但填写时必须成对出现，且必须为数字；纬度范围为 `-90` 至 `90`，经度范围为 `-180` 至 `180`。有坐标的地点才能在地图上定位，最多配置 1000 个；其 `name` 最长 80 个字符、`description` 最长 500 个字符、`id` 最长 93 个字符（地图内部会添加 `source-` 前缀）。可选的 `status` 为 `want`（想去）或 `visited`（去过），省略时默认想去。

`url` 与 `image` 是可省略的保留元数据，目前地图只使用坐标、名称、说明和 `status`。保留链接应使用完整的 http(s) 地址；保留本地图片应放入 `dist/` 内，并填写相对该目录的路径。配置文件中的地点属于发布内容；浏览器内保存的个人标记属于本地数据。

### 国家图钉、地点资料与心愿评分

添加地点窗口分为“城市／景点”和“国家／地区”。城市沿用水滴图钉，国家使用带小地球的旗杆图钉；两者可在同一位置分别收藏。国家通过稳定的 `countryId` 识别，不能因首都城市已经收藏就被视为重复国家。编辑时改变标记类型或国家身份会创建新标识并重置评分，防止以后添加原目录地点时覆盖另一条记录。

默认搜索也会同时显示匹配的国家结果（最多八个），无需先切换分类；专用“国家／地区”页签仍可搜索完整国家目录。学术机构定位继续只使用城市／地点结果。资料页图片旁的“更换图片”可展开编辑并定位自定义图片链接，只有点击保存后才更新；清空链接并保存会恢复自动照片。

国家图钉定位在首都，已有国家记录在读取、保存和显示时也会更新至相同位置，保留评分与全部资料；城市和景点坐标不变。179 个单元中，178 个提供首都或明确的行政中心，南极没有首都，保留注明的地理中心。通常使用官方／宪法首都（例如荷兰 Amsterdam、马来西亚 Kuala Lumpur、玻利维亚 Sucre；南非使用 Pretoria）；属地使用注明的行政中心。坐标来自 Natural Earth 和 GeoNames，出处、来源 ID、特殊情况记录在 `country-capitals.js`。图钉位置不改变国家边界、归属和现有路由。

点击地图图钉或下方已收藏地点会打开资料卡，包含照片、维基百科、自己的介绍、收藏的攻略及独立心愿评分。点击卡片标题或照片进入 `#/travel/guide/place/<pin-id>` 或 `#/travel/guide/country/<country-id>`；国家卡片和详情页列出归属于该国家的全部已收藏城市／景点。浏览尚未收藏的国家详情不会自动创建图钉，保存介绍时才加入国家收藏。

自动照片由维基百科公开 API 获取，只查询目录名称或地点名称，不发送自己的介绍、攻略或评分。优先使用带自由许可的 Wikimedia 图片，并提供文件许可说明链接；请求失败时显示占位图和百科搜索入口。自己的 `photoUrl` 可替换自动照片，必须是 HTTPS；`wikipediaUrl` 仅允许维基百科 HTTPS 地址；`guides` 最多 30 条 `{title,url}`，链接须为无账号密码的 HTTP(S) 地址。自己的介绍 `note` 最多 5000 字符。这些资料随原 version 1 旅行 JSON 一起备份，旧版没有这些字段的备份仍可导入。

“旅行地图”下的“心愿评分”进入 `#/travel/ratings`。国家、城市与景点分开评分，不继承、不平均；1–5 分表示想去程度，0 表示未评分。可以查看已收藏或全部目录，按地名搜索并排序。为未收藏的目录地点打 1–5 分会同时加入心愿；清零不会删除地点，浏览页面也不会自动添加记录。`desireRating` 仅接受 0–5 整数。

直接点击第几颗星就是几分，悬停或聚焦时预览；双击星星清除评分，界面不再显示单独清除按钮。支持触屏与键盘 Tab、Enter／空格；方向键及 Home／End 可在五颗星之间移动焦点，Delete／Backspace 清除当前评分。清除不会删除已收藏的地点。

## 使用学术地图

左侧“学术地图”位于兴趣爱好上方，入口 `#/academic`，支持相同的大洲／国家层级。初始研究组为空，所有内容由自己收藏；学术地图使用地理底图和书本标记，没有旅行插画。

三种视图共用相同经纬度和收藏：默认“地理球”可拖动旋转、滚轮或双指缩放，方向键也可旋转，`+/-` 缩放、Home 复位；“平面地图”保留 Equal Earth 地理地图；“卫星地球”使用本地 NASA Blue Marble 白天图与 Earth at Night 2012 夜景，按当前 UTC 时间计算太阳位置，每分钟更新晨昏过渡。影像为静态卫星合成图，不是实时天气或实时拍摄。太阳计算参考 NOAA 公式，出处与影像署名见 `earth-attribution.txt`。球面正反投影共用同一套计算，背面标记隐藏；拖动和缩放不改变收藏的真实位置。

视图按钮按“平面地图 → 地理球 → 卫星地球”排列，学术平面地图不显示大洲文字标签。球体静止时按显示尺寸和屏幕像素密度超采样（普通屏至少 1.5 倍，DPR 取值最高 2），画布长边最高 3072 像素；拖动预览使用 720 像素，松手后恢复高清双线性采样。地理填色纹理为 4096×2048，国界和海岸线在最终画布上另外直接绘制矢量细线，按球面地平线裁切，放大时不拉伸边线贴图。加载 50m 边界，放大至 2.2 倍后为视野附近最多四国补充 10m 细节。NASA 原始白天图为 5400×2700、夜景为 3600×1800，桌面保留原图，移动端按显示尺寸限制采样内存；影像使用独立版本地址以更新旧缓存。地理位置、图钉和鼠标选点继续使用真实经纬度。

点击“收藏研究组”后，显式搜索所在城市或机构并选择结果，再填写名称、机构、研究方向、官网和备注。搜索只发送所填写的位置查询，不发送研究组介绍或备注。也可点击“在地图上选位置”，再在球面或平面放点；界面不要求输入经纬度。列表支持按研究组、机构或研究方向查找，点击标记或列表可编辑完整资料。

学术收藏独立保存在 `tobias.academic-map.v1`，显示偏好使用 `tobias.academic-map.view.v1`；完全不读写旅行地点、评分或插画偏好。备份结构为 `{type:"academic-map",version:1,groups:[...]}`，必须使用“导出研究组／导入”迁移，不能混用旅行备份。最多 1000 个研究组、文件 5 MB。官网仅接受不含账号密码的 HTTP(S) 链接。浏览器存储失败时资料暂存在当前页面并提示导出；更换设备和清理数据前请备份。

### 地图样式、精度与旗帜

地图采用 **Equal Earth 等面积投影**，参考[联合国关于等面积地图的倡议](https://www.un.org/osaa/en/news/victory-africa-un-votes-resolution-correct-map)；边界来自公共领域 [Natural Earth](https://www.naturalearthdata.com/)，并非联合国发布的官方边界地图。

国界按缩放逐级加载 **110m 世界概览 → 50m 区域细节 → 10m 高清细节**。这里的 `m` 表示 million：对应约 1:1.1 亿、1:5000 万和 1:1000 万地图比例尺，**不是 110 米／50 米／10 米定位精度**。路径为矢量，放大时同时换用更细的轮廓；加载失败会保留可用轮廓并显示提示。177 个地理单元及其路由 ID 保持一致。

哈萨克斯坦高清轮廓对拜科努尔作了一处显示修正：源数据将它单列为哈萨克斯坦主权下的租借区，并在国家图形中留下对应孔洞。本站核对租借区外环与该孔逐点反向一致后，将这一处孔并回哈萨克斯坦地表，避免露出水面底色；没有新增主权国界或国家入口。原始来源、租借性质及修正范围记录在 `dist/assets/map-attribution.txt`，其他地形和湖泊数据保持原样。

“地理地图”与“插画地图”共用坐标和个人标记。插画模式使用 **36 幅新版 3D 卡通地标与风景**；每幅插画的底部中心和小圆点始终锚定真实经纬度，缩放与拖拽时不做位置偏移。遇到其他插画、文字或控件遮挡时，按优先级隐藏部分插画，放大后有足够空间再显示。插画仅用于辨认和探索地点，不代表本人想去或去过；它们与候选目录、个人 📌 分开计数。

当前原图为透明的 `travel-landmarks-atlas-v3.png`。实际取图使用 `landmark-sprites-v3.js` 中每个地标 ID 对应的独立 `sourceBox`（`x`、`y`、`width`、`height`），**不再按等分方格裁切**；每个区域根据原图的独立透明轮廓确定并额外留出 8 像素空白，避免裁断地标或带入相邻图案。渲染时保持宽高比，水平居中、底部对齐真实位置，并使用柔边遮罩处理边缘。原始生成图片的像素未改写。增补或替换插画时，同时维护独立取图区域、`landmark-catalog.js` 中的地理坐标和 `priority`；`cell` 保留原图行列顺序索引，再检查各洲与手机视图是否重叠。不要仅靠等分图格推断新版插画的轮廓范围。

旗帜来自本地保存的 [flag-icons](https://github.com/lipis/flag-icons) SVG，使用 MIT 许可；来源与原许可保存在 `flags/SOURCES.txt` 和 `flags/LICENSE.txt`。南极没有统一官方国旗，只作地理符号说明；北塞浦路斯（`cyn`）、索马里兰（`sol`）没有当前数据对应的 ISO2 旗帜资源，显示占位符，不借用其他国家旗帜。新增单元时先核对映射和许可。

插画按页面层级安排：世界初始提供 11 个代表地标候选，优先保留非洲桌山、印度泰姬陵和土耳其卡帕多奇亚，并在空间允许时增加东非草原，使非洲显示 1–2 个代表。世界概览的图标会按屏幕宽度缩小，窄屏省略文字标签；完整名称保留在悬停与无障碍标签中。放大至 2 倍、5 倍逐步增加区域和当地细节，实际仅显示真实位置处不相互遮挡的插画。大洲页先展示该洲代表建筑与风景，相对初始视图放大 1.6 倍后补充当地细节；国家页只使用本国完整图集，并由避让布局决定当前可见内容。

相关逻辑：`projection.js` 负责投影与逆投影，`geography.js` 负责地区路由和标记归属，`map-detail.js` 加载国界细节，`landmark-curation.js` 决定各层候选，`landmark-layout.js` 计算插画避让。更换投影或边界数据时保留个人标记的经纬度、名称、备注与状态；现有版本 1 的 JSON 备份无需转换。

水域由独立的 `lake-layer.js`、`lake-data.js` 和 `lake-detail/` 绘制在国家填色之上。使用 Natural Earth 当前湖泊数据及里海水面，排除历史湖形图层，避免湖面被国家颜色填满；水域与国界一样随视图加载细节，并保留岛屿孔洞。湖岸是地图数据的静态概括，不表示实时水位。

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
    { "id": "travel", "label": "旅行地图", "enabled": true },
    { "id": "interests", "label": "兴趣爱好", "enabled": true },
    { "id": "writing", "label": "文章", "enabled": true },
    { "id": "videos", "label": "收藏视频", "enabled": true },
    { "id": "about", "label": "关于我", "enabled": true },
    { "id": "projects", "label": "项目", "enabled": false }
  ]
}
```

修改 `label` 可重命名，调整数组顺序可排序，`enabled: false` 隐藏导航入口。隐藏入口不限制直接访问对应地址。新增导航前应先实现页面与路由。

## 新增栏目

现有核心路由为：

| 地址 | 页面 |
| --- | --- |
| `#/` | 首页 |
| `#/travel` | 完整旅行地图与地点管理 |
| `#/travel/continent/<id>` | 大洲地图与国家入口 |
| `#/travel/country/<id>` | 国家或地区地图 |
| `#/interests` | 兴趣爱好 |
| `#/writing` | 文章列表 |
| `#/videos` | 视频收藏 |
| `#/about` | 关于 |
| `#/post/<id>` | 文章详情 |
| `#/projects` | 预留作品页，默认隐藏导航入口 |

`app.js` 导出 `pageRenderers` 映射，现有键为 `home`、`travel`、`interests`、`writing`、`videos`、`about` 与 `projects`。`renderRoute` 根据 hash 路径选择页面，`navigation` 中的 `id` 对应映射中的键。大洲 ID 为 `asia`、`europe`、`africa`、`north-america`、`south-america`、`oceania`、`antarctica`；国家或地区 ID 沿用 Natural Earth 的 `ADM0_A3` 小写形式。

例如未来增加“阅读”栏目，可以沿用现有结构：

1. 在 `site.json` 新增 `books` 等独立内容数组，并为条目设置稳定的 `id`。
2. 在 `app.js` 中编写该栏目的 renderer，复用现有页面容器和卡片样式。
3. 将新 renderer 加入 `pageRenderers` 的 `reading` 键，并配合 `renderRoute` 的路由规则使 `#/reading` 能显示新页面。
4. 在 `navigation` 中添加 `{ "id": "reading", "label": "阅读", "enabled": true }`，并同步 `scripts/check.mjs` 中的 `registeredPages` 页面列表。
5. 检查直接打开链接、刷新、浏览器前进后退、空列表和手机布局。

`now`、`featured`、`accent` 为预留字段，当前页面不读取它们；修改这些值不会产生可见变化。保留现有默认值即可。`extensionNotes` 记录维护约定，也不直接生成页面功能。

私人头像照片及该配置字段不包含在公开 GitHub 源码中；私有 Sites 源码和本人下载的交付包保留照片。

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

## 维护兴趣爱好页

左侧导航的“兴趣爱好”位于“旅行地图”之后，地址为 `#/interests`。页面先预留六个方向，供以后添加个人内容；默认方向示例不代表已经确认的个人爱好或经历。

| ID | 方向 |
| --- | --- |
| `reading-writing` | 阅读与写作 |
| `music-film` | 音乐与影像 |
| `sports-outdoors` | 运动与户外 |
| `travel-nature` | 旅行与自然 |
| `technology-making` | 科技与创造 |
| `art-everyday` | 艺术与生活 |

内容保存在 `dist/content/site.json` 的 `interests` 数组。每项包含稳定的 `id`、显示标题 `title`、说明 `description`、可展开的方向示例 `topics` 数组，以及真实记录 `notes` 数组。向 `notes` 添加文字后，卡片会显示记录及数量；空数组显示“待补充”。修改这些内容并重新发布即可更新页面，访客不能直接在页面编辑，也不会写入旅行地图的本地标记存储。

