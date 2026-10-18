import { emptyAvatar, generatedAvatarPath } from '../../../shared/avatar';
import { nicknameSchema, type PersistedProfileDraft } from '../../../shared/account';
import { experienceLabel, experienceSchema, primaryExperience } from '../../../shared/experience';
import { TONES, type AlumniProfile } from '@/lib/alumni-data';
import { PERSONALITY_TRAITS } from './options';

export type DraftProfile = PersistedProfileDraft;

export function createDefaultDraft(): DraftProfile {
  return {
    nickname: '',
    personalityTraits: [],
    personalityCustom: '',
    tone: TONES[Math.floor(Math.random() * TONES.length)],
    summary: '',
    avatar: emptyAvatar(),
    year: '',
    experiences: [],
    reflection: '',
    advice: '',
  };
}

export function validateDraftForSave(draft: DraftProfile): string {
  const nickname = nicknameSchema.safeParse(draft.nickname);
  if (!nickname.success) return nickname.error.issues[0]?.message || '请填写昵称。';
  if (!/^20\d{2}$/.test(draft.year)) return '请选择高中毕业年份。';
  if ([draft.advice, ...draft.experiences.flatMap((item) => [item.title, item.organization, item.location, item.description])].some((value) => value.includes('xxx')))
    return '请把模板中的 xxx 换成自己的话，或清空该项。';
  for (const experience of draft.experiences) {
    const result = experienceSchema.safeParse(experience);
    if (!result.success) return result.error.issues[0]?.message || '请检查经历内容。';
  }
  return '';
}

export function draftToProfile(draft: DraftProfile): AlumniProfile {
  const experience = primaryExperience(draft.experiences);
  const status = experience ? experienceLabel(experience) : '';

  return {
    id: 'my-profile',
    nickname: draft.nickname.trim() || '神秘校友',
    year: draft.year || '20??',
    avatarImageUrl: draft.avatar?.generatedAssetId
      ? generatedAvatarPath(draft.avatar.generatedAssetId)
      : undefined,
    avatarLabel: draft.avatar?.generatedAssetId
      ? (draft.avatar.adoptedRecipe ?? draft.avatar.recipe)?.subject
      : undefined,
    summary: draft.summary,
    experiences: draft.experiences,
    field: [experience?.title, status].filter(Boolean).join(' · '),
    reflection: draft.reflection,
    advice: draft.advice.trim(),
    tone: draft.tone,
  };
}

export function answersFor(draft: DraftProfile) {
  const experience = primaryExperience(draft.experiences);
  const traits = (draft.personalityTraits ?? [])
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label)
    .filter(Boolean);
  return {
    personality: traits.length
      ? [...traits, draft.personalityCustom.trim()].filter(Boolean).join('、')
      : draft.personalityCustom,
    nickname: draft.nickname,
    year: draft.year,
    status: experience ? experienceLabel(experience) : '',
    place: experience?.organization || experience?.location || '',
    direction: experience?.title || '',
    reflection: draft.reflection,
    advice: draft.advice,
  };
}
