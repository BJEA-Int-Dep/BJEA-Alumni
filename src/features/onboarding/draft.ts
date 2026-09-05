import {
  emptyAvatar,
  selectedPair,
  type AvatarState,
} from '../../../shared/avatar';
import type { AlumniProfile, Tone } from '@/lib/alumni-data';
import { PERSONALITIES, STATUS_OPTIONS, type StatusId } from './options';

export interface DraftProfile {
  nickname: string;
  personalityId: string;
  personalityCustom: string;
  emoji: string;
  tone: Tone;
  summary: string;
  avatar?: AvatarState;
  year: string;
  statusId: StatusId | '';
  place: string;
  direction: string;
  reflection: string;
  advice: string;
}

export function createDefaultDraft(): DraftProfile {
  return {
    nickname: '',
    personalityId: '',
    personalityCustom: '',
    emoji: '✨',
    tone: 'graphite',
    summary: '回答几个问题，这张角色卡会慢慢长出来。',
    avatar: emptyAvatar(),
    year: '',
    statusId: '',
    place: '',
    direction: '',
    reflection: '',
    advice: '',
  };
}

export function draftToProfile(draft: DraftProfile): AlumniProfile {
  const status =
    STATUS_OPTIONS.find((option) => option.id === draft.statusId)?.label ??
    '还在探索';

  return {
    id: 'my-profile',
    nickname: draft.nickname.trim() || '神秘校友',
    year: draft.year || '20??',
    emoji: draft.avatar?.selection.first || draft.emoji,
    avatarImageUrl: selectedPair(draft.avatar)?.imageUrl,
    avatarLabel: draft.avatar?.selection.first
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
  const personality = PERSONALITIES.find(
    (item) => item.id === draft.personalityId,
  );
  return {
    personality:
      draft.personalityCustom ||
      (personality ? `${personality.label}：${personality.note}` : ''),
    nickname: draft.nickname,
    year: draft.year,
    status:
      STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label || '',
    place: draft.place,
    direction: draft.direction,
    reflection: draft.reflection,
    advice: draft.advice,
  };
}
