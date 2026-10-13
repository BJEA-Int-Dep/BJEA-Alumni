export type StatusId =
  | 'university'
  | 'postgrad'
  | 'working'
  | 'independent'
  | 'gap'
  | 'other';

export const PERSONALITY_TRAITS = [
  { id: 'slow_burn', label: '慢热，但熟了很吵' },
  { id: 'action_first', label: '想到就做' },
  { id: 'detail_spotter', label: '爱观察细节' },
  { id: 'wild_ideas', label: '常有奇怪脑洞' },
  { id: 'deep_diver', label: '容易沉浸一件事' },
  { id: 'people_connector', label: '喜欢把大家聚起来' },
  { id: 'new_things', label: '总想试点新鲜的' },
  { id: 'careful_planner', label: '先想清楚再出发' },
] as const;

export const STATUS_OPTIONS: Array<{ id: StatusId; label: string }> = [
  { id: 'university', label: '本科在读' },
  { id: 'postgrad', label: '读研 / 继续深造' },
  { id: 'working', label: '已经工作' },
  { id: 'independent', label: '创业 / 自由职业' },
  { id: 'gap', label: 'Gap / 转弯中' },
  { id: 'other', label: '其他状态' },
];
