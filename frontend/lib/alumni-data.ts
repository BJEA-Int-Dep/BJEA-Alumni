export type Tone =
  | 'sunset'
  | 'ocean'
  | 'lemon'
  | 'mint'
  | 'berry'
  | 'graphite'
  | 'coral'
  | 'sky';

export interface AlumniProfile {
  avatarImageUrl?: string;
  avatarLabel?: string;
  id: string;
  nickname: string;
  year: string;
  emoji: string;
  summary: string;
  field: string;
  status: string;
  place: string;
  direction: string;
  reflection: string;
  advice: string;
  tone: Tone;
}

export const TONE_CLASSES: Record<Tone, string> = {
  sunset: 'from-[#ff7048] via-[#f59b24] to-[#ffd45a]',
  ocean: 'from-[#1678b8] via-[#58a9d8] to-[#bde4ee]',
  lemon: 'from-[#f6ac23] via-[#ffcf4f] to-[#fff0a2]',
  mint: 'from-[#3e9f67] via-[#73bd6b] to-[#c8e8a9]',
  berry: 'from-[#e34a35] via-[#ef735c] to-[#f8c5b5]',
  graphite: 'from-[#48515a] via-[#78828a] to-[#cbd0d3]',
  coral: 'from-[#ef593c] via-[#f18c58] to-[#ffd09e]',
  sky: 'from-[#1c83c5] via-[#71b5db] to-[#d1ebf5]',
};

export const ALUMNI: AlumniProfile[] = [
  {
    id: 'matcha',
    nickname: 'Matcha',
    year: '2023',
    emoji: '🦊',
    summary: '高中以为会学物理，最后每天都在 debug。',
    field: '计算机 · 在读',
    status: '还在大学',
    place: '北京 · 一所综合大学',
    direction: '计算机与创意编程',
    reflection: '挺喜欢，虽然凌晨两点修 bug 时会短暂反悔。',
    advice: '别急着找到唯一正确答案，先做一个你真的好奇的小项目。',
    tone: 'sunset',
  },
  {
    id: 'island',
    nickname: '小岛',
    year: '2021',
    emoji: '🐳',
    summary: '兜了一圈，发现喜欢的事真的可以慢慢找。',
    field: '环境研究 · Gap year',
    status: 'Gap year 中',
    place: '从广州一路走到海口',
    direction: '环境教育与纪录片',
    reflection: '绕路不等于走错，有些答案只在路上出现。',
    advice: '允许自己暂时不知道，但别停止观察和尝试。',
    tone: 'ocean',
  },
  {
    id: 'crispy',
    nickname: '阿脆',
    year: '2020',
    emoji: '🐣',
    summary: '白天做品牌，晚上认真研究烤面包。',
    field: '视觉设计 · 工作中',
    status: '已经工作',
    place: '上海 · 一间小型设计工作室',
    direction: '品牌与视觉设计',
    reflection: '专业只是入口，真正学会的东西都来自项目和同伴。',
    advice: '作品先做完，再做漂亮；生活也差不多。',
    tone: 'lemon',
  },
  {
    id: 'beibei',
    nickname: '北北',
    year: '2024',
    emoji: '🐼',
    summary: '选专业前想了很多，选完以后也还在想。',
    field: '社会学 · 在读',
    status: '还在大学',
    place: '成都 · 一所文理学院',
    direction: '社会学与城市研究',
    reflection: '正在喜欢上它，也保留随时转弯的权利。',
    advice: '多和具体的人聊天，比看一百篇专业介绍更有用。',
    tone: 'mint',
  },
  {
    id: 'bean',
    nickname: '一颗豆',
    year: '2019',
    emoji: '🦦',
    summary: '从社恐辩手，变成了会开会的社恐。',
    field: '公共政策 · 工作中',
    status: '已经工作',
    place: '北京 · 公益机构',
    direction: '青年公共项目',
    reflection: '不算当年的计划，但意外地适合我。',
    advice: '不用变成外向的人，也能把自己的想法说清楚。',
    tone: 'berry',
  },
  {
    id: 'gravity',
    nickname: '万有引力',
    year: '2022',
    emoji: '🐯',
    summary: '没有宏大计划，先把手边这件事做好。',
    field: '机械工程 · 在读',
    status: '还在大学',
    place: '天津 · 一所工科学院',
    direction: '机械设计与机器人',
    reflection: '谈不上命中注定，但越做越有意思。',
    advice: '别被“天赋”吓住，很多能力只是做得比昨天多一点。',
    tone: 'graphite',
  },
  {
    id: 'water',
    nickname: '三点水',
    year: '2018',
    emoji: '🐙',
    summary: '做过老师、剪过片，现在经营一家小工作室。',
    field: '内容创作 · 创业中',
    status: '自由职业 / 创业',
    place: '杭州 · 三人工作室',
    direction: '影像内容与教育',
    reflection: '履历看起来很跳，但每一段都带来了下一段。',
    advice: '先让自己成为一个可靠的人，机会通常喜欢可靠的人。',
    tone: 'coral',
  },
  {
    id: 'summer',
    nickname: '夏天同学',
    year: '2023',
    emoji: '🐸',
    summary: '人生支线很多，主线暂时加载中。',
    field: 'Undecided · 探索中',
    status: '还在大学',
    place: '加拿大 · 一所社区学院',
    direction: '还没决定，正在跨专业选课',
    reflection: '以前怕落后，现在更怕没认真体验过。',
    advice: '不知道想做什么时，先排除你确定不想做的。',
    tone: 'sky',
  },
  {
    id: 'mumu',
    nickname: '木木',
    year: '2020',
    emoji: '🦥',
    summary: '学的是经济，最擅长的却是把复杂事讲明白。',
    field: '职业教育 · 工作中',
    status: '已经工作',
    place: '苏州 · 职业教育团队',
    direction: '课程与学习体验设计',
    reflection: '专业没有白学，只是用法和想象中不太一样。',
    advice: '不要只问“这个专业能干嘛”，也问问“我想解决什么问题”。',
    tone: 'mint',
  },
  {
    id: 'eleven',
    nickname: '十一号',
    year: '2021',
    emoji: '🛸',
    summary: '休学半年做音乐，回来以后更知道为什么学习。',
    field: '声音艺术 · 在读',
    status: '重返校园',
    place: '海外 · 一所艺术学院',
    direction: '声音设计与交互装置',
    reflection: '和它形成了复杂但快乐的共生关系。',
    advice: '认真喜欢一件“没用”的事，它可能会偷偷改变你。',
    tone: 'ocean',
  },
];
