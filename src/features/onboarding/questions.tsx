import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  navigateFlow: (step: number) => void;
  onComplete: () => void;
  aiLoading?: boolean;
  aiError?: string;
}

function Choice({
  emoji,
  label,
  note,
  onClick,
}: {
  emoji?: string;
  label: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-left shadow-[0_6px_22px_rgba(50,42,32,0.05)] transition hover:-translate-y-0.5 hover:border-[#1680bd]/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20"
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
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
    </button>
  );
}

export function Questions({
  step,
  draft,
  patchDraft,
  navigateFlow,
  onComplete,
  aiLoading = false,
  aiError = '',
}: QuestionsProps) {
  const choosePersonality = (id: string) => {
    const option = PERSONALITIES.find((item) => item.id === id);
    if (!option) return;
    patchDraft({
      personalityId: option.id,
      personalityCustom: '',
      emoji: option.emoji,
      tone: option.tone,
      summary: option.summary,
    });
    navigateFlow(1);
  };
  const chooseStatus = (statusId: StatusId) => {
    patchDraft({ statusId });
    navigateFlow(3);
  };
  const currentStatus = draft.statusId || 'university';
  const headings = [
    [
      '第一题 · 凭直觉选',
      '高中时期，你是哪种生物？',
      '没有标准答案，也可以用自己的话说。',
    ],
    [
      '第二题 · 一点坐标',
      '你是哪一年高中毕业的？',
      '选择高中毕业年份，方便大家理解时间线。',
    ],
    [
      '第三题 · 现在的阶段',
      '你现在处于什么阶段？',
      '选一个最接近的状态，不需要给自己下定义。',
    ],
    [
      '第四题 · 两个坐标',
      '现在在哪里、主要在做什么？',
      '地点和方向都可以写得具体或模糊一点。',
    ],
    [
      '第五题 · 一点真心话',
      '现在怎么看这条路？',
      '不需要积极向上，诚实就很好。',
    ],
    [
      '第六题 · 留张纸条',
      '想对学弟学妹说什么？',
      '可以写一句，也可以暂时留空。',
    ],
    [
      '最后一步 · 角色卡署名',
      '给角色卡取个昵称',
      'AI 会根据前面的回答给你一些灵感，最后由你决定。',
    ],
  ];
  const [eyebrow, title, description] = headings[step] || headings[0];
  const next = () => navigateFlow(step + 1);

  switch (step) {
    case 0:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
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
          <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white/55 p-4">
            <label htmlFor="custom-personality" className="text-sm font-black">
              我自己说
            </label>
            <Input
              id="custom-personality"
              value={draft.personalityCustom}
              onChange={(event) =>
                patchDraft({
                  personalityId: 'custom',
                  personalityCustom: event.target.value,
                })
              }
              placeholder="例如：一只正在学会游泳的企鹅"
              maxLength={80}
              className="mt-3 h-12 rounded-xl border-black/10 bg-white"
            />
            <Button
              onClick={() => {
                if (draft.personalityCustom.trim()) {
                  patchDraft({
                    personalityId: 'custom',
                    emoji: '✨',
                    tone: 'graphite',
                    summary: draft.personalityCustom.trim(),
                  });
                  next();
                }
              }}
              disabled={!draft.personalityCustom.trim()}
              className="mt-3 rounded-xl bg-[#24282c] font-black text-white"
            >
              用这句话继续 <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      );
    case 1:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <select
            aria-label="高中毕业年份"
            value={draft.year}
            onChange={(event) => patchDraft({ year: event.target.value })}
            className="mt-8 h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-base font-black shadow-sm"
          >
            <option value="">选择年份</option>
            {Array.from({ length: 10 }, (_, index) => String(2017 + index)).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ),
            )}
          </select>
          <Button
            onClick={next}
            disabled={!draft.year}
            className="mt-8 h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white"
          >
            下一题 <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    case 2:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
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
      );
    case 3:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1478ad]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <label
            className="mt-7 block text-xs font-black text-muted-foreground"
            htmlFor="place"
          >
            现在在哪里
          </label>
          <Input
            id="place"
            value={draft.place}
            onChange={(event) => patchDraft({ place: event.target.value })}
            placeholder="城市、学校、工作室，或者一个大概"
            className="mt-2 h-12 rounded-xl border-black/10 bg-white"
          />{' '}
          <div className="mt-3 flex flex-wrap gap-2">
            {PLACE_SUGGESTIONS[currentStatus].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => patchDraft({ place: item })}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <label
            className="mt-6 block text-xs font-black text-muted-foreground"
            htmlFor="direction"
          >
            主要在做什么方向
          </label>
          <Input
            id="direction"
            value={draft.direction}
            onChange={(event) => patchDraft({ direction: event.target.value })}
            placeholder="专业、行业、项目或正在探索的方向"
            className="mt-2 h-12 rounded-xl border-black/10 bg-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {DIRECTION_OPTIONS[currentStatus].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => patchDraft({ direction: item })}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            onClick={next}
            disabled={!draft.place.trim() || !draft.direction.trim()}
            className="mt-8 h-12 rounded-2xl bg-[#24282c] px-7 font-black text-white"
          >
            下一题 <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    case 4:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {REFLECTION_OPTIONS.map((item) => (
              <Choice
                key={item}
                label={item}
                onClick={() => patchDraft({ reflection: item })}
              />
            ))}
          </div>
          <Textarea
            aria-label="自己写一段真心话"
            value={draft.reflection}
            onChange={(event) => patchDraft({ reflection: event.target.value })}
            placeholder="或者自己写一段…"
            maxLength={500}
            className="mt-5 min-h-28 rounded-2xl border-black/10 bg-white"
          />
          <Button
            onClick={next}
            disabled={!draft.reflection.trim()}
            className="mt-6 h-12 rounded-2xl bg-[#24282c] px-7 font-black text-white"
          >
            下一题 <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    case 5:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <Textarea
            aria-label="给学弟学妹的话"
            value={draft.advice}
            onChange={(event) => patchDraft({ advice: event.target.value })}
            placeholder="写给后来的人…（可以留空）"
            maxLength={500}
            className="mt-8 min-h-36 rounded-2xl border-black/10 bg-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {ADVICE_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => patchDraft({ advice: item })}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            onClick={next}
            className="mt-8 h-12 rounded-2xl bg-[#24282c] px-7 font-black text-white"
          >
            最后一步 <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    default:
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {aiLoading ? (
            <p
              role="status"
              className="mt-6 text-xs font-bold text-muted-foreground"
            >
              正在根据你的回答找一点灵感…
            </p>
          ) : null}
          {aiError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-[#fff0dc] p-3 text-xs font-bold leading-5 text-[#885421]"
            >
              {aiError} 你也可以自己填写昵称继续。
            </p>
          ) : null}
          {draft.avatar?.nicknameSuggestions?.length ? (
            <div className="mt-7">
              <p className="text-xs font-black text-muted-foreground">
                AI 想到的几个名字
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.avatar.nicknameSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patchDraft({ nickname: item })}
                    className="rounded-full border border-[#1680bd]/20 bg-[#eaf5fa] px-3 py-2 text-sm font-black text-[#17648e]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Input
            aria-label="角色卡昵称"
            value={draft.nickname}
            onChange={(event) => patchDraft({ nickname: event.target.value })}
            placeholder="例如：小岛、周五下班、北纬 39°"
            maxLength={32}
            className="mt-8 h-14 rounded-2xl border-black/10 bg-white text-base font-bold"
          />
          <Button
            onClick={onComplete}
            disabled={!draft.nickname.trim()}
            className="mt-8 h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white"
          >
            <Check className="size-4" /> 使用这个昵称
          </Button>
        </div>
      );
  }
}
