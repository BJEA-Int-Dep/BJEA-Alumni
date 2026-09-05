import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarPicker } from '@/features/avatar/avatar-picker';
import { EmojiAvatar } from '@/features/avatar/emoji-avatar';
import { selectedPair } from '../../../shared/avatar';
import { TONE_CLASSES } from '@/lib/alumni-data';
import { STATUS_OPTIONS } from './options';
import type { DraftProfile } from './draft';

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
  const [editing, setEditing] = useState(false);
  const pair = selectedPair(draft.avatar);
  const avatar = draft.avatar;

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
          角色卡
        </span>
        <span className="text-xs font-bold text-[#4b8c45]">实时更新</span>
      </div>
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full overflow-hidden rounded-[28px] bg-white text-left shadow-[0_24px_65px_rgba(52,43,30,0.14)] ring-1 ring-black/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/25"
          aria-label="打开角色卡详细编辑"
        >
          <div
            className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-48 lg:h-64 ${TONE_CLASSES[draft.tone]}`}
          >
            <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black text-black/65 shadow-sm">
              {draft.year ? `高中毕业 ${draft.year}` : '高中毕业 ··'}
            </span>
            <EmojiAvatar
              imageUrl={pair?.imageUrl}
              emoji={draft.avatar?.selection.first || draft.emoji}
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
              “{draft.summary || '写一句让人认识你的话'}”
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {draft.statusId ? (
                <span className="rounded-full bg-[#e8f3f8] px-2.5 py-1 text-xs font-bold text-[#17648e]">
                  {
                    STATUS_OPTIONS.find((item) => item.id === draft.statusId)
                      ?.label
                  }
                </span>
              ) : null}
              {draft.direction ? (
                <span className="rounded-full bg-[#edf5e6] px-2.5 py-1 text-xs font-bold text-[#3e7740]">
                  {draft.direction}
                </span>
              ) : null}
            </div>
            <div className="mt-4 border-t border-black/[0.06] pt-3 text-xs font-semibold text-muted-foreground">
              {draft.place || '填写后来的位置'} · 点击编辑详细信息
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-[28px] bg-white p-4 shadow-[0_24px_65px_rgba(52,43,30,0.14)] ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e15036]">
                角色卡详细信息
              </p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                这里的修改会同步到左侧问题。
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(false)}
              aria-label="完成编辑"
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-nickname"
            >
              昵称
              <Input
                id="profile-nickname"
                value={draft.nickname}
                onChange={(event) =>
                  patchDraft({ nickname: event.target.value })
                }
                className="mt-2 h-11 rounded-xl bg-white"
              />
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-summary"
            >
              一句话简介
              <Textarea
                id="profile-summary"
                value={draft.summary}
                onChange={(event) =>
                  patchDraft({ summary: event.target.value })
                }
                className="mt-2 min-h-20 rounded-xl bg-white"
              />
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-year"
            >
              高中毕业年份
              <select
                id="profile-year"
                value={draft.year}
                onChange={(event) => patchDraft({ year: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-bold"
              >
                <option value="">请选择</option>
                {Array.from({ length: 10 }, (_, index) =>
                  String(2017 + index),
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-status"
            >
              现在的阶段
              <select
                id="profile-status"
                value={draft.statusId}
                onChange={(event) =>
                  patchDraft({
                    statusId: event.target.value as DraftProfile['statusId'],
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-bold"
              >
                <option value="">请选择</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-place"
            >
              现在在哪里
              <Input
                id="profile-place"
                value={draft.place}
                onChange={(event) => patchDraft({ place: event.target.value })}
                className="mt-2 h-11 rounded-xl bg-white"
              />
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-direction"
            >
              主要方向
              <Input
                id="profile-direction"
                value={draft.direction}
                onChange={(event) =>
                  patchDraft({ direction: event.target.value })
                }
                className="mt-2 h-11 rounded-xl bg-white"
              />
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-reflection"
            >
              怎么看这条路
              <Textarea
                id="profile-reflection"
                value={draft.reflection}
                onChange={(event) =>
                  patchDraft({ reflection: event.target.value })
                }
                className="mt-2 min-h-20 rounded-xl bg-white"
              />
            </label>
            <label
              className="block text-xs font-black text-muted-foreground"
              htmlFor="profile-advice"
            >
              给学弟学妹的话
              <Textarea
                id="profile-advice"
                value={draft.advice}
                onChange={(event) => patchDraft({ advice: event.target.value })}
                className="mt-2 min-h-20 rounded-xl bg-white"
              />
            </label>
          </div>
          {avatar ? (
            <div className="mt-6 border-t border-black/[0.07] pt-5">
              <AvatarPicker
                avatar={avatar}
                onChange={changeAvatar}
                loading={loading}
                error={error}
                onRefresh={onRefresh}
              />
            </div>
          ) : null}
          <Button
            onClick={() => setEditing(false)}
            className="mt-5 h-11 w-full rounded-xl bg-[#24282c] font-black text-white"
          >
            <Pencil className="size-4" /> 完成编辑
          </Button>
        </div>
      )}
    </aside>
  );
}
