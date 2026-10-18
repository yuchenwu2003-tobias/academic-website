// The atlas has six columns and six rows; cells are numbered in row-major order.
// These illustrative navigation landmarks are independent of personal travel pins.
// Landscape coordinates indicate a representative viewpoint, not an entire region.
export const LANDMARK_CATALOG = [
  // Row 1 — Europe.
  { id: 'eiffel', title: '埃菲尔铁塔', country: 'fra', lat: 48.8584, lon: 2.2945, cell: 0, priority: 1 },
  { id: 'big-ben', title: '大本钟', country: 'gbr', lat: 51.5007, lon: -0.1246, cell: 1, priority: 2 },
  { id: 'colosseum', title: '罗马斗兽场', country: 'ita', lat: 41.8902, lon: 12.4922, cell: 2, priority: 2 },
  { id: 'sagrada', title: '圣家堂', country: 'esp', lat: 41.4036, lon: 2.1744, cell: 3, priority: 2 },
  { id: 'windmill', title: '小孩堤防风车', country: 'nld', lat: 51.8830, lon: 4.6390, cell: 4, priority: 3 },
  { id: 'neuschwanstein', title: '新天鹅堡', country: 'deu', lat: 47.5576, lon: 10.7498, cell: 5, priority: 3 },
  // Row 2 — Africa and Petra.
  { id: 'pyramids', title: '吉萨金字塔', country: 'egy', lat: 29.9792, lon: 31.1342, cell: 6, priority: 1 },
  { id: 'petra', title: '佩特拉古城', country: 'jor', lat: 30.3306, lon: 35.4433, cell: 7, priority: 2 },
  { id: 'savanna', title: '马赛马拉 · 稀树草原', country: 'ken', lat: -1.4931, lon: 35.1439, cell: 8, priority: 2 },
  { id: 'kilimanjaro', title: '乞力马扎罗山', country: 'tza', lat: -3.0674, lon: 37.3556, cell: 9, priority: 2 },
  { id: 'table-mountain', title: '桌山', country: 'zaf', lat: -33.9628, lon: 18.4098, cell: 10, priority: 2 },
  { id: 'koutoubia', title: '马拉喀什 · 库图比亚清真寺', country: 'mar', lat: 31.6241, lon: -7.9936, cell: 11, priority: 3 },
  // Row 3 — Asia.
  { id: 'great-wall', title: '万里长城 · 八达岭', country: 'chn', lat: 40.3541, lon: 116.0072, cell: 12, priority: 1 },
  { id: 'fuji', title: '富士山', country: 'jpn', lat: 35.3606, lon: 138.7274, cell: 13, priority: 1 },
  { id: 'taj-mahal', title: '泰姬陵', country: 'ind', lat: 27.1751, lon: 78.0421, cell: 14, priority: 2 },
  { id: 'angkor', title: '吴哥窟', country: 'khm', lat: 13.4125, lon: 103.8670, cell: 15, priority: 2 },
  { id: 'borobudur', title: '婆罗浮屠', country: 'idn', lat: -7.6079, lon: 110.2038, cell: 16, priority: 3 },
  { id: 'cappadocia', title: '卡帕多奇亚 · 格雷梅', country: 'tur', lat: 38.6431, lon: 34.8289, cell: 17, priority: 3 },
  // Row 4 — The Americas and Australia.
  { id: 'liberty', title: '自由女神像', country: 'usa', lat: 40.6892, lon: -74.0445, cell: 18, priority: 1 },
  { id: 'golden-gate', title: '金门大桥', country: 'usa', lat: 37.8199, lon: -122.4783, cell: 19, priority: 2 },
  { id: 'chichen-itza', title: '奇琴伊察', country: 'mex', lat: 20.6843, lon: -88.5678, cell: 20, priority: 2 },
  { id: 'christ-redeemer', title: '里约基督像', country: 'bra', lat: -22.9519, lon: -43.2105, cell: 21, priority: 1 },
  { id: 'machu-picchu', title: '马丘比丘', country: 'per', lat: -13.1631, lon: -72.5450, cell: 22, priority: 2 },
  { id: 'opera-house', title: '悉尼歌剧院', country: 'aus', lat: -33.8568, lon: 151.2153, cell: 23, priority: 1 },
  // Row 5 — China: natural landscapes and city landmarks.
  { id: 'panda', title: '成都 · 熊猫与竹林', country: 'chn', lat: 30.7338, lon: 104.1459, cell: 24, priority: 2 },
  { id: 'guilin', title: '桂林山水', country: 'chn', lat: 25.2639, lon: 110.2978, cell: 25, priority: 3 },
  { id: 'huangshan', title: '黄山', country: 'chn', lat: 30.1453, lon: 118.1551, cell: 26, priority: 3 },
  { id: 'potala', title: '布达拉宫', country: 'chn', lat: 29.6578, lon: 91.1172, cell: 27, priority: 3 },
  { id: 'shanghai', title: '上海天际线', country: 'chn', lat: 31.2397, lon: 121.4998, cell: 28, priority: 3 },
  { id: 'forbidden-city', title: '北京故宫', country: 'chn', lat: 39.9163, lon: 116.3972, cell: 29, priority: 3 },
  // Row 6 — More landscapes, including Antarctica.
  { id: 'fushimi-inari', title: '京都 · 伏见稻荷鸟居', country: 'jpn', lat: 34.9671, lon: 135.7727, cell: 30, priority: 3 },
  { id: 'lavender', title: '北海道 · 富田农场薰衣草', country: 'jpn', lat: 43.4172, lon: 142.4278, cell: 31, priority: 3 },
  { id: 'everest', title: '珠穆朗玛峰', country: 'npl', lat: 27.9881, lon: 86.9250, cell: 32, priority: 2 },
  { id: 'bali-coast', title: '巴厘岛 · 乌鲁瓦图海岸', country: 'idn', lat: -8.8291, lon: 115.0849, cell: 33, priority: 3 },
  { id: 'grand-canyon', title: '科罗拉多大峡谷', country: 'usa', lat: 36.0610, lon: -112.1076, cell: 34, priority: 2 },
  { id: 'penguin', title: '南极 · 企鹅与冰原', country: 'ata', lat: -77.5500, lon: 166.1700, cell: 35, priority: 1 },
  // Independent transparent artwork; coordinates refer to the summit / representative viewpoint.
  { id:'matterhorn',title:'马特洪峰',country:'che',countries:['che','ita'],lat:45.9764,lon:7.6586,priority:2 },
  { id:'dolomites',title:'多洛米蒂 · 三峰山',iconSize:56,country:'ita',lat:46.6191,lon:12.3030,priority:2 },
  {id:'yushan',title:'玉山',country:'twn',lat:23.47,lon:120.957267,priority:2},
  {id:'mont-saint-michel',title:'圣米歇尔山',country:'fra',lat:48.635558,lon:-1.510558,priority:2},
  {id:'etretat',title:'埃特勒塔白崖',country:'fra',lat:49.70639,lon:0.20667,priority:2},
];
