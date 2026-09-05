import { LockKeyhole, RotateCw, Sparkles, UnlockKeyhole } from 'lucide-react';
import {
  chooseEmoji,
  type AvatarState,
  type EmojiPair,
} from '../../shared/avatar';
import { Button } from '@/components/ui/button';
import { EmojiAvatar } from '@/components/emoji-avatar';

interface Props {
  avatar: AvatarState;
  onChange: (change: (current: AvatarState) => AvatarState) => void;
  loading: boolean;
  error: string;
  onRefresh?: () => void;
}

export function AvatarPicker({
  avatar,
  onChange,
  loading,
  error,
  onRefresh,
}: Props) {
  const pickPair = (pair: EmojiPair) =>
    onChange((current) => ({
      ...current,
      selection: {
        subject: pair.subject,
        trait: pair.trait,
        subjectLocked: true,
        traitLocked: true,
      },
    }));
  return (
    <div className="space-y-5 text-left" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black">
          <Sparkles className="size-4 text-[#ee573c]" /> 给头像加点你的配方
        </p>
        {onRefresh && (
          <Button
            variant="ghost"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full px-3 text-xs"
          >
            <RotateCw className={loading ? 'animate-spin' : ''} />{' '}
            {loading ? '寻找灵感…' : error ? '重试' : '换一批'}
          </Button>
        )}
      </div>
      <p
        className="text-xs leading-5 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {loading
          ? '正在根据你的回答更新灵感，已有选择会保留。'
          : '先挑一个主体，再加一点特征；点选即保留，后续不会自动换掉。'}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#fff0dc] p-3 text-xs leading-5 text-[#885421]"
        >
          {error}
        </p>
      )}
      {(['subject', 'trait'] as const).map((slot) => {
        const list = slot === 'subject' ? avatar.subjects : avatar.traits;
        const other = slot === 'subject' ? 'trait' : 'subject';
        const locked = avatar.selection[`${slot}Locked`];
        return (
          <section
            key={slot}
            aria-label={slot === 'subject' ? '主体候选' : '特征候选'}
            className="rounded-2xl border border-black/[0.07] bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-black">
                {slot === 'subject' ? '① 主体 · 我是谁' : '② 特征 · 我的气质'}
              </p>
              {avatar.selection[slot] && (
                <button
                  type="button"
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      selection: {
                        ...current.selection,
                        [`${slot}Locked`]: !current.selection[`${slot}Locked`],
                      },
                    }))
                  }
                  aria-label={`${locked ? '解锁' : '锁定'}${slot === 'subject' ? '主体' : '特征'}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f4f1e9] px-2.5 py-1.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-[#1680bd]"
                >
                  {locked ? (
                    <LockKeyhole className="size-3" />
                  ) : (
                    <UnlockKeyhole className="size-3" />
                  )}
                  {locked ? '已保留' : '随灵感更新'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {list.length
                ? list.map((entry) => {
                    const selected = avatar.selection[slot] === entry.emoji;
                    const enabled = avatar.pairs.some(
                      (pair) =>
                        pair[slot] === entry.emoji &&
                        (!avatar.selection[`${other}Locked`] ||
                          pair[other] === avatar.selection[other]),
                    );
                    return (
                      <button
                        key={entry.emoji}
                        type="button"
                        aria-label={`${slot === 'subject' ? '主体' : '特征'} ${entry.emoji}：${entry.reason}${enabled ? '' : '（无法搭配已保留的选择）'}`}
                        aria-pressed={selected}
                        disabled={!enabled}
                        title={
                          enabled
                            ? entry.reason
                            : '与已保留的另一枚无法组合，解锁后可尝试'
                        }
                        onClick={() =>
                          onChange((current) =>
                            chooseEmoji(current, slot, entry.emoji),
                          )
                        }
                        className={`relative grid aspect-square place-items-center rounded-2xl border-2 text-3xl transition focus-visible:outline-2 focus-visible:outline-[#1680bd] disabled:cursor-not-allowed disabled:opacity-25 ${selected ? 'border-[#ee573c] bg-[#fff0e7] shadow-sm' : 'border-transparent bg-[#f7f5ef] hover:border-[#ee573c]/30'}`}
                      >
                        <span aria-hidden="true">{entry.emoji}</span>
                        {selected && locked && (
                          <LockKeyhole className="absolute bottom-1 right-1 size-3 text-[#d64a32]" />
                        )}
                      </button>
                    );
                  })
                : Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-2xl bg-[#f4f1e9] ${loading ? 'motion-safe:animate-pulse' : ''}`}
                    />
                  ))}
            </div>
            <p className="mt-3 min-h-5 text-xs leading-5 text-muted-foreground">
              {list.find((entry) => entry.emoji === avatar.selection[slot])
                ?.reason || '正在等待这一阶段的灵感'}
            </p>
          </section>
        );
      })}
      {avatar.pairs.length > 0 && (
        <section aria-label="推荐组合">
          <p className="mb-3 text-xs font-bold text-muted-foreground">
            也可以一键选一整组（会保留两枚）
          </p>
          <div className="grid grid-cols-3 gap-3">
            {avatar.pairs.slice(0, 3).map((pair) => (
              <button
                type="button"
                key={`${pair.subject}-${pair.trait}`}
                onClick={() => pickPair(pair)}
                className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-black/[0.07] bg-white px-2 py-3 hover:border-[#ee573c] focus-visible:outline-2 focus-visible:outline-[#1680bd]"
                aria-label={`选择组合 ${pair.subject} 加 ${pair.trait}`}
              >
                <EmojiAvatar
                  imageUrl={pair.imageUrl}
                  emoji={pair.subject}
                  label={`${pair.subject} + ${pair.trait}`}
                  className="size-16 text-4xl sm:size-20"
                />
                <span className="text-xs">
                  {pair.subject} + {pair.trait}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
