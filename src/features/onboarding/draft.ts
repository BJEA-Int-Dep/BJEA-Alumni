import {
  emptyAvatar,
  selectedPair,
  type AvatarAnswers,
  type AvatarStage,
  type AvatarState,
} from '../../../shared/avatar';
import type { AlumniProfile, Tone } from '@/lib/alumni-data';
import { PERSONALITIES, STATUS_OPTIONS, type StatusId } from './options';

export interface DraftProfile {
  nickname: string;
  personalityId: string;
  emoji: string;
  tone: Tone;
  summary: string;
  avatarDescription: string;
  avatarStyle?: AvatarAnswers['style'];
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
    emoji: '✨',
    tone: 'graphite',
    summary: '回答几个问题，这张角色卡会慢慢长出来。',
    avatarDescription: '一个还在加载中的神秘校友角色，轻松插画风',
    avatarStyle: 'playful',
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
    emoji: draft.avatar?.selection.subject || draft.emoji,
    avatarImageUrl: selectedPair(draft.avatar)?.imageUrl,
    avatarLabel: draft.avatar?.selection.subject
      ? `${draft.avatar.selection.subject} + ${draft.avatar.selection.trait}`
      : undefined,
    summary: draft.summary,
    field:
      draft.statusId === 'private'
        ? '人生支线 · 暂时保密'
        : `${draft.direction || '探索中'} · ${status}`,
    status,
    place: draft.place || '暂时没有公开',
    direction: draft.direction || '仍在探索',
    reflection: draft.reflection || '这部分还没想好，允许以后再补充。',
    advice: draft.advice.trim() || '别急着给自己定型。',
    tone: draft.tone,
  };
}

export function answersFor(
  draft: DraftProfile,
  stage: AvatarStage,
): AvatarAnswers {
  const personality = PERSONALITIES.find(
    (item) => item.id === draft.personalityId,
  );
  return {
    personality: personality ? `${personality.label}：${personality.note}` : '',
    nickname: draft.nickname,
    description: draft.avatarDescription,
    style: draft.avatarStyle || 'playful',
    ...(stage >= 2
      ? {
          year: draft.year,
          status:
            STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label ||
            '',
          place: draft.place,
          direction: draft.direction,
        }
      : {}),
    ...(stage >= 3
      ? { reflection: draft.reflection, advice: draft.advice }
      : {}),
  };
}
