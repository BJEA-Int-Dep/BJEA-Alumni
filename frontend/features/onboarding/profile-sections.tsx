import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PERSONALITY_TRAITS, STATUS_OPTIONS } from './options';
import type { DraftProfile } from './draft';

type PatchDraft = (patch: Partial<DraftProfile>) => void;

export function BasicSection({
  draft,
  patchDraft,
  onSuggestNames,
  nicknameLoading,
  nicknameError,
}: {
  draft: DraftProfile;
  patchDraft: PatchDraft;
  onSuggestNames: () => void;
  nicknameLoading: boolean;
  nicknameError: string;
}) {
  return (
    <section className="rounded-[28px] bg-[#fffaf1] p-5 shadow-[0_20px_60px_rgba(57,47,33,0.08)] sm:p-8">
      <p className="text-xs font-black text-[#df5035]">基本信息 · 必填</p>
      <h1 className="mt-2 text-3xl font-black">先让大家认识你</h1>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black">
          昵称
          <Input value={draft.nickname} onChange={(event) => patchDraft({ nickname: event.target.value })} maxLength={24} placeholder="大家怎么称呼你？" className="h-12 rounded-xl bg-white" />
        </label>
        <label className="grid gap-2 text-sm font-black">
          高中毕业年份
          <select value={draft.year} onChange={(event) => patchDraft({ year: event.target.value })} className="h-12 rounded-xl border border-black/10 bg-white px-3">
            <option value="">请选择</option>
            {Array.from({ length: 15 }, (_, index) => String(2013 + index)).map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onSuggestNames} className="rounded-xl bg-white font-bold"><Sparkles className="size-4" /> 昵称灵感</Button>
        {nicknameLoading && <span className="text-xs">正在想名字…</span>}
        {draft.avatar?.nicknameSuggestions.map((name) => (
          <button key={name} type="button" onClick={() => patchDraft({ nickname: name })} className="rounded-full border border-[#1680bd]/25 bg-[#eaf5fa] px-3 py-1.5 text-xs font-bold text-[#17648e]">{name}</button>
        ))}
      </div>
      {nicknameError && <p role="alert" className="mt-2 text-xs text-destructive">{nicknameError}</p>}
    </section>
  );
}

export function AboutSection({ draft, patchDraft }: { draft: DraftProfile; patchDraft: PatchDraft }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-3 text-sm font-bold">朋友会怎么形容你？</p>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const selected = draft.personalityTraits?.includes(trait.id) ?? false;
            return (
              <button key={trait.id} type="button" aria-pressed={selected} onClick={() => patchDraft({ personalityTraits: selected ? (draft.personalityTraits ?? []).filter((id) => id !== trait.id) : [...(draft.personalityTraits ?? []), trait.id].slice(0, 3) })} className={`rounded-full border px-3 py-2 text-xs font-bold ${selected ? 'border-[#ee573c] bg-[#fff0e7]' : 'border-black/10 bg-white'}`}>
                {trait.label}
              </button>
            );
          })}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-bold">
        一句话介绍自己
        <Textarea value={draft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} maxLength={180} placeholder="例如：喜欢观察细节，也喜欢和朋友胡思乱想" className="min-h-20 rounded-xl bg-white" />
      </label>
    </div>
  );
}

export function JourneySection({ draft, patchDraft }: { draft: DraftProfile; patchDraft: PatchDraft }) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        现在的阶段
        <select value={draft.statusId} onChange={(event) => patchDraft({ statusId: event.target.value as DraftProfile['statusId'] })} className="h-12 rounded-xl border border-black/10 bg-white px-3">
          <option value="">可以不填</option>
          {STATUS_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {draft.statusId === 'other' && <label className="grid gap-2 text-sm font-bold">具体阶段<Input value={draft.statusCustom} onChange={(event) => patchDraft({ statusCustom: event.target.value })} maxLength={80} className="h-12 rounded-xl bg-white" /></label>}
      <label className="grid gap-2 text-sm font-bold">现在在哪里 / 哪所学校<Input value={draft.place} onChange={(event) => patchDraft({ place: event.target.value })} maxLength={100} placeholder="例如：美国的 xxx 大学；也可以不公开" className="h-12 rounded-xl bg-white" /></label>
      <label className="grid gap-2 text-sm font-bold">在学什么 / 做什么<Input value={draft.direction} onChange={(event) => patchDraft({ direction: event.target.value })} maxLength={100} placeholder="专业、工作、项目，或正在休息调整" className="h-12 rounded-xl bg-white" /></label>
    </div>
  );
}

export function ThoughtsSection({ draft, patchDraft }: { draft: DraftProfile; patchDraft: PatchDraft }) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">现在怎么看这条路？<Textarea value={draft.reflection} onChange={(event) => patchDraft({ reflection: event.target.value })} maxLength={500} placeholder="不用写得很积极，真实就好" className="min-h-24 rounded-xl bg-white" /></label>
      <label className="grid gap-2 text-sm font-bold">给学弟学妹的话<Textarea value={draft.advice} onChange={(event) => patchDraft({ advice: event.target.value })} maxLength={500} placeholder="想起一个具体时刻，会更容易写" className="min-h-24 rounded-xl bg-white" /></label>
    </div>
  );
}
