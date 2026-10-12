import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { emptyAvatar } from '../../../shared/avatar';
import type { DraftProfile } from './draft';
import {
  ADVICE_SUGGESTIONS,
  DIRECTION_OPTIONS,
  PERSONALITY_TRAITS,
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
  completing?: boolean;
  aiLoading?: boolean;
  aiError?: string;
  onAiRefresh?: () => void;
  concept?: { options: string[]; loading: boolean; error: string; refresh: () => void };
}

function Choice({
  emoji,
  label,
  note,
  selected = false,
  disabled = false,
  multiSelect = false,
  onClick,
}: {
  emoji?: string;
  label: string;
  note?: string;
  selected?: boolean;
  disabled?: boolean;
  multiSelect?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-[0_6px_22px_rgba(50,42,32,0.05)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${selected ? 'border-[#ee573c] bg-[#fff0e7] ring-2 ring-[#ee573c]/20' : 'border-black/[0.08] bg-white hover:border-[#1680bd]/35'}`}
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
      {multiSelect ? (
        selected ? <Check className="size-4 shrink-0 text-[#df5035]" /> : <Plus className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
      )}
    </button>
  );
}

const YEARS = ['', ...Array.from({ length: 10 }, (_, index) => String(2017 + index))];

function YearWheel({ value, onChange }: { value: string; onChange: (year: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wheelDeltaRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const activeRef = useRef(value);
  const [active, setActive] = useState(value);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    const index = Math.max(0, YEARS.indexOf(value));
    if (ref.current) ref.current.scrollTop = index * 56;
  }, []);

  useEffect(() => {
    if (value === activeRef.current) return;
    const index = Math.max(0, YEARS.indexOf(value));
    ref.current?.scrollTo({ top: index * 56 });
    activeRef.current = value;
    setActive(value);
  }, [value]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      wheelDeltaRef.current += event.deltaY;
      clearTimeout(wheelResetRef.current);
      wheelResetRef.current = setTimeout(() => (wheelDeltaRef.current = 0), 100);
      if (Math.abs(wheelDeltaRef.current) < 30) return;
      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      const current = Math.max(0, YEARS.indexOf(activeRef.current));
      const next = Math.min(YEARS.length - 1, Math.max(0, current + direction));
      const year = YEARS[next];
      activeRef.current = year;
      setActive(year);
      element.scrollTop = next * 56;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current(year), 120);
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
      clearTimeout(timerRef.current);
      clearTimeout(wheelResetRef.current);
    };
  }, []);

  return (
    <div className="relative mt-7 h-[280px] max-w-xs overflow-hidden rounded-2xl border border-black/10 bg-white shadow-inner">
      <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-14 -translate-y-1/2 rounded-xl bg-[#fff0e7] ring-1 ring-[#ee573c]/20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-white to-transparent" />
      <div
        ref={ref}
        onScroll={(event) => {
          const index = Math.round(event.currentTarget.scrollTop / 56);
          const year = YEARS[Math.min(YEARS.length - 1, Math.max(0, index))];
          activeRef.current = year;
          setActive(year);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => onChange(year), 120);
        }}
        className="relative z-10 h-full snap-y snap-proximity overflow-y-auto py-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {YEARS.map((year, index) => (
          <button
            key={year || 'empty'}
            type="button"
            onClick={() => {
              activeRef.current = year;
              setActive(year);
              onChangeRef.current(year);
              ref.current?.scrollTo({ top: index * 56, behavior: 'smooth' });
            }}
            className={`flex h-14 w-full snap-center items-center justify-center text-xl transition ${active === year ? 'font-black text-foreground' : 'font-bold text-muted-foreground/45'}`}
          >
            {year || '选择年份'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Questions({
  step,
  draft,
  patchDraft,
  navigateFlow,
  onComplete,
  completing = false,
  aiLoading = false,
  aiError = '',
  onAiRefresh,
  concept,
}: QuestionsProps) {
  const placeInputRef = useRef<HTMLInputElement>(null);
  const directionInputRef = useRef<HTMLInputElement>(null);
  const adviceInputRef = useRef<HTMLTextAreaElement>(null);
  const chooseTemplate = (field: 'place' | 'direction' | 'advice', template: string) => {
    patchDraft(field === 'place' ? { place: template } : field === 'direction' ? { direction: template } : { advice: template });
    requestAnimationFrame(() => {
      const input = field === 'place' ? placeInputRef.current : field === 'direction' ? directionInputRef.current : adviceInputRef.current;
      const start = template.indexOf('xxx');
      input?.focus();
      if (start >= 0) input?.setSelectionRange(start, start + 3);
    });
  };
  const selectedTraits = draft.personalityTraits ?? [];
  const personalitySummary = (traits: string[], custom: string) => {
    const labels = traits
      .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label)
      .filter(Boolean);
    return labels.length
      ? `朋友会说我：${labels.join('、')}${custom.trim() ? `；${custom.trim()}` : ''}。`
      : custom.trim() || '回答几个问题，这张角色卡会慢慢长出来。';
  };
  const toggleTrait = (id: string) => {
    if (!selectedTraits.includes(id) && selectedTraits.length >= 3) return;
    const traits = selectedTraits.includes(id)
      ? selectedTraits.filter((item) => item !== id)
      : [...selectedTraits, id];
    const custom = draft.personalityId && draft.personalityId !== 'custom'
      ? ''
      : draft.personalityCustom;
    patchDraft({
      personalityId: '',
      personalityTraits: traits,
      personalityCustom: custom,
      summary: personalitySummary(traits, custom),
    });
  };
  const chooseStatus = (statusId: StatusId) => {
    patchDraft({ statusId, statusCustom: '' });
    if (statusId !== 'other') navigateFlow(3);
  };
  const currentStatus = draft.statusId || 'university';
  const headings = [
    [
      '第一题 · 认识一下你',
      '朋友会怎么形容你？',
      '选 2–3 项最像你的描述，也可以补上一句自己的话。',
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
      '第四题 · 毕业后的坐标',
      '现在在哪里，走在什么方向？',
      '国家、城市、学校和近况，都可以按你愿意公开的程度填写。',
    ],
    [
      '第五题 · 一点真心话',
      '现在怎么看这条路？',
      '不需要积极向上，诚实就很好。',
    ],
    [
      '第六题 · 留张纸条',
      '哪件事，你希望有人早点告诉你？',
      '从一个具体时刻写起，留给学弟学妹；不想写也可以跳过。',
    ],
    [
      '第七题 · 头像的主角',
      '如果把你画成一个角色，会是什么？',
      'AI 会根据你的回答给出几个主体灵感。可以选一个，也可以写自己的想法。',
    ],
    [
      '第八题 · 加一点细节',
      '这个角色在做什么？',
      '给它加一个配件或动作；喜欢简单一点，也可以留空。',
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
            {PERSONALITY_TRAITS.map((option) => (
              <Choice
                key={option.id}
                label={option.label}
                note={option.note}
                selected={selectedTraits.includes(option.id)}
                disabled={selectedTraits.length >= 3 && !selectedTraits.includes(option.id)}
                multiSelect
                onClick={() => toggleTrait(option.id)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            已选 {selectedTraits.length} / 3 项（至少选 2 项）
          </p>
          <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white/55 p-4">
            <label htmlFor="custom-personality" className="text-sm font-black">
              还想补充一句？
            </label>
            <Input
              id="custom-personality"
              value={draft.personalityCustom}
              onChange={(event) =>
                patchDraft({
                  personalityId: '',
                  personalityCustom: event.target.value,
                  summary: personalitySummary(selectedTraits, event.target.value),
                })
              }
              placeholder="例如：熟了以后其实很爱讲冷笑话"
              maxLength={80}
              className="mt-3 h-12 rounded-xl border-black/10 bg-white"
            />
            <Button
              onClick={next}
              disabled={selectedTraits.length < 2 && !draft.personalityId}
              className="mt-3 rounded-xl bg-[#24282c] font-black text-white"
            >
              下一题 <ArrowRight className="size-4" />
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
          <YearWheel value={draft.year} onChange={(year) => patchDraft({ year })} />
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
                selected={draft.statusId === option.id}
                onClick={() => chooseStatus(option.id)}
              />
            ))}
          </div>
          {draft.statusId === 'other' ? (
            <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white/55 p-4">
              <Input
                value={draft.statusCustom}
                onChange={(event) => patchDraft({ statusCustom: event.target.value })}
                placeholder="例如：正在准备考试、在做个人项目"
                maxLength={80}
                className="h-12 rounded-xl border-black/10 bg-white"
              />
              <Button onClick={next} disabled={!draft.statusCustom.trim()} className="mt-3 rounded-xl bg-[#24282c] font-black text-white">
                下一题 <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : null}
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
            现在在哪里 / 哪所学校
          </label>
          <Input
            id="place"
            ref={placeInputRef}
            value={draft.place}
            onChange={(event) => patchDraft({ place: event.target.value })}
            placeholder="例如：美国的某大学、国内的某大学，或暂不公开"
            className="mt-2 h-12 rounded-xl border-black/10 bg-white"
          />{' '}
          <div className="mt-3 flex flex-wrap gap-2">
            {PLACE_SUGGESTIONS[currentStatus].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseTemplate('place', item)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            点模板后替换 xxx；其他国家、国内学校或不想公开，也可以直接填写。
          </p>
          <label
            className="mt-6 block text-xs font-black text-muted-foreground"
            htmlFor="direction"
          >
            现在学什么 / 在做什么
          </label>
          <Input
            id="direction"
            ref={directionInputRef}
            value={draft.direction}
            onChange={(event) => patchDraft({ direction: event.target.value })}
            placeholder="专业、工作方向，或正在休息调整"
            className="mt-2 h-12 rounded-xl border-black/10 bg-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {DIRECTION_OPTIONS[currentStatus].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseTemplate('direction', item)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            onClick={next}
            disabled={!draft.place.trim() || !draft.direction.trim() || draft.place.includes('xxx') || draft.direction.includes('xxx')}
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
            ref={adviceInputRef}
            aria-label="给学弟学妹的话"
            value={draft.advice}
            onChange={(event) => patchDraft({ advice: event.target.value })}
            placeholder="例如：刚到新学校时，我希望早点知道……（可以留空）"
            maxLength={500}
            className="mt-8 min-h-36 rounded-2xl border-black/10 bg-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {ADVICE_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseTemplate('advice', item)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            选一句开头，把 xxx 换成你自己的经历；也可以直接写或跳过。
          </p>
          <Button
            onClick={next}
            disabled={draft.advice.includes('xxx')}
            className="mt-8 h-12 rounded-2xl bg-[#24282c] px-7 font-black text-white"
          >
            下一题 <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    case 6:
    case 7: {
      const subjectStage = step === 6;
      const recipe = draft.avatar?.recipe ?? { subject: '', detail: '' };
      const value = subjectStage ? recipe.subject : recipe.detail;
      const field = subjectStage ? 'subject' : 'detail';
      const update = (nextValue: string) => patchDraft({
        avatar: {
          ...(draft.avatar ?? emptyAvatar()),
          recipe: { ...recipe, [field]: nextValue },
        },
      });
      return (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f8d42]">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          {concept?.loading ? <p role="status" className="mt-6 text-xs font-bold text-muted-foreground">正在想一些有趣的选择…</p> : null}
          {concept?.error ? <p role="alert" className="mt-6 text-xs font-bold text-[#885421]">{concept.error} 可以直接自己填写。</p> : null}
          {concept?.options.length ? (
            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-muted-foreground">AI 给你的灵感</p>
                <Button type="button" variant="ghost" onClick={concept.refresh} disabled={concept.loading} className="h-8 rounded-full px-2.5 text-xs font-black">
                  <RotateCw className={`size-3.5 ${concept.loading ? 'animate-spin' : ''}`} />重新推荐
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {concept.options.map((option) => (
                  <button key={option} type="button" onClick={() => update(option)} className={`rounded-full border px-3 py-2 text-sm font-black ${value === option ? 'border-[#ee573c] bg-[#fff0e7] text-[#b8432e]' : 'border-[#1680bd]/20 bg-[#eaf5fa] text-[#17648e]'}`}>{option}</button>
                ))}
              </div>
            </div>
          ) : null}
          <Input
            aria-label={subjectStage ? '头像主体' : '头像配件或动作'}
            value={value}
            onChange={(event) => update(event.target.value)}
            placeholder={subjectStage ? '例如：一只戴眼镜的小狐狸、一株仙人掌' : '例如：抱着一本书、背着小行囊'}
            maxLength={subjectStage ? 80 : 120}
            className="mt-7 h-14 rounded-2xl border-black/10 bg-white text-base font-bold"
          />
          <Button onClick={next} disabled={subjectStage && !value.trim()} className="mt-8 h-12 rounded-2xl bg-[#24282c] px-7 font-black text-white">
            {subjectStage ? '下一题' : '最后一步'} <ArrowRight className="size-4" />
          </Button>
        </div>
      );
    }
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
              {aiError} 你也可以自己填写昵称继续。{' '}
              <button type="button" onClick={onAiRefresh} className="underline underline-offset-2">
                重试
              </button>
            </p>
          ) : null}
          {draft.avatar?.nicknameSuggestions?.length ? (
            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-muted-foreground">AI 想到的几个名字</p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onAiRefresh}
                  disabled={aiLoading}
                  className="h-8 rounded-full px-2.5 text-xs font-black"
                >
                  <RotateCw className={`size-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                  {aiLoading ? '生成中' : '重新生成'}
                </Button>
              </div>
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
            disabled={!draft.nickname.trim() || completing}
            className="mt-8 h-12 rounded-2xl bg-[#ee573c] px-7 font-black text-white"
          >
            <Check className="size-4" /> {completing ? '正在保存…' : '大功告成'}
          </Button>
        </div>
      );
  }
}
