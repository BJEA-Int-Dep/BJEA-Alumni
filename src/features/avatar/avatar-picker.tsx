import { useEffect, useMemo, useState } from 'react';
import { Dice5, RotateCw, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmojiAvatar } from '@/features/avatar/emoji-avatar';
import {
  chooseAnyEmoji,
  compatibilityReady,
  selectedPair,
  type AvatarSlot,
  type AvatarState,
} from '../../../shared/avatar';

interface Props {
  avatar: AvatarState;
  onChange: (change: (current: AvatarState) => AvatarState) => void;
  loading: boolean;
  error: string;
  onRefresh?: () => void;
}

interface EmojiResponse {
  emojis?: string[];
  error?: string;
}

const slots: AvatarSlot[] = ['first', 'second'];

export function AvatarPicker({
  avatar,
  onChange,
  loading,
  error,
  onRefresh,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<AvatarSlot>('first');
  const [allEmojis, setAllEmojis] = useState<string[]>([]);
  const [emojiError, setEmojiError] = useState('');
  const [compatible, setCompatible] = useState<Set<string>>(new Set());
  const [compatibleFor, setCompatibleFor] = useState('');
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [compatibilityAttempt, setCompatibilityAttempt] = useState(0);
  const [compatibilityError, setCompatibilityError] = useState('');
  const otherSlot = activeSlot === 'first' ? 'second' : 'first';
  const otherEmoji = avatar.selection[otherSlot];

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/avatar/emojis', { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as EmojiResponse;
        if (!response.ok)
          throw new Error(result.error || 'emoji 列表加载失败。');
        setAllEmojis(result.emojis || []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setEmojiError(
            cause instanceof Error ? cause.message : 'emoji 列表加载失败。',
          );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!otherEmoji) {
      setCompatibleFor('');
      setCompatible(new Set());
      setCompatibilityLoading(false);
      setCompatibilityError('');
      return;
    }
    const controller = new AbortController();
    setCompatibilityLoading(true);
    setCompatibilityError('');
    void fetch(`/api/avatar/emojis?with=${encodeURIComponent(otherEmoji)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as EmojiResponse;
        if (!response.ok) throw new Error(result.error || '组合列表加载失败。');
        if (controller.signal.aborted) return;
        setCompatible(new Set(result.emojis || []));
        setCompatibleFor(otherEmoji);
        setCompatibilityError('');
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setCompatibilityError(
            cause instanceof Error ? cause.message : '组合列表加载失败。',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCompatibilityLoading(false);
      });
    return () => controller.abort();
  }, [compatibilityAttempt, otherEmoji]);

  const recommendations = useMemo(() => {
    const entries = avatar.recommendations;
    return entries.filter(
      (entry, index, all) =>
        all.findIndex((other) => other.emoji === entry.emoji) === index,
    );
  }, [avatar.recommendations]);

  const allowed = (slot: AvatarSlot, emoji: string) => {
    const other = slot === 'first' ? 'second' : 'first';
    if (!avatar.selection[other] || avatar.selection[slot] === emoji)
      return true;
    return (
      compatibilityReady(
        avatar.selection[other],
        compatibleFor,
        compatibilityLoading,
      ) &&
      !compatibilityError &&
      compatible.has(emoji)
    );
  };

  const knownIncompatible = (slot: AvatarSlot, emoji: string) => {
    const other = slot === 'first' ? 'second' : 'first';
    if (!avatar.selection[other] || avatar.selection[slot] === emoji)
      return false;
    return (
      compatibilityReady(
        avatar.selection[other],
        compatibleFor,
        compatibilityLoading,
      ) &&
      !compatibilityError &&
      !compatible.has(emoji)
    );
  };

  const statusLabel = (slot: AvatarSlot, emoji: string) => {
    if (knownIncompatible(slot, emoji)) return '（暂时无法组合）';
    if (compatibilityLoading) return '（正在查找兼容组合）';
    if (compatibilityError) return '（兼容性暂不可用）';
    return '';
  };

  const retryCompatibility = () =>
    setCompatibilityAttempt((attempt) => attempt + 1);

  const pickerError = error || emojiError || compatibilityError;

  const pick = (slot: AvatarSlot, emoji: string) => {
    if (!allowed(slot, emoji)) return;
    onChange((current) =>
      chooseAnyEmoji(
        current,
        slot,
        emoji,
        slot === activeSlot && otherEmoji ? compatible : new Set(allEmojis),
      ),
    );
    const nextSlot = slot === 'first' ? 'second' : 'first';
    if (!avatar.selection[nextSlot]) setActiveSlot(nextSlot);
  };

  const pickPair = (first: string, second: string) => {
    onChange((current) => ({ ...current, selection: { first, second } }));
    setActiveSlot('first');
  };

  const randomize = async () => {
    try {
      const response = await fetch('/api/avatar/random');
      const pair = (await response.json()) as {
        first?: string;
        second?: string;
        error?: string;
      };
      if (!response.ok || !pair.first || !pair.second)
        throw new Error(pair.error || '暂时找不到可用组合。');
      pickPair(pair.first, pair.second);
    } catch (cause) {
      setEmojiError(
        cause instanceof Error ? cause.message : '暂时找不到可用组合。',
      );
    }
  };

  const clear = () =>
    onChange((current) => ({
      ...current,
      selection: { first: '', second: '' },
    }));
  const selected = selectedPair(avatar);

  return (
    <div className="space-y-5 text-left" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black">
          <Sparkles className="size-4 text-[#ee573c]" /> 自己调一张头像
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => void randomize()}
            className="rounded-full px-2.5 text-xs"
          >
            <Dice5 className="size-3.5" /> 随机
          </Button>
          <Button
            variant="ghost"
            onClick={clear}
            className="rounded-full px-2.5 text-xs"
          >
            <Trash2 className="size-3.5" /> 清空
          </Button>
          {onRefresh ? (
            <Button
              variant="ghost"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-full px-2.5 text-xs"
            >
              <RotateCw className={loading ? 'animate-spin' : ''} />{' '}
              {loading ? '寻找…' : error ? '重试' : '换一批'}
            </Button>
          ) : null}
        </div>
      </div>
      <p
        className="text-xs leading-5 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {loading
          ? '正在根据你的回答寻找灵感，手动选择会保留。'
          : compatibilityLoading
            ? '正在查找可组合 emoji…'
            : '点一下上面的格子，再从下面挑喜欢的 emoji。'}
      </p>
      {pickerError ? (
        <div className="rounded-xl bg-[#fff0dc] p-3 text-xs leading-5 text-[#885421]">
          <p role="alert">{pickerError}</p>
          {compatibilityError ? (
            <Button
              variant="ghost"
              onClick={retryCompatibility}
              className="mt-2 h-8 rounded-lg px-2 text-xs font-black text-[#885421]"
            >
              重新查找兼容组合
            </Button>
          ) : null}
        </div>
      ) : null}

      <section
        aria-label="头像配方"
        className="rounded-2xl border border-black/[0.07] bg-white p-4"
      >
        <div className="flex items-center justify-center gap-3">
          {slots.map((slot, index) => {
            const value = avatar.selection[slot];
            const active = activeSlot === slot;
            return (
              <div key={slot} className="flex items-center gap-3">
                {index ? (
                  <span className="text-xl font-black text-muted-foreground">
                    +
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  aria-label={`选择第${index + 1}枚 emoji`}
                  aria-pressed={active}
                  className={`grid size-16 place-items-center rounded-2xl border-2 text-4xl transition focus-visible:outline-2 focus-visible:outline-[#1680bd] ${active ? 'border-[#ee573c] bg-[#fff0e7]' : 'border-black/[0.08] bg-[#f7f5ef] hover:border-[#ee573c]/40'}`}
                >
                  {value || (
                    <span className="text-2xl text-muted-foreground">＋</span>
                  )}
                </button>
              </div>
            );
          })}
          <span className="text-xl font-black text-muted-foreground">=</span>
          <div className="grid size-16 place-items-center rounded-2xl bg-[#f4f1e9]">
            {selected ? (
              <EmojiAvatar
                imageUrl={selected.imageUrl}
                emoji={selected.first}
                label="合成头像"
                className="size-14 text-3xl"
              />
            ) : (
              <span className="text-2xl text-muted-foreground">?</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] font-bold text-muted-foreground">
          正在编辑第{activeSlot === 'first' ? '一' : '二'}枚 ·
          点击上方格子可切换
        </p>
      </section>

      <section aria-label="AI 推荐">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-black text-muted-foreground">
            AI 挑的，觉得像你
          </p>
          <span className="text-[11px] text-muted-foreground">
            点一下就能使用
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recommendations.length ? (
            recommendations.map((entry) => (
              <button
                key={entry.emoji}
                type="button"
                disabled={!allowed(activeSlot, entry.emoji)}
                onClick={() => pick(activeSlot, entry.emoji)}
                aria-label={`推荐 ${entry.emoji}：${entry.reason}${statusLabel(activeSlot, entry.emoji)}`}
                aria-pressed={avatar.selection[activeSlot] === entry.emoji}
                className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 text-2xl transition focus-visible:outline-2 focus-visible:outline-[#1680bd] disabled:cursor-not-allowed ${knownIncompatible(activeSlot, entry.emoji) ? 'opacity-25' : ''} ${avatar.selection[activeSlot] === entry.emoji ? 'border-[#ee573c] bg-[#fff0e7]' : 'border-black/[0.07] bg-white hover:border-[#ee573c]/40'}`}
              >
                {entry.emoji}
              </button>
            ))
          ) : loading ? (
            Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                className="size-12 shrink-0 animate-pulse rounded-xl bg-[#f4f1e9]"
              />
            ))
          ) : (
            <p className="rounded-xl bg-[#f7f5ef] px-3 py-2 text-xs text-muted-foreground">
              暂时没有推荐，可以从下面自由选择。
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="全部可用 emoji"
        className="rounded-2xl border border-black/[0.07] bg-white p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-black">全部可组合的 emoji</p>
          <span className="text-[11px] font-bold text-muted-foreground">
            {allEmojis.length || '…'}
          </span>
        </div>
        <div className="grid max-h-80 grid-cols-8 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-9">
          {allEmojis.map((emoji) => {
            const enabled = allowed(activeSlot, emoji);
            const chosen = avatar.selection[activeSlot] === emoji;
            return (
              <button
                key={emoji}
                type="button"
                disabled={!enabled}
                onClick={() => pick(activeSlot, emoji)}
                aria-label={`${emoji}${statusLabel(activeSlot, emoji)}`}
                aria-pressed={chosen}
                className={`grid aspect-square place-items-center rounded-xl text-xl transition focus-visible:outline-2 focus-visible:outline-[#1680bd] disabled:cursor-not-allowed ${knownIncompatible(activeSlot, emoji) ? 'opacity-20' : ''} ${chosen ? 'bg-[#fff0e7] ring-2 ring-[#ee573c]' : 'bg-[#f7f5ef] hover:bg-[#fff0e7]'}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          {emojiError
            ? 'emoji 列表暂时不可用，请稍后重试。'
            : compatibilityError
              ? '兼容列表暂时不可用，请点击上方重试。'
              : compatibilityLoading
                ? '正在查找可组合 emoji，列表加载完成后会更新。'
                : '灰色 emoji 与当前另一枚暂时没有可用的合成图。'}
        </p>
      </section>
    </div>
  );
}
