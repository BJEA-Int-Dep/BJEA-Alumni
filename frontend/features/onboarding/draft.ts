import {
  emptyAvatar,
  generatedAvatarPath,
  selectedPair,
  type AvatarState,
} from '../../../shared/avatar';
import type { AlumniProfile, Tone } from '@/lib/alumni-data';
import { PERSONALITIES, PERSONALITY_TRAITS, STATUS_OPTIONS, type StatusId } from './options';

export interface DraftProfile {
  nickname: string;
  personalityId: string;
  personalityTraits?: string[];
  personalityCustom: string;
  emoji: string;
  tone: Tone;
  summary: string;
  avatar?: AvatarState;
  year: string;
  statusId: StatusId | '';
  statusCustom: string;
  place: string;
  direction: string;
  reflection: string;
  advice: string;
}

export function createDefaultDraft(): DraftProfile {
  return {
    nickname: '',
    personalityId: '',
    personalityTraits: [],
    personalityCustom: '',
    emoji: '',
    tone: 'graphite',
    summary: '回答几个问题，这张角色卡会慢慢长出来。',
    avatar: emptyAvatar(),
    year: '',
    statusId: '',
    statusCustom: '',
    place: '',
    direction: '',
    reflection: '',
    advice: '',
  };
}

export function draftToProfile(draft: DraftProfile): AlumniProfile {
  const status = draft.statusId === 'other'
    ? draft.statusCustom || '其他状态'
    : STATUS_OPTIONS.find((option) => option.id === draft.statusId)?.label ?? '还在探索';

  return {
    id: 'my-profile',
    nickname: draft.nickname.trim() || '神秘校友',
    year: draft.year || '20??',
    emoji: draft.avatar?.selection.first || draft.emoji,
    avatarImageUrl: draft.avatar?.generatedAssetId
      ? generatedAvatarPath(draft.avatar.generatedAssetId)
      : selectedPair(draft.avatar)?.imageUrl,
    avatarLabel: draft.avatar?.generatedAssetId
      ? draft.avatar.recipe?.subject
      : draft.avatar?.selection.first
        ? `${draft.avatar.selection.first} + ${draft.avatar.selection.second}`
        : undefined,
    summary: draft.summary,
    field: `${draft.direction || '探索中'} · ${status}`,
    status,
    place: draft.place || '暂时没有公开',
    direction: draft.direction || '仍在探索',
    reflection: draft.reflection,
    advice: draft.advice.trim(),
    tone: draft.tone,
  };
}

export function answersFor(draft: DraftProfile) {
  const traits = (draft.personalityTraits ?? [])
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label)
    .filter(Boolean);
  const personality = PERSONALITIES.find(
    (item) => item.id === draft.personalityId,
  );
  return {
    personality: traits.length
      ? [...traits, draft.personalityCustom.trim()].filter(Boolean).join('、')
      : draft.personalityCustom ||
        (personality ? `${personality.label}：${personality.note}` : ''),
    nickname: draft.nickname,
    year: draft.year,
    status: draft.statusId === 'other'
      ? draft.statusCustom
      : STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label || '',
    place: draft.place,
    direction: draft.direction,
    reflection: draft.reflection,
    advice: draft.advice,
  };
}
