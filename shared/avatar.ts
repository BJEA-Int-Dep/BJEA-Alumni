import { z } from 'zod';

const stageSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type AvatarStage = z.infer<typeof stageSchema>;
const candidateSchema = z.object({
  emoji: z.string().min(1).max(32),
  reason: z.string().min(1).max(100),
});
export const listsSchema = z.object({
  subjects: z.array(candidateSchema).min(3).max(5),
  traits: z.array(candidateSchema).min(3).max(5),
});
export type Candidate = z.infer<typeof candidateSchema>;
export type EmojiLists = z.infer<typeof listsSchema>;
const selectionSchema = z.object({
  subject: z.string().max(32),
  trait: z.string().max(32),
  subjectLocked: z.boolean(),
  traitLocked: z.boolean(),
});
export type Selection = z.infer<typeof selectionSchema>;
const answersSchema = z.object({
  personality: z.string().max(180),
  nickname: z.string().max(32),
  description: z.string().max(500),
  style: z.enum(['gentle', 'playful', 'wild']),
  year: z.string().max(8).optional(),
  status: z.string().max(80).optional(),
  place: z.string().max(100).optional(),
  direction: z.string().max(100).optional(),
  reflection: z.string().max(500).optional(),
  advice: z.string().max(500).optional(),
});
export type AvatarAnswers = z.infer<typeof answersSchema>;
export const suggestionRequestSchema = z.object({
  stage: stageSchema,
  answers: answersSchema,
  selection: selectionSchema,
  refresh: z.number().int().min(0).max(1000000).default(0),
});
export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
export interface EmojiPair {
  subject: string;
  trait: string;
  imageUrl: string;
}
export interface Suggestions extends EmojiLists {
  pairs: EmojiPair[];
}
export interface AvatarState extends Suggestions {
  selection: Selection;
  stages: Partial<Record<AvatarStage, string>>;
}

export function emptyAvatar(): AvatarState {
  return {
    subjects: [],
    traits: [],
    pairs: [],
    stages: {},
    selection: {
      subject: '',
      trait: '',
      subjectLocked: false,
      traitLocked: false,
    },
  };
}

export function emojiCode(emoji: string) {
  return Array.from(emoji)
    .map((part) => part.codePointAt(0)!.toString(16))
    .join('-');
}

export function pairImagePath(subject: string, trait: string) {
  return `/api/avatar/images/${emojiCode(subject)}_${emojiCode(trait)}.png`;
}

export function selectedPair(avatar?: AvatarState) {
  return avatar?.pairs.find(
    (pair) =>
      pair.subject === avatar.selection.subject &&
      pair.trait === avatar.selection.trait,
  );
}

// Merge against the latest selection, including changes made while an AI request was pending.
export function mergeSuggestions(
  current: AvatarState,
  incoming: Suggestions,
): AvatarState {
  const { selection } = current;
  const match = incoming.pairs.find(
    (pair) =>
      (!selection.subjectLocked || pair.subject === selection.subject) &&
      (!selection.traitLocked || pair.trait === selection.trait),
  );
  const next = match
    ? { ...selection, subject: match.subject, trait: match.trait }
    : selection;
  const keep = (list: Candidate[], old: Candidate[], emoji: string) => {
    if (!emoji || list.some((entry) => entry.emoji === emoji)) return list;
    return [
      old.find((entry) => entry.emoji === emoji) ?? {
        emoji,
        reason: '你的选择',
      },
      ...list,
    ].slice(0, 5);
  };
  const subjects = keep(incoming.subjects, current.subjects, next.subject);
  const traits = keep(incoming.traits, current.traits, next.trait);
  const pairs = [...incoming.pairs, ...current.pairs].filter(
    (pair, index, all) =>
      subjects.some((entry) => entry.emoji === pair.subject) &&
      traits.some((entry) => entry.emoji === pair.trait) &&
      all.findIndex(
        (other) => other.subject === pair.subject && other.trait === pair.trait,
      ) === index,
  );
  return { ...current, subjects, traits, pairs, selection: next };
}

export function chooseEmoji(
  current: AvatarState,
  slot: 'subject' | 'trait',
  emoji: string,
): AvatarState {
  const other = slot === 'subject' ? 'trait' : 'subject';
  const compatible = current.pairs.filter((pair) => pair[slot] === emoji);
  const pair =
    compatible.find((entry) => entry[other] === current.selection[other]) ??
    (!current.selection[`${other}Locked`] ? compatible[0] : undefined);
  if (!pair) return current;
  return {
    ...current,
    selection: {
      ...current.selection,
      subject: pair.subject,
      trait: pair.trait,
      [`${slot}Locked`]: true,
    },
  };
}
