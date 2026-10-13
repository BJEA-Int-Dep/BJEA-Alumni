import { z } from 'zod';

const candidateSchema = z.object({
  emoji: z.string().min(1).max(32),
  reason: z.string().min(1).max(100),
});
export const suggestionsSchema = z.object({
  recommendations: z.array(candidateSchema).min(3).max(8),
});
export const nicknameSuggestionsSchema = z.object({
  nicknameSuggestions: z.array(z.string().min(2).max(24)).min(3).max(5),
});
export type Candidate = z.infer<typeof candidateSchema>;
export type Suggestions = z.infer<typeof suggestionsSchema>;
export type NicknameSuggestions = z.infer<typeof nicknameSuggestionsSchema>;

const selectionSchema = z.object({
  first: z.string().max(32),
  second: z.string().max(32),
});
export type Selection = z.infer<typeof selectionSchema>;
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
export const suggestionRequestSchema = z
  .object({
    answers: answersSchema,
    refresh: z.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
export const nicknameSuggestionRequestSchema = suggestionRequestSchema;
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
export function generatedAvatarPath(id: string) {
  return `/api/avatar/generated/${id}.png`;
}

export interface AvatarState {
  recommendations: Candidate[];
  nicknameSuggestions: string[];
  selection: Selection;
  recipe?: AvatarRecipe;
  generatedAssetId?: string;
}

export function emptyAvatar(): AvatarState {
  return {
    recommendations: [],
    nicknameSuggestions: [],
    selection: { first: '', second: '' },
  };
}

export type AvatarSlot = 'first' | 'second';

export function compatibilityReady(
  otherEmoji: string,
  loadedFor: string,
  loading: boolean,
) {
  return !otherEmoji || (!loading && loadedFor === otherEmoji);
}

export function canChooseEmoji(
  avatar: AvatarState,
  slot: AvatarSlot,
  emoji: string,
  compatible: ReadonlySet<string>,
) {
  const other = slot === 'first' ? 'second' : 'first';
  return !avatar.selection[other] || compatible.has(emoji);
}

export function chooseAnyEmoji(
  current: AvatarState,
  slot: AvatarSlot,
  emoji: string,
  compatible: ReadonlySet<string>,
): AvatarState {
  if (!canChooseEmoji(current, slot, emoji, compatible)) return current;
  return {
    ...current,
    selection: { ...current.selection, [slot]: emoji },
  };
}

export function emojiCode(emoji: string) {
  return Array.from(emoji)
    .map((part) => part.codePointAt(0)!.toString(16))
    .join('-');
}

export function pairImagePath(first: string, second: string) {
  return `/api/avatar/images/${emojiCode(first)}_${emojiCode(second)}.png`;
}

export function selectedPair(avatar?: AvatarState) {
  const first = avatar?.selection.first;
  const second = avatar?.selection.second;
  return first && second
    ? { first, second, imageUrl: pairImagePath(first, second) }
    : undefined;
}

export function mergeSuggestions(
  current: AvatarState,
  incoming: Suggestions,
): AvatarState {
  const recommendations = [
    ...incoming.recommendations,
    ...current.recommendations,
  ]
    .filter(
      (entry, index, all) =>
        all.findIndex((other) => other.emoji === entry.emoji) === index,
    )
    .slice(0, 8);
  return {
    ...current,
    recommendations,
  };
}
