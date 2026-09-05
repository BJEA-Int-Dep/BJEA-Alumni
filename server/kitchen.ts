import { checkSupported, googleRequestUrl, supportedEmojis } from 'emoji-mixer';
import { emojiCode, type Suggestions } from '../shared/avatar.ts';

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
const compatibilityCache = new Map<string, string[]>();
let compatibilityIndex: Map<string, Set<string>> | null = null;

function canonicalCode(value: string) {
  return emojiCode(value).replace(/-fe0f/g, '');
}

function buildCompatibilityIndex() {
  if (compatibilityIndex) return compatibilityIndex;
  const byCode = new Map(
    supported.map((value) => [canonicalCode(value), value]),
  );
  const index = new Map<string, Set<string>>();
  for (const left of supported) {
    const leftCode = canonicalCode(left);
    const entries = checkSupported(left) || [];
    for (const entry of entries) {
      const right = byCode.get(entry.rightEmoji.replace(/-fe0f/g, ''));
      if (!right) continue;
      const rightCode = canonicalCode(right);
      if (!index.has(leftCode)) index.set(leftCode, new Set());
      if (!index.has(rightCode)) index.set(rightCode, new Set());
      index.get(leftCode)!.add(rightCode);
      index.get(rightCode)!.add(leftCode);
    }
  }
  compatibilityIndex = index;
  return index;
}
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

export function compatibleEmojis(emoji: string) {
  const normalized = normalizeEmoji(emoji);
  if (!normalized) return [];
  const key = canonicalCode(normalized);
  const cached = compatibilityCache.get(key);
  if (cached) return cached;
  const available = buildCompatibilityIndex().get(key) || new Set<string>();
  const result = supported.filter((value) =>
    available.has(canonicalCode(value)),
  );
  if (compatibilityCache.size >= 1000)
    compatibilityCache.delete(compatibilityCache.keys().next().value!);
  compatibilityCache.set(key, result);
  return result;
}

export function randomPair() {
  const firstOptions = supported.filter(
    (emoji) => compatibleEmojis(emoji).length,
  );
  if (!firstOptions.length) return null;
  const first = firstOptions[Math.floor(Math.random() * firstOptions.length)];
  const secondOptions = compatibleEmojis(first);
  const second =
    secondOptions[Math.floor(Math.random() * secondOptions.length)];
  return { first, second };
}

export function buildSuggestions(lists: Suggestions): Suggestions {
  const recommendations = lists.recommendations
    .flatMap((entry) => {
      const emoji = normalizeEmoji(entry.emoji);
      return emoji ? [{ ...entry, emoji }] : [];
    })
    .filter(
      (entry, index, all) =>
        all.findIndex((other) => other.emoji === entry.emoji) === index,
    )
    .slice(0, 8);
  return {
    recommendations,
    nicknameSuggestions: lists.nicknameSuggestions,
  };
}
