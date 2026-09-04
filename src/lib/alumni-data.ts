export type Tone =
  | 'sunset'
  | 'ocean'
  | 'lemon'
  | 'mint'
  | 'berry'
  | 'graphite'
  | 'coral'
  | 'sky';

export type StatusId =
  | 'university'
  | 'working'
  | 'gap'
  | 'independent'
  | 'private';

export interface AlumniProfile {
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

export interface PersonalityOption {
  id: string;
  label: string;
  note: string;
  emoji: string;
  tone: Tone;
  summary: string;
  description: string;
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

export const PERSONALITIES: PersonalityOption[] = [
  {
    id: 'observer',
    label: '安静观察员',
    note: '话不多，但什么都看见了',
    emoji: '🦉',
    tone: 'ocean',
    summary: '看起来很安静，脑内同时开着十二个窗口。',
    description: '戴圆框眼镜的蓝色猫头鹰，安静、好奇、有一点夜猫子气质，轻松插画风',
  },
  {
    id: 'vibe',
    label: '气氛组常驻',
    note: '班级群里的能量补给站',
    emoji: '🐣',
    tone: 'lemon',
    summary: '擅长让尴尬的空气重新流动起来。',
    description: '橙黄色小鸟，表情很有感染力，随身带着快乐能量，轻松插画风',
  },
  {
    id: 'sprint',
    label: '截止日前爆发',
    note: '压力越大，手速越快',
    emoji: '🐯',
    tone: 'sunset',
    summary: '平时像在待机，DDL 前突然拥有超能力。',
    description: '穿连帽衫的小老虎，手边有咖啡和便利贴，行动力爆发，轻松插画风',
  },
  {
    id: 'npc',
    label: '校园野生 NPC',
    note: '总在奇怪的地方触发支线',
    emoji: '🦦',
    tone: 'mint',
    summary: '没有固定人设，但经常解锁意外剧情。',
    description: '背着帆布包的水獭，收藏奇怪小物件，松弛又神秘，轻松插画风',
  },
];

export const STATUS_OPTIONS: Array<{
  id: StatusId;
  label: string;
  note: string;
  emoji: string;
}> = [
  { id: 'university', label: '还在大学', note: '作业与理想轮流出现', emoji: '🎒' },
  { id: 'working', label: '已经工作', note: '正在学习如何开会', emoji: '💻' },
  { id: 'gap', label: 'Gap / 转弯中', note: '暂时离开默认路线', emoji: '🧭' },
  { id: 'independent', label: '创业 / 自由职业', note: '自己画地图，也自己踩坑', emoji: '🚀' },
  { id: 'private', label: '暂时不想透露', note: '完全没问题，直接跳过', emoji: '🌫️' },
];

export const PLACE_SUGGESTIONS: Record<StatusId, string[]> = {
  university: ['北京的一所大学', '国内其他城市', '海外校园', '还在准备申请'],
  working: ['留在北京工作', '去了南方城市', '在海外工作', '远程工作中'],
  gap: ['在旅行', '在准备申请', '在做个人项目', '先休息充电'],
  independent: ['自己的小工作室', '三五人的创业团队', '独立创作中', '到处办公'],
  private: ['暂时保密'],
};

export const DIRECTION_OPTIONS: Record<StatusId, string[]> = {
  university: ['计算机 / 工程', '艺术 / 设计', '社科 / 人文', '商科 / 经济', '还没想明白'],
  working: ['科技 / 互联网', '教育 / 公益', '媒体 / 创意', '金融 / 商业', '和专业没什么关系'],
  gap: ['旅行与体验', '准备申请', '个人项目', '休息充电', '继续探索'],
  independent: ['创业中', '独立创作', '自由职业', '小团队项目', '保密项目'],
  private: ['暂时保密'],
};

export const REFLECTION_OPTIONS = [
  '挺喜欢，感觉选对了',
  '还行，边走边看',
  '如果重来可能会换',
  '已经和它形成复杂的共生关系',
];

export const ADVICE_SUGGESTIONS = [
  '别急着给自己定型。',
  '多做一点真实的小尝试。',
  '睡够真的比熬夜有用。',
];

export const AVATAR_SETS: Record<string, string[]> = {
  observer: ['🦉', '🦊', '🐈'],
  vibe: ['🐣', '🐸', '🦜'],
  sprint: ['🐯', '🐿️', '🐙'],
  npc: ['🦦', '🦥', '🦄'],
};
