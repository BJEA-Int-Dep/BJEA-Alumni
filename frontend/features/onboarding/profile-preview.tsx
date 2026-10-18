import { Check } from 'lucide-react';
import { ProfileAvatar } from '@/features/avatar/profile-avatar';
import { TONE_CLASSES, TONES, type Tone } from '@/lib/alumni-data';
import { generatedAvatarPath } from '../../../shared/avatar';
import { experienceLabel, primaryExperience } from '../../../shared/experience';
import type { DraftProfile } from './draft';

const toneLabels: Record<Tone, string> = {
  sunset: '落日',
  ocean: '海蓝',
  lemon: '暖黄',
  mint: '薄荷',
  berry: '莓红',
  graphite: '石墨',
  coral: '珊瑚',
  sky: '晴空',
};

export function ProfilePreview({ draft, onToneChange }: { draft: DraftProfile; onToneChange: (tone: Tone) => void }) {
  const experience = primaryExperience(draft.experiences);
  const status = experience ? experienceLabel(experience) : '';
  return <aside className="lg:sticky lg:top-24">
    <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-black text-muted-foreground">PROFILE 预览</span><span className="text-xs font-bold text-[#4b8c45]">实时更新</span></div>
    <div className="flex min-h-36 overflow-hidden rounded-[24px] bg-white shadow-[0_24px_65px_rgba(52,43,30,0.14)] ring-1 ring-black/[0.06] lg:block lg:rounded-[28px]">
      <div className={`relative flex w-32 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br sm:w-44 lg:h-64 lg:w-full ${TONE_CLASSES[draft.tone]}`}>
        <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-[9px] font-black text-black/65 lg:left-4 lg:top-4">{draft.year ? `高中毕业 ${draft.year}` : '高中毕业 ··'}</span>
        <ProfileAvatar imageUrl={draft.avatar?.generatedAssetId ? generatedAvatarPath(draft.avatar.generatedAssetId) : undefined} label="当前角色头像" className="size-24 select-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.18)] sm:size-28 lg:size-48" />
      </div>
      <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6"><p className="text-xs font-black text-[#e15036]">亦中校友角色卡</p><h2 className="mt-1 text-2xl font-black tracking-tight lg:text-3xl">{draft.nickname || '你的昵称'}</h2>{draft.summary ? <p className="mt-2 line-clamp-3 text-sm leading-6">“{draft.summary}”</p> : null}{experience ? <div className="mt-3 flex flex-wrap gap-2">{status ? <span className="rounded-full bg-[#e8f3f8] px-2.5 py-1 text-xs font-bold text-[#17648e]">{status}</span> : null}{experience.title ? <span className="rounded-full bg-[#edf5e6] px-2.5 py-1 text-xs font-bold text-[#3e7740]">{experience.title}</span> : null}</div> : null}{experience?.organization || experience?.location ? <p className="mt-3 truncate border-t border-black/[0.06] pt-2 text-xs text-muted-foreground">{experience.organization || experience.location}</p> : null}</div>
    </div>
    <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white/75 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-black">封面配色</p><span className="text-xs font-bold text-muted-foreground">{toneLabels[draft.tone]}</span></div>
      <div role="group" aria-label="封面配色" className="mt-3 flex flex-wrap gap-3">
        {TONES.map((tone) => <button key={tone} type="button" title={toneLabels[tone]} aria-label={`${toneLabels[tone]}配色`} aria-pressed={draft.tone === tone} onClick={() => onToneChange(tone)} className={`grid size-10 place-items-center rounded-full bg-gradient-to-br transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1680bd] ${TONE_CLASSES[tone]} ${draft.tone === tone ? 'ring-2 ring-[#24282c] ring-offset-2' : 'ring-1 ring-black/10'}`}>
          {draft.tone === tone ? <span className="grid size-5 place-items-center rounded-full bg-white/85 text-[#24282c]"><Check className="size-3.5" /></span> : null}
        </button>)}
      </div>
    </div>
  </aside>;
}
