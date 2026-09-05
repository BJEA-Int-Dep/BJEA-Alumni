import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AvatarPicker } from '@/components/avatar-picker';
import { EmojiAvatar } from '@/components/emoji-avatar';
import { useAvatarSuggestions } from '@/hooks/use-avatar-suggestions';
import {
  emptyAvatar,
  selectedPair,
  type AvatarAnswers,
  type AvatarStage,
  type AvatarState,
} from '../../shared/avatar';
import {
  ADVICE_SUGGESTIONS,
  DIRECTION_OPTIONS,
  PERSONALITIES,
  PLACE_SUGGESTIONS,
  REFLECTION_OPTIONS,
  STATUS_OPTIONS,
  TONE_CLASSES,
  type AlumniProfile,
  type StatusId,
  type Tone,
} from '@/lib/alumni-data';

export interface DraftProfile {
  nickname: string;
  personalityId: string;
  emoji: string;
  tone: Tone;
  summary: string;
  avatarDescription: string;
  avatarStyle?: AvatarAnswers['style'];
  avatar?: AvatarState;
  year: string;
  statusId: StatusId | '';
  place: string;
  direction: string;
  reflection: string;
  advice: string;
}

export function createDefaultDraft(): DraftProfile {
  return {
    nickname: '',
    personalityId: '',
    emoji: '✨',
    tone: 'graphite',
    summary: '回答几个问题，这张角色卡会慢慢长出来。',
    avatarDescription: '一个还在加载中的神秘校友角色，轻松插画风',
    avatarStyle: 'playful',
    avatar: emptyAvatar(),
    year: '',
    statusId: '',
    place: '',
    direction: '',
    reflection: '',
    advice: '',
  };
}

export function draftToProfile(draft: DraftProfile): AlumniProfile {
  const status =
    STATUS_OPTIONS.find((option) => option.id === draft.statusId)?.label ??
    '还在探索';

  return {
    id: 'my-profile',
    nickname: draft.nickname.trim() || '神秘校友',
    year: draft.year || '20??',
    emoji: draft.avatar?.selection.subject || draft.emoji,
    avatarImageUrl: selectedPair(draft.avatar)?.imageUrl,
    avatarLabel: draft.avatar?.selection.subject
      ? `${draft.avatar.selection.subject} + ${draft.avatar.selection.trait}`
      : undefined,
    summary: draft.summary,
    field:
      draft.statusId === 'private'
        ? '人生支线 · 暂时保密'
        : `${draft.direction || '探索中'} · ${status}`,
    status,
    place: draft.place || '暂时没有公开',
    direction: draft.direction || '仍在探索',
    reflection: draft.reflection || '这部分还没想好，允许以后再补充。',
    advice: draft.advice.trim() || '别急着给自己定型。',
    tone: draft.tone,
  };
}

interface OnboardingFlowProps {
  draft: DraftProfile;
  onDraftChange: Dispatch<SetStateAction<DraftProfile>>;
  onExit: () => void;
  onComplete: () => void;
}

interface ChoiceProps {
  emoji?: string;
  label: string;
  note?: string;
  onClick: () => void;
}

const TOTAL_STEPS = 9;

interface FlowLocation {
  step: number;
  checkpoint: AvatarStage | null;
}

function readFlowLocation(): FlowLocation {
  const params = new URLSearchParams(window.location.search);
  const requestedStep = Number(params.get('step'));
  const step = Number.isInteger(requestedStep)
    ? Math.min(TOTAL_STEPS - 1, Math.max(0, requestedStep - 1))
    : 0;
  const requestedCheckpoint = Number(params.get('checkpoint'));
  const checkpoint =
    requestedCheckpoint === 1 ||
    requestedCheckpoint === 2 ||
    requestedCheckpoint === 3
      ? requestedCheckpoint
      : null;

  return { step, checkpoint };
}

function flowPath(step: number, checkpoint: AvatarStage | null = null) {
  if (step === 0 && checkpoint === null) return '/create';

  const params = new URLSearchParams({ step: String(step + 1) });
  if (checkpoint) params.set('checkpoint', String(checkpoint));
  return `/create?${params.toString()}`;
}

function track(event: string, detail?: Record<string, string>) {
  console.info('[mock analytics]', event, detail ?? {});
}

