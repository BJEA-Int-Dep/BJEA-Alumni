import { checkSupported, googleRequestUrl, supportedEmojis } from 'emoji-mixer';
import {
  emojiCode,
  pairImagePath,
  type Candidate,
  type EmojiLists,
  type EmojiPair,
  type Selection,
  type Suggestions,
} from '../shared/avatar.ts';

export const supported = supportedEmojis.map((code) =>
  String.fromCodePoint(...code.split('-').map((part) => parseInt(part, 16))),
);
const supportedSet = new Set(
  supported.map((emoji) => emoji.replace(/\uFE0F/g, '')),
);
export function normalizeEmoji(value: string) {
  const emoji = value.trim().replace(/\uFE0F/g, '');
  return supportedSet.has(emoji) ? emoji : null;
}

const urlCache = new Map<string, string[]>();
export function upstreamImages(subject: string, trait: string): string[] {
  try {
    const a = normalizeEmoji(subject);
    const b = normalizeEmoji(trait);
    if (!a || !b) return [];
    const [first, second] = [a, b].sort();
    const key = `${emojiCode(first)}_${emojiCode(second)}`;
    if (urlCache.has(key)) return urlCache.get(key)!;
    // v1.3.1's compressed database includes mirrored entries, even when Google
    // hosts only one orientation. Keep both stored orientations and older releases.
    const combos = [
      ...(checkSupported(first) || []).filter(
        (entry) => entry.rightEmoji.replace(/-fe0f/g, '') === emojiCode(second),
      ),
      ...(checkSupported(second) || []).filter(
        (entry) => entry.rightEmoji.replace(/-fe0f/g, '') === emojiCode(first),
      ),
    ].sort((left, right) => Number(right.date) - Number(left.date));
    const urls = [...new Set(combos.map(googleRequestUrl))]
      .filter((url) =>
        /^https:\/\/www\.gstatic\.com\/android\/keyboard\/emojikitchen\/[0-9]+\/u[0-9a-f-]+\/u[0-9a-f_u-]+\.png$/.test(
          url,
        ),
      )
      .slice(0, 6);
    if (urlCache.size >= 5000) urlCache.delete(urlCache.keys().next().value!);
    urlCache.set(key, urls);
    return urls;
  } catch {
    return [];
  }
}

export function upstreamImage(subject: string, trait: string) {
  return upstreamImages(subject, trait)[0] || null;
}

export function buildSuggestions(
  lists: EmojiLists,
  selection: Selection,
): Suggestions {
  const clean = (entries: Candidate[], pinned: string, locked: boolean) => {
    const normalized = entries.flatMap((entry) => {
      const emoji = normalizeEmoji(entry.emoji);
      return emoji ? [{ ...entry, emoji }] : [];
    });
    const pinnedEmoji = normalizeEmoji(pinned);
    if (locked && pinnedEmoji)
      normalized.unshift({
        emoji: pinnedEmoji,
        reason:
          normalized.find((entry) => entry.emoji === pinnedEmoji)?.reason ||
          '你已保留的选择',
      });
    return normalized
      .filter(
        (entry, index, all) =>
          all.findIndex((other) => other.emoji === entry.emoji) === index,
      )
      .slice(0, 5);
  };
  const subjects = clean(
    lists.subjects,
    selection.subject,
    selection.subjectLocked,
  );
  const traits = clean(lists.traits, selection.trait, selection.traitLocked);
  const pairs: EmojiPair[] = [];
  for (const subject of subjects)
    for (const trait of traits) {
      if (upstreamImage(subject.emoji, trait.emoji))
        pairs.push({
          subject: subject.emoji,
          trait: trait.emoji,
          imageUrl: pairImagePath(subject.emoji, trait.emoji),
        });
    }
  const rank = (pair: EmojiPair) =>
    subjects.findIndex((entry) => entry.emoji === pair.subject) +
    traits.findIndex((entry) => entry.emoji === pair.trait);
  pairs.sort((a, b) => rank(a) - rank(b));
  return { subjects, traits, pairs };
}
