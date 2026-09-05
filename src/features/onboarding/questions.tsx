import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TONE_CLASSES } from '@/lib/alumni-data';
import type { AvatarStage } from '../../../shared/avatar';
import type { DraftProfile } from './draft';
import {
  ADVICE_SUGGESTIONS,
  DIRECTION_OPTIONS,
  PERSONALITIES,
  PLACE_SUGGESTIONS,
  REFLECTION_OPTIONS,
  STATUS_OPTIONS,
  type StatusId,
} from './options';

interface QuestionsProps {
  step: number;
  draft: DraftProfile;
  patchDraft: (patch: Partial<DraftProfile>) => void;
  navigateFlow: (step: number, checkpoint?: AvatarStage | null) => void;
}

interface ChoiceProps {
  emoji?: string;
  label: string;
  note?: string;
  onClick: () => void;
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

export function Questions({
  step,
  draft,
  patchDraft,
  navigateFlow,
}: QuestionsProps) {
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

    navigateFlow(1);
  };

  const chooseStatus = (statusId: StatusId) => {
    patchDraft({
      statusId,
      place: statusId === 'private' ? '暂时没有公开' : '',
      direction: statusId === 'private' ? '仍在探索' : '',
    });

    if (statusId === 'private') {
      navigateFlow(4, 2);
    } else {
      navigateFlow(5);
    }
  };

  const chooseDirection = (direction: string) => {
    patchDraft({ direction });

    navigateFlow(6, 2);
  };

  const currentStatus = draft.statusId || 'university';
  const headings = [
    {
      eyebrow: '第一题 · 凭直觉选',
      title: '高中时期，你是哪种生物？',
      description: '没有心理测试结果，只是给角色卡一点起始性格。',
    },
    {
      eyebrow: '第二题 · 公开显示',
      title: '给这张角色卡取个昵称',
      description: '不必使用真实姓名，舒服最重要。',
    },
    {
      eyebrow: '第三题 · 初始角色',
      title: '想让角色是什么样子？',
      description:
        '动物、食物、奇怪的小东西都可以。不必像本人，像你的气质就好。',
    },
    {
      eyebrow: '第四题 · 一点坐标',
      title: '你是哪一届毕业的？',
      description: '这是帮助学弟学妹理解时间线，不是年龄竞猜。',
    },
    {
      eyebrow: '第五题 · 动态分支',
      title: '你现在处于哪条人生支线？',
      description: '接下来的问题会跟着这个答案变化，也可以选择不透露。',
    },
    {
      eyebrow: `第六题 · ${STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label ?? ''}`,
      title: '后来去了哪里？',
      description: '可以是学校、城市、工作室，也可以只说一个大概。',
    },
    {
      eyebrow: '第七题 · 保持简单',
      title: '现在主要在做什么方向？',
      description: '选最接近的一个就好，不需要给人生下定义。',
    },
    {
      eyebrow: '第八题 · 一点真心话',
      title: '现在怎么看这条路？',
      description: '不需要积极向上，诚实就很好。',
    },
    {
      eyebrow: '最后一题 · 留张纸条',
      title: '给学弟学妹一句话',
      description: '一句话就够。也可以先借用下面这几句。',
    },
  ];
  const heading = headings[step];
  const accent =
    step <= 2
      ? 'text-[#df5035]'
      : step <= 6
        ? 'text-[#1478ad]'
        : 'text-[#4f8d42]';

  function renderInput() {
    switch (step) {
      case 0:
        return (
          <>
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
          </>
        );
      case 1:
        return (
          <>
            <Input
              value={draft.nickname}
              onChange={(event) => patchDraft({ nickname: event.target.value })}
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
              onClick={() => navigateFlow(2)}
              disabled={!draft.nickname.trim()}
              className="mt-8 h-12 w-full rounded-2xl bg-[#ee573c] text-base font-black text-white hover:bg-[#d9462f] sm:w-auto sm:px-7"
            >
              就叫这个 <ArrowRight className="size-4" />
            </Button>
          </>
        );
      case 2:
        return (
          <>
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
                onClick={() => navigateFlow(2, 1)}
                disabled={!draft.avatarDescription.trim()}
                className="h-12 rounded-2xl bg-[#24282c] px-6 font-black text-white hover:bg-black"
              >
                完成第一阶段 <Check className="size-4" />
              </Button>
            </div>
          </>
        );
      case 3:
        return (
          <>
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

                    navigateFlow(4);
                  }}
                  className="min-h-16 rounded-2xl border border-black/[0.08] bg-white text-lg font-black shadow-sm transition hover:-translate-y-0.5 hover:border-[#1680bd]/40 hover:bg-[#eaf5fa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20"
                >
                  {year}
                </button>
              ))}
            </div>
          </>
        );
      case 4:
        return (
          <>
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
          </>
        );
      case 5:
        return (
          <>
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
              onChange={(event) => patchDraft({ place: event.target.value })}
              placeholder="或者自己写一句…"
              maxLength={36}
              className="mt-5 h-14 rounded-2xl border-black/10 bg-white px-4 text-base font-bold md:text-base"
            />
            <Button
              onClick={() => navigateFlow(6)}
              disabled={!draft.place.trim()}
              className="mt-7 h-12 w-full rounded-2xl bg-[#1680bd] text-base font-black text-white hover:bg-[#126a9d] sm:w-auto sm:px-7"
            >
              下一题 <ArrowRight className="size-4" />
            </Button>
          </>
        );
      case 6:
        return (
          <>
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
          </>
        );
      case 7:
        return (
          <>
            <div className="mt-7 grid gap-3">
              {REFLECTION_OPTIONS.map((reflection, index) => (
                <Choice
                  key={reflection}
                  emoji={['🙂', '🛶', '🔀', '🫠'][index]}
                  label={reflection}
                  onClick={() => {
                    patchDraft({ reflection });

                    navigateFlow(8);
                  }}
                />
              ))}
            </div>
          </>
        );
      case 8:
        return (
          <>
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
              onChange={(event) => patchDraft({ advice: event.target.value })}
              placeholder="例如：别急着找到标准答案，先去试试看。"
              maxLength={80}
              className="mt-5 min-h-32 resize-none rounded-2xl border-black/10 bg-white p-4 text-base leading-7 md:text-base"
            />
            <div className="mt-2 text-right text-xs font-bold text-muted-foreground">
              {draft.advice.length} / 80
            </div>
            <Button
              onClick={() => navigateFlow(8, 3)}
              className="mt-6 h-13 w-full rounded-2xl bg-[#4f9445] text-base font-black text-white shadow-[0_10px_30px_rgba(79,148,69,0.24)] hover:bg-[#407d38] sm:w-auto sm:px-8"
            >
              <Sparkles className="size-4" />
              生成我的 Profile
            </Button>
          </>
        );
    }
  }

  return (
    <div>
      <p className={`text-xs font-black uppercase tracking-[0.18em] ${accent}`}>
        {heading.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
        {heading.title}
      </h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        {heading.description}
      </p>
      {renderInput()}
    </div>
  );
}
