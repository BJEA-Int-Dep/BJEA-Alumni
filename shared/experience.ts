import { z } from 'zod';

const experienceDateSchema = z.string().trim().regex(
  /^(?:|(?:19|20)\d{2}-(?:0[1-9]|1[0-2]))$/,
  '时间请选择年月，例如 2024-09。',
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
  isPublic: z.boolean(),
  description: z.string().max(500),
}).refine((item) => {
  if (item.current || !item.startDate || !item.endDate) return true;
  return item.endDate >= item.startDate;
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
  if (!/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(value)) return '';
  const [year, month] = value.split('-');
  return `${year} 年 ${Number(month)} 月`;
}

export function experiencePeriod(experience: Experience) {
  const start = experienceDateLabel(experience.startDate);
  const end = experience.current ? '至今' : experienceDateLabel(experience.endDate);
  if (!start) return experience.current ? '' : end ? `截至 ${end}` : '';
  return end ? `${start} — ${end}` : `${start}开始`;
}
