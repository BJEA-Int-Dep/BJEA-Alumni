import type { Tone } from '@/lib/alumni-data';

export type StatusId =
  | 'university'
  | 'working'
  | 'gap'
  | 'independent'
  | 'private';

interface PersonalityOption {
  id: string;
  label: string;
  note: string;
  emoji: string;
  tone: Tone;
  summary: string;
  description: string;
}

export const PERSONALITIES: PersonalityOption[] = [
  {
    id: 'observer',
    label: '安静观察员',
    note: '话不多，但什么都看见了',
    emoji: '🦉',
    tone: 'ocean',
    summary: '看起来很安静，脑内同时开着十二个窗口。',
    description:
      '戴圆框眼镜的蓝色猫头鹰，安静、好奇、有一点夜猫子气质，轻松插画风',
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
  {
    id: 'university',
    label: '还在大学',
    note: '作业与理想轮流出现',
    emoji: '🎒',
  },
  { id: 'working', label: '已经工作', note: '正在学习如何开会', emoji: '💻' },
  { id: 'gap', label: 'Gap / 转弯中', note: '暂时离开默认路线', emoji: '🧭' },
  {
    id: 'independent',
    label: '创业 / 自由职业',
    note: '自己画地图，也自己踩坑',
    emoji: '🚀',
  },
  {
    id: 'private',
    label: '暂时不想透露',
    note: '完全没问题，直接跳过',
    emoji: '🌫️',
  },
];

export const PLACE_SUGGESTIONS: Record<StatusId, string[]> = {
  university: ['北京的一所大学', '国内其他城市', '海外校园', '还在准备申请'],
  working: ['留在北京工作', '去了南方城市', '在海外工作', '远程工作中'],
  gap: ['在旅行', '在准备申请', '在做个人项目', '先休息充电'],
  independent: ['自己的小工作室', '三五人的创业团队', '独立创作中', '到处办公'],
  private: ['暂时保密'],
};

export const DIRECTION_OPTIONS: Record<StatusId, string[]> = {
  university: [
    '计算机 / 工程',
    '艺术 / 设计',
    '社科 / 人文',
    '商科 / 经济',
    '还没想明白',
  ],
  working: [
    '科技 / 互联网',
    '教育 / 公益',
    '媒体 / 创意',
    '金融 / 商业',
    '和专业没什么关系',
  ],
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
