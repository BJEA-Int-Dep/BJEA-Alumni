import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AvatarPicker } from '@/features/avatar/avatar-picker';
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

export function OnboardingFlow({
  draft,
  onDraftChange,
  onExit,
  onComplete,
}: OnboardingFlowProps) {
  const { step, checkpoint, navigateFlow } = useFlowNavigation();
  const avatar = draft.avatar ?? emptyAvatar();
  const changeAvatar = useCallback(
    (change: (current: AvatarState) => AvatarState) => {
      onDraftChange((current) => ({
        ...current,
        avatar: change(current.avatar ?? emptyAvatar()),
      }));
    },
    [onDraftChange],
  );
  const {
    loading: avatarLoading,
    error: avatarError,
    refresh,
  } = useAvatarSuggestions(
    answersFor(draft, checkpoint ?? 1),
    avatar,
    changeAvatar,
    checkpoint,
  );
  const stage = step <= 2 ? 1 : step <= 6 ? 2 : 3;
  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  const patchDraft = (patch: Partial<DraftProfile>) => {
    onDraftChange((current) => ({ ...current, ...patch }));
  };

  const continueCheckpoint = () => {
    if (checkpoint === 1) navigateFlow(3);
    if (checkpoint === 2) navigateFlow(7);
    if (checkpoint === 3) onComplete();
  };

  const goBack = () => {
    if (step === 0 && !checkpoint) {
      onExit();
      return;
    }
    window.history.back();
  };

  const questionKey = checkpoint ? `checkpoint-${checkpoint}` : `step-${step}`;

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-12 text-foreground">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f4f1e9]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={goBack}
            className="size-10 rounded-full hover:bg-black/[0.06]"
            aria-label={step === 0 ? '退出创建' : '返回上一题'}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-xs font-black">
                STAGE {stage} ·{' '}
                {stage === 1
                  ? '你是哪种人'
                  : stage === 2
                    ? '后来去哪了'
                    : '你的故事'}
              </span>
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
          <div
            key={questionKey}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
          >
            {checkpoint ? (
              <div className="flex min-h-[490px] flex-col items-center justify-center text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
                  Stage {checkpoint} clear
                </p>
                <h1 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
                  {checkpoint === 1
                    ? '你的角色，有了第一点灵感'
                    : checkpoint === 2
                      ? '把人生支线，揉进头像里'
                      : '最后一笔，写进你的故事'}
                </h1>
                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-muted-foreground">
                  AI 提供灵感，你来决定长什么样。已保留的 emoji
                  不会被新推荐覆盖。
                </p>
                <div className="mt-6 w-full">
                  <AvatarPicker
                    avatar={avatar}
                    onChange={changeAvatar}
                    loading={avatarLoading}
                    error={avatarError}
                    onRefresh={refresh}
                  />
                </div>
                <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={continueCheckpoint}
                    disabled={avatarLoading}
                    className="h-12 flex-1 rounded-2xl bg-[#24282c] font-black text-white hover:bg-black"
                  >
                    {avatarLoading
                      ? '正在寻找你的配方…'
                      : checkpoint === 3
                        ? '使用这张角色卡'
                        : '继续下一阶段'}{' '}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
                <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                  {avatarError
                    ? '推荐暂时不可用也没关系，可以保留当前头像继续。'
                    : '灰色的 emoji 暂时无法与已保留的另一枚组合。'}
                </p>
              </div>
            ) : null}

            {!checkpoint && (
              <Questions
                step={step}
                draft={draft}
                patchDraft={patchDraft}
                navigateFlow={navigateFlow}
              />
            )}
          </div>
        </section>

        <div className="order-1 lg:order-2">
          <ProfilePreview draft={draft} />
          {!checkpoint && avatar.subjects.length > 0 && (
            <details className="mt-5 rounded-2xl border border-black/[0.07] bg-[#fffaf1] p-4">
              <summary className="cursor-pointer text-sm font-black">
                调整我的 emoji 配方
              </summary>
              <div className="mt-4">
                <AvatarPicker
                  avatar={avatar}
                  onChange={changeAvatar}
                  loading={false}
                  error=""
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
