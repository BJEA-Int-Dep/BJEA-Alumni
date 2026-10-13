import { z } from 'zod';
import { avatarRecipeSchema, generatedAvatarIdSchema } from './avatar.ts';

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
  recommendations: z.array(
    z.object({ emoji: z.string().max(32), reason: z.string().max(100) }),
  ),
  nicknameSuggestions: z.array(z.string().max(32)),
  selection: z.object({
    first: z.string().max(32),
    second: z.string().max(32),
  }),
  recipe: avatarRecipeSchema.optional(),
  generatedAssetId: generatedAvatarIdSchema.optional(),
});

export const profileDraftSchema = z.object({
  nickname: z.string().max(32),
  personalityId: z.string().max(40),
  personalityTraits: z.array(z.string().max(32)).max(3).optional(),
  personalityCustom: z.string().max(180),
  emoji: z.string().max(32),
  tone: z.enum([
    'sunset',
    'ocean',
    'lemon',
    'mint',
    'berry',
    'graphite',
    'coral',
    'sky',
  ]),
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
  reflection: z.string().max(500),
  advice: z.string().max(500),
});

export type PersistedProfileDraft = z.infer<typeof profileDraftSchema>;

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