function Choice({ emoji, label, note, onClick }: ChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left shadow-[0_6px_22px_rgba(50,42,32,0.05)] transition hover:-translate-y-0.5 hover:border-[#1680bd]/35 hover:shadow-[0_10px_28px_rgba(50,42,32,0.09)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20"
    >
      {emoji ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f3f0e9] text-2xl">
          {emoji}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black sm:text-base">{label}</span>
        {note ? (
          <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
            {note}
          </span>
        ) : null}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[#1680bd]" />
    </button>
  );
}

function LiveProfilePreview({ draft }: { draft: DraftProfile }) {
  const status = STATUS_OPTIONS.find((option) => option.id === draft.statusId);

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
          Live preview
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-[#4b8c45]">
          <span className="size-1.5 rounded-full bg-[#67aa4f]" />
          实时生长中
        </span>
      </div>
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_65px_rgba(52,43,30,0.14)] ring-1 ring-black/[0.06]">
        <div
          className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-48 lg:h-64 ${TONE_CLASSES[draft.tone]}`}
        >
          <div className="absolute -left-10 top-8 h-28 w-28 rounded-full border-[18px] border-white/16" />
          <div className="absolute -bottom-14 right-0 h-36 w-36 rotate-12 rounded-[34px] bg-white/12" />
          <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black text-black/65 shadow-sm">
            {draft.year ? `CLASS OF '${draft.year.slice(-2)}` : 'CLASS OF ··'}
          </span>
          <EmojiAvatar
            imageUrl={selectedPair(draft.avatar)?.imageUrl}
            emoji={draft.avatar?.selection.subject || draft.emoji}
            label="当前角色头像"
            className="size-32 select-none text-7xl drop-shadow-[0_14px_14px_rgba(0,0,0,0.18)] sm:size-36 sm:text-8xl lg:size-48 lg:text-[8rem]"
          />
        </div>
        <div className="p-4 sm:p-5 lg:p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e15036]">
            亦实校友角色卡
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight lg:text-3xl">
            {draft.nickname || '你的昵称'}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-foreground/72">
            “{draft.summary}”
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {status ? (
              <span className="rounded-full bg-[#e8f3f8] px-2.5 py-1 text-xs font-bold text-[#17648e]">
                {status.emoji} {status.label}
              </span>
            ) : null}
            {draft.direction ? (
              <span className="rounded-full bg-[#edf5e6] px-2.5 py-1 text-xs font-bold text-[#3e7740]">
                {draft.direction}
              </span>
            ) : null}
          </div>
          <div className="mt-4 border-t border-black/[0.06] pt-3 text-xs font-semibold text-muted-foreground">
            {draft.place || '下一段人生轨迹，等待解锁…'}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] font-medium text-muted-foreground">
        {draft.avatar?.selection.subject
          ? `${draft.avatar.selection.subject} + ${draft.avatar.selection.trait} · 你的专属配方`
          : '每完成一个阶段，角色就多一点你的样子'}
      </p>
    </aside>
  );
}

