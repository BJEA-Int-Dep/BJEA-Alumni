import { z } from 'zod';

const experienceDateSchema = z.string().trim().regex(
  /^(?:|(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2]))?)$/,
  '时间请填写年份或年月，例如 2024 或 2024-09。',
);

export const experienceSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(['education', 'work', 'internship', 'gap', 'other']),
  degree: z.enum(['', 'bachelor', 'master', 'doctorate']),
  title: z.string().trim().min(1, '请填写这段经历的专业、角色或正在做的事。').max(100),
  organization: z.string().max(100),
  location: z.string().max(100),
  startDate: experienceDateSchema,
  endDate: experienceDateSchema,
  current: z.boolean(),
  isPublic: z.boolean().default(true),
  description: z.string().max(500),
}).refine((item) => {
  if (item.current || !item.startDate || !item.endDate) return true;
  const start = item.startDate.length === 4 ? `${item.startDate}-01` : item.startDate;
  const end = item.endDate.length === 4 ? `${item.endDate}-12` : item.endDate;
  return end >= start;
}, { path: ['endDate'], message: '经历的结束时间不能早于开始时间。' });

export type Experience = z.infer<typeof experienceSchema>;

export const experienceTypeLabels: Record<Experience['type'], string> = {
  education: '学习',
  work: '工作',
  internship: '实习',
  gap: 'Gap / 探索',
  other: '其他',
};

export const degreeLabels: Record<Exclude<Experience['degree'], ''>, string> = {
  bachelor: '本科',
  master: '硕士',
  doctorate: '博士',
};

export function experienceLabel(experience: Experience) {
  return experience.type === 'education' && experience.degree
    ? degreeLabels[experience.degree]
    : experienceTypeLabels[experience.type];
}

export function sortExperiences(experiences: Experience[]) {
  return [...experiences].sort((a, b) =>
    Number(b.current) - Number(a.current) ||
    b.startDate.localeCompare(a.startDate),
  );
}

export function primaryExperience(experiences: Experience[]) {
  return sortExperiences(experiences)[0];
}

export function experienceDateLabel(value: string) {
  if (!value) return '';
  const [year, month] = value.split('-');
  return month ? `${year} 年 ${Number(month)} 月` : `${year} 年`;
}

export function experiencePeriod(experience: Experience) {
  const start = experienceDateLabel(experience.startDate);
  const end = experience.current ? '至今' : experienceDateLabel(experience.endDate);
  if (!start) return experience.current ? '' : end ? `截至 ${end}` : '';
  return end ? `${start} — ${end}` : `${start}开始`;
}

export function legacyExperiences(draft: {
  statusId: string;
  statusCustom: string;
  place: string;
  direction: string;
}): Experience[] {
  if (!draft.statusId && !draft.statusCustom && !draft.place && !draft.direction) return [];
  const type: Experience['type'] =
    draft.statusId === 'university' || draft.statusId === 'postgrad' ? 'education' :
    draft.statusId === 'working' || draft.statusId === 'independent' ? 'work' :
    draft.statusId === 'gap' ? 'gap' : 'other';
  const degree: Experience['degree'] = draft.statusId === 'university' ? 'bachelor' : '';
  const defaultTitle = draft.statusId === 'independent' ? '创业 / 自由职业' :
    draft.statusId === 'gap' ? 'Gap / 转弯中' :
    draft.statusId === 'postgrad' ? '继续深造' :
    draft.statusId === 'university' ? '本科在读' :
    draft.statusId === 'working' ? '工作' : '其他经历';
  return [{
    id: 'legacy', type, degree,
    title: draft.direction || draft.statusCustom || defaultTitle,
    organization: type === 'education' || type === 'work' ? draft.place : '',
    location: type === 'education' || type === 'work' ? '' : draft.place,
    startDate: '', endDate: '', current: true, isPublic: true,
    description: draft.statusId === 'postgrad' ? '读研 / 继续深造' :
      draft.statusId === 'independent' ? '创业 / 自由职业' :
      draft.statusId === 'other' && draft.direction ? draft.statusCustom : '',
  }];
}
