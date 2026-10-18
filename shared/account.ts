import { z } from 'zod';
import { avatarRecipeSchema, generatedAvatarIdSchema } from './avatar.ts';
import { experienceSchema, legacyExperiences } from './experience.ts';

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, '昵称至少需要 2 个字符。')
  .max(24, '昵称最多 24 个字符。')
  .regex(
    /^[\p{L}\p{N}_.·-]+$/u,
    '昵称只能包含中文、字母、数字、点、横线或下划线。',
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('请输入有效的邮箱地址。')
  .max(254, '邮箱地址过长。');

export const passwordSchema = z
  .string()
  .min(8, '密码至少需要 8 个字符。')
  .max(72, '密码最多 72 个字符。');

export const realNameSchema = z
  .string()
  .trim()
  .min(1, '请填写真实姓名。')
  .max(80, '姓名最多 80 个字符。');

export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, '请输入验证码。');

const avatarStateSchema = z.object({
  nicknameSuggestions: z.array(z.string().max(32)),
  recipe: avatarRecipeSchema.optional(),
  generatedAssetId: generatedAvatarIdSchema.optional(),
  adoptedRecipe: avatarRecipeSchema.optional(),
});

export const profileToneSchema = z.enum([
  'sunset', 'ocean', 'lemon', 'mint', 'berry', 'graphite', 'coral', 'sky',
]);

export const profileDraftSchema = z.object({
  nickname: z.string().max(32),
  personalityTraits: z.array(z.string().max(32)).max(3).optional(),
  personalityCustom: z.string().max(180),
  tone: profileToneSchema,
  summary: z.string().max(180),
  avatar: avatarStateSchema.optional(),
  year: z.string().max(8),
  statusId: z.enum([
    '',
    'university',
    'postgrad',
    'working',
    'independent',
    'gap',
    'other',
  ]),
  statusCustom: z.string().max(80),
  place: z.string().max(100),
  direction: z.string().max(100),
  experiences: z.array(experienceSchema).max(15).optional(),
  reflection: z.string().max(500),
  advice: z.string().max(500),
}).transform((draft) => ({
  ...draft,
  experiences: draft.experiences ?? legacyExperiences(draft),
}));

export type PersistedProfileDraft = z.infer<typeof profileDraftSchema>;

export function publishedProfileDraft(draft: PersistedProfileDraft): PersistedProfileDraft {
  return {
    ...draft,
    statusId: '',
    statusCustom: '',
    place: '',
    direction: '',
    experiences: draft.experiences.filter((experience) => experience.isPublic),
  };
}

export const accountPreferencesSchema = z
  .object({
    notifyMajorEvents: z.boolean(),
    notifyCommunityUpdates: z.boolean(),
    publicProfile: z.boolean(),
  })
  .strict();

export type AccountPreferences = z.infer<typeof accountPreferencesSchema>;

export const defaultAccountPreferences = (): AccountPreferences => ({
  notifyMajorEvents: false,
  notifyCommunityUpdates: false,
  publicProfile: false,
});

export function canPublishProfile(draft: PersistedProfileDraft) {
  return nicknameSchema.safeParse(draft.nickname).success && /^20\d{2}$/.test(draft.year);
}

export interface AccountUser {
  id: number;
  realName: string;
  email: string;
  hasProfile: boolean;
  preferences: AccountPreferences;
}

export interface AuthPayload {
  user: AccountUser;
  draft: PersistedProfileDraft | null;
}

export interface PublicProfilePayload {
  id: string;
  draft: PersistedProfileDraft;
  example?: boolean;
}
