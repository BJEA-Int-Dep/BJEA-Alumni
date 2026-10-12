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

export const PERSONALITY_TRAITS = [
  { id: 'slow_burn', label: '慢热，但熟了很吵', note: '先观察，再加入' },
  { id: 'action_first', label: '想到就做', note: '灵感来了先试试' },
  { id: 'detail_spotter', label: '爱观察细节', note: '总能看见别人漏掉的' },
  { id: 'wild_ideas', label: '常有奇怪脑洞', note: '脑内支线很多' },
  { id: 'deep_diver', label: '容易沉浸一件事', note: '喜欢一路钻进去' },
  { id: 'people_connector', label: '喜欢把大家聚起来', note: '一起做更有意思' },
  { id: 'new_things', label: '总想试点新鲜的', note: '遇到未知会好奇' },
  { id: 'careful_planner', label: '先想清楚再出发', note: '准备也很有乐趣' },
] as const;

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
  university: ['美国的xxx大学', '英国的xxx大学'],
  postgrad: ['美国的xxx大学读研', '英国的xxx大学读研'],
  working: ['在xxx城市工作', '在xxx国家工作', '远程工作，主要在xxx'],
  gap: ['目前在xxx休息调整', '目前在xxx准备下一步'],
  independent: ['在xxx城市做项目', '远程工作，最近在xxx'],
  other: ['目前在xxx', '最近在xxx生活'],
};

export const DIRECTION_OPTIONS: Record<StatusId, string[]> = {
  university: [
    '主修xxx专业',
    '还没定专业，最近对xxx感兴趣',
    '正在适应xxx的课程与生活',
  ],
  postgrad: ['在读xxx专业', '研究方向是xxx', '正在从xxx转向新的方向'],
  working: [
    '在xxx行业工作',
    '目前负责xxx方向',
    '正在从xxx转向新的领域',
  ],
  gap: ['在准备申请xxx', '正在尝试xxx项目', '暂时休息，之后想探索xxx'],
  independent: ['正在做xxx项目', '主要接xxx方向的工作', '和朋友一起做xxx'],
  other: ['正在准备xxx', '目前在做xxx', '正在探索xxx方向'],
};

export const REFLECTION_OPTIONS = [
  '挺喜欢，感觉选对了',
  '还行，边走边看',
  '如果重来可能会换',
  '已经和它形成复杂的共生关系',
];

export const ADVICE_SUGGESTIONS = [
  '刚到新环境时，我希望早点知道：xxx',
  '申请或选校时，我希望有人提醒我：xxx',
  '如果计划突然变了，我想告诉你：xxx',
];
