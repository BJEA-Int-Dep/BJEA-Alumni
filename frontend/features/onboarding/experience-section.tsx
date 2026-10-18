import { ChevronDown, Eye, Lock } from 'lucide-react';
import type { Experience } from '../../../shared/experience';
import { degreeLabels, experienceTypeLabels } from '../../../shared/experience';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const emptyExperience = (type: Experience['type'] = 'education', id: string = crypto.randomUUID()): Experience => ({
  id,
  type,
  degree: type === 'education' ? 'bachelor' : '',
  title: '',
  organization: '',
  location: '',
  startDate: '',
  endDate: '',
  current: true,
  isPublic: true,
  description: '',
});

export function ExperienceTypeSelect({ type, onSelect }: {
  type?: Experience['type'];
  onSelect: (type: Experience['type']) => void;
}) {
  return (
    <label className="relative inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1680bd]">
      <span className="min-w-0 break-words">经历{type ? `·${experienceTypeLabels[type]}` : ''}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <select aria-label={type ? `更改经历类型，当前为${experienceTypeLabels[type]}` : '选择经历类型'} value={type ?? ''} onChange={(event) => onSelect(event.target.value as Experience['type'])} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
        <option value="" disabled>请选择经历类型</option>
        {(Object.keys(experienceTypeLabels) as Experience['type'][]).map((type) => <option key={type} value={type}>{experienceTypeLabels[type]}</option>)}
      </select>
    </label>
  );
}

export function ExperienceVisibilityButton({ isPublic, onToggle }: { isPublic: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={isPublic ? '将这段经历设为仅自己可见' : '将这段经历设为公开'}
      aria-pressed={isPublic}
      onClick={onToggle}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680bd] ${isPublic ? 'bg-[#e8f3f8] text-[#17648e]' : 'bg-[#eceae5] text-[#666b6e]'}`}
    >
      {isPublic ? <Eye className="size-3" /> : <Lock className="size-3" />}
      {isPublic ? '公开' : '仅自己'}
    </button>
  );
}

export function ExperienceSection({ experience: item, onChange }: {
  experience: Experience;
  onChange: (patch: Partial<Experience>) => void;
}) {
  const titleLabel = item.type === 'education' ? '专业 / 研究方向' :
    item.type === 'work' || item.type === 'internship' ? '职位 / 做的事' : '这段经历';
  const organizationLabel = item.type === 'education' ? '学校' :
    item.type === 'work' || item.type === 'internship' ? '公司 / 机构' : '相关机构（可不填）';

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {item.type === 'education' ? <label className="grid gap-2 text-sm font-bold">阶段
          <select value={item.degree} onChange={(event) => onChange({ degree: event.target.value as Experience['degree'] })} className="h-12 rounded-xl border border-black/10 bg-white px-3">
            <option value="">继续深造 / 未注明</option>
            {(Object.keys(degreeLabels) as Exclude<Experience['degree'], ''>[]).map((degree) => <option key={degree} value={degree}>{degreeLabels[degree]}</option>)}
          </select>
        </label> : null}
        <label className="grid gap-2 text-sm font-bold">{titleLabel}
          <Input value={item.title} onChange={(event) => onChange({ title: event.target.value })} maxLength={100} placeholder={item.type === 'gap' ? '例如：休整、旅行、探索新方向' : '写一句大家能看懂的话'} className="h-12 rounded-xl bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold">{organizationLabel}
          <Input value={item.organization} onChange={(event) => onChange({ organization: event.target.value })} maxLength={100} placeholder="可以不填" className="h-12 rounded-xl bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold">地点（可选）
          <Input value={item.location} onChange={(event) => onChange({ location: event.target.value })} maxLength={100} placeholder="例如：北京，或远程" className="h-12 rounded-xl bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-bold">开始时间（可选）
          <Input value={item.startDate} onChange={(event) => onChange({ startDate: event.target.value })} maxLength={7} inputMode="numeric" placeholder="如 2024 或 2024-09" className="h-12 rounded-xl bg-white" />
        </label>
        {!item.current ? <label className="grid gap-2 text-sm font-bold">结束时间（可选）
          <Input value={item.endDate} onChange={(event) => onChange({ endDate: event.target.value })} maxLength={7} inputMode="numeric" placeholder="如 2025 或 2025-06" className="h-12 rounded-xl bg-white" />
        </label> : null}
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={item.current} onChange={(event) => onChange({ current: event.target.checked, endDate: event.target.checked ? '' : item.endDate })} className="size-4 accent-[#ee573c]" />仍在进行</label>
      <label className="grid gap-2 text-sm font-bold">想补充的故事（可选）
        <Textarea value={item.description} onChange={(event) => onChange({ description: event.target.value })} maxLength={500} placeholder="这段时间做了什么，或为什么选择这条路" className="min-h-20 rounded-xl bg-white" />
      </label>
    </div>
  );
}
