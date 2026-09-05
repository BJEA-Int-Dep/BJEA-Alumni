import type { Tone } from '@/lib/alumni-data';

export type StatusId =
  | 'university'
  | 'postgrad'
  | 'working'
  | 'independent'
  | 'gap'
  | 'other';

interface PersonalityOption {
  id: string;
  label: string;
  note: string;
  emoji: string;
  tone: Tone;
  summary: string;
}

export const PERSONALITIES: PersonalityOption[] = [
  {
    id: 'observer',
    label: '安静观察员',
    note: '话不多，但什么都看见了',
    emoji: '🦉',
    tone: 'ocean',
    summary: '看起来很安静，脑内同时开着十二个窗口。',
  },
  {
    id: 'connector',
    label: '热情连接者',
    note: '走到哪里都能认识新朋友',
    emoji: '🐕',
    tone: 'lemon',
    summary: '很自然地把身边的人连接到一起。',
  },
  {
    id: 'builder',
    label: '稳定行动派',
    note: '想到一点，就认真搭一点',
    emoji: '🦫',
    tone: 'mint',
    summary: '不声不响地把想法一点点搭成现实。',
  },
  {
    id: 'multitasker',
    label: '多线程选手',
    note: '脑子里总同时装着好几件事',
    emoji: '🐿️',
    tone: 'sunset',
    summary: '总有好几个计划同时在脑子里奔跑。',
  },
  {
    id: 'explorer',
    label: '远方探索者',
    note: '对下一站永远保持好奇',
    emoji: '🐦',
    tone: 'sky',
    summary: '喜欢离开熟悉的地图，看看更远的地方。',
  },
  {
    id: 'steady',
    label: '情绪稳定器',
    note: '不着急，按自己的节奏前进',
    emoji: '🐢',
    tone: 'coral',
    summary: '很少被节奏推着跑，更相信自己的步伐。',
  },
];

export const STATUS_OPTIONS: Array<{
  id: StatusId;
  label: string;
  note: string;
  emoji: string;
}> = [
  {
    id: 'university',
    label: '本科在读',
    note: '作业与理想轮流出现',
    emoji: '🎒',
  },
  { id: 'postgrad', label: '读研 / 继续深造', note: '还在知识地图里前进', emoji: '📚' },
  { id: 'working', label: '已经工作', note: '正在学习如何开会', emoji: '💻' },
  {
    id: 'independent',
    label: '创业 / 自由职业',
    note: '自己画地图，也自己踩坑',
    emoji: '🚀',
  },
  { id: 'gap', label: 'Gap / 转弯中', note: '暂时离开默认路线', emoji: '🧭' },
  { id: 'other', label: '其他状态', note: '用自己的话说更准确', emoji: '✨' },
];

export const PLACE_SUGGESTIONS: Record<StatusId, string[]> = {
  university: ['北京的一所大学', '国内其他城市', '海外校园', '还在准备申请'],
  postgrad: ['国内高校', '海外校园', '实验室', '一边工作一边读书'],
  working: ['留在北京工作', '去了南方城市', '在海外工作', '远程工作中'],
  gap: ['在旅行', '在准备申请', '在做个人项目', '先休息充电'],
  independent: ['自己的小工作室', '三五人的创业团队', '独立创作中', '到处办公'],
  other: ['留在北京', '国内其他城市', '在海外', '地点不固定'],
};

export const DIRECTION_OPTIONS: Record<StatusId, string[]> = {
  university: [
    '计算机 / 工程',
    '艺术 / 设计',
    '社科 / 人文',
    '商科 / 经济',
    '还没想明白',
  ],
  postgrad: ['学术研究', '专业深造', '准备申请', '跨专业探索', '还没想明白'],
  working: [
    '科技 / 互联网',
    '教育 / 公益',
    '媒体 / 创意',
    '金融 / 商业',
    '和专业没什么关系',
  ],
  gap: ['旅行与体验', '准备申请', '个人项目', '休息充电', '继续探索'],
  independent: ['创业中', '独立创作', '自由职业', '小团队项目', '保密项目'],
  other: ['准备考试', '照顾家人', '个人项目', '休息调整', '继续探索'],
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
