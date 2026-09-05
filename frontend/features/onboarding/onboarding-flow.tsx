import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ArrowLeft, ArrowRight, House } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAvatarSuggestions } from '@/features/avatar/use-avatar-suggestions';
import { emptyAvatar, type AvatarState } from '../../../shared/avatar';
import { answersFor, type DraftProfile } from './draft';
import { ProfilePreview } from './profile-preview';
import { Questions } from './questions';
import { TOTAL_STEPS, useFlowNavigation } from './use-flow-navigation';

interface OnboardingFlowProps {
  draft: DraftProfile;
  onDraftChange: Dispatch<SetStateAction<DraftProfile>>;
  onExit: () => void;
  onComplete: () => void;
}

const requiredFields: Array<[keyof DraftProfile, string]> = [
  ['personalityId', '性格'],
  ['year', '高中毕业年份'],
  ['statusId', '现在的阶段'],
  ['place', '现在在哪里'],
  ['direction', '主要方向'],
  ['reflection', '真心话'],
  ['nickname', '昵称'],
];

export function OnboardingFlow({
  draft,
  onDraftChange,
  onExit,
  onComplete,
}: OnboardingFlowProps) {
  const { step, navigateFlow } = useFlowNavigation();
  const [validationError, setValidationError] = useState('');
  const changeAvatar = useCallback(
    (change: (current: AvatarState) => AvatarState) => {
      onDraftChange((current) => ({
        ...current,
        avatar: change(current.avatar ?? emptyAvatar()),
      }));
    },
    [onDraftChange],
  );
  const suggestions = useAvatarSuggestions(
    answersFor(draft),
    changeAvatar,
    step === 6,
  );
  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const patchDraft = (patch: Partial<DraftProfile>) => {
    setValidationError('');
    onDraftChange((current) => ({ ...current, ...patch }));
  };
  const complete = () => {
    if (draft.statusId === 'other' && !draft.statusCustom.trim()) {
      setValidationError('请先补充：现在的状态');
      return;
    }
    const missing = requiredFields.find(
      ([key]) => !String(draft[key] ?? '').trim(),
    );
    if (missing) {
      setValidationError(`请先补充：${missing[1]}`);
      return;
    }
    onComplete();
  };
  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-12 text-foreground">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f4f1e9]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onExit}
            className="size-10 rounded-full hover:bg-black/[0.06]"
            aria-label="返回首页"
          >
            <House className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-xs font-black">创建你的角色卡</span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                {step + 1} / {TOTAL_STEPS}
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`创建进度 ${progress}%`}
              className="gap-0 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#ef593c] [&_[data-slot=progress-indicator]]:via-[#f6a624] [&_[data-slot=progress-indicator]]:to-[#64a94e] [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-black/[0.08]"
            />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-10">
        <section className="order-2 min-h-[520px] rounded-[28px] bg-[#fffaf1] p-5 shadow-[0_20px_60px_rgba(57,47,33,0.08)] ring-1 ring-black/[0.05] sm:p-8 lg:order-1 lg:min-h-[610px]">
          <div className="mb-5 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={step === 0}
              onClick={() => navigateFlow(step - 1)}
              aria-label="上一题"
              className="rounded-full"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={step === TOTAL_STEPS - 1}
              onClick={() => navigateFlow(step + 1)}
              aria-label="下一题"
              className="rounded-full"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
          <div
            key={step}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
          >
            <Questions
              step={step}
              draft={draft}
              patchDraft={patchDraft}
              navigateFlow={navigateFlow}
              onComplete={complete}
              aiLoading={suggestions.loading}
              aiError={suggestions.error}
              onAiRefresh={suggestions.refresh}
            />
            {validationError ? (
              <p
                role="alert"
                className="mt-6 rounded-xl bg-[#fff0dc] p-3 text-xs font-bold leading-5 text-[#885421]"
              >
                {validationError}
              </p>
            ) : null}
          </div>
        </section>
        <div className="order-1 lg:order-2">
          <ProfilePreview
            draft={draft}
            patchDraft={patchDraft}
            changeAvatar={changeAvatar}
            loading={suggestions.loading}
            error={suggestions.error}
            onRefresh={suggestions.refresh}
          />
        </div>
      </div>
    </main>
  );
}