export function OnboardingFlow({
  draft,
  onDraftChange,
  onExit,
  onComplete,
}: OnboardingFlowProps) {
  const [initialLocation] = useState(readFlowLocation);
  const [step, setStep] = useState(initialLocation.step);
  const [checkpoint, setCheckpoint] = useState<AvatarStage | null>(
    initialLocation.checkpoint,
  );
  const {
    loading: avatarLoading,
    error: avatarError,
    refresh,
  } = useAvatarSuggestions(draft, onDraftChange, checkpoint);
  const avatar = draft.avatar ?? emptyAvatar();
  const changeAvatar = (change: (current: AvatarState) => AvatarState) => {
    onDraftChange((current) => ({
      ...current,
      avatar: change(current.avatar ?? emptyAvatar()),
    }));
  };
  const stage = step <= 2 ? 1 : step <= 6 ? 2 : 3;
  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname !== '/create') return;
      const location = readFlowLocation();
      setStep(location.step);
      setCheckpoint(location.checkpoint);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateFlow = (
    nextStep: number,
    nextCheckpoint: AvatarStage | null = null,
  ) => {
    window.history.pushState(
      { ...window.history.state, alumniApp: true },
      '',
      flowPath(nextStep, nextCheckpoint),
    );
    setStep(nextStep);
    setCheckpoint(nextCheckpoint);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const patchDraft = (patch: Partial<DraftProfile>) => {
    onDraftChange((current) => ({ ...current, ...patch }));
  };

  const choosePersonality = (id: string) => {
    const option = PERSONALITIES.find((item) => item.id === id);
    if (!option) return;
    patchDraft({
      personalityId: option.id,
      emoji: option.emoji,
      tone: option.tone,
      summary: option.summary,
      avatarDescription: option.description,
    });
    track('question_completed', { question: 'personality', answer: id });
    navigateFlow(1);
  };

  const chooseStatus = (statusId: StatusId) => {
    const option = STATUS_OPTIONS.find((item) => item.id === statusId);
    patchDraft({ statusId, place: '', direction: '' });
    track('question_completed', {
      question: 'current_status',
      answer: statusId,
    });
    if (statusId === 'private') {
      patchDraft({
        place: '暂时没有公开',
        direction: '仍在探索',
      });
      track('stage_2_completed', { path: 'privacy_skip' });
      navigateFlow(4, 2);
    } else {
      navigateFlow(5);
    }
    if (option) track('status_branch_selected', { branch: option.label });
  };

  const chooseDirection = (direction: string) => {
    patchDraft({ direction });
    track('question_completed', { question: 'direction', answer: direction });
    track('stage_2_completed');
    navigateFlow(6, 2);
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

  const completeProfile = () => {
    track('question_completed', { question: 'advice' });
    track('stage_3_completed');
    navigateFlow(8, 3);
  };

  const currentStatus = draft.statusId || 'university';
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

            {!checkpoint && step === 0 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
                  第一题 · 凭直觉选
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  高中时期，你是哪种生物？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  没有心理测试结果，只是给角色卡一点起始性格。
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {PERSONALITIES.map((option) => (
                    <Choice
                      key={option.id}
                      emoji={option.emoji}
                      label={option.label}
                      note={option.note}
                      onClick={() => choosePersonality(option.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 1 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
                  第二题 · 公开显示
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  给这张角色卡取个昵称
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  不必使用真实姓名，舒服最重要。
                </p>
                <Input
                  value={draft.nickname}
                  onChange={(event) =>
                    patchDraft({ nickname: event.target.value })
                  }
                  placeholder="例如：Matcha、小岛、北纬 39°"
                  maxLength={16}
                  className="mt-8 h-14 rounded-2xl border-black/10 bg-white px-4 text-base font-bold shadow-sm md:text-base"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {['小行星', '周五下班', '十一号'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => patchDraft({ nickname: suggestion })}
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold hover:border-[#1680bd]/35 hover:text-[#17648e]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    track('question_completed', { question: 'nickname' });
                    navigateFlow(2);
                  }}
                  disabled={!draft.nickname.trim()}
                  className="mt-8 h-12 w-full rounded-2xl bg-[#ee573c] text-base font-black text-white hover:bg-[#d9462f] sm:w-auto sm:px-7"
                >
                  就叫这个 <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : null}

            {!checkpoint && step === 2 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
                  第三题 · 初始角色
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  想让角色是什么样子？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  动物、食物、奇怪的小东西都可以。不必像本人，像你的气质就好。
                </p>
                <div className="mt-7 grid gap-4 sm:grid-cols-[120px_1fr] sm:items-stretch">
                  <div
                    className={`grid min-h-28 place-items-center rounded-2xl bg-gradient-to-br text-6xl shadow-inner ${TONE_CLASSES[draft.tone]}`}
                  >
                    {draft.avatar?.selection.subject || draft.emoji}
                  </div>
                  <div>
                    <label
                      htmlFor="avatar-description"
                      className="mb-2 block text-xs font-black text-muted-foreground"
                    >
                      你的形象描述
                    </label>
                    <Textarea
                      id="avatar-description"
                      value={draft.avatarDescription}
                      maxLength={500}
                      onChange={(event) =>
                        patchDraft({ avatarDescription: event.target.value })
                      }
                      className="min-h-28 resize-none rounded-2xl border-black/10 bg-white p-3 text-base leading-6 md:text-base"
                    />
                  </div>
                </div>
                <fieldset className="mt-6">
                  <legend className="text-xs font-black text-muted-foreground">
                    脑洞开到多大？
                  </legend>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: 'gentle',
                          label: '🌱 温和一点',
                          note: '亲切、好认',
                        },
                        {
                          value: 'playful',
                          label: '🪄 有点反差',
                          note: '熟悉中带点意外',
                        },
                        {
                          value: 'wild',
                          label: '🛸 尽管猎奇',
                          note: '让 AI 自由发挥',
                        },
                      ] as const
                    ).map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        aria-pressed={
                          (draft.avatarStyle || 'playful') === style.value
                        }
                        onClick={() => patchDraft({ avatarStyle: style.value })}
                        className={`rounded-2xl border p-3 text-left transition ${(draft.avatarStyle || 'playful') === style.value ? 'border-[#ee573c] bg-[#fff0e7]' : 'border-black/10 bg-white hover:border-[#ee573c]/40'}`}
                      >
                        <span className="block text-xs font-black sm:text-sm">
                          {style.label}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {style.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="mt-5 text-xs leading-5 text-muted-foreground">
                  每阶段结束时，已填写的回答会经本站服务器发送给 AI
                  服务（OpenRouter），用于推荐 emoji；请勿填写敏感信息。
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => {
                      track('stage_1_completed');
                      navigateFlow(2, 1);
                    }}
                    disabled={!draft.avatarDescription.trim()}
                    className="h-12 rounded-2xl bg-[#24282c] px-6 font-black text-white hover:bg-black"
                  >
                    完成第一阶段 <Check className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 3 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
                  第四题 · 一点坐标
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  你是哪一届毕业的？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  这是帮助学弟学妹理解时间线，不是年龄竞猜。
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    '2025',
                    '2024',
                    '2023',
                    '2022',
                    '2021',
                    '2020',
                    '2019',
                    '2018',
                  ].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        patchDraft({ year });
                        track('question_completed', {
                          question: 'graduation_year',
                          answer: year,
                        });
                        navigateFlow(4);
                      }}
                      className="min-h-16 rounded-2xl border border-black/[0.08] bg-white text-lg font-black shadow-sm transition hover:-translate-y-0.5 hover:border-[#1680bd]/40 hover:bg-[#eaf5fa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 4 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
                  第五题 · 动态分支
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  你现在处于哪条人生支线？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  接下来的问题会跟着这个答案变化，也可以选择不透露。
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {STATUS_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      emoji={option.emoji}
                      label={option.label}
                      note={option.note}
                      onClick={() => chooseStatus(option.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 5 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
                  第六题 ·{' '}
                  {
                    STATUS_OPTIONS.find((item) => item.id === draft.statusId)
                      ?.label
                  }
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  后来去了哪里？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  可以是学校、城市、工作室，也可以只说一个大概。
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {PLACE_SUGGESTIONS[currentStatus].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => patchDraft({ place: suggestion })}
                      className={`rounded-full border px-3.5 py-2 text-sm font-bold transition ${
                        draft.place === suggestion
                          ? 'border-[#1680bd] bg-[#1680bd] text-white'
                          : 'border-black/10 bg-white hover:border-[#1680bd]/40'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <Input
                  value={draft.place}
                  onChange={(event) =>
                    patchDraft({ place: event.target.value })
                  }
                  placeholder="或者自己写一句…"
                  maxLength={36}
                  className="mt-5 h-14 rounded-2xl border-black/10 bg-white px-4 text-base font-bold md:text-base"
                />
                <Button
                  onClick={() => {
                    track('question_completed', { question: 'place' });
                    navigateFlow(6);
                  }}
                  disabled={!draft.place.trim()}
                  className="mt-7 h-12 w-full rounded-2xl bg-[#1680bd] text-base font-black text-white hover:bg-[#126a9d] sm:w-auto sm:px-7"
                >
                  下一题 <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : null}

            {!checkpoint && step === 6 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
                  第七题 · 保持简单
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  现在主要在做什么方向？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  选最接近的一个就好，不需要给人生下定义。
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {DIRECTION_OPTIONS[currentStatus].map((direction, index) => (
                    <Choice
                      key={direction}
                      emoji={['🧩', '🎨', '🌱', '📚', '🌪️'][index]}
                      label={direction}
                      onClick={() => chooseDirection(direction)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 7 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">
                  第八题 · 一点真心话
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  现在怎么看这条路？
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  不需要积极向上，诚实就很好。
                </p>
                <div className="mt-7 grid gap-3">
                  {REFLECTION_OPTIONS.map((reflection, index) => (
                    <Choice
                      key={reflection}
                      emoji={['🙂', '🛶', '🔀', '🫠'][index]}
                      label={reflection}
                      onClick={() => {
                        patchDraft({ reflection });
                        track('question_completed', {
                          question: 'reflection',
                        });
                        navigateFlow(8);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!checkpoint && step === 8 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">
                  最后一题 · 留张纸条
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  给学弟学妹一句话
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  一句话就够。也可以先借用下面这几句。
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {ADVICE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => patchDraft({ advice: suggestion })}
                      className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm font-bold transition hover:border-[#64a94e]/50 hover:bg-[#edf5e6]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={draft.advice}
                  onChange={(event) =>
                    patchDraft({ advice: event.target.value })
                  }
                  placeholder="例如：别急着找到标准答案，先去试试看。"
                  maxLength={80}
                  className="mt-5 min-h-32 resize-none rounded-2xl border-black/10 bg-white p-4 text-base leading-7 md:text-base"
                />
                <div className="mt-2 text-right text-xs font-bold text-muted-foreground">
                  {draft.advice.length} / 80
                </div>
                <Button
                  onClick={completeProfile}
                  className="mt-6 h-13 w-full rounded-2xl bg-[#4f9445] text-base font-black text-white shadow-[0_10px_30px_rgba(79,148,69,0.24)] hover:bg-[#407d38] sm:w-auto sm:px-8"
                >
                  <Sparkles className="size-4" />
                  生成我的 Profile
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="order-1 lg:order-2">
          <LiveProfilePreview draft={draft} />
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
