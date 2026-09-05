import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSuggestions,
  normalizeEmoji,
  upstreamImage,
} from '../server/kitchen.ts';
import {
  chooseEmoji,
  emptyAvatar,
  mergeSuggestions,
  pairImagePath,
  selectedPair,
  suggestionRequestSchema,
  type EmojiLists,
} from '../shared/avatar.ts';

const entries = (...emojis: string[]) =>
  emojis.map((emoji) => ({ emoji, reason: `关于 ${emoji}` }));
const lists: EmojiLists = {
  subjects: entries('🐱', '🐶', '🦊'),
  traits: entries('🌟', '🔥', '🙃'),
};
const suggestions = buildSuggestions(lists, emptyAvatar().selection);

test('uses real bidirectional Kitchen lookup and rejects non-emoji / unsupported inputs', () => {
  assert.ok(upstreamImage('🐱', '🔥'));
  assert.ok(upstreamImage('🔥', '🐱'));
  assert.equal(upstreamImage('🐱', 'https://example.com'), null);
  assert.equal(upstreamImage('not-an-emoji', '🔥'), null);
  assert.equal(normalizeEmoji('🌪️'), '🌪');
  assert.equal(normalizeEmoji('🐱🐶'), null);
});

test('cleans unsupported/duplicate candidates and emits only known, same-origin pairs', () => {
  const result = buildSuggestions(
    { ...lists, subjects: entries('🐱', '🐱', 'not-an-emoji', '🦊') },
    emptyAvatar().selection,
  );
  assert.equal(result.subjects.length, 2);
  for (const pair of result.pairs) {
    assert.ok(upstreamImage(pair.subject, pair.trait));
    assert.equal(pair.imageUrl, pairImagePath(pair.subject, pair.trait));
  }
});

test('automatically selects first valid recommendation without locking it', () => {
  const state = mergeSuggestions(emptyAvatar(), suggestions);
  assert.deepEqual(selectedPair(state), suggestions.pairs[0]);
  assert.equal(state.selection.subjectLocked, false);
  assert.equal(state.selection.traitLocked, false);
});

test('clicking a subject locks just that slot; later updates preserve it', () => {
  const first = mergeSuggestions(emptyAvatar(), suggestions);
  const selected = chooseEmoji(first, 'subject', '🐶');
  assert.equal(selected.selection.subjectLocked, true);
  assert.equal(selected.selection.traitLocked, false);
  const incoming = buildSuggestions(
    { subjects: entries('🐱', '🐶', '🦊'), traits: entries('🙃', '🌟', '🔥') },
    selected.selection,
  );
  const next = mergeSuggestions(selected, incoming);
  assert.equal(next.selection.subject, '🐶');
  assert.equal(next.selection.trait, '🙃');
});

test('user choices made during an in-flight request survive a stale response', () => {
  let state = mergeSuggestions(emptyAvatar(), suggestions);
  state = chooseEmoji(chooseEmoji(state, 'subject', '🐶'), 'trait', '🔥');
  const stale = buildSuggestions(
    { subjects: entries('🐱', '🦊', '🐼'), traits: entries('🌟', '🙃', '💫') },
    emptyAvatar().selection,
  );
  const next = mergeSuggestions(state, stale);
  assert.deepEqual(next.selection, state.selection);
  assert.ok(selectedPair(next));
  assert.ok(next.subjects.some((entry) => entry.emoji === '🐶'));
  assert.ok(next.traits.some((entry) => entry.emoji === '🔥'));
  assert.ok(next.subjects.length <= 5 && next.traits.length <= 5);
});

test('cannot replace a locked opposite slot with an incompatible pair', () => {
  const state = mergeSuggestions(emptyAvatar(), suggestions);
  state.selection.traitLocked = true;
  state.pairs = state.pairs.filter(
    (pair) => pair.subject !== '🦊' || pair.trait !== state.selection.trait,
  );
  assert.equal(chooseEmoji(state, 'subject', '🦊'), state);
});

test('unlocking permits automatic recommendations again', () => {
  const state = chooseEmoji(
    mergeSuggestions(emptyAvatar(), suggestions),
    'subject',
    '🐶',
  );
  state.selection.subjectLocked = false;
  assert.equal(
    mergeSuggestions(state, suggestions).selection.subject,
    suggestions.pairs[0].subject,
  );
});

test('request validation bounds cost and excludes arbitrary URL inputs', () => {
  const input = {
    stage: 1,
    answers: { personality: '', nickname: '', description: '', style: 'wild' },
    selection: emptyAvatar().selection,
  };
  assert.ok(suggestionRequestSchema.safeParse(input).success);
  assert.equal(
    suggestionRequestSchema.safeParse({ ...input, stage: 4 }).success,
    false,
  );
  assert.equal(
    suggestionRequestSchema.safeParse({ ...input, refresh: 1000001 }).success,
    false,
  );
  assert.equal(
    suggestionRequestSchema.safeParse({
      ...input,
      answers: { ...input.answers, description: 'x'.repeat(501) },
    }).success,
    false,
  );
});
