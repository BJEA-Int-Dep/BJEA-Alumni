import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { House, Plus, RotateCw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { emptyAvatar } from '../../../shared/avatar';
import { answersFor, validateDraftForSave, type DraftProfile } from './draft';
import { ProfilePreview } from './profile-preview';
import { PERSONALITY_TRAITS, STATUS_OPTIONS } from './options';
import { useNicknameSuggestions } from './use-nickname-suggestions';
import { useAvatarConcepts } from './use-avatar-concepts';

interface Props {
  draft: DraftProfile;
  onDraftChange: Dispatch<SetStateAction<DraftProfile>>;
  onExit: () => void;
  onComplete: () => void | Promise<void>;
  completing?: boolean;
  completionError?: string;
}
type Section = 'about' | 'journey' | 'thoughts' | 'avatar';
const labels: Record<Section, string> = { about: '关于我', journey: '现在的阶段与方向', thoughts: '一些真心话', avatar: '我的 AI 头像' };
function initialSections(d: DraftProfile): Section[] {
  return (Object.keys(labels) as Section[]).filter((s) =>
    s === 'about' ? Boolean(d.personalityTraits?.length || d.personalityCustom || d.summary) :
    s === 'journey' ? Boolean(d.statusId || d.place || d.direction) :
    s === 'thoughts' ? Boolean(d.reflection || d.advice) : Boolean(d.avatar?.recipe?.subject));
}

export function OnboardingFlow({ draft, onDraftChange, onExit, onComplete, completing = false, completionError = '' }: Props) {
  const [sections, setSections] = useState<Section[]>(() => initialSections(draft));
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [nicknameRequested, setNicknameRequested] = useState(false);
  const [detailRequested, setDetailRequested] = useState(false);
  const patchDraft = (patch: Partial<DraftProfile>) => { setError(''); onDraftChange((d) => ({ ...d, ...patch })); };
  const changeNicknames = useCallback((names: string[]) => onDraftChange((d) => ({ ...d, avatar: { ...(d.avatar ?? emptyAvatar()), nicknameSuggestions: names } })), [onDraftChange]);
  const nicknames = useNicknameSuggestions(answersFor(draft), changeNicknames, nicknameRequested);
  const subjects = useAvatarConcepts('subject', answersFor(draft), '', sections.includes('avatar'));
  const details = useAvatarConcepts('detail', answersFor(draft), draft.avatar?.recipe?.subject ?? '', sections.includes('avatar') && detailRequested && !!draft.avatar?.recipe?.subject);
  const updateRecipe = (field: 'subject' | 'detail', value: string) => {
    const avatar = draft.avatar ?? emptyAvatar();
    if (field === 'subject') setDetailRequested(false);
    patchDraft({ avatar: { ...avatar, generatedAssetId: undefined, recipe: { subject: avatar.recipe?.subject ?? '', detail: avatar.recipe?.detail ?? '', [field]: value } } });
  };
  const removeSection = (section: Section) => {
    setSections((items) => items.filter((item) => item !== section));
    if (section === 'about') patchDraft({ personalityId: '', personalityTraits: [], personalityCustom: '', summary: '' });
    if (section === 'journey') patchDraft({ statusId: '', statusCustom: '', place: '', direction: '' });
    if (section === 'thoughts') patchDraft({ reflection: '', advice: '' });
    if (section === 'avatar') patchDraft({ avatar: { ...(draft.avatar ?? emptyAvatar()), recipe: undefined, generatedAssetId: undefined } });
  };
  const save = () => {
    const validationError = validateDraftForSave(draft);
    if (validationError) return setError(validationError);
    onComplete();
  };
  return <main className="min-h-screen bg-[#f4f1e9] pb-16 text-foreground">
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f4f1e9]/95 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8"><Button variant="ghost" size="icon-lg" onClick={onExit} aria-label="返回首页"><House className="size-5" /></Button><div><p className="font-black">编辑我的 Profile</p><p className="text-xs text-muted-foreground">先填写昵称和毕业年份，其他板块随时添加</p></div></div></header>
    <div className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-10">
      <div className="order-2 grid gap-4 lg:order-1">
        <section className="rounded-[28px] bg-[#fffaf1] p-5 shadow-[0_20px_60px_rgba(57,47,33,0.08)] sm:p-8"><p className="text-xs font-black text-[#df5035]">基本信息 · 必填</p><h1 className="mt-2 text-3xl font-black">先让大家认识你</h1>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-black">昵称<Input value={draft.nickname} onChange={(e) => patchDraft({ nickname: e.target.value })} maxLength={24} placeholder="大家怎么称呼你？" className="h-12 rounded-xl bg-white" /></label><label className="grid gap-2 text-sm font-black">高中毕业年份<select value={draft.year} onChange={(e) => patchDraft({ year: e.target.value })} className="h-12 rounded-xl border border-black/10 bg-white px-3"><option value="">请选择</option>{Array.from({ length: 15 }, (_, i) => String(2013 + i)).map((year) => <option key={year}>{year}</option>)}</select></label></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => { setNicknameRequested(true); nicknames.refresh(); }} className="rounded-xl bg-white font-bold"><Sparkles className="size-4" /> 昵称灵感</Button>{nicknames.loading ? <span className="text-xs">正在想名字…</span> : null}{draft.avatar?.nicknameSuggestions.map((name) => <button key={name} type="button" onClick={() => patchDraft({ nickname: name })} className="rounded-full border border-[#1680bd]/25 bg-[#eaf5fa] px-3 py-1.5 text-xs font-bold text-[#17648e]">{name}</button>)}</div>{nicknames.error ? <p role="alert" className="mt-2 text-xs text-destructive">{nicknames.error}</p> : null}
        </section>
        {sections.map((section) => <section key={section} className="rounded-[28px] bg-[#fffaf1] p-5 shadow-[0_12px_35px_rgba(57,47,33,0.06)] sm:p-8"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{labels[section]}</h2><Button variant="ghost" size="sm" onClick={() => removeSection(section)}><Trash2 className="size-4" /> 移除</Button></div>
          {section === 'about' ? <div className="grid gap-5"><div><p className="mb-3 text-sm font-bold">朋友会怎么形容你？</p><div className="flex flex-wrap gap-2">{PERSONALITY_TRAITS.map((trait) => { const selected = draft.personalityTraits?.includes(trait.id) ?? false; return <button key={trait.id} type="button" aria-pressed={selected} onClick={() => patchDraft({ personalityTraits: selected ? (draft.personalityTraits ?? []).filter((id) => id !== trait.id) : [...(draft.personalityTraits ?? []), trait.id].slice(0, 3) })} className={`rounded-full border px-3 py-2 text-xs font-bold ${selected ? 'border-[#ee573c] bg-[#fff0e7]' : 'border-black/10 bg-white'}`}>{trait.label}</button>; })}</div></div><label className="grid gap-2 text-sm font-bold">一句话介绍自己<Textarea value={draft.summary} onChange={(e) => patchDraft({ summary: e.target.value })} maxLength={180} placeholder="例如：喜欢观察细节，也喜欢和朋友胡思乱想" className="min-h-20 rounded-xl bg-white" /></label></div> : null}
          {section === 'journey' ? <div className="grid gap-4"><label className="grid gap-2 text-sm font-bold">现在的阶段<select value={draft.statusId} onChange={(e) => patchDraft({ statusId: e.target.value as DraftProfile['statusId'] })} className="h-12 rounded-xl border border-black/10 bg-white px-3"><option value="">可以不填</option>{STATUS_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{draft.statusId === 'other' ? <label className="grid gap-2 text-sm font-bold">具体阶段<Input value={draft.statusCustom} onChange={(e) => patchDraft({ statusCustom: e.target.value })} maxLength={80} className="h-12 rounded-xl bg-white" /></label> : null}<label className="grid gap-2 text-sm font-bold">现在在哪里 / 哪所学校<Input value={draft.place} onChange={(e) => patchDraft({ place: e.target.value })} maxLength={100} placeholder="例如：美国的 xxx 大学；也可以不公开" className="h-12 rounded-xl bg-white" /></label><label className="grid gap-2 text-sm font-bold">在学什么 / 做什么<Input value={draft.direction} onChange={(e) => patchDraft({ direction: e.target.value })} maxLength={100} placeholder="专业、工作、项目，或正在休息调整" className="h-12 rounded-xl bg-white" /></label></div> : null}
          {section === 'thoughts' ? <div className="grid gap-4"><label className="grid gap-2 text-sm font-bold">现在怎么看这条路？<Textarea value={draft.reflection} onChange={(e) => patchDraft({ reflection: e.target.value })} maxLength={500} placeholder="不用写得很积极，真实就好" className="min-h-24 rounded-xl bg-white" /></label><label className="grid gap-2 text-sm font-bold">给学弟学妹的话<Textarea value={draft.advice} onChange={(e) => patchDraft({ advice: e.target.value })} maxLength={500} placeholder="想起一个具体时刻，会更容易写" className="min-h-24 rounded-xl bg-white" /></label></div> : null}
          {section === 'avatar' ? <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">描述一个代表你的角色，保存后异步生成头像。</p>
            <label className="grid gap-2 text-sm font-bold">头像主体<Input value={draft.avatar?.recipe?.subject ?? ''} onChange={(e) => updateRecipe('subject', e.target.value)} maxLength={80} placeholder="例如：一只背着书包的小狐狸" className="h-12 rounded-xl bg-white" /></label>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={subjects.refresh} disabled={subjects.loading} className="rounded-xl bg-white font-bold"><RotateCw className="size-3" /> {subjects.options.length ? '重新推荐主体' : '推荐主体'}</Button>
              {subjects.options.map((item) => <button key={item} type="button" onClick={() => updateRecipe('subject', item.slice(0, 80))} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold">{item}</button>)}
              {subjects.loading ? <span className="text-xs">正在想主体…</span> : null}
            </div>
            {subjects.error ? <p role="alert" className="text-xs text-destructive">{subjects.error} 可以自己填写主体。</p> : null}
            <label className="grid gap-2 text-sm font-bold">配件或动作<Input value={draft.avatar?.recipe?.detail ?? ''} onChange={(e) => updateRecipe('detail', e.target.value)} maxLength={80} placeholder="可以留空" className="h-12 rounded-xl bg-white" /></label>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setDetailRequested(true); details.refresh(); }} disabled={!draft.avatar?.recipe?.subject || details.loading} className="rounded-xl bg-white font-bold">{detailRequested ? <RotateCw className="size-3" /> : <Sparkles className="size-3" />} {detailRequested ? '重新推荐细节' : '推荐细节'}</Button>
              {detailRequested ? details.options.map((item) => <button key={item} type="button" onClick={() => updateRecipe('detail', item.slice(0, 80))} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold">{item}</button>) : null}
              {details.loading ? <span className="text-xs">正在想细节…</span> : null}
            </div>
            {detailRequested && details.error ? <p role="alert" className="text-xs text-destructive">{details.error} 可以自己填写配件或动作。</p> : null}
          </div> : null}
        </section>)}
        <section className="rounded-[28px] border border-dashed border-black/15 bg-white/45 p-5 sm:p-7"><Button variant="outline" onClick={() => setShowAdd((v) => !v)} className="h-12 rounded-xl bg-white font-black"><Plus className="size-4" /> 添加板块</Button>{showAdd ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{(Object.keys(labels) as Section[]).filter((s) => !sections.includes(s)).map((s) => <button key={s} type="button" onClick={() => { setSections((items) => [...items, s]); setShowAdd(false); }} className="rounded-xl border border-black/10 bg-white p-4 text-left text-sm font-bold"><Plus className="mr-2 inline size-4" />{labels[s]}</button>)}</div> : null}<p className="mt-3 text-xs text-muted-foreground">不用一次写完，保存后随时可以回来修改。</p></section>
        <div className="flex flex-wrap items-center gap-4"><Button onClick={save} disabled={completing} className="h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white">{completing ? '正在保存…' : '保存 Profile'}</Button><span className="text-xs text-muted-foreground">默认仅自己可见，保存后可以选择公开</span></div>{error || completionError ? <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{error || completionError}</p> : null}
      </div><div className="order-1 lg:order-2"><ProfilePreview draft={draft} onToneChange={(tone) => patchDraft({ tone })} /></div>
    </div>
  </main>;
}
