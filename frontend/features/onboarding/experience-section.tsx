import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Experience } from '../../../shared/experience';
import { degreeLabels, experienceTypeLabels } from '../../../shared/experience';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { DraftProfile } from './draft';

type PatchDraft = (patch: Partial<DraftProfile>) => void;
const compactFieldClass = 'grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-2 text-sm font-bold sm:grid-cols-1 sm:gap-2';

function MonthInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const pickerValue = /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(value) ? value : '';
  return <span className="relative block min-w-0 rounded-xl focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1680bd]">
    <Input value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} placeholder="YYYY-MM" className="h-11 rounded-xl bg-white pr-11" />
    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    <input type="month" aria-label={`选择${label}月份`} value={pickerValue} onChange={(event) => onChange(event.target.value)} min="1900-01" max="2099-12" onClick={(event) => {
      try { event.currentTarget.showPicker?.(); } catch { /* The native month control remains available. */ }
    }} className="absolute inset-y-0 right-0 h-full w-11 cursor-pointer opacity-0" />
  </span>;
}

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
      {draft.experiences.map((item, index) => {
        const titleLabel = item.type === 'education' ? '专业 / 研究方向' :
          item.type === 'work' || item.type === 'internship' ? '职位 / 做的事' : '这段经历';
        const organizationLabel = item.type === 'education' ? '学校' :
          item.type === 'work' || item.type === 'internship' ? '公司 / 机构' : '相关机构（可不填）';
        return (
          <div
            key={item.id}
            ref={item.id === newEntryId ? newCardRef : undefined}
            className={`grid scroll-mt-24 gap-3 ${index > 0 ? 'border-t border-black/10 pt-4' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="relative inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md text-sm font-black focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1680bd]">
                <span className="min-w-0">经历 {index + 1} · {experienceTypeLabels[item.type]}</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <select
                  aria-label={`经历 ${index + 1} 的类型`}
                  value={item.type}
                  onChange={(event) => {
                    const type = event.target.value as Experience['type'];
                    update(item.id, { type, degree: type === 'education' ? 'bachelor' : '' });
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  {(Object.keys(experienceTypeLabels) as Experience['type'][]).map((type) => <option key={type} value={type}>{experienceTypeLabels[type]}</option>)}
                </select>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => patchDraft({ experiences: draft.experiences.filter((entry) => entry.id !== item.id) })} className="text-muted-foreground"><Trash2 className="size-4" /> 删除</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.type === 'education' ? <label className={compactFieldClass}>阶段
                <select value={item.degree} onChange={(event) => update(item.id, { degree: event.target.value as Experience['degree'] })} className="h-11 min-w-0 rounded-xl border border-black/10 bg-white px-3">
                  <option value="">继续深造 / 未注明</option>
                  {(Object.keys(degreeLabels) as Exclude<Experience['degree'], ''>[]).map((degree) => <option key={degree} value={degree}>{degreeLabels[degree]}</option>)}
                </select>
              </label> : null}
              <label className={compactFieldClass}>{titleLabel}
                <Input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} maxLength={100} placeholder={item.type === 'gap' ? '例如：休整、旅行、探索新方向' : '写一句大家能看懂的话'} className="h-11 rounded-xl bg-white" />
              </label>
              <label className={compactFieldClass}>{organizationLabel}
                <Input value={item.organization} onChange={(event) => update(item.id, { organization: event.target.value })} maxLength={100} className="h-11 rounded-xl bg-white" />
              </label>
              <label className={compactFieldClass}>开始时间
                <MonthInput label="开始时间" value={item.startDate} onChange={(startDate) => update(item.id, { startDate })} />
              </label>
              {!item.current ? <label className={compactFieldClass}>结束时间
                <MonthInput label="结束时间" value={item.endDate} onChange={(endDate) => update(item.id, { endDate })} />
              </label> : null}
              <label className={compactFieldClass}>城市
                <Input value={item.location} onChange={(event) => update(item.id, { location: event.target.value })} maxLength={100} className="h-11 rounded-xl bg-white" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={item.current} onChange={(event) => update(item.id, { current: event.target.checked, endDate: event.target.checked ? '' : item.endDate })} className="size-4 accent-[#ee573c]" />仍在进行</label>
            <label className="grid gap-2 text-sm font-bold">想补充的故事
              <Textarea value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} maxLength={500} placeholder="这段时间做了什么，或为什么选择这条路" className="min-h-20 rounded-xl bg-white" />
            </label>
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={addExperience} disabled={draft.experiences.length >= 15} className="h-12 justify-start rounded-xl bg-white font-bold"><Plus className="size-4" /> 添加一段经历</Button>
    </div>
  );
}
