import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Experience } from '../../../shared/experience';
import { degreeLabels, experienceTypeLabels } from '../../../shared/experience';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { DraftProfile } from './draft';

type PatchDraft = (patch: Partial<DraftProfile>) => void;

const emptyExperience = (): Experience => ({
  id: crypto.randomUUID(),
  type: 'education',
  degree: 'bachelor',
  title: '',
  organization: '',
  location: '',
  startDate: '',
  endDate: '',
  current: true,
  description: '',
});

export function ExperienceSection({ draft, patchDraft }: { draft: DraftProfile; patchDraft: PatchDraft }) {
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const newCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newEntryId) newCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [newEntryId]);

  const update = (id: string, patch: Partial<Experience>) => patchDraft({
    experiences: draft.experiences.map((item) => item.id === id ? { ...item, ...patch } : item),
  });

  const addExperience = () => {
    const item = emptyExperience();
    patchDraft({ experiences: [...draft.experiences, item] });
    setNewEntryId(item.id);
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-muted-foreground">记录毕业后的学习、工作、实习或转弯；可以添加多段，同时进行的经历也可以分别填写。</p>
      {draft.experiences.map((item, index) => {
        const titleLabel = item.type === 'education' ? '专业 / 研究方向' :
          item.type === 'work' || item.type === 'internship' ? '职位 / 做的事' : '这段经历';
        const organizationLabel = item.type === 'education' ? '学校' :
          item.type === 'work' || item.type === 'internship' ? '公司 / 机构' : '相关机构（可不填）';
        return (
          <div
            key={item.id}
            ref={item.id === newEntryId ? newCardRef : undefined}
            className="grid scroll-mt-24 gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black">经历 {index + 1}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => patchDraft({ experiences: draft.experiences.filter((entry) => entry.id !== item.id) })} className="text-muted-foreground"><Trash2 className="size-4" /> 删除</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">类型
                <select value={item.type} onChange={(event) => {
                  const type = event.target.value as Experience['type'];
                  update(item.id, { type, degree: type === 'education' ? 'bachelor' : '' });
                }} className="h-12 rounded-xl border border-black/10 bg-white px-3">
                  {(Object.keys(experienceTypeLabels) as Experience['type'][]).map((type) => <option key={type} value={type}>{experienceTypeLabels[type]}</option>)}
                </select>
              </label>
              {item.type === 'education' ? <label className="grid gap-2 text-sm font-bold">阶段
                <select value={item.degree} onChange={(event) => update(item.id, { degree: event.target.value as Experience['degree'] })} className="h-12 rounded-xl border border-black/10 bg-white px-3">
                  <option value="">继续深造 / 未注明</option>
                  {(Object.keys(degreeLabels) as Exclude<Experience['degree'], ''>[]).map((degree) => <option key={degree} value={degree}>{degreeLabels[degree]}</option>)}
                </select>
              </label> : null}
              <label className="grid gap-2 text-sm font-bold">{titleLabel}
                <Input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} maxLength={100} placeholder={item.type === 'gap' ? '例如：休整、旅行、探索新方向' : '写一句大家能看懂的话'} className="h-12 rounded-xl bg-white" />
              </label>
              <label className="grid gap-2 text-sm font-bold">{organizationLabel}
                <Input value={item.organization} onChange={(event) => update(item.id, { organization: event.target.value })} maxLength={100} placeholder="可以不填" className="h-12 rounded-xl bg-white" />
              </label>
              <label className="grid gap-2 text-sm font-bold">地点（可选）
                <Input value={item.location} onChange={(event) => update(item.id, { location: event.target.value })} maxLength={100} placeholder="例如：北京，或远程" className="h-12 rounded-xl bg-white" />
              </label>
              <label className="grid gap-2 text-sm font-bold">开始时间（可选）
                <Input value={item.startDate} onChange={(event) => update(item.id, { startDate: event.target.value })} maxLength={7} inputMode="numeric" placeholder="如 2024 或 2024-09" className="h-12 rounded-xl bg-white" />
              </label>
              {!item.current ? <label className="grid gap-2 text-sm font-bold">结束时间（可选）
                <Input value={item.endDate} onChange={(event) => update(item.id, { endDate: event.target.value })} maxLength={7} inputMode="numeric" placeholder="如 2025 或 2025-06" className="h-12 rounded-xl bg-white" />
              </label> : null}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={item.current} onChange={(event) => update(item.id, { current: event.target.checked, endDate: event.target.checked ? '' : item.endDate })} className="size-4 accent-[#ee573c]" />仍在进行</label>
            <label className="grid gap-2 text-sm font-bold">想补充的故事（可选）
              <Textarea value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} maxLength={500} placeholder="这段时间做了什么，或为什么选择这条路" className="min-h-20 rounded-xl bg-white" />
            </label>
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={addExperience} disabled={draft.experiences.length >= 15} className="h-12 justify-start rounded-xl bg-white font-bold"><Plus className="size-4" /> 添加一段经历</Button>
    </div>
  );
}
