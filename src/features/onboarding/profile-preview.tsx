import { EmojiAvatar } from '@/features/avatar/emoji-avatar';
import { selectedPair } from '../../../shared/avatar';
import { TONE_CLASSES } from '@/lib/alumni-data';
import { STATUS_OPTIONS } from './options';
import type { DraftProfile } from './draft';

export function ProfilePreview({ draft }: { draft: DraftProfile }) {
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
