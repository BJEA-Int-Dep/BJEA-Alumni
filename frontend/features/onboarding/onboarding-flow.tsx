import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyAvatar, type AvatarState } from '../../../shared/avatar';
import { AvatarSection } from './avatar-section';
import { answersFor, validateDraftForSave, type DraftProfile } from './draft';
import { BasicSection, AboutSection, ThoughtsSection } from './profile-sections';
import { ExperienceSection } from './experience-section';
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

type Section = 'about' | 'journey' | 'thoughts' | 'avatar';
const labels: Record<Section, string> = {
  about: '关于我',
  journey: '经历',
  thoughts: '一些真心话',
  avatar: '我的头像',
};
const sectionNames = Object.keys(labels) as Section[];

export function OnboardingFlow({
  draft,
  onDraftChange,
  onExit,
  onComplete,
  completing = false,
  completionError = '',
  savedAvatar,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Section[]>([]);
  const [visitedSections, setVisitedSections] = useState<Section[]>([]);
  const [error, setError] = useState('');
  const [nicknameRequested, setNicknameRequested] = useState(false);

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

  const toggleSection = (section: Section) => {
    setVisitedSections((current) => current.includes(section) ? current : [...current, section]);
    setExpandedSections((current) => current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section]);
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
    switch (section) {
      case 'about': return <AboutSection draft={draft} patchDraft={patchDraft} />;
      case 'journey': return <ExperienceSection draft={draft} patchDraft={patchDraft} />;
      case 'thoughts': return <ThoughtsSection draft={draft} patchDraft={patchDraft} />;
      case 'avatar': return <AvatarSection draft={draft} onDraftChange={onDraftChange} savedAvatar={savedAvatar} />;
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-16 text-foreground">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f4f1e9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Button variant="ghost" size="icon-lg" onClick={onExit} aria-label="返回"><ArrowLeft className="size-5" /></Button>
          <div><p className="font-black">编辑我的 Profile</p><p className="text-xs text-muted-foreground">先填写昵称和毕业年份，其他板块按需展开</p></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-10">
        <div className="order-2 grid gap-4 lg:order-1">
          <div className="divide-y divide-black/10 rounded-[28px] bg-[#fffaf1] px-5 shadow-[0_12px_35px_rgba(57,47,33,0.06)] sm:px-8">
            <BasicSection
              draft={draft}
              patchDraft={patchDraft}
              onSuggestNames={() => { setNicknameRequested(true); nicknames.refresh(); }}
              nicknameLoading={nicknames.loading}
              nicknameError={nicknames.error}
            />
            {sectionNames.map((section) => {
              const expanded = expandedSections.includes(section);
              return (
                <section key={section} className="py-5 sm:py-8">
                  <h2 className="text-xl font-black">
                    <button type="button" onClick={() => toggleSection(section)} aria-expanded={expanded} className="inline-flex items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680bd]">
                      {labels[section]}
                      {expanded ? <Minus className="size-5" aria-hidden="true" /> : <Plus className="size-5" aria-hidden="true" />}
                    </button>
                  </h2>
                  <div aria-hidden={!expanded} inert={!expanded} className={`grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out motion-reduce:transition-none ${expanded ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="-mx-1.5 -mb-1.5 min-h-0 overflow-hidden px-1.5 pb-1.5">{visitedSections.includes(section) && sectionContent(section)}</div>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={save} disabled={completing} className="h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white">{completing ? '正在保存…' : '保存 Profile'}</Button>
            <span className="text-xs text-muted-foreground">保存后可在 Profile 页面调整公开设置</span>
          </div>
          {(error || completionError) && <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{error || completionError}</p>}
        </div>
        <div className="order-1 lg:order-2"><ProfilePreview draft={draft} onToneChange={(tone) => patchDraft({ tone })} /></div>
      </div>
    </main>
  );
}
