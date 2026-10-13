import { z } from 'zod';

export const nicknameSuggestionsSchema = z.object({
  nicknameSuggestions: z.array(z.string().min(2).max(24)).min(3).max(5),
});
export type NicknameSuggestions = z.infer<typeof nicknameSuggestionsSchema>;

export const answersSchema = z.object({
  personality: z.string().max(180),
  nickname: z.string().max(32),
  year: z.string().max(8).optional(),
  status: z.string().max(80).optional(),
  place: z.string().max(100).optional(),
  direction: z.string().max(100).optional(),
  reflection: z.string().max(500).optional(),
  advice: z.string().max(500).optional(),
});
export type AvatarAnswers = z.infer<typeof answersSchema>;

export const nicknameSuggestionRequestSchema = z.object({
  answers: answersSchema,
  refresh: z.number().int().min(0).max(1000000).default(0),
}).strict();
export type NicknameSuggestionRequest = z.infer<typeof nicknameSuggestionRequestSchema>;

export const avatarConceptRequestSchema = z.object({
  stage: z.enum(['subject', 'detail']),
  answers: answersSchema,
  subject: z.string().trim().max(80).optional(),
  refresh: z.number().int().min(0).max(1000000).default(0),
}).strict();
export type AvatarConceptRequest = z.infer<typeof avatarConceptRequestSchema>;
export const avatarConceptResponseSchema = z.object({
  options: z.array(z.string().trim().min(2).max(120)).min(1).max(5),
});
export type AvatarConceptResponse = z.infer<typeof avatarConceptResponseSchema>;

export const avatarRecipeSchema = z.object({
  subject: z.string().trim().max(80),
  detail: z.string().trim().max(120),
});
export type AvatarRecipe = z.infer<typeof avatarRecipeSchema>;
export const generatedAvatarIdSchema = z.string().uuid();

export interface AvatarState {
  nicknameSuggestions: string[];
  recipe?: AvatarRecipe;
  generatedAssetId?: string;
  adoptedRecipe?: AvatarRecipe;
}

export function emptyAvatar(): AvatarState {
  return { nicknameSuggestions: [] };
}

export function generatedAvatarPath(id: string) {
  return `/api/avatar/generated/${id}.png`;
}
