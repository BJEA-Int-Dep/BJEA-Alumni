import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarPicker } from '@/features/avatar/avatar-picker';
import { EmojiAvatar } from '@/features/avatar/emoji-avatar';
import { TONE_CLASSES } from '@/lib/alumni-data';
import { emptyAvatar, selectedPair } from '../../../shared/avatar';
import type { DraftProfile } from './draft';
import { STATUS_OPTIONS } from './options';

interface Props {
  draft: DraftProfile;
  patchDraft: (patch: Partial<DraftProfile>) => void;
  changeAvatar: Parameters<typeof AvatarPicker>[0]['onChange'];
  loading: boolean;
  error: string;
  onRefresh?: () => void;
}

export function ProfilePreview({
  draft,
  patchDraft,
  changeAvatar,
  loading,
  error,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pair = selectedPair(draft.avatar);
  const avatar = draft.avatar ?? emptyAvatar();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">角色卡</span>
        <span className="text-xs font-bold text-[#4b8c45]">实时更新</span>
      </div>
      <div ref={containerRef} className="relative">
        <div className="relative z-10 flex min-h-36 overflow-hidden rounded-[24px] bg-white shadow-[0_24px_65px_rgba(52,43,30,0.14)] ring-1 ring-black/[0.06] lg:block lg:rounded-[28px]">
          <div className={`relative flex w-32 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br sm:w-44 lg:h-64 lg:w-full ${TONE_CLASSES[draft.tone]}`}>
            <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-[9px] font-black text-black/65 shadow-sm lg:left-4 lg:top-4 lg:px-2.5 lg:text-[10px]">
              {draft.year ? `高中毕业 ${draft.year}` : '高中毕业 ··'}
            </span>
            <button
              type="button"
              onClick={() => setEmojiOpen(true)}
              aria-label="编辑头像"
              className="relative rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            >
              <EmojiAvatar
                imageUrl={pair?.imageUrl}
                emoji={draft.avatar?.selection.first || draft.emoji}
                label="当前角色头像"
                className="size-24 select-none text-6xl drop-shadow-[0_14px_14px_rgba(0,0,0,0.18)] sm:size-28 sm:text-7xl lg:size-48 lg:text-[8rem]"
              />
              <span className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-white text-foreground shadow-md ring-1 ring-black/10 lg:bottom-2 lg:right-2">
                <Pencil className="size-3.5" />
              </span>
            </button>
          </div>
          <div className="relative min-w-0 flex-1 p-4 pr-12 sm:p-5 sm:pr-14 lg:p-6 lg:pr-16">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e15036]">亦中校友角色卡</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight lg:text-3xl">{draft.nickname || '你的昵称'}</h2>
            <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-foreground/72 lg:mt-2 lg:text-sm lg:leading-6">“{draft.summary || '写一句让人认识你的话'}”</p>
            <div className="mt-2 hidden flex-wrap gap-2 sm:flex lg:mt-4">
              {draft.statusId ? (
                <span className="rounded-full bg-[#e8f3f8] px-2.5 py-1 text-xs font-bold text-[#17648e]">
                  {draft.statusId === 'other'
                    ? draft.statusCustom || '其他状态'
                    : STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label}
                </span>
              ) : null}
              {draft.direction ? (
                <span className="rounded-full bg-[#edf5e6] px-2.5 py-1 text-xs font-bold text-[#3e7740]">{draft.direction}</span>
              ) : null}
            </div>
            <p className="mt-2 truncate border-t border-black/[0.06] pt-2 text-[11px] font-semibold text-muted-foreground lg:mt-4 lg:pt-3 lg:text-xs">{draft.place || '填写后来的位置'}</p>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? '收起详细信息' : '展开详细信息'}
              aria-expanded={open}
              className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-black/[0.05] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20 lg:bottom-5 lg:right-5 lg:size-9"
            >
              <span className={`flex flex-col gap-1 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}>
                <span className="h-0.5 w-4 rounded-full bg-foreground" />
                <span className="h-0.5 w-4 rounded-full bg-foreground" />
                <span className="h-0.5 w-4 rounded-full bg-foreground" />
              </span>
            </button>
          </div>
        </div>

        {open ? (
          <div className="absolute inset-x-0 top-full z-0 -mt-5 max-h-[calc(100vh-9rem)] overflow-y-auto animate-in fade-in slide-in-from-top-3 rounded-b-[24px] bg-[#e9e7e2] px-4 pb-4 pt-9 duration-300 ring-1 ring-black/[0.06] sm:px-5 sm:pb-5">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">详细信息</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="昵称"><Input value={draft.nickname} onChange={(e) => patchDraft({ nickname: e.target.value })} /></Field>
              <Field label="高中毕业年份">
                <select value={draft.year} onChange={(e) => patchDraft({ year: e.target.value })} className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-sm font-bold">
                  <option value="">请选择</option>
                  {Array.from({ length: 10 }, (_, index) => String(2017 + index)).map((year) => <option key={year}>{year}</option>)}
                </select>
              </Field>
              <Field label="现在的阶段">
                <select value={draft.statusId} onChange={(e) => patchDraft({ statusId: e.target.value as DraftProfile['statusId'] })} className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-sm font-bold">
                  <option value="">请选择</option>
                  {STATUS_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </Field>
              {draft.statusId === 'other' ? (
                <Field label="具体状态"><Input value={draft.statusCustom} onChange={(e) => patchDraft({ statusCustom: e.target.value })} /></Field>
              ) : null}
              <Field label="现在在哪里"><Input value={draft.place} onChange={(e) => patchDraft({ place: e.target.value })} /></Field>
              <Field label="主要方向" wide><Input value={draft.direction} onChange={(e) => patchDraft({ direction: e.target.value })} /></Field>
              <Field label="一句话简介" wide><Textarea value={draft.summary} onChange={(e) => patchDraft({ summary: e.target.value })} /></Field>
              <Field label="怎么看这条路" wide><Textarea value={draft.reflection} onChange={(e) => patchDraft({ reflection: e.target.value })} /></Field>
              <Field label="给学弟学妹的话" wide><Textarea value={draft.advice} onChange={(e) => patchDraft({ advice: e.target.value })} /></Field>
            </div>
          </div>
        ) : null}
      </div>
      <Dialog open={emojiOpen} onOpenChange={setEmojiOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] min-w-0 max-w-3xl overflow-x-hidden overflow-y-auto rounded-[28px] bg-[#f4f1e9] p-4 [scrollbar-width:none] sm:p-7 [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">调一张你的头像</DialogTitle>
            <DialogDescription>挑两枚 emoji，组合会实时显示在角色卡上。</DialogDescription>
          </DialogHeader>
          <AvatarPicker
            avatar={avatar}
            onChange={changeAvatar}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
          />
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`text-[11px] font-black text-muted-foreground ${wide ? 'col-span-2' : ''}`}>
      {label}
      <div className="mt-1 [&_input]:h-9 [&_input]:rounded-lg [&_textarea]:min-h-14 [&_textarea]:rounded-lg [&_textarea]:py-2">{children}</div>
    </label>
  );
}
