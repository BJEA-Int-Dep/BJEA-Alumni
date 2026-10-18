import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyAvatar, type AvatarState } from '../../../shared/avatar';
import type { Experience } from '../../../shared/experience';
import { AvatarSection } from './avatar-section';
import { answersFor, validateDraftForSave, type DraftProfile } from './draft';
import { BasicSection, AboutSection, ThoughtsSection } from './profile-sections';
import { emptyExperience, ExperienceSection } from './experience-section';
import { ProfilePreview } from './profile-preview';
import { useNicknameSuggestions } from './use-nickname-suggestions';

interface Props {
  draft: DraftProfile;
  onDraftChange: Dispatch<SetStateAction<DraftProfile>>;
  onExit: () => void;
  onComplete: () => void | Promise<void>;
  completing?: boolean;
  completionError?: string;
  savedAvatar?: AvatarState;
}

type AddSection = 'about' | 'journey' | 'thoughts' | 'avatar';
type Section = Exclude<AddSection, 'journey'> | `experience:${string}`;
const labels: Record<AddSection, string> = {
  about: '关于我',
  journey: '毕业后的经历',
  thoughts: '一些真心话',
  avatar: '我的 AI 头像',
};
const sectionNames = Object.keys(labels) as AddSection[];

function initialSections(draft: DraftProfile): Section[] {
  const sections: Section[] = [];
  if (draft.personalityTraits?.length || draft.personalityCustom || draft.summary) sections.push('about');
  sections.push(...draft.experiences.map((item) => `experience:${item.id}` as const));
  if (draft.reflection || draft.advice) sections.push('thoughts');
  if (draft.avatar?.recipe?.subject) sections.push('avatar');
  return sections;
}

export function OnboardingFlow({
  draft,
  onDraftChange,
  onExit,
  onComplete,
  completing = false,
  completionError = '',
  savedAvatar,
}: Props) {
  const [sections, setSections] = useState<Section[]>(() => initialSections(draft));
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [nicknameRequested, setNicknameRequested] = useState(false);
  const [newExperienceId, setNewExperienceId] = useState<string | null>(null);
  const newExperienceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (newExperienceId) newExperienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [newExperienceId]);

  const patchDraft = (patch: Partial<DraftProfile>) => {
    setError('');
    onDraftChange((current) => ({ ...current, ...patch }));
  };
  const changeNicknames = useCallback((names: string[]) => {
    onDraftChange((current) => ({
      ...current,
      avatar: { ...(current.avatar ?? emptyAvatar()), nicknameSuggestions: names },
    }));
  }, [onDraftChange]);
  const nicknames = useNicknameSuggestions(answersFor(draft), changeNicknames, nicknameRequested);

  const removeSection = (section: Section) => {
    setSections((items) => items.filter((item) => item !== section));
    if (section.startsWith('experience:')) {
      patchDraft({ experiences: draft.experiences.filter((item) => item.id !== section.slice('experience:'.length)) });
      return;
    }
    switch (section) {
      case 'about': patchDraft({ personalityTraits: [], personalityCustom: '', summary: '' }); break;
      case 'thoughts': patchDraft({ reflection: '', advice: '' }); break;
      case 'avatar': patchDraft({
        avatar: { ...(draft.avatar ?? emptyAvatar()), recipe: undefined, generatedAssetId: undefined, adoptedRecipe: undefined },
      }); break;
    }
  };

  const save = () => {
    const validationError = validateDraftForSave(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    onComplete();
  };

  const sectionContent = (section: Section) => {
    if (section.startsWith('experience:')) {
      const item = draft.experiences.find((experience) => experience.id === section.slice('experience:'.length));
      return item ? <ExperienceSection experience={item} onChange={(patch: Partial<Experience>) => patchDraft({
        experiences: draft.experiences.map((experience) => experience.id === item.id ? { ...experience, ...patch } : experience),
      })} /> : null;
    }
    switch (section) {
      case 'about': return <AboutSection draft={draft} patchDraft={patchDraft} />;
      case 'thoughts': return <ThoughtsSection draft={draft} patchDraft={patchDraft} />;
      case 'avatar': return <AvatarSection draft={draft} onDraftChange={onDraftChange} savedAvatar={savedAvatar} />;
    }
  };

  const addSection = (section: AddSection) => {
    if (section === 'journey') {
      if (draft.experiences.length >= 15) return;
      const item = emptyExperience();
      patchDraft({ experiences: [...draft.experiences, item] });
      setSections((current) => [...current, `experience:${item.id}`]);
      setNewExperienceId(item.id);
    } else {
      setSections((current) => [...current, section]);
    }
    setShowAdd(false);
  };

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-16 text-foreground">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f4f1e9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Button variant="ghost" size="icon-lg" onClick={onExit} aria-label="返回"><ArrowLeft className="size-5" /></Button>
          <div><p className="font-black">编辑我的 Profile</p><p className="text-xs text-muted-foreground">先填写昵称和毕业年份，其他板块随时添加</p></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-10">
        <div className="order-2 grid gap-4 lg:order-1">
          <BasicSection
            draft={draft}
            patchDraft={patchDraft}
            onSuggestNames={() => { setNicknameRequested(true); nicknames.refresh(); }}
            nicknameLoading={nicknames.loading}
            nicknameError={nicknames.error}
          />

          {sections.map((section) => {
            const experienceId = section.startsWith('experience:') ? section.slice('experience:'.length) : null;
            return <section key={section} ref={experienceId === newExperienceId ? newExperienceRef : undefined} className="scroll-mt-24 rounded-[28px] bg-[#fffaf1] p-5 shadow-[0_12px_35px_rgba(57,47,33,0.06)] sm:p-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-black">{experienceId ? `${labels.journey} ${draft.experiences.findIndex((item) => item.id === experienceId) + 1}` : labels[section as Exclude<AddSection, 'journey'>]}</h2>
                <Button variant="ghost" size="sm" onClick={() => removeSection(section)}><Trash2 className="size-4" /> 移除</Button>
              </div>
              {sectionContent(section)}
            </section>;
          })}

          <section className="rounded-[28px] border border-dashed border-black/15 bg-white/45 p-5 sm:p-7">
            <Button variant="outline" onClick={() => setShowAdd((visible) => !visible)} className="h-12 rounded-xl bg-white font-black"><Plus className="size-4" /> 添加板块</Button>
            {showAdd && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {sectionNames.filter((section) => section === 'journey' || !sections.includes(section)).map((section) => (
                  <button key={section} type="button" onClick={() => addSection(section)} disabled={section === 'journey' && draft.experiences.length >= 15} className="rounded-xl border border-black/10 bg-white p-4 text-left text-sm font-bold disabled:opacity-50"><Plus className="mr-2 inline size-4" />{labels[section]}</button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">不用一次写完，保存后随时可以回来修改。</p>
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={save} disabled={completing} className="h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white">{completing ? '正在保存…' : '保存 Profile'}</Button>
            <span className="text-xs text-muted-foreground">默认仅自己可见，保存后可以选择公开</span>
          </div>
          {(error || completionError) && <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{error || completionError}</p>}
        </div>
        <div className="order-1 lg:order-2"><ProfilePreview draft={draft} onToneChange={(tone) => patchDraft({ tone })} /></div>
      </div>
    </main>
  );
}
